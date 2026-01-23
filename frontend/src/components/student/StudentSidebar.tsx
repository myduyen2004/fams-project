import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';
import { authService } from '../../services/api/authService';
import { ConfirmModal } from '../common/ConfirmModal';

// --- Custom Solid Icons (FontAwesome Solid Equivalents) ---

const DashboardIcon = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 576 512" fill="currentColor" className={className}>
        <path d="M575.8 255.5c0 18-15 32.1-32 32.1h-32l.7 160.2c0 2.7-.2 5.4-.5 8.1V472c0 22.1-17.9 40-40 40H456c-1.1 0-2.2 0-3.3-.1c-1.4 .1-2.8 .1-4.2 .1H416 392c-22.1 0-40-17.9-40-40V448 384c0-17.7-14.3-32-32-32H256c-17.7 0-32 14.3-32 32v64 24c0 22.1-17.9 40-40 40H160 128.1c-1.5 0-3-.1-4.5-.2c-1.2 .1-2.4 .2-3.6 .2H104c-22.1 0-40-17.9-40-40V360c0-.9 0-1.9 .1-2.8V287.6H32c-18 0-32-14-32-32.1c0-9 3-17 10-24L266.4 8c7-7 15-8 22-8s15 2 21 7L564.8 231.5c8 7 12 15 11 24z" />
    </svg>
);

const ScheduleIcon = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 448 512" fill="currentColor" className={className}>
        <path d="M152 24c0-13.3-10.7-24-24-24s-24 10.7-24 24V64H64C28.7 64 0 92.7 0 128v16 48V448c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V192 144 128c0-35.3-28.7-64-64-64H344V24c0-13.3-10.7-24-24-24s-24 10.7-24 24V64H152V24zM48 192h80v56H48V192zm0 104h80v64H48V296zm128 0h96v64H176V296zm144 0h80v64H320V296zm80-48H320V192h80v56zm0 160v40c0 8.8-7.2 16-16 16H320V408h80zm-128 0v56H176V408h96zm-128 0v56H64c-8.8 0-16-7.2-16-16V408h80zM272 248H176V192h96v56z" />
    </svg>
);

const AttendanceIcon = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M9 10h.01M15 10h.01M9.5 15a3.5 3.5 0 0 0 5 0" />
        <path d="M3 7V5a2 2 0 0 1 2-2h2 M17 3h2a2 2 0 0 1 2 2v2 M21 17v2a2 2 0 0 1-2 2h-2 M7 21H5a2 2 0 0 1-2-2v-2" />
    </svg>
);

const StudyIcon = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 448 512" fill="currentColor" className={className}>
        <path d="M0 96C0 43 43 0 96 0h96V190.7c0 13.4 15.5 20.9 26 12.5L256 176l38 27.2c10.5 8.4 26 .9 26-12.5V0h32 32c17.7 0 32 14.3 32 32V352c0 17.7-14.3 32-32 32v64c17.7 0 32 14.3 32 32s-14.3 32-32 32H384 96c-53 0-96-43-96-96V128 96zM64 416c0 17.7 14.3 32 32 32H352V384H96c-17.7 0-32 14.3-32 32z" />
    </svg>
);

const MessagesIcon = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="currentColor" className={className}>
        <path d="M512 240c0 114.9-114.6 208-256 208c-37.1 0-72.3-6.4-104.1-18.1c-32.3 26.5-72.4 46.5-115.9 59.5c-44 13.2-56.1-9.9-25.2-36.2C46.8 418.8 69.3 381.7 82.3 349c-31.5-31.9-50.3-73.4-50.3-118C32 105.1 146.6 24 256 24s256 81.1 256 216zm-361.6-16c0 17.7 14.3 32 32 32s32-14.3 32-32s-14.3-32-32-32s-32 14.3-32 32zm88 0c0 17.7 14.3 32 32 32s32-14.3 32-32s-14.3-32-32-32s-32 14.3-32 32zm88 0c0 17.7 14.3 32 32 32s32-14.3 32-32s-14.3-32-32-32s-32 14.3-32 32z" />
    </svg>
);

const RequestsIcon = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="currentColor" className={className}>
        <path d="M498.1 5.6c10.1 7 15.4 19.1 13.5 31.2l-64 416c-1.5 9.7-7.4 18.2-16 23s-18.9 5.4-28 1.6L284 427.7l-68.5 74.1c-8.9 9.7-22.9 12.9-35.2 8.1S160 493.2 160 480V396.4c0-4 1.5-7.8 4.2-10.7L331.8 202.8c5.8-6.3 5.6-16-.4-22s-15.7-6.4-22-.7L106 360.8 17.7 316.6C7.1 311.3 .3 300.7 0 288.9s5.9-22.8 16.1-28.7l448-256c10.7-6.1 23.9-5.5 34 1.4z" />
    </svg>
);

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
            icon: <DashboardIcon size={20} />,
            path: '/student/dashboard'
        },
        {
            id: 'schedule',
            label: 'Thời khóa biểu',
            icon: <ScheduleIcon size={20} />,
            path: '/student/schedule'
        },
        {
            id: 'attendance',
            label: 'Điểm danh',
            icon: <AttendanceIcon size={20} />,
            path: '/student/attendance'
        },
        {
            id: 'study',
            label: 'Học tập',
            icon: <StudyIcon size={20} />,
            path: '/student/study'
        },
        {
            id: 'messages',
            label: 'Tin nhắn',
            icon: <MessagesIcon size={20} />,
            path: '/student/messages'
        },
        {
            id: 'requests',
            label: 'Gửi đơn yêu cầu',
            icon: <RequestsIcon size={20} />,
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
            className={`fixed left-0 top-0 h-screen bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 transition-all duration-300 z-50 ${isExpanded ? 'w-64' : 'w-16'
                }`}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
        >
            <div className="flex flex-col h-full overflow-hidden">
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
                <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2">
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
                                <div className={`flex-shrink-0 transition-colors duration-200 ${isActive(item.path) ? 'text-white font-bold' : 'text-fpt-orange group-hover:text-white'}`}>
                                    {item.icon}
                                </div>
                                {isExpanded && (
                                    <span className={`flex-1 text-left text-sm whitespace-nowrap transition-colors duration-200 ${isActive(item.path) ? 'text-white font-bold' : 'text-fpt-orange font-medium group-hover:text-white'}`}>
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
