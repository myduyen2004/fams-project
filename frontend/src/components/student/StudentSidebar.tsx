import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Home,
    Calendar,
    ScanFace,
    BookOpen,
    MessageCircle,
    Send,
    Settings,
    LogOut
} from 'lucide-react';
import { authService } from '../../services/api/authService';
import { ConfirmModal } from '../common/ConfirmModal';

interface MenuItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    path: string;
}

export const StudentSidebar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isExpanded, setIsExpanded] = useState(false);
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
            id: 'attendance',
            label: 'Điểm danh',
            icon: <ScanFace size={20} />,
            path: '/student/attendance'
        },
        {
            id: 'study',
            label: 'Học tập',
            icon: <BookOpen size={20} />,
            path: '/student/study'
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
        }
    ];

    const handleLogout = async () => {
        setShowLogoutModal(false);
        try {
            await authService.logout();
        } catch (error) {
            console.error('Logout failed:', error);
        }
        navigate('/login');
    };

    const isActive = (path: string) => {
        return location.pathname === path || (path !== '/student/dashboard' && location.pathname.startsWith(path + '/'));
    };

    return (
        <div
            className={`fixed left-0 top-0 h-screen bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 transition-all duration-300 z-50 ${isExpanded ? 'w-64' : 'w-16'}`}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
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
                                onClick={() => navigate(item.path)}
                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group ${isActive(item.path)
                                    ? 'bg-fpt-orange text-white'
                                    : 'text-fpt-orange hover:bg-fpt-orange hover:text-white'
                                    }`}
                                title={!isExpanded ? item.label : ''}
                            >
                                <div className={`flex-shrink-0 transition-colors duration-200 ${isActive(item.path) ? 'text-white' : 'text-fpt-orange group-hover:text-white'}`}>
                                    {item.icon}
                                </div>
                                {isExpanded && (
                                    <span className={`flex-1 text-left text-sm whitespace-nowrap transition-colors duration-200 ${isActive(item.path) ? 'text-white font-bold' : 'font-medium group-hover:text-white'}`}>
                                        {item.label}
                                    </span>
                                )}
                            </button>
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
