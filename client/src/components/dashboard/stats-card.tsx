import React from "react";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: string;
  color: "blue" | "green" | "purple" | "yellow";
}

export function StatsCard({ title, value, icon, color }: StatsCardProps) {
  const getColorClasses = () => {
    switch (color) {
      case "blue": return "bg-blue-500";
      case "green": return "bg-green-500";
      case "purple": return "bg-purple-500";
      case "yellow": return "bg-yellow-500";
      default: return "bg-blue-500";
    }
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center">
          <div className={`flex-shrink-0 rounded-md p-3 ${getColorClasses()}`}>
            <i className={`${icon} text-white text-xl`}></i>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd>
                <div className="text-lg font-medium text-gray-900">{value}</div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
