/**
 * ヤフオク出品者ページURLから出品者IDを抽出
 */
export function extractSellerIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // ドメインチェック
    if (!urlObj.hostname.includes('auctions.yahoo.co.jp')) {
      return null;
    }

    // auc_user_id パラメータを取得
    const sellerId = urlObj.searchParams.get('auc_user_id');

    if (!sellerId || sellerId.trim() === '') {
      return null;
    }

    return sellerId.trim();
  } catch (error) {
    // URLパースエラー
    return null;
  }
}

/**
 * URLが有効なヤフオク出品者ページURLかチェック
 */
export function isValidSellerUrl(url: string): boolean {
  return extractSellerIdFromUrl(url) !== null;
}

/**
 * 商品名がキーワードにマッチするかチェック（部分一致）
 */
export function matchesKeyword(title: string, keyword: string): boolean {
  if (!keyword || keyword.trim() === '') {
    return true; // キーワードが空の場合は全て表示
  }

  const normalizedTitle = title.toLowerCase();
  const normalizedKeyword = keyword.toLowerCase().trim();

  return normalizedTitle.includes(normalizedKeyword);
}

/**
 * 待機処理（レート制限用）
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 価格の統計情報を計算
 */
export function calculateStatistics(prices: number[]): {
  average: number;
  max: number;
  min: number;
} | null {
  if (prices.length === 0) {
    return null;
  }

  const sum = prices.reduce((acc, price) => acc + price, 0);
  const average = Math.round(sum / prices.length);
  const max = Math.max(...prices);
  const min = Math.min(...prices);

  return { average, max, min };
}
