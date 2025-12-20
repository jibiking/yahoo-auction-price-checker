import * as cheerio from 'cheerio';
import type { AuctionItem } from '@/types/auction';
import { sleep, matchesKeyword } from './utils';

const BASE_URL = 'https://auctions.yahoo.co.jp';
const RATE_LIMIT_MS = 500; // レート制限: 500ms待機（緩和）
const PARALLEL_LIMIT = 5; // 並列処理数

type AuctionUrlWithTitle = {
  url: string;
  title: string;
};

/**
 * 評価ページから商品URLリストを取得（商品名付き）
 */
export async function fetchAuctionUrls(sellerId: string, keyword?: string): Promise<string[]> {
  const allItems: AuctionUrlWithTitle[] = [];
  let totalPages = 1;

  try {
    // 1ページ目を取得して総ページ数を確認
    const firstPageUrl = `${BASE_URL}/jp/show/rating?auc_user_id=${sellerId}&role=seller&apg=1`;
    const firstPageHtml = await fetchWithRetry(firstPageUrl);
    const $ = cheerio.load(firstPageHtml);

    // 総ページ数を取得
    totalPages = extractTotalPages($);
    console.log(`Total pages: ${totalPages}`);

    // 1ページ目の商品URLと商品名を取得
    const firstPageItems = extractAuctionItemsFromPage($);
    allItems.push(...firstPageItems);

    // 2ページ目以降を取得
    for (let page = 2; page <= totalPages; page++) {
      await sleep(RATE_LIMIT_MS);

      const pageUrl = `${BASE_URL}/jp/show/rating?auc_user_id=${sellerId}&role=seller&apg=${page}`;
      const html = await fetchWithRetry(pageUrl);
      const $page = cheerio.load(html);

      const items = extractAuctionItemsFromPage($page);
      allItems.push(...items);

      console.log(`Fetched page ${page}/${totalPages}: ${items.length} items`);
    }

    // キーワードでフィルタリング
    const filteredItems = keyword
      ? allItems.filter(item => matchesKeyword(item.title, keyword))
      : allItems;

    console.log(`Filtered ${filteredItems.length}/${allItems.length} items by keyword: "${keyword}"`);

    // URLのみを返す（重複排除）
    const urls = filteredItems.map(item => item.url);
    return Array.from(new Set(urls));
  } catch (error) {
    console.error('Error fetching auction URLs:', error);
    throw new Error('評価ページの取得に失敗しました');
  }
}

/**
 * 商品詳細ページから情報を取得
 */
export async function fetchAuctionDetails(auctionUrl: string): Promise<AuctionItem | null> {
  try {
    const html = await fetchWithRetry(auctionUrl);
    const $ = cheerio.load(html);

    // デバッグ: scriptタグの数を確認
    const scriptTags = $('script');
    console.log(`[${auctionUrl}] Found ${scriptTags.length} script tags`);

    // JSONデータを抽出
    const jsonData = extractJsonData($);
    if (!jsonData) {
      console.warn(`No JSON data found for ${auctionUrl}`);
      return null;
    }

    console.log(`[${auctionUrl}] Extracted data:`, JSON.stringify(jsonData));

    // 落札済みかチェック
    if (jsonData.status !== 'closed') {
      console.log(`[${auctionUrl}] Status is not closed: ${jsonData.status}`);
      return null;
    }

    const auctionId = auctionUrl.split('/').pop() || '';

    return {
      id: auctionId,
      title: jsonData.title || '',
      price: jsonData.price || 0,
      endTime: jsonData.endTime || '',
      url: auctionUrl,
    };
  } catch (error) {
    console.error(`Error fetching auction details for ${auctionUrl}:`, error);
    return null;
  }
}

/**
 * 複数の商品詳細を並列取得
 */
export async function fetchMultipleAuctionDetails(
  urls: string[],
  onProgress?: (current: number, total: number) => void
): Promise<AuctionItem[]> {
  const items: AuctionItem[] = [];
  let completed = 0;

  // URLを並列処理用のチャンクに分割
  const chunks: string[][] = [];
  for (let i = 0; i < urls.length; i += PARALLEL_LIMIT) {
    chunks.push(urls.slice(i, i + PARALLEL_LIMIT));
  }

  // チャンクごとに並列処理
  for (const chunk of chunks) {
    await sleep(RATE_LIMIT_MS);

    const promises = chunk.map(async (url) => {
      const item = await fetchAuctionDetails(url);
      completed++;

      if (onProgress) {
        onProgress(completed, urls.length);
      }

      console.log(`Fetched ${completed}/${urls.length} auction details`);
      return item;
    });

    const results = await Promise.all(promises);

    // nullでないアイテムのみ追加
    results.forEach(item => {
      if (item) items.push(item);
    });
  }

  return items;
}

/**
 * HTMLからJSONデータを抽出
 */
