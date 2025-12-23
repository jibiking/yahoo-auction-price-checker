'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { AuctionItem } from '@/types/auction';

type PriceChartProps = {
  items: AuctionItem[];
};

export default function PriceChart({ items }: PriceChartProps) {
  // データを日付順にソート（古い順）
  const sortedItems = [...items].sort((a, b) => {
    return new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
  });

  // グラフ用のデータに変換
  const chartData = sortedItems.map((item) => {
    const endDate = new Date(item.endTime);

    return {
      date: endDate.toLocaleDateString('ja-JP', {
        month: '2-digit',
        day: '2-digit',
      }),
      fullDate: endDate.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
      price: item.price,
      title: item.title,
    };
  });

  // カスタムツールチップ
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900/95 backdrop-blur-sm p-3 border border-cyan-500/50 rounded-md shadow-2xl shadow-cyan-500/20">
          <p className="text-sm font-semibold text-cyan-400">{data.fullDate}</p>
          <p className="text-lg font-bold text-cyan-300">
            ¥{data.price.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs truncate">
            {data.title}
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-lg shadow-xl border border-cyan-500/20 p-6 mb-8">
      <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-4">
        価格推移グラフ
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="date"
            stroke="#9ca3af"
            style={{ fontSize: '12px', fill: '#9ca3af' }}
          />
          <YAxis
            stroke="#9ca3af"
            style={{ fontSize: '12px', fill: '#9ca3af' }}
            tickFormatter={(value) => `¥${value.toLocaleString()}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: '#e5e7eb' }} />
          <Line
            type="monotone"
            dataKey="price"
            name="落札価格"
            stroke="#06b6d4"
            strokeWidth={3}
            dot={{ fill: '#06b6d4', r: 5, strokeWidth: 2, stroke: '#0e7490' }}
            activeDot={{ r: 7, fill: '#22d3ee', stroke: '#06b6d4', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-500 mt-2 text-center">
        ※ 横軸: 落札日、縦軸: 落札価格
      </p>
    </div>
  );
}
