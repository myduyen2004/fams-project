import React, { useState, useEffect, useMemo } from 'react';
import { Bell, Check, Trash2, Clock, CheckCircle2, AlertCircle, Loader2, Settings, MoreVertical } from 'lucide-react';
import { userService } from '../../services/api/userService';
import { authService } from '../../services/api/authService';
import { dashboardService } from '../../services/api/dashboardService';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useNavigate } from 'react-router-dom';
import { AppNotification } from '../../types/dashboard';

interface ImportJobNotification {
  jobId: string;
  filename: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PENDING' | 'CANCELLED' | 'SAVING';
  percentage: number;
  successCount?: number;
  failedCount?: number;
  errorMessage?: string;
  createdAt: number; // timestamp
}

export const NotificationBell: React.FC = () => {
  const [jobs, setJobs] = useState<ImportJobNotification[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'notifications' | 'jobs'>('notifications');
  const navigate = useNavigate();

  // Strip HTML tags and return plain text
  const stripHtml = (html: string): string => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const username = authService.getUser()?.username || 'anonymous';

  // Listen for import job progress
  useWebSocket(`/topic/import-progress/${username}`, (data) => {
    updateJob(data);
  });

  // Listen for persistent system/import notifications
  useWebSocket(`/user/queue/notifications`, (data: AppNotification[]) => {
    console.log('[NotificationBell] Received WebSocket notifications:', data);
    setNotifications(prev => {
      // ONLY add truly new notifications that don't exist in current state
      // NEVER overwrite existing notifications to preserve their isRead status
      const existingIds = new Set(prev.map(n => n.id));
      const newNotifications = data.filter(n => !existingIds.has(n.id));
      
      if (newNotifications.length > 0) {
        console.log('[NotificationBell] Adding', newNotifications.length, 'new notifications');
        return [...newNotifications, ...prev];
      }
      
      console.log('[NotificationBell] No new notifications, keeping existing state');
      return prev;
    });
  });

  // Load notifications and jobs on mount
  useEffect(() => {
    loadNotifications();
    
    // 1. Fetch active job from backend on mount (covers refresh/new login)
    const fetchActiveJob = async () => {
      try {
        const activeJob = await userService.getActiveImportJob();
        if (activeJob) {
          addJob({
            jobId: activeJob.jobId,
            filename: activeJob.filename,
            status: activeJob.status as any,
            percentage: activeJob.percentage || 0,
            successCount: activeJob.successCount,
            failedCount: activeJob.failedCount,
            createdAt: new Date(activeJob.createdAt).getTime(),
          });
        }
      } catch (error) {
        console.error('Failed to fetch active job:', error);
      }
    };

    fetchActiveJob();
    
    // 2. Load existing jobs from local storage for history
    const storedJobs = JSON.parse(localStorage.getItem('importJobs') || '[]');
    if (storedJobs.length > 0) {
      storedJobs.forEach(async (job: any) => {
        // Only re-fetch if not already added by fetchActiveJob
        try {
          const status = await userService.getImportJobStatus(job.jobId);
          addJob({
            jobId: job.jobId,
            filename: job.filename,
            status: status.status as any,
            percentage: status.percentage || 0,
            successCount: status.successCount,
            failedCount: status.failedCount,
            createdAt: new Date(status.createdAt).getTime(),
          });
        } catch (error) {
          console.error('Failed to fetch job status:', error);
        }
      });
    }
  }, []);

  const loadNotifications = async () => {
    try {
      console.log('[NotificationBell] Loading notifications from API...');
      const data = await dashboardService.getNotifications();
      console.log('[NotificationBell] API returned', data.length, 'notifications:', data);
      setNotifications(data);
    } catch (error) {
      console.error('[NotificationBell] Error loading notifications:', error);
    }
  };

  const addJob = (job: ImportJobNotification) => {
    setJobs(prev => {
      if (prev.find(j => j.jobId === job.jobId)) return prev;
      const newJobs = [job, ...prev];
      // Save to localStorage for persistence
      localStorage.setItem('importJobs', JSON.stringify(newJobs.slice(0, 10)));
      return newJobs;
    });
  };

  const updateJob = (update: any) => {
    setJobs(prev => {
      const index = prev.findIndex(j => j.jobId === update.jobId);
      let updated;
      const jobWithTimestamp = {
        ...update,
        createdAt: update.createdAt ? new Date(update.createdAt).getTime() : 
                  (index !== -1 ? prev[index].createdAt : Date.now())
      };

      if (index === -1) {
        updated = [jobWithTimestamp, ...prev];
      } else {
        updated = [...prev];
        updated[index] = { ...updated[index], ...jobWithTimestamp };
      }

      // If finished, refresh notifications as a persistent one might have been created
      if (update.status === 'COMPLETED' || update.status === 'FAILED' || update.status === 'CANCELLED') {
         loadNotifications();
      }

      // Save to localStorage
      localStorage.setItem('importJobs', JSON.stringify(updated.slice(0, 10)));
      return updated;
    });
  };

  const handleNotificationClick = async (notification: AppNotification) => {
    // Try to mark as read, but don't block navigation if it fails
    if (!notification.isRead) {
      console.log('[NotificationBell] Marking notification as read:', notification.id);
      
      // Immediately update UI state for instant feedback
      setNotifications(prev => prev.map(n => 
        n.id === notification.id ? { ...n, isRead: true } : n
      ));
      
      // Try to sync with backend, but don't fail if it doesn't work
      try {
        await dashboardService.markNotificationAsRead(notification.id);
        console.log('[NotificationBell] Successfully marked notification as read:', notification.id);
      } catch (error) {
        console.warn('[NotificationBell] Failed to mark as read on backend, but continuing:', error);
        // Revert UI state if backend failed
        setNotifications(prev => prev.map(n => 
          n.id === notification.id ? { ...n, isRead: false } : n
        ));
      }
    }
    
    // Always navigate to notification detail page
    navigate(`/notifications/${notification.id}`);
    setShowDropdown(false);
  };

  const handleMarkAllAsRead = async () => {
    try {
      console.log('[NotificationBell] Marking all notifications as read');
      
      // Immediately update UI state for instant feedback
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      
      // Then sync with backend
      await dashboardService.markAllNotificationsAsRead();
      console.log('[NotificationBell] Successfully marked all as read');
    } catch (error) {
      console.error('[NotificationBell] Failed to mark all as read:', error);
      // Reload notifications on error to restore correct state
      loadNotifications();
    }
  };

  const removeJob = (jobId: string) => {
    setJobs(prev => {
      const updated = prev.filter(j => j.jobId !== jobId);
      localStorage.setItem('importJobs', JSON.stringify(updated.slice(0, 10)));
      return updated;
    });
  };

  const unreadCount = useMemo(() => {
    const count = notifications.filter(n => !n.isRead).length;
    console.log('[NotificationBell] Recalculating unreadCount:', count);
    return count;
  }, [notifications]);
  
  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => b.createdAt - a.createdAt);
  }, [jobs]);

  const processingJobsCount = useMemo(() => {
    return jobs.filter(j => j.status === 'PROCESSING' || j.status === 'SAVING' || j.status === 'PENDING').length;
  }, [jobs]);

  // Debug logging
  useEffect(() => {
    console.log('[NotificationBell] Notifications updated:', notifications.length, 'total,', unreadCount, 'unread');
    console.log('[NotificationBell] Notifications detail:', notifications.map(n => ({ id: n.id, isRead: n.isRead, title: n.title })));
  }, [notifications, unreadCount]);

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
      >
        <Bell size={20} />
        {(unreadCount + processingJobsCount) > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-white dark:border-zinc-900">
            {unreadCount + processingJobsCount > 9 ? '9+' : unreadCount + processingJobsCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-3 w-[400px] bg-white dark:bg-zinc-900 rounded-[24px] shadow-2xl border border-gray-100 dark:border-zinc-800 z-40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="p-5 flex justify-between items-center bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
            <h3 className="text-[20px] font-bold text-gray-900 dark:text-white">
              Thông báo
            </h3>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-gray-500"
                  title="Đánh dấu tất cả đã đọc"
                >
                  <Check size={18} />
                </button>
              )}
              <button
                onClick={() => {
                  navigate('/admin/notification-management');
                  setShowDropdown(false);
                }}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-gray-500"
                title="Quản lý thông báo"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>

          {/* Tabs - Minimal Style */}
          <div className="flex px-5 mb-2 border-b border-gray-50 dark:border-zinc-800/50">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`pb-3 text-sm font-semibold transition-all relative mr-6 ${
                activeTab === 'notifications' 
                ? 'text-fpt-orange' 
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              Thông báo
              {unreadCount > 0 && (
                <span className="ml-1 text-xs opacity-60">({unreadCount})</span>
              )}
              {activeTab === 'notifications' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-fpt-orange rounded-full"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={`pb-3 text-sm font-semibold transition-all relative ${
                activeTab === 'jobs' 
                ? 'text-fpt-orange' 
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              Tiến trình
              {processingJobsCount > 0 && (
                <span className="ml-1 text-xs opacity-60">({processingJobsCount})</span>
              )}
              {activeTab === 'jobs' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-fpt-orange rounded-full"></div>
              )}
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[480px] overflow-y-auto notification-content">
            {activeTab === 'notifications' ? (
              notifications.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-gray-400">
                  <div className="w-16 h-16 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                    <Bell size={32} className="opacity-20" />
                  </div>
                  <p className="text-sm font-medium">Không có thông báo mới</p>
                </div>
              ) : (
                notifications.slice(0, 5).map(n => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-4 flex gap-4 cursor-pointer transition-all relative group hover:bg-gray-50 dark:hover:bg-zinc-800/50 ${
                      !n.isRead ? 'bg-blue-50/20 dark:bg-blue-900/10' : ''
                    }`}
                  >
                    {/* Avatar/Icon Circle */}
          <div className="relative flex-shrink-0">
            {n.senderName && n.senderName !== 'System' ? (
              n.senderAvatar ? (
                <img 
                  src={n.senderAvatar} 
                  alt={n.senderName} 
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                  n.type === 'ALERT' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' :
                  'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
                }`}>
                   {n.senderName.charAt(0)}
                </div>
              )
            ) : (
              <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-800 border-2 border-fpt-orange flex items-center justify-center p-2 overflow-hidden">
                <img 
                  src="/fams-logo.png" 
                  alt="FAMS" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<span class="text-fpt-orange font-bold text-xl">F</span>';
                    }
                  }}
                />
              </div>
            )}
            {!n.isRead && (
              <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white dark:border-zinc-900"></div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <div className="flex-1 pr-2">
                {/* Tiêu đề thông báo - in đậm */}
                <p className="text-sm font-bold text-gray-900 dark:text-white mb-1 truncate">
                  {n.title}
                </p>
                {/* Nội dung thông báo - bình thường */}
                <p className={`text-xs line-clamp-2 ${!n.isRead ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
                  {stripHtml(n.description)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500">
                     {n.senderName && n.senderName !== 'System' ? 'Cá nhân' : (n.type === 'SYSTEM' ? 'Hệ thống' : n.type === 'ALERT' ? 'Cảnh báo' : 'Dữ liệu')}
                  </span>
                            <span className="text-[11px] text-gray-400">•</span>
                            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">{n.timestamp}</span>
                          </div>
                        </div>
                        <button className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                           <MoreVertical size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )
            ) : (
              jobs.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-gray-400">
                  <div className="w-16 h-16 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                    <Clock size={32} className="opacity-20" />
                  </div>
                  <p className="text-sm font-medium">Không có tiến trình nào gần đây</p>
                </div>
              ) : (
                sortedJobs.map(job => (
                  <div key={job.jobId} className="p-4 flex gap-4 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors group">
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        job.status === 'COMPLETED' ? 'bg-orange-100 dark:bg-orange-900/20 text-fpt-orange' :
                        job.status === 'FAILED' || job.status === 'CANCELLED' ? 'bg-red-100 text-red-600' :
                        'bg-orange-100 text-fpt-orange'
                      }`}>
                        {job.status === 'COMPLETED' ? <CheckCircle2 size={24} /> : 
                         job.status === 'FAILED' || job.status === 'CANCELLED' ? <AlertCircle size={24} /> : <Loader2 size={24} className="animate-spin" />}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium truncate">
                            {job.filename} • {new Date(job.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                          </p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">Import danh sách người dùng</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {(job.status === 'COMPLETED' || job.status === 'FAILED') && (
                            <button 
                              onClick={() => removeJob(job.jobId)}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold ${
                            job.status === 'COMPLETED' ? 'text-fpt-orange' :
                            job.status === 'FAILED' || job.status === 'CANCELLED' ? 'text-red-600' : 'text-fpt-orange'
                          }`}>
                            {job.status === 'COMPLETED' ? '✓ Hoàn tất' : 
                             job.status === 'FAILED' ? '✗ Thất bại' : 
                             job.status === 'CANCELLED' ? '✗ Đã dừng' : `${job.percentage}%`}
                          </span>
                          {job.status === 'COMPLETED' && (job.failedCount ?? 0) > 0 && (
                            <span className="text-[9px] font-medium text-red-600 dark:text-red-400">
                              {job.failedCount} lỗi
                            </span>
                          )}
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-1 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              job.status === 'COMPLETED' ? 'bg-fpt-orange' :
                              job.status === 'FAILED' || job.status === 'CANCELLED' ? 'bg-red-500' : 'bg-fpt-orange'
                            }`} 
                            style={{ width: `${job.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
          
          <div className="p-4 flex justify-center bg-white dark:bg-zinc-900">
             <button 
               onClick={() => setShowDropdown(false)}
               className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
             >
               Ẩn bảng thông báo
             </button>
          </div>
        </div>
      )}
    </div>
  );
};
