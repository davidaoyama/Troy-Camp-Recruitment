"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
];

interface BarChartCardProps {
  title: string;
  data: { name: string; count: number }[];
  emptyMessage?: string;
  color?: string;
  colorful?: boolean;
}

const BarChartCard = ({
  title,
  data,
  emptyMessage = "No data available",
  color = "#3b82f6",
  colorful = false,
}: BarChartCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-gray-500 mb-4">{title}</h3>
      {data.length === 0 ? (
        <p className="text-gray-400 text-center py-8">{emptyMessage}</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={data}
            margin={{ top: 4, right: 4, left: -8, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "#6b7280" }}
              interval={0}
              angle={data.length > 5 ? -30 : 0}
              textAnchor={data.length > 5 ? "end" : "middle"}
              height={data.length > 5 ? 60 : 30}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#6b7280" }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                fontSize: "13px",
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={colorful ? COLORS[i % COLORS.length] : color}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default BarChartCard;
