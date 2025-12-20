'use client';

import { useState } from 'react';
import type { SearchResult, AuctionItem } from '@/types/auction';
import PriceChart from './components/PriceChart';

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
    <div className="min-h-screen p-8 pb-20">
      <main className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-900">
          ヤフオク落札価格チェッカー
        </h1>
        <p className="text-center text-gray-600 mb-8">
          出品者の過去の落札価格を検索
        </p>

        <form onSubmit={handleSearch} className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="mb-4">
            <label htmlFor="sellerUrl" className="block text-sm font-medium text-gray-700 mb-2">
              出品者ページURL
            </label>
            <input
              type="text"
              id="sellerUrl"
              value={sellerUrl}
              onChange={(e) => setSellerUrl(e.target.value)}
              placeholder="https://auctions.yahoo.co.jp/jp/show/rating?auc_user_id=..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yahoo-red focus:border-transparent"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              出品者の評価ページURLを貼り付けてください
            </p>
          </div>

          <div className="mb-4">
            <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 mb-2">
              商品名キーワード
            </label>
            <input
              type="text"
              id="keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="例: ビカクシダ"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yahoo-red focus:border-transparent"
            />
            <p className="mt-1 text-sm text-gray-500">
              空欄の場合は全ての商品を表示します
            </p>
          </div>

          <div className="mb-6">
            <label htmlFor="limit" className="block text-sm font-medium text-gray-700 mb-2">
              取得件数制限
            </label>
            <select
              id="limit"
              value={limit === null ? 'all' : limit}
              onChange={(e) => setLimit(e.target.value === 'all' ? null : parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yahoo-red focus:border-transparent"
            >
              <option value="all">全件取得</option>
              <option value="50">最新50件</option>
              <option value="100">最新100件</option>
              <option value="200">最新200件</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              取得する商品数を制限できます（処理時間短縮）
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yahoo-red text-white py-3 px-6 rounded-md font-semibold hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '検索中...' : '検索'}
          </button>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-8">
            <p className="font-semibold">エラー</p>
            <p>{error}</p>
          </div>
        )}

        {loading && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-6 py-4 rounded-md mb-8">
            <div className="flex items-center mb-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-800 mr-3"></div>
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
                  <div className="w-full bg-blue-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300 flex items-center justify-center"
                      style={{
                        width: `${progress.percentage}%`,
                      }}
                    >
                      {progress.percentage > 10 && (
                        <span className="text-xs text-white font-semibold">
                          {progress.percentage}%
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
              <p className="text-xs text-blue-700 mt-2">
                ※ 商品データを1件ずつ取得しています
              </p>
            </div>
          </div>
        )}

        {result && (
          <div>
            {result.statistics && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <p className="text-sm text-gray-600 mb-1">平均価格</p>
                  <p className="text-3xl font-bold text-green-600">
                    {formatPrice(result.statistics.average)}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <p className="text-sm text-gray-600 mb-1">最高価格</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {formatPrice(result.statistics.max)}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <p className="text-sm text-gray-600 mb-1">最低価格</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {formatPrice(result.statistics.min)}
                  </p>
                </div>
              </div>
            )}

            {/* 価格推移グラフ */}
            <PriceChart items={result.items} />

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  検索結果: {result.totalCount}件
                </h2>
              </div>

              {result.items.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  該当する商品が見つかりませんでした
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          商品名
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          落札価格
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          落札日時
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          リンク
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {result.items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{item.title}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-green-600">
                              {formatPrice(item.price)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {formatDate(item.endTime)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-yahoo-red hover:text-red-700 text-sm font-medium"
                            >
                              詳細 →
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
