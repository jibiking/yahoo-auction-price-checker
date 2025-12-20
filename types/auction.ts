export type AuctionImage = {
  image: string;        // フル解像度画像URL
  thumbnail: string;    // サムネイル画像URL
  width: number;        // 画像幅
  height: number;       // 画像高さ
};

export type AuctionItem = {
  id: string;           // オークションID
  title: string;        // 商品名
  price: number;        // 落札価格（円）
  endTime: string;      // 落札日時（ISO 8601形式）
  url: string;          // 商品詳細ページURL
  images: AuctionImage[]; // 商品画像リスト
};

export type SearchResult = {
  items: AuctionItem[];
  totalCount: number;
  sellerName?: string;  // 出品者名
  statistics?: {
    average: number;
    max: number;
    min: number;
  };
};

export type SearchRequest = {
  sellerUrl: string;    // 出品者ページURL
  keyword: string;      // 検索キーワード
  limit?: number | null; // 取得件数制限（nullの場合は全件）
};

export type ApiError = {
  error: string;
  details?: string;
};
