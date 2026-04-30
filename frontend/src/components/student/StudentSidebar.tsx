import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Home,
    Newspaper,
    Calendar,
    ScanFace,
    FileText,
    MessageCircle,
    Send,
    Settings,
    LogOut,
    GraduationCap,
    TrendingUp,
    ChevronDown,
    List
} from 'lucide-react';
import { authService } from '../../services/api/authService';
import { ConfirmModal } from '../common/ConfirmModal';

interface SubMenuItem {
    label: string;
    path: string;
}

interface MenuItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    path?: string;
    submenu?: SubMenuItem[];
}

export const StudentSidebar: React.FC = () => {
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
            path: '/student/dashboard'
        },
        {
            id: 'schedule',
            label: 'Thời khóa biểu',
            icon: <Calendar size={20} />,
            path: '/student/schedule'
        },
        {
            id: 'grades',
            label: 'Bảng điểm chi tiết',
            icon: <GraduationCap size={20} />,
            path: '/student/grades'
        },
        {
            id: 'all-grades',
            label: 'Kết quả học tập',
            icon: <TrendingUp size={20} />,
            path: '/student/all-grades'
        },
        {
            id: 'attendance',
            label: 'Điểm danh',
            icon: <ScanFace size={20} />,
            path: '/student/attendance'
        },
        {
            id: 'assignments',
            label: 'Bài tập',
            icon: <FileText size={20} />,
            path: '/student/assignments'
        },
        {
            id: 'lists',
            label: 'Danh sách',
            icon: <List size={20} />,
            submenu: [
                { label: 'Phòng học', path: '/student/rooms' },
                { label: 'Học kỳ', path: '/student/semesters' }
            ]
        },
        {
            id: 'messages',
            label: 'Tin nhắn',
            icon: <MessageCircle size={20} />,
            path: '/student/messages'
        },
        {
            id: 'requests',
            label: 'Gửi đơn yêu cầu',
            icon: <Send size={20} />,
            path: '/student/requests'
        },
        {
            id: 'news',
            label: 'Tin tức',
            icon: <Newspaper size={20} />,
            path: '/news'
        }
    ];

    // Auto-expand submenu if current route matches
    useEffect(() => {
        const activeMenuItem = menuItems.find(item =>
            item.submenu && isSubmenuActive(item.submenu)
        );
        if (activeMenuItem) {
            setOpenSubmenu(activeMenuItem.id);
        }
    }, [location.pathname]);

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
        return location.pathname === path || (path !== '/student/dashboard' && location.pathname.startsWith(path + '/'));
    };

    const isSubmenuActive = (submenu?: SubMenuItem[]) => {
        if (!submenu) return false;
        return submenu.some(subItem => isActive(subItem.path));
    };

    const handleMenuClick = (item: MenuItem) => {
        if (item.submenu) {
            setOpenSubmenu(openSubmenu === item.id ? null : item.id);
        } else if (item.path) {
            navigate(item.path);
        }
    };

    return (
        <div
            className={`fixed left-0 top-0 h-screen bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 transition-all duration-300 z-[50] ${isExpanded ? 'w-64' : 'w-16'}`}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => {
                setIsExpanded(false);
                setOpenSubmenu(null);
            }}
        >
            <div className="flex flex-col h-full">
                {/* Logo Section */}
                <div
                    onClick={() => navigate('/student/dashboard')}
                    className="h-16 flex items-center justify-center border-b border-gray-200 dark:border-zinc-800 px-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors select-none"
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
                                    : 'text-fpt-orange hover:bg-fpt-orange hover:text-white'
                                    }`}
                                title={!isExpanded ? item.label : ''}
                            >
                                <div className={`flex-shrink-0 transition-colors duration-200 ${isActive(item.path) || isSubmenuActive(item.submenu) ? 'text-white' : 'text-fpt-orange group-hover:text-white'}`}>
                                    {item.icon}
                                </div>
                                {isExpanded && (
                                    <>
                                        <span className={`flex-1 text-left text-sm whitespace-nowrap transition-colors duration-200 ${isActive(item.path) || isSubmenuActive(item.submenu) ? 'text-white font-bold' : 'font-medium group-hover:text-white'}`}>
                                            {item.label}
                                        </span>
                                        {item.submenu && (
                                            <ChevronDown
                                                size={16}
                                                className={`transition-transform duration-200 ${openSubmenu === item.id ? 'rotate-180' : ''}`}
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
                                            key={subItem.path}
                                            onClick={() => navigate(subItem.path)}
                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group ${isActive(subItem.path)
                                                ? 'bg-orange-50 dark:bg-orange-900/20 text-fpt-orange font-medium'
                                                : 'text-fpt-orange hover:bg-fpt-orange hover:text-white'
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

                {/* Bottom Actions */}
                <div className="border-t border-gray-200 dark:border-zinc-800 p-2 space-y-1">
                    <button
                        onClick={() => navigate('/student/settings')}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-fpt-orange hover:bg-fpt-orange hover:text-white transition-all duration-200 group ${isActive('/student/settings') ? 'bg-fpt-orange text-white' : ''}`}
                        title={!isExpanded ? 'Cài đặt' : ''}
                    >
                        <div className={`flex-shrink-0 transition-colors duration-200 ${isActive('/student/settings') ? 'text-white' : 'text-fpt-orange group-hover:text-white'}`}>
                            <Settings size={20} />
                        </div>
                        {isExpanded && <span className={`text-sm font-medium whitespace-nowrap ${isActive('/student/settings') ? 'text-white' : ''}`}>Cài đặt</span>}
                    </button>

                    <button
                        onClick={() => setShowLogoutModal(true)}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-fpt-orange hover:bg-fpt-orange hover:text-white transition-all duration-200 group"
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

