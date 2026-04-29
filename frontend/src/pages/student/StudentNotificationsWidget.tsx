import React, { useEffect, useState } from 'react';
import { Card } from '../../components/common/Card';
import { dashboardService } from '../../services/api/dashboardService';
import { AppNotification } from '../../types/dashboard';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export const StudentNotificationsWidget: React.FC = () => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const data = await dashboardService.getNotifications();
                setNotifications(data.slice(0, 5)); // Show top 5
            } catch (error) {
                console.error('Failed to fetch notifications', error);
            }
        };
        fetchNotifications();
    }, []);

    const getFirstLineHtml = (html: string): string => {
        if (!html) return '';
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        let content = '';

        // Strategy 1: Find first paragraph
        const paragraphs = tempDiv.querySelectorAll('p');
        for (let i = 0; i < paragraphs.length; i++) {
            if (paragraphs[i].textContent && paragraphs[i].textContent?.replace(/[\s\u00A0]/g, '').length > 0) {
                content = paragraphs[i].innerHTML;
                break;
            }
        }

        // Strategy 2: Split by BR
        if (!content) {
            const lines = tempDiv.innerHTML.split(/<br\s*\/?>/i);
            content = lines.find(line => {
                const t = document.createElement('div');
                t.innerHTML = line;
                return t.textContent && t.textContent.replace(/[\s\u00A0]/g, '').length > 0;
            }) || lines[0] || '';
        }

        // Cleanup
        content = content.replace(/^(\s*<br\s*\/?>\s*)+/gi, '');
        let oldContent = '';
        while (content !== oldContent) {
            oldContent = content;
            content = content.replace(/^((?:<[^>]+>)*)(?:&nbsp;|&#160;|\s)+/gi, '$1');
        }
        return content;
    };

    return (
        <Card className="h-full flex flex-col bg-white dark:bg-zinc-900 border">
            <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Thông báo</h3>
                <button
                    onClick={() => navigate('/notifications')}
                    className="text-xs font-bold text-fpt-orange hover:text-orange-600 flex items-center gap-1 transition-colors"
                >
                    Xem tất cả <ArrowRight size={12} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[400px] p-2 space-y-2 custom-scrollbar">
                {notifications.length > 0 ? (
                    notifications.map((n) => (
                        <div
                            key={n.id}
                            onClick={() => navigate(`/notifications/${n.id}`)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer relative group ${!n.isRead
                                ? 'bg-orange-50/50 border-orange-100 dark:bg-orange-900/10 dark:border-orange-900/30'
                                : 'bg-white border-gray-100 hover:border-orange-100 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:border-zinc-700'
                                }`}
                        >
                            <div className="flex gap-3">
                                {/* Avatar */}
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                                        {n.senderName ? n.senderName.charAt(0).toUpperCase() : 'S'}
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-0.5">
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate max-w-[70%]">
                                            {n.senderName || 'Hệ thống'}
                                        </p>
                                        {!n.isRead && (
                                            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1"></span>
                                        )}
                                    </div>

                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate mb-0.5">
                                        {n.title}
                                    </h4>

                                    <div
                                        className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1 mb-2"
                                        dangerouslySetInnerHTML={{ __html: getFirstLineHtml(n.description) }}
                                    />

                                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide flex items-center gap-1.5">
                                        <span>{n.senderName ? n.senderName.toUpperCase() : 'HE THONG'}</span>
                                        <span className="w-0.5 h-0.5 rounded-full bg-gray-300 dark:bg-zinc-600"></span>
                                        <span>{n.timestamp}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                        <p className="text-sm">Không có thông báo mới</p>
                    </div>
                )}
            </div>
        </Card>
    );
};

