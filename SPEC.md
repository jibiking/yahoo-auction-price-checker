# ヤフオク落札価格チェッカー - 仕様書

## 1. プロジェクト概要

### 目的
指定したヤフオク出品者の過去の落札商品について、特定の商品名で絞り込んで落札価格の履歴を確認できるアプリケーション

### 背景
- ヤフオクには出品者×商品名での過去落札価格検索機能がない
- 特定の出品者から繰り返し購入する際に、適正価格を把握したい

---

## 2. 機能要件

### 2.1 コア機能

#### 入力
- **出品者ページURL**: ヤフオクの出品者評価ページURL
  - 形式: `https://auctions.yahoo.co.jp/jp/show/rating?auc_user_id={出品者ID}&role=seller`
  - 例: `https://auctions.yahoo.co.jp/jp/show/rating?auc_user_id=fPueNTPCt5JWiDHfkDNtGkKaLAfd&role=seller`
  - URLから出品者IDを自動抽出
- **商品名キーワード**: 検索したい商品名（部分一致・曖昧検索対応）

#### 処理フロー
1. ユーザーが出品者ページURLと商品名キーワードを入力
2. URLから出品者ID（`auc_user_id`パラメータ）を抽出
3. 出品者の評価ページから全ページを巡回して商品URLリストを取得
   - URL形式: `https://auctions.yahoo.co.jp/jp/show/rating?auc_user_id={出品者ID}&role=seller&apg={ページ番号}`
   - ページネーション対応（全ページ取得）
3. 各商品詳細ページにアクセスして以下を取得:
   - 商品名
   - 落札価格
   - 落札日時
4. 商品名キーワードでフィルタリング
5. 結果を一覧表示

#### 出力
- 該当商品の落札価格一覧
  - 商品名
  - 落札価格
  - 落札日時
  - 商品詳細ページへのリンク
- 価格の統計情報（オプション）
  - 平均価格
  - 最高価格
  - 最低価格

### 2.2 非機能要件

#### パフォーマンス
- レート制限を設けてYahoo側にブロックされないよう配慮
- 推奨: 各リクエスト間に0.5〜1秒の待機時間

#### UX
- 取得中の進捗表示（何ページ中何ページ目を処理中か）
- 長時間かかる場合の中断機能（オプション）

#### エラーハンドリング
- ネットワークエラー時のリトライ
- 不正なURL形式入力時のエラー表示
- URLから出品者IDを抽出できない場合のエラー表示
- スクレイピング失敗時の適切なエラーメッセージ

---

## 3. 技術仕様

### 3.1 技術スタック

