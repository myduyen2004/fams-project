import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Settings,
  Newspaper,
  Bell,
  AlertTriangle,
  Clock,
  LogOut,
  ChevronDown,
  Cog
} from 'lucide-react';
import { authService } from '../../services/api/authService';
import { ConfirmModal } from '../common/ConfirmModal';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  submenu?: SubMenuItem[];
}

interface SubMenuItem {
  id: string;
  label: string;
  path: string;
}

export const AdminSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <Home size={20} />,
      path: '/admin/dashboard'
    },
    {
      id: 'manage',
      label: 'Quản lý',
      icon: <Settings size={20} />,
      submenu: [
        { id: 'users', label: 'Tài khoản chưa kích hoạt', path: '/admin/users' },
        { id: 'activated-users', label: 'Tài khoản đã kích hoạt', path: '/admin/activated-users' },
        { id: 'permissions', label: 'Phân quyền & vai trò', path: '/admin/permissions' },
        { id: 'ai-tools', label: 'Quản lý AI Toolset', path: '/admin/ai-tools' }
      ]
    },
    {
      id: 'notifications-settings',
      label: 'Quản lý tin tức',
      icon: <Newspaper size={20} />,
      path: '/admin/news-management'
    },
    {
      id: 'notification-management',
      label: 'Quản lý thông báo',
      icon: <Bell size={20} />,
      path: '/admin/notification-management'
    },
    {
      id: 'alerts',
      label: 'Cảnh báo',
      icon: <AlertTriangle size={20} />,
      path: '/admin/alerts'
    },
    {
      id: 'system-logs',
      label: 'Nhật ký hệ thống',
      icon: <Clock size={20} />,
      path: '/admin/system-logs'
    }
  ];

  const handleMenuClick = (item: MenuItem) => {
    if (item.submenu) {
      setOpenSubmenu(openSubmenu === item.id ? null : item.id);
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const handleSubmenuClick = (path: string) => {
    navigate(path);
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
    navigate('/login');
  };

  const isActive = (path?: string) => {
    if (!path) return false;

    // Special case for news management to be active on sub-routes
    if (path === '/admin/news-management' && location.pathname.startsWith('/admin/news/')) {
      return true;
    }

    if (path === '/admin/notification-management' && location.pathname.startsWith('/admin/notification-management')) {
      return true;
    }

    // Highlighting 'Activated Accounts' when on 'Locked Accounts' page
    if (path === '/admin/activated-users' && location.pathname === '/admin/locked-users') {
      return true;
    }

    if (path === '/admin/ai-tools' && location.pathname.startsWith('/admin/ai-tools')) {
      return true;
    }

    return location.pathname === path;
  };

  // Check if any submenu item is active
  const isSubmenuActive = (submenu?: SubMenuItem[]) => {
    if (!submenu) return false;
    // Use isActive to check sub-items so that custom logic (like locked-users) bubbles up to parent
    return submenu.some(subItem => isActive(subItem.path));
  };

  // Auto-expand submenu if current route matches a submenu item
  useEffect(() => {
    const activeMenuItem = menuItems.find(item =>
      item.submenu && isSubmenuActive(item.submenu)
    );
    if (activeMenuItem) {
      setOpenSubmenu(activeMenuItem.id);
    }
  }, [location.pathname]);

  return (
    <div
      className={`fixed left-0 top-0 h-screen bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 transition-all duration-300 z-50 ${isExpanded ? 'w-64' : 'w-16'
        }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => {
        setIsExpanded(false);
        setOpenSubmenu(null);
      }}
    >
      <div className="flex flex-col h-full">
        {/* Logo Section */}
        <div
          onClick={() => navigate('/admin/dashboard')}
          className="h-16 flex items-center justify-center border-b border-gray-200 dark:border-zinc-800 px-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
          title="Về trang chủ"
        >
          {isExpanded ? (
            <img
              src="/assets/images/fams-logo.png"
              alt="FAMS"
              className="h-10 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<div class="text-fpt-orange font-bold text-xl">FAMS</div>';
              }}
            />
          ) : (
            <img
              src="/assets/images/fams-logo.png"
              alt="FAMS"
              className="h-8 w-8 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<div class="w-8 h-8 bg-fpt-orange rounded-lg flex items-center justify-center"><span class="text-white font-bold text-sm">F</span></div>';
              }}
            />
          )}
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {menuItems.map((item) => (
            <div key={item.id} className="mb-1">
              <button
                onClick={() => handleMenuClick(item)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group ${isActive(item.path) || isSubmenuActive(item.submenu)
                  ? 'bg-fpt-orange text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-fpt-orange hover:text-white'
                  }`}
                title={!isExpanded ? item.label : ''}
              >
                <div className={`flex-shrink-0 transition-colors duration-200 ${isActive(item.path) || isSubmenuActive(item.submenu) ? 'text-white font-bold' : 'text-fpt-orange group-hover:text-white'}`}>
                  {item.icon}
                </div>
                {isExpanded && (
                  <>
                    <span className={`flex-1 text-left text-sm whitespace-nowrap transition-colors duration-200 ${isActive(item.path) || isSubmenuActive(item.submenu) ? 'text-white font-bold' : 'text-fpt-orange font-medium group-hover:text-white'}`}>
                      {item.label}
                    </span>
                    {item.submenu && (
                      <ChevronDown
                        size={16}
                        className={`transition-transform duration-200 ${openSubmenu === item.id ? 'rotate-180' : ''
                          }`}
                      />
                    )}
                  </>
                )}
              </button>

              {/* Submenu */}
              {isExpanded && item.submenu && openSubmenu === item.id && (
                <div className="mt-1 ml-4 space-y-1">
                  {item.submenu.map((subItem) => (
                    <button
                      key={subItem.id}
                      onClick={() => handleSubmenuClick(subItem.path)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group ${isActive(subItem.path)
                        ? 'bg-orange-50 dark:bg-orange-900/20 text-fpt-orange font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-fpt-orange hover:text-white'
                        }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${isActive(subItem.path) ? 'bg-current' : 'bg-fpt-orange group-hover:bg-white'}`}></div>
                      <span className="whitespace-nowrap">{subItem.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-gray-200 dark:border-zinc-800 p-2 space-y-1">
          <button
            onClick={() => navigate('/admin/settings')}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-fpt-orange hover:text-white transition-all duration-200 group"
            title={!isExpanded ? 'Cài đặt' : ''}
          >
            <div className={`flex-shrink-0 transition-colors duration-200 ${location.pathname.startsWith('/admin/settings') ? 'text-white' : 'text-fpt-orange group-hover:text-white'}`}>
              <Cog size={20} />
            </div>
            {isExpanded && <span className="text-sm font-medium whitespace-nowrap">Cài đặt</span>}
          </button>

          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-fpt-orange hover:text-white transition-all duration-200 group"
            title={!isExpanded ? 'Đăng xuất' : ''}
          >
            <div className="flex-shrink-0 text-fpt-orange group-hover:text-white transition-colors duration-200">
              <LogOut size={20} />
            </div>
            {isExpanded && <span className="text-sm font-medium whitespace-nowrap">Đăng xuất</span>}
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        title="Đăng xuất"
        message="Bạn có chắc chắn muốn đăng xuất khỏi hệ thống FAMS không?"
        confirmLabel="Đăng xuất ngay"
        cancelLabel="Ở lại"
        type="danger"
      />
    </div>
  );
};
