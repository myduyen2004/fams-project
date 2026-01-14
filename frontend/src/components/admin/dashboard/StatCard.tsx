import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  value: string | number;
  label: string;
  variant?: 'orange' | 'green';
}

export const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  value,
  label,
  variant = 'orange'
}) => {
  const isOrange = variant === 'orange';
  
  return (
    <div className={`group relative rounded-2xl p-5 shadow-sm border transition-all duration-300 ${
      isOrange 
        ? 'bg-gradient-to-br from-orange-50/80 to-amber-50/80 dark:from-orange-900/5 dark:to-amber-900/5 border-orange-100/50 dark:border-orange-800/20'
        : 'bg-gradient-to-br from-green-50/80 to-emerald-50/80 dark:from-green-900/5 dark:to-emerald-900/5 border-green-100/50 dark:border-green-800/20'
    } hover:shadow-md hover:border-opacity-100`}>
      
      <div className="relative flex flex-col gap-3">
        {/* Label */}
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
          {label}
        </p>
        
        {/* Value and Icon Row */}
        <div className="flex items-center justify-between">
          <h3 className="text-4xl font-bold text-gray-800 dark:text-gray-200">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </h3>
          
          {/* Icon with soft background */}
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
            isOrange 
              ? 'bg-orange-100/60 dark:bg-orange-900/10' 
              : 'bg-green-100/60 dark:bg-green-900/10'
          }`}>
            <Icon size={28} className={`${
              isOrange 
                ? 'text-orange-400 dark:text-orange-500' 
                : 'text-green-400 dark:text-green-500'
            }`} />
          </div>
        </div>
      </div>
    </div>
  );
};