function extractJsonData($: cheerio.CheerioAPI): any {
  try {
    // すべてのscriptタグを検索
    const allScripts = $('script:not([src])');

    for (let i = 0; i < allScripts.length; i++) {
      const content = $(allScripts[i]).html() || '';

      // パターン1: var pageData = {...}
      if (content.includes('var pageData')) {
        try {
          // 貪欲マッチではなく、セミコロンまでマッチさせる
          const match = content.match(/var pageData\s*=\s*(\{[\s\S]*?\});/);
          if (match && match[1]) {
            const pageData = JSON.parse(match[1]);
            if (pageData.items) {
              const item = pageData.items;

              // endTimeフィールドを取得（優先順位: endTime > endtime）
              const endTime = item.endTime || item.endtime || '';

              return {
                title: item.productName || item.title || '',
                price: parseInt(item.price) || 0,
                endTime: endTime,
                status: 'closed',
              };
            }
          }
        } catch (e) {
          console.error('Failed to parse pageData:', e);
        }
      }

      // パターン2: __NEXT_DATA__
      if (content.includes('__NEXT_DATA__')) {
        try {
          const match = content.match(/__NEXT_DATA__\s*=\s*(\{.+?\});?$/s);
          if (match && match[1]) {
            const nextData = JSON.parse(match[1]);
            const item = nextData?.props?.pageProps?.initialState?.item?.detail?.item;
            if (item) {
              // endTimeフィールドを取得（優先順位: endTime > endtime）
              const endTime = item.endTime || item.endtime || '';

              return {
                title: item.productName || item.title || '',
                price: parseInt(item.price) || 0,
                endTime: endTime,
                status: 'closed',
              };
            }
          }
        } catch (e) {
          // パース失敗時は次のパターンへ
        }
      }

      // パターン3: id="__NEXT_DATA__" の script タグ
      const nextDataScript = $('#__NEXT_DATA__');
      if (nextDataScript.length > 0) {
        try {
          const scriptContent = nextDataScript.html();
          if (scriptContent) {
            const nextData = JSON.parse(scriptContent);
            const item = nextData?.props?.pageProps?.initialState?.item?.detail?.item;
            if (item) {
              // endTimeフィールドを取得（優先順位: endTime > endtime）
              const endTime = item.endTime || item.endtime || '';

              return {
                title: item.productName || item.title || '',
                price: parseInt(item.price) || 0,
                endTime: endTime,
                status: 'closed',
              };
            }
          }
        } catch (e) {
          // パース失敗
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error extracting JSON data:', error);
    return null;
  }
}

/**
 * ページから商品URLリストと商品名を抽出
 */
function extractAuctionItemsFromPage($: cheerio.CheerioAPI): AuctionUrlWithTitle[] {
  const items: AuctionUrlWithTitle[] = [];

  // 商品リンクを探す
  $('a[href*="/jp/auction/"]').each((_, element) => {
    const href = $(element).attr('href');
    if (href) {
      // 相対URLの場合は絶対URLに変換
      const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;

      // クエリパラメータを削除
      const cleanUrl = fullUrl.split('?')[0];

      // 商品名を取得（リンクテキストまたは親要素のテキスト）
      let title = $(element).text().trim();

      // リンクテキストが空の場合、親要素から探す
      if (!title) {
        title = $(element).closest('tr, li, div').find('.ProductName, .product-name, [class*="title"]').text().trim();
      }

      items.push({
        url: cleanUrl,
        title: title || '',
      });
    }
  });

  return items;
}

/**
 * 総ページ数を抽出
 */
function extractTotalPages($: cheerio.CheerioAPI): number {
  try {
    // ページ全体のテキストから「XXページ中」を探す
    const bodyText = $('body').text();

    // パターン: "12ページ中1ページ目"
    const match = bodyText.match(/(\d+)ページ中/);
    if (match) {
      const totalPages = parseInt(match[1], 10);
      console.log(`Extracted total pages: ${totalPages}`);
      return totalPages;
    }

    // 代替パターン: 合計件数から計算
    // 例: "合計：288件" → 288 / 25 = 12ページ
    const totalMatch = bodyText.match(/合計[：:]\s*(\d+)\s*件/);
    if (totalMatch) {
      const totalItems = parseInt(totalMatch[1], 10);
      const totalPages = Math.ceil(totalItems / 25);
      console.log(`Calculated total pages from total items: ${totalPages}`);
      return totalPages;
    }

    console.log('Could not extract total pages, defaulting to 1');
    return 1;
  } catch (error) {
    console.error('Error extracting total pages:', error);
    return 1;
  }
}

/**
 * リトライ機能付きfetch（404は即スキップ）
 */
async function fetchWithRetry(url: string, retries = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      });

      // 404エラーは即スキップ（リトライしない）
      if (response.status === 404) {
        throw new Error(`HTTP error! status: 404 (not found)`);
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      // 404エラーの場合は即座に throw（リトライしない）
      if (error instanceof Error && error.message.includes('404')) {
        throw error;
      }

      // その他のエラーはリトライ
      if (i === retries - 1) {
        throw error;
      }
      await sleep(1000 * (i + 1)); // 指数バックオフ
    }
  }

  throw new Error('Failed to fetch after retries');
}
