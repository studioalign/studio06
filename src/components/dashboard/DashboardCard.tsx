import React from 'react';

interface CardItem {
  label: string;
  value: string;
}

interface DashboardCardProps {
  title: string;
  items: CardItem[];
  onClick?: () => void;
  actions?: React.ReactNode;
}

export default function DashboardCard({ title, items, onClick, actions }: DashboardCardProps) {
  return (
    <div 
      className={`bg-white rounded-lg shadow p-6 ${onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-brand-primary">{title}</h3>
        {actions && (
          <div onClick={e => e.stopPropagation()}>
            {actions}
          </div>
        )}
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex justify-between">
            <span className="text-sm text-brand-secondary-400">{item.label}</span>
            <span className="text-sm font-medium text-gray-900">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}