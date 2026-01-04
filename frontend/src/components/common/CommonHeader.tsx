import React, { useState, useEffect, useRef } from 'react';
import { Bell, Moon, Sun, User, Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/api/authService';

interface CommonHeaderProps {
  title: string;
  showNotifications?: boolean;
  showThemeToggle?: boolean;
}

export const CommonHeader: React.FC<CommonHeaderProps> = ({ 
  title,
  showNotifications = true,
  showThemeToggle = true
}) => {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);
  const [notificationCount, _setNotificationCount] = useState(3);
  const [user, setUser] = useState<{ email: string; fullName: string; avatar?: string; role?: string } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
    navigate('/login');
  };

  // Get profile route based on role
  const getProfileRoute = () => {
    if (user?.role === 'ADMIN') return '/admin/profile';
    if (user?.role === 'ACADEMIC_STAFF') return '/academic-staff/profile';
    if (user?.role === 'LECTURER') return '/lecturer/profile';
    if (user?.role === 'STUDENT') return '/student/profile';
    return '/profile';
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
        {showThemeToggle && (
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        )}

        {/* Notification Bell */}
        {showNotifications && (
          <button className="relative p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
            <Bell size={20} />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {notificationCount}
              </span>
            )}
          </button>
        )}

        {/* User Info with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition-colors py-1 px-2"
          >
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
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {user?.fullName || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user?.email || 'user@fpt.edu.vn'}
              </p>
            </div>
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-gray-200 dark:border-zinc-700 py-2 z-50">
              <button
                onClick={() => {
                  navigate(getProfileRoute());
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
              >
                <User size={18} />
                <span>Xem hồ sơ</span>
              </button>

              <button
                onClick={() => {
                  navigate('/settings');
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
              >
                <Settings size={18} />
                <span>Cài đặt</span>
              </button>

              <hr className="my-2 border-gray-200 dark:border-zinc-700" />

              <button
                onClick={() => {
                  handleLogout();
                  setShowDropdown(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut size={18} />
                <span>Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
