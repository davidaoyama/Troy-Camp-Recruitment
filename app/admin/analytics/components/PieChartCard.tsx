"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
];

interface PieChartCardProps {
  title: string;
  data: { name: string; count: number }[];
  emptyMessage?: string;
}

const PieChartCard = ({
  title,
  data,
  emptyMessage = "No data available",
}: PieChartCardProps) => {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-gray-500 mb-4">{title}</h3>
      {data.length === 0 || total === 0 ? (
        <p className="text-gray-400 text-center py-8">{emptyMessage}</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
              innerRadius={50}
              paddingAngle={2}
              label={(props: PieLabelRenderProps) =>
                `${props.name ?? ""} (${(((props.percent as number) ?? 0) * 100).toFixed(0)}%)`
              }
              labelLine={{ strokeWidth: 1 }}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [value, "Count"]}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                fontSize: "13px",
              }}
            />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "12px" }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default PieChartCard;
