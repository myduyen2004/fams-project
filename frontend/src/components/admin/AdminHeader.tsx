import React, { useState, useEffect } from 'react';
import { Bell, Moon, Sun } from 'lucide-react';

interface AdminHeaderProps {
  title: string;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ title }) => {
  const [isDark, setIsDark] = useState(false);
  const [notificationCount, _setNotificationCount] = useState(3);
  const [user, setUser] = useState<{ email: string; fullName: string; avatar?: string } | null>(null);

  useEffect(() => {
    // Load user from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }

    // Check if dark mode is enabled
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="h-16 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between px-6">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          {title}
        </h1>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Notification Bell */}
        <button className="relative p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
          <Bell size={20} />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {notificationCount}
            </span>
          )}
        </button>

        {/* User Info */}
        <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-zinc-800">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fpt-orange to-orange-600 flex items-center justify-center overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.fullName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-semibold text-sm">
                {user?.fullName?.charAt(0).toUpperCase() || 'A'}
              </span>
            )}
          </div>

          {/* User Text */}
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {user?.fullName || 'Admin'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {user?.email || 'admin@fpt.edu.vn'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
