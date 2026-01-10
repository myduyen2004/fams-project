import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { userService } from '../../services/api/userService';
import { useWebSocket } from '../../hooks/useWebSocket';
// import { authService } from '../../services/api/authService';

interface ImportJobNotification {
  jobId: string;
  filename: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  percentage: number;
  successCount?: number;
  failedCount?: number;
  errorMessage?: string;
  completedAt?: string;
}

export const NotificationBell: React.FC = () => {
  const [jobs, setJobs] = useState<ImportJobNotification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // const currentUser = authService.getUser();
  // const username = currentUser?.username || 'anonymous';

  // Listen for import job updates via WebSocket
  useWebSocket(`/user/queue/import-job`, (data) => {
    console.log('Received job update:', data);
    updateJob(data);
  });

  // Listen for new job creation from ImportUserModal
  useEffect(() => {
    const handleNewJob = (event: any) => {
      const { jobId, filename } = event.detail;
      addJob({ jobId, filename, status: 'PROCESSING', percentage: 0 });
    };

    window.addEventListener('new-import-job', handleNewJob);
    return () => window.removeEventListener('new-import-job', handleNewJob);
  }, []);

  // Load jobs from localStorage on mount
  useEffect(() => {
    const storedJobs = JSON.parse(localStorage.getItem('importJobs') || '[]');
    if (storedJobs.length > 0) {
      // Fetch status for each job
      storedJobs.forEach(async (job: any) => {
        try {
          const status = await userService.getImportJobStatus(job.jobId);
          addJob({
            jobId: job.jobId,
            filename: job.filename,
            status: status.status as any,
            percentage: status.percentage || 0,
            successCount: status.successCount,
            failedCount: status.failedCount,
            errorMessage: status.errorMessage,
            completedAt: status.completedAt
          });
        } catch (error) {
          console.error('Failed to fetch job status:', error);
        }
      });
    }
  }, []);

  const addJob = (job: ImportJobNotification) => {
    setJobs(prev => {
      const existing = prev.find(j => j.jobId === job.jobId);
      if (existing) return prev;
      setUnreadCount(c => c + 1);
      return [job, ...prev];
    });
  };

  const updateJob = async (update: any) => {
    setJobs(prev => {
      const index = prev.findIndex(j => j.jobId === update.jobId);
      if (index === -1) {
        // New job
        setUnreadCount(c => c + 1);
        return [{
          jobId: update.jobId,
          filename: update.filename || 'Unknown',
          status: update.status,
          percentage: update.percentage || 0,
          successCount: update.successCount,
          failedCount: update.failedCount,
          errorMessage: update.errorMessage,
          completedAt: update.completedAt
        }, ...prev];
      }

      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        status: update.status,
        percentage: update.percentage || updated[index].percentage,
        successCount: update.successCount,
        failedCount: update.failedCount,
        errorMessage: update.errorMessage,
        completedAt: update.completedAt
      };

      // Show toast on completion
      if (update.status === 'COMPLETED' && prev[index].status !== 'COMPLETED') {
        import('react-hot-toast').then(toast => {
          toast.default.success(`✅ Import hoàn tất! ${updated[index].successCount || 0} users thành công`);
        });
      } else if (update.status === 'FAILED' && prev[index].status !== 'FAILED') {
        import('react-hot-toast').then(toast => {
          toast.default.error(`❌ Import thất bại: ${update.errorMessage || 'Unknown error'}`);
        });
      }

      return updated;
    });
  };

  const markAllRead = () => {
    setUnreadCount(0);
  };

  const clearCompleted = () => {
    setJobs(prev => prev.filter(j => j.status === 'PROCESSING'));
    localStorage.setItem('importJobs', JSON.stringify(
      jobs.filter(j => j.status === 'PROCESSING').map(j => ({ jobId: j.jobId, filename: j.filename }))
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600';
      case 'FAILED': return 'text-red-600';
      default: return 'text-blue-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '✅';
      case 'FAILED': return '❌';
      default: return '⏳';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setShowDropdown(!showDropdown);
          if (!showDropdown) markAllRead();
        }}
        className="relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-gray-200 dark:border-zinc-700 z-50">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-zinc-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Import Jobs</h3>
            {jobs.length > 0 && (
              <button
                onClick={clearCompleted}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Clear completed
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {jobs.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Bell size={48} className="mx-auto mb-2 opacity-50" />
                <p>No import jobs</p>
              </div>
            ) : (
              jobs.map(job => (
                <div
                  key={job.jobId}
                  className="p-4 border-b border-gray-100 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getStatusIcon(job.status)}</span>
                        <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
                          {job.filename}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 ${getStatusColor(job.status)}`}>
                        {job.status === 'PROCESSING' && `Processing... ${job.percentage}%`}
                        {job.status === 'COMPLETED' && `✓ ${job.successCount || 0} users imported`}
                        {job.status === 'FAILED' && `Failed: ${job.errorMessage || 'Unknown error'}`}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 ml-2">
                      {job.jobId.substring(0, 8)}
                    </span>
                  </div>

                  {job.status === 'PROCESSING' && (
                    <div className="w-full bg-gray-200 dark:bg-zinc-600 rounded-full h-1.5 mt-2">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${job.percentage}%` }}
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
