import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  value: string | number;
  label: string;
  variant?: 'orange' | 'green' | 'blue' | 'purple' | 'red';
}

export const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  value,
  label,
  variant = 'orange'
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'green':
        return {
          bg: 'from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/5 dark:to-teal-900/10',
          border: 'border-emerald-100/50 dark:border-emerald-800/10',
          iconBg: 'bg-emerald-100/40 dark:bg-emerald-900/20',
          iconColor: 'text-emerald-500',
          accent: 'bg-emerald-500'
        };
      case 'blue':
        return {
          bg: 'from-blue-50/50 to-indigo-50/50 dark:from-blue-900/5 dark:to-indigo-900/10',
          border: 'border-blue-100/50 dark:border-blue-800/10',
          iconBg: 'bg-blue-100/40 dark:bg-blue-900/20',
          iconColor: 'text-blue-500',
          accent: 'bg-blue-500'
        };
      case 'purple':
        return {
          bg: 'from-purple-50/50 to-fuchsia-50/50 dark:from-purple-900/5 dark:to-fuchsia-900/10',
          border: 'border-purple-100/50 dark:border-purple-800/10',
          iconBg: 'bg-purple-100/40 dark:bg-purple-900/20',
          iconColor: 'text-purple-500',
          accent: 'bg-purple-500'
        };
      case 'red':
        return {
          bg: 'from-red-50/50 to-rose-50/50 dark:from-red-900/5 dark:to-rose-900/10',
          border: 'border-red-100/50 dark:border-red-800/10',
          iconBg: 'bg-red-100/40 dark:bg-red-900/20',
          iconColor: 'text-red-500',
          accent: 'bg-red-500'
        };
      default: // orange
        return {
          bg: 'from-orange-50/50 to-amber-50/50 dark:from-orange-900/5 dark:to-amber-900/10',
          border: 'border-orange-100/50 dark:border-orange-800/10',
          iconBg: 'bg-orange-100/40 dark:bg-orange-900/20',
          iconColor: 'text-orange-500',
          accent: 'bg-orange-500'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={`group relative rounded-[28px] p-6 shadow-sm border transition-all duration-500 ease-out overflow-hidden ${`bg-gradient-to-br ${styles.bg} ${styles.border}`
      } hover:shadow-xl hover:-translate-y-1 hover:border-opacity-100`}>

      {/* Decorative background element */}
      <div className={`absolute -right-6 -bottom-6 w-32 h-32 rounded-full blur-3xl opacity-20 transition-all duration-500 group-hover:scale-150 ${styles.accent}`}></div>

      <div className="relative z-10 flex flex-col gap-4">
        {/* Top half: Icon and Accent */}
        <div className="flex justify-between items-start">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:rotate-6 ${styles.iconBg}`}>
            <Icon size={28} className={`${styles.iconColor} transition-colors duration-300`} />
          </div>
          {/* <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20 backdrop-blur-sm border border-white/50 dark:border-white/5 shadow-sm">
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${styles.accent}`}></div>
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Live</span>
            </div>
          </div> */}
        </div>

        {/* Bottom half: Value and Label */}
        <div className="mt-2 text-center sm:text-left">
          <p className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.15em] mb-1">
            {label}
          </p>
          <h3 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tighter tabular-nums mb-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </h3>
        </div>
      </div>
    </div>
  );
};