#### フロントエンド
- **フレームワーク**: Next.js 14+ (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **UI**: シンプル・おしゃれなデザイン

#### バックエンド
- **ランタイム**: Node.js
- **フレームワーク**: Next.js API Routes
- **スクレイピング**: Cheerio（軽量・高速）

#### その他
- **キャッシュ**: メモリキャッシュ or ローカルストレージ（オプション）

### 3.2 データ構造

#### 商品データ型
```typescript
type AuctionItem = {
  id: string;           // オークションID
  title: string;        // 商品名
  price: number;        // 落札価格（円）
  endTime: string;      // 落札日時（ISO 8601形式）
  url: string;          // 商品詳細ページURL
}
```

#### API レスポンス型
```typescript
type SearchResult = {
  items: AuctionItem[];
  totalCount: number;
  statistics?: {
    average: number;
    max: number;
    min: number;
  }
}
```

### 3.3 API設計

#### エンドポイント: `/api/search`

**メソッド**: POST

**リクエストボディ**:
```json
{
  "sellerUrl": "https://auctions.yahoo.co.jp/jp/show/rating?auc_user_id=fPueNTPCt5JWiDHfkDNtGkKaLAfd&role=seller",
  "keyword": "ビカクシダ"
}
```

**レスポンス**:
```json
{
  "items": [
    {
      "id": "d1207096955",
      "title": "P. FSQ' De La Rocha'【calm_plants】ビカクシダ デラロチャ 株分け品子株",
      "price": 11500,
      "endTime": "2025-11-15T20:58:49+09:00",
      "url": "https://auctions.yahoo.co.jp/jp/auction/d1207096955"
    }
  ],
  "totalCount": 1,
  "statistics": {
    "average": 11500,
    "max": 11500,
    "min": 11500
  }
}
```

---

## 4. スクレイピング詳細

### 4.1 評価ページからの商品URL取得

**対象URL**:
```
https://auctions.yahoo.co.jp/jp/show/rating?auc_user_id={出品者ID}&role=seller&apg={ページ番号}
```

**取得データ**:
- 商品詳細ページへのリンク（`/jp/auction/{商品ID}` 形式）
- 総ページ数（ページネーション情報）

**実装方針**:
1. 1ページ目にアクセスして総ページ数を取得
2. 全ページを順次取得して商品URLリストを構築
3. 重複排除

### 4.2 商品詳細ページからの情報取得

**対象URL**:
```
https://auctions.yahoo.co.jp/jp/auction/{商品ID}
```

**取得データ**:
- HTMLに埋め込まれたJSONデータをパース
- 必要なフィールド:
  - `title`: 商品名
  - `price`: 落札価格
  - `endTime`: 落札日時
  - `status`: "closed" であることを確認

---

## 5. UI/UX設計

### 5.1 画面構成

#### メイン画面
1. **入力エリア**
   - 出品者ページURL入力フィールド
     - プレースホルダー: `https://auctions.yahoo.co.jp/jp/show/rating?auc_user_id=...`
     - ヘルプテキスト: 「出品者の評価ページURLを貼り付けてください」
   - 商品名キーワード入力フィールド
   - 検索ボタン

2. **結果表示エリア**
   - 取得中: ローディング表示 + 進捗（例: "5/12ページ処理中..."）
   - 完了後:
     - 統計情報カード（平均価格、最高/最低価格）
     - 商品一覧テーブル
       - 列: 商品名、落札価格、落札日時、リンク

3. **エラー表示エリア**
   - エラーメッセージ表示

### 5.2 デザインコンセプト
- シンプル・ミニマル
- カード型レイアウト
- レスポンシブ対応
- カラースキーム:
  - プライマリ: Yahoo風の赤（#FF0033）
  - セカンダリ: ニュートラルグレー
  - アクセント: 価格情報は緑系

---

## 6. 注意事項・制約

### 6.1 法的・倫理的考慮
- ヤフオクの利用規約を確認し、スクレイピングが禁止されていないか確認
- 過度なアクセスによるサーバー負荷を避ける
- 個人利用の範囲での使用を推奨

### 6.2 技術的制約
- Yahoo側のHTML構造変更に対する脆弱性
- IPブロックのリスク → レート制限必須
- JavaScriptレンダリングが必要な場合はCheerioでは不十分（その場合Puppeteerに変更）

### 6.3 今後の拡張性
- 取得データのローカル保存機能
- 複数出品者の比較機能
- 価格推移グラフ表示
- お気に入り出品者登録機能

---

## 7. 開発フェーズ

### Phase 1: MVP開発
- 基本的なスクレイピング機能実装
- シンプルなUI（入力フォーム + 結果テーブル）
- エラーハンドリング

### Phase 2: UX改善
- 進捗表示
- 統計情報表示
- デザインブラッシュアップ

### Phase 3: 拡張機能（オプション）
- データキャッシュ
- 価格グラフ
- お気に入り機能

---

## 8. ディレクトリ構成（予定）

```
yahoo-auction-price-checker/
├── README.md
├── SPEC.md (本ファイル)
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
├── src/
│   ├── app/
│   │   ├── page.tsx          # メインページ
│   │   ├── layout.tsx
│   │   └── api/
│   │       └── search/
│   │           └── route.ts  # 検索APIエンドポイント
│   ├── lib/
│   │   ├── scraper.ts        # スクレイピングロジック
│   │   ├── parser.ts         # HTMLパース処理
│   │   └── utils.ts          # ユーティリティ関数
│   └── types/
│       └── auction.ts        # 型定義
└── public/
```

---

---

## 9. URL解析仕様

### 9.1 出品者ID抽出

**入力URL例**:
```
https://auctions.yahoo.co.jp/jp/show/rating?auc_user_id=fPueNTPCt5JWiDHfkDNtGkKaLAfd&role=seller
```

**抽出方法**:
- URLパラメータ `auc_user_id` の値を取得
- 正規表現: `auc_user_id=([^&]+)`

**バリデーション**:
- URLが `auctions.yahoo.co.jp` ドメインであることを確認
- `auc_user_id` パラメータが存在することを確認
- 抽出したIDが空文字列でないことを確認

---

**作成日**: 2025-12-20
**最終更新**: 2025-12-20
**バージョン**: 1.1
