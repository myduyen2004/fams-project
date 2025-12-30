import React from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '../../../types/dashboard';
import { AlertTriangle, Info, XCircle } from 'lucide-react';

interface AlertsSectionProps {
  alerts: Alert[];
  isDashboard?: boolean;
}

export const AlertsSection: React.FC<AlertsSectionProps> = ({ alerts, isDashboard = false }) => {
  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <XCircle size={16} className="text-red-500" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-yellow-500" />;
      default:
        return <Info size={16} className="text-blue-500" />;
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 h-full">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Cảnh báo
        </h3>
        <Link to="/admin/alerts" className="text-sm text-fpt-orange hover:text-orange-600 font-medium">
          Xem tất cả →
        </Link>
      </div>

      <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
        {alerts.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8">
            Không có cảnh báo nào
          </p>
        ) : (
          (isDashboard ? alerts.slice(0, 6) : alerts).map((alert) => (
            <div
              key={alert.id}
              className="p-4 rounded-lg border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getAlertIcon(alert.level)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {alert.title}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {alert.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    {alert.timestamp}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
