import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { chatGroupService, ChatGroupResponse } from '../../services/api/chatGroupService';
import { authService } from '../../services/api/authService';
import { useWebSocket } from '../../hooks/useWebSocket';

export const ChatMessageIcon: React.FC = () => {
    const [groups, setGroups] = useState<ChatGroupResponse[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const navigate = useNavigate();
    const dropdownRef = useRef<HTMLDivElement>(null);

    const user = authService.getUser();
    const role = user?.role?.toLowerCase() || 'student';

    // Load groups initially to get unread counts
    useEffect(() => {
        loadGroups();
    }, []);

    const loadGroups = async () => {
        try {
            const data = await chatGroupService.getMyGroups();
            setGroups(data);
        } catch (error) {
            console.error('[ChatMessageIcon] Error loading groups:', error);
        }
    };

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Listen for real-time chat notifications
    useWebSocket(`/user/queue/chat-notifications`, (data) => {
        console.debug('[ChatMessageIcon] Received chat notification:', data);

        if (data.type === 'READ_UPDATE') {
            setGroups(prev => prev.map(g =>
                g.id === Number(data.groupId) ? { ...g, unreadCount: 0 } : g
            ));
        } else {
            // New message notification
            setGroups(prev => {
                const groupIdx = prev.findIndex(g => g.id === Number(data.groupId));
                if (groupIdx === -1) {
                    // Group not found, reload all groups to be safe
                    loadGroups();
                    return prev;
                }

                const updatedGroups = [...prev];
                updatedGroups[groupIdx] = {
                    ...updatedGroups[groupIdx],
                    unreadCount: (updatedGroups[groupIdx].unreadCount || 0) + 1,
                    lastMessage: {
                        senderName: data.senderName,
                        content: data.content,
                        type: data.type,
                        sentAt: data.sentAt
                    }
                };

                // Sort by last message time
                return updatedGroups.sort((a, b) => {
                    const timeA = a.lastMessage?.sentAt ? new Date(a.lastMessage.sentAt).getTime() : 0;
                    const timeB = b.lastMessage?.sentAt ? new Date(b.lastMessage.sentAt).getTime() : 0;
                    return timeB - timeA;
                });
            });
        }
    });

    const unreadGroups = useMemo(() => {
        return groups.filter(g => (g.unreadCount || 0) > 0);
    }, [groups]);

    const totalUnread = useMemo(() => {
        return unreadGroups.reduce((acc, g) => acc + (g.unreadCount || 0), 0);
    }, [unreadGroups]);

    const handleGroupClick = (group: ChatGroupResponse) => {
        const path = `/${role}/messages`;
        navigate(path, { state: { selectedGroupId: group.id } });
        setShowDropdown(false);
    };

    const formatTime = (dateString?: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
                title="Tin nhắn"
            >
                <MessageCircle size={20} />
                {totalUnread > 0 && (
                    <span className="absolute top-1 right-1 bg-blue-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-white dark:border-zinc-900">
                        {totalUnread > 9 ? '9+' : totalUnread}
                    </span>
                )}
            </button>

            {showDropdown && (
                <div className="absolute right-0 mt-3 w-[350px] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900 dark:text-white">Tin nhắn</h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {unreadGroups.length} cuộc hội thoại mới
                        </span>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {unreadGroups.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                                <MessageCircle size={40} className="opacity-10 mb-2" />
                                <p className="text-xs">Không có tin nhắn mới</p>
                            </div>
                        ) : (
                            unreadGroups.map(group => (
                                <div
                                    key={group.id}
                                    onClick={() => handleGroupClick(group)}
                                    className="p-3 flex gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors border-b border-gray-50 dark:border-zinc-800/50 last:border-0"
                                >
                                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                                        {group.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate pr-2">
                                                {group.name}
                                            </p>
                                            <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                                {formatTime(group.lastMessage?.sentAt)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            <span className="font-medium text-gray-700 dark:text-gray-300">
                                                {group.lastMessage?.senderName}:
                                            </span> {group.lastMessage?.content || (group.lastMessage?.type === 'IMAGE' ? '[Hình ảnh]' : '[Tệp tin]')}
                                        </p>
                                    </div>
                                    {group.unreadCount && group.unreadCount > 0 && (
                                        <div className="mt-1">
                                            <div className="bg-blue-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                                {group.unreadCount}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-3 text-center border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/30">
                        <button
                            onClick={() => {
                                const path = `/${role}/messages`;
                                navigate(path);
                                setShowDropdown(false);
                            }}
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            Xem tất cả tin nhắn
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
