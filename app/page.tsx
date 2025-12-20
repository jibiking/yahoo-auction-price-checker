'use client';

import { useState } from 'react';
import type { SearchResult, AuctionItem } from '@/types/auction';
import PriceChart from './components/PriceChart';
import ImageGallery from './components/ImageGallery';

export default function Home() {
  const [sellerUrl, setSellerUrl] = useState('');
  const [keyword, setKeyword] = useState('');
  const [limit, setLimit] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [statusMessage, setStatusMessage] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    setProgress({ current: 0, total: 0, percentage: 0 });
    setStatusMessage('');

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sellerUrl,
          keyword,
          limit,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'エラーが発生しました');
        setLoading(false);
        return;
      }

      // Server-Sent Eventsを受信
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('レスポンスの読み取りに失敗しました');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            switch (data.type) {
              case 'status':
                setStatusMessage(data.message);
                break;
              case 'total':
                setProgress({ current: 0, total: data.total, percentage: 0 });
                setStatusMessage(data.message);
                break;
              case 'progress':
                setProgress({
                  current: data.current,
                  total: data.total,
                  percentage: data.percentage,
                });
                break;
              case 'complete':
                setResult(data.data);
                setLoading(false);
                break;
              case 'error':
                setError(data.error);
                setLoading(false);
                break;
            }
          }
        }
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return dateString;
    }
  };


  return (
    <div className="min-h-screen p-4 md:p-8 pb-20">
      <main className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 animate-gradient">
            ヤフオク落札価格チェッカー
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            出品者の過去の落札価格を検索・分析
          </p>
        </div>

        {/* 検索フォーム */}
        <form onSubmit={handleSearch} className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-xl shadow-2xl border border-cyan-500/20 p-6 mb-8">
          <div className="mb-4">
            <label htmlFor="sellerUrl" className="block text-sm font-medium text-cyan-400 mb-2">
              出品者ページURL
            </label>
            <input
              type="text"
              id="sellerUrl"
              value={sellerUrl}
              onChange={(e) => setSellerUrl(e.target.value)}
              placeholder="https://auctions.yahoo.co.jp/jp/show/rating?auc_user_id=..."
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-100 placeholder-gray-500 transition-all autofill:bg-gray-900/50 autofill:text-gray-100"
              required
              autoComplete="off"
            />
            <p className="mt-2 text-xs text-gray-500">
              出品者の評価ページURLを貼り付けてください
            </p>
          </div>

          <div className="mb-4">
            <label htmlFor="keyword" className="block text-sm font-medium text-cyan-400 mb-2">
              商品名キーワード
            </label>
            <input
              type="text"
              id="keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="例: ビカクシダ"
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-100 placeholder-gray-500 transition-all autofill:bg-gray-900/50 autofill:text-gray-100"
              autoComplete="off"
            />
            <p className="mt-2 text-xs text-gray-500">
              空欄の場合は全ての商品を表示します
            </p>
          </div>

          <div className="mb-6">
            <label htmlFor="limit" className="block text-sm font-medium text-cyan-400 mb-2">
              取得件数制限
            </label>
            <select
              id="limit"
              value={limit === null ? 'all' : limit}
              onChange={(e) => setLimit(e.target.value === 'all' ? null : parseInt(e.target.value))}
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-100 transition-all"
            >
              <option value="all">全件取得</option>
              <option value="50">最新50件</option>
              <option value="100">最新100件</option>
              <option value="200">最新200件</option>
            </select>
            <p className="mt-2 text-xs text-gray-500">
              取得する商品数を制限できます（処理時間短縮）
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white py-3 px-6 rounded-lg font-semibold disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50"
          >
            {loading ? '検索中...' : '検索'}
          </button>
        </form>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-900/50 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-8 backdrop-blur-sm">
            <p className="font-semibold">エラー</p>
            <p>{error}</p>
          </div>
        )}

        {/* ローディング */}
        {loading && (
          <div className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 text-cyan-100 px-6 py-4 rounded-lg mb-8 backdrop-blur-sm">
            <div className="flex items-center mb-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-400 mr-3"></div>
              <p className="font-semibold">{statusMessage || 'データを取得中...'}</p>
            </div>
            <div className="space-y-2">
              {progress.total > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>進捗:</span>
                    <span className="font-mono font-semibold">
                      {progress.current} / {progress.total} 件 ({progress.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden border border-cyan-500/30">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 h-3 rounded-full transition-all duration-300 flex items-center justify-center shadow-lg shadow-cyan-500/50"
                      style={{
                        width: `${progress.percentage}%`,
                      }}
                    >
                      {progress.percentage > 10 && (
                        <span className="text-xs text-white font-semibold drop-shadow-lg">
                          {progress.percentage}%
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
              <p className="text-xs text-cyan-400 mt-2">
                ※ 商品データを並列で取得しています
              </p>
            </div>
          </div>
        )}

        {/* 検索結果 */}
        {result && (
          <div>
            {/* 統計情報 */}
            {result.statistics && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gradient-to-br from-green-900/40 to-green-800/40 backdrop-blur-sm rounded-lg shadow-xl border border-green-500/30 p-6 hover:border-green-400/50 transition-all">
                  <p className="text-sm text-green-300 mb-1">平均価格</p>
                  <p className="text-3xl font-bold text-green-400">
                    {formatPrice(result.statistics.average)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/40 backdrop-blur-sm rounded-lg shadow-xl border border-blue-500/30 p-6 hover:border-blue-400/50 transition-all">
                  <p className="text-sm text-blue-300 mb-1">最高価格</p>
                  <p className="text-3xl font-bold text-blue-400">
                    {formatPrice(result.statistics.max)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-orange-900/40 to-orange-800/40 backdrop-blur-sm rounded-lg shadow-xl border border-orange-500/30 p-6 hover:border-orange-400/50 transition-all">
                  <p className="text-sm text-orange-300 mb-1">最低価格</p>
                  <p className="text-3xl font-bold text-orange-400">
                    {formatPrice(result.statistics.min)}
                  </p>
                </div>
              </div>
            )}

            {/* 価格推移グラフ */}
            <PriceChart items={result.items} />

            {/* 検索結果ヘッダー */}
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                検索結果: {result.totalCount}件
              </h2>
            </div>

            {/* カードグリッド */}
            {result.items.length === 0 ? (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 px-6 py-12 text-center text-gray-400">
                該当する商品が見つかりませんでした
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {result.items.map((item, index) => (
                  <div
                    key={item.id}
                    className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-lg shadow-xl border border-gray-700 hover:border-cyan-500/50 transition-all duration-300 overflow-hidden group"
                  >
                    {/* 画像 */}
                    <ImageGallery
                      images={item.images}
                      title={item.title}
                    />

                    {/* カード内容 */}
                    <div className="p-4">
                      {/* 商品名 */}
                      <h3 className="text-sm font-medium text-gray-200 mb-2 line-clamp-2 group-hover:text-cyan-400 transition-colors">
                        {item.title}
                      </h3>

                      {/* 価格 */}
                      <div className="mb-2">
                        <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
                          {formatPrice(item.price)}
                        </p>
                      </div>

                      {/* 落札日時 */}
                      <div className="mb-3">
                        <p className="text-xs text-gray-500">落札日時</p>
                        <p className="text-sm text-gray-400">{formatDate(item.endTime)}</p>
                      </div>

                      {/* リンク */}
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                      >
                        詳細を見る
                        <svg
                          className="w-4 h-4 ml-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                          />
                        </svg>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
