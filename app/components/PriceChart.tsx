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
  TooltipProps,
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
  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-md shadow-lg">
          <p className="text-sm font-semibold text-gray-900">{data.fullDate}</p>
          <p className="text-lg font-bold text-green-600">
            ¥{data.price.toLocaleString()}
          </p>
          <p className="text-xs text-gray-600 mt-1 max-w-xs truncate">
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
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">価格推移グラフ</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `¥${value.toLocaleString()}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="price"
            name="落札価格"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-500 mt-2 text-center">
        ※ 横軸: 落札日、縦軸: 落札価格
      </p>
    </div>
  );
}
