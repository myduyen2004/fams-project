import React from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../../../types/dashboard';
import { AlertCircle, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';

interface AlertsSectionProps {
  alerts: Alert[];
  isDashboard?: boolean;
}

export const AlertsSection: React.FC<AlertsSectionProps> = ({ alerts, isDashboard = false }) => {
  const getAlertStyle = (level: string) => {
    switch (level) {
      case 'error':
        return {
          icon: <XCircle size={18} className="text-red-500" />,
          bg: 'bg-red-50/50 dark:bg-red-900/10',
          border: 'border-red-100 dark:border-red-900/20'
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={18} className="text-amber-500" />,
          bg: 'bg-amber-50/50 dark:bg-amber-900/10',
          border: 'border-amber-100 dark:border-amber-900/20'
        };
      default:
        return {
          icon: <AlertCircle size={18} className="text-blue-500" />,
          bg: 'bg-blue-50/50 dark:bg-blue-900/10',
          border: 'border-blue-100 dark:border-blue-900/20'
        };
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-[24px] shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col h-full overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-50 dark:border-zinc-800 flex items-center justify-between bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-10">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
          Cảnh báo
        </h3>
        <Link to="/admin/alerts" className="group flex items-center gap-1.5 text-xs font-bold text-fpt-orange hover:text-orange-600 transition-colors uppercase tracking-wider">
          Xem tất cả
          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="flex-1 p-5 space-y-4 overflow-y-auto custom-scrollbar">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-zinc-800 flex items-center justify-center mb-4">
              <AlertCircle size={32} className="text-gray-300 dark:text-zinc-700" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-zinc-500">
              Không có cảnh báo nào
            </p>
          </div>
        ) : (
          (isDashboard ? alerts.slice(0, 6) : alerts).map((alert) => {
            const style = getAlertStyle(alert.level);
            return (
              <div
                key={alert.id}
                className={`group p-4 rounded-2xl border ${style.border} ${style.bg} hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-0.5">
                    {style.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                       <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                        {alert.title}
                      </p>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                      {alert.description}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest tabular-nums">
                        {alert.timestamp}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

