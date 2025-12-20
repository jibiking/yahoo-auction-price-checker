import { NextRequest } from 'next/server';
import type { SearchRequest, AuctionItem } from '@/types/auction';
import { extractSellerIdFromUrl, matchesKeyword, calculateStatistics } from '@/lib/utils';
import { fetchAuctionUrls, fetchAuctionDetails } from '@/lib/scraper';
import { sleep } from '@/lib/utils';

const RATE_LIMIT_MS = 800;

export async function POST(request: NextRequest) {
  const body: SearchRequest = await request.json();
  const { sellerUrl, keyword, limit } = body;

  // バリデーション
  if (!sellerUrl) {
    return new Response(
      JSON.stringify({ error: '出品者URLが指定されていません' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 出品者IDを抽出
  const sellerId = extractSellerIdFromUrl(sellerUrl);
  if (!sellerId) {
    return new Response(
      JSON.stringify({ error: '無効な出品者URLです' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ストリーミングレスポンスを作成
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 進捗を送信するヘルパー関数
        const sendProgress = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        console.log(`Starting search for seller: ${sellerId}, keyword: "${keyword}"`);

        // 1. 評価ページから商品URLリストを取得（キーワード絞り込み含む）
        sendProgress({ type: 'status', message: '商品URLリストを取得中...' });
        const auctionUrls = await fetchAuctionUrls(sellerId, keyword);
        console.log(`Found ${auctionUrls.length} auction URLs`);

        if (auctionUrls.length === 0) {
          sendProgress({
            type: 'complete',
            data: { items: [], totalCount: 0, statistics: null }
          });
          controller.close();
          return;
        }

        // 取得件数制限を適用
        const limitedUrls = limit && limit > 0 ? auctionUrls.slice(0, limit) : auctionUrls;
        console.log(`Limited to ${limitedUrls.length} URLs (original: ${auctionUrls.length})`);

        sendProgress({
          type: 'total',
          total: limitedUrls.length,
          message: `${limitedUrls.length}件の商品を取得します...`
        });

        // 2. 各商品詳細を順次取得（進捗を随時送信）
        const allItems: AuctionItem[] = [];

        for (let i = 0; i < limitedUrls.length; i++) {
          await sleep(RATE_LIMIT_MS);

          const item = await fetchAuctionDetails(limitedUrls[i]);
          if (item) {
            allItems.push(item);
          }

          // 進捗を送信
          sendProgress({
            type: 'progress',
            current: i + 1,
            total: limitedUrls.length,
            percentage: Math.round(((i + 1) / limitedUrls.length) * 100),
          });

          console.log(`Fetched ${i + 1}/${limitedUrls.length} auction details`);
        }

        console.log(`Fetched ${allItems.length} auction details`);

        // 3. 統計情報を計算
        const prices = allItems.map(item => item.price);
        const statistics = calculateStatistics(prices);

        // 4. 落札日時で降順ソート
        const sortedItems = allItems.sort((a, b) => {
          return new Date(b.endTime).getTime() - new Date(a.endTime).getTime();
        });

        // 最終結果を送信
        sendProgress({
          type: 'complete',
          data: {
            items: sortedItems,
            totalCount: sortedItems.length,
            statistics: statistics || undefined,
          },
        });

        controller.close();
      } catch (error) {
        console.error('API Error:', error);
        const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            error: 'サーバーエラーが発生しました',
            details: errorMessage
          })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
