"use client";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
}

const StatCard = ({ label, value, subtitle }: StatCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
      {subtitle && (
        <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
      )}
    </div>
  );
};

export default StatCard;
