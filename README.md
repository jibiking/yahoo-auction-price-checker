# ヤフオク落札価格チェッカー 🔍💰

出品者の過去の落札価格を瞬時に検索・分析できるWebアプリケーション

![Next.js](https://img.shields.io/badge/Next.js-15.5.9-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css)

## ✨ 特徴

- **🎯 かんたん検索**: 出品者URLとキーワードを入力するだけで過去の落札データを取得
- **📊 視覚的な分析**: 価格推移グラフで落札価格の傾向を一目で把握
- **🖼️ 画像ギャラリー**: 商品画像を複数枚表示、クリックでフルサイズ閲覧
- **💫 スタイリッシュなUI**: ダークモードベースのモダンなデザイン
- **📈 統計情報**: 平均価格・最高価格・最低価格を自動計算
- **⚡ リアルタイム進捗**: 取得状況をプログレスバーで表示

## 🚀 使い方

1. **出品者ページURLを入力**
   ```
   https://auctions.yahoo.co.jp/jp/show/rating?auc_user_id=xxxxx
   ```

2. **商品名キーワードを入力**（オプション）
   - 例: `ビカクシダ`, `iPhone`, `ポケモンカード`
   - 空欄の場合は全商品を表示

3. **取得件数を選択**
   - 全件取得 / 最新50件 / 最新100件 / 最新200件

4. **検索ボタンをクリック！**

## 🛠️ セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/yahoo-auction-price-checker.git
cd yahoo-auction-price-checker

# 依存パッケージをインストール
npm install

# 開発サーバーを起動
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開く

## 📦 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **グラフ**: Recharts
- **スクレイピング**: Cheerio

## 🎨 デザイン

- **カラースキーム**: ダークモード with シアン/ブルーのアクセント
- **グラデーション**: 美しいグラデーション背景とテキスト
- **グラスモーフィズム**: 透明感のあるバックドロップブラー効果
- **レスポンシブ**: モバイル・タブレット・デスクトップ対応

## 📝 ライセンス

MIT

## ⚠️ 注意事項

このアプリケーションはヤフオクの公開情報を取得します。利用規約を遵守し、過度なアクセスは控えてください。

---

Made with ❤️ for auction data analysis
