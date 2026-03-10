import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, Send, FileText, X, Search, Users, ArrowLeft, Image as ImageIcon, Info, Plus, Trash2, Download, Folder, File as FileIcon, ExternalLink, Reply, Eye } from 'lucide-react';
import { chatGroupService, ChatGroupResponse, ChatMessageResponse } from '../../services/api/chatGroupService';
import { getViewableFileUrl } from '../../services/utils/fileViewerUtils';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { WS_URL } from '../../services/api/config';
import { toast } from 'react-hot-toast';
import { ConfirmModal } from '../common/ConfirmModal';

interface MessagesPageProps {
    role: 'LECTURER' | 'STUDENT';
}

const MessagesPage: React.FC<MessagesPageProps> = ({ role }) => {
    const location = useLocation();
    const [groups, setGroups] = useState<ChatGroupResponse[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<ChatGroupResponse | null>(null);
    const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);

    // Refs must be declared before any logic that might access them
    const groupsRef = useRef<ChatGroupResponse[]>([]);
    const selectedGroupRef = useRef<ChatGroupResponse | null>(null);
    const subscriptionsRef = useRef<{ [key: string]: any }>({});
    const stompClientRef = useRef<Client | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastReadTimeRef = useRef<{ [key: number]: number }>({});
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isInitialLoad = useRef(true);

    // Sync refs immediately to ensure they are never stale in callbacks
    groupsRef.current = groups;
    selectedGroupRef.current = selectedGroup;

    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showMembers, setShowMembers] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [filePreviews, setFilePreviews] = useState<{ id: string, url: string | null, name: string, type: string }[]>([]);
    const [showDetailSidebar, setShowDetailSidebar] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [messageToDelete, setMessageToDelete] = useState<number | null>(null);
    const [detailViewMode, setDetailViewMode] = useState<'INFO' | 'MEMBERS' | 'MEDIA'>('INFO');
    const [mediaTab, setMediaTab] = useState<'IMAGE' | 'FILE' | 'LINK'>('IMAGE');
    const [previewData, setPreviewData] = useState<{ isOpen: boolean, url: string | null, name: string | null, type: any } | null>(null);
    const [isUnreadOnly, setIsUnreadOnly] = useState(false);
    const [expandedMessageId, setExpandedMessageId] = useState<number | null>(null);
    const [replyingTo, setReplyingTo] = useState<{ id: number; senderName: string; content: string; attachmentUrl?: string | null; type?: string } | null>(null);

    // Theme colors based on role
    const themeColor = role === 'LECTURER' ? 'orange' : 'blue';
    const bgColor = role === 'LECTURER' ? 'bg-orange-500' : 'bg-blue-500';
    const bgColorLight = role === 'LECTURER' ? 'bg-orange-100' : 'bg-blue-100';
    const textColor = role === 'LECTURER' ? 'text-orange-600' : 'text-blue-600';

    const triggerMarkAsRead = (groupId: number) => {
        if (!groupId) return;

        const now = Date.now();
        const lastRead = lastReadTimeRef.current[groupId] || 0;

        // 1. Throttle/Debounce: If called within 2s, schedule a trailing call
        if (now - lastRead < 2000) {
            if (subscriptionsRef.current[`read_timeout_${groupId}`]) {
                clearTimeout(subscriptionsRef.current[`read_timeout_${groupId}`]);
            }
            subscriptionsRef.current[`read_timeout_${groupId}`] = setTimeout(() => {
                triggerMarkAsRead(groupId);
            }, 2100 - (now - lastRead));
            return;
        }

        // Clear any pending trailing-edge call
        if (subscriptionsRef.current[`read_timeout_${groupId}`]) {
            clearTimeout(subscriptionsRef.current[`read_timeout_${groupId}`]);
            delete subscriptionsRef.current[`read_timeout_${groupId}`];
        }

        // 2. Refresh local state immediately for UI responsiveness
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, unreadCount: 0 } : g));

        // 3. Add 100ms safety delay before actual persistence to prevent race conditions with DB
        setTimeout(() => {
            const currentSelected = selectedGroupRef.current;
            if (currentSelected?.id !== groupId) return;

            lastReadTimeRef.current[groupId] = now;
            console.debug('[MessagesPage] Triggering read receipt for group', groupId);

            if (stompClientRef.current?.connected) {
                stompClientRef.current.publish({
                    destination: `/app/chat.read/${groupId}`
                });
            } else {
                chatGroupService.markAsRead(groupId).then(() => {
                    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, unreadCount: 0 } : g));
                }).catch(console.error);
            }
        }, 100);
    };

    useEffect(() => {
        loadGroups();
        return () => {
            if (stompClientRef.current) {
                stompClientRef.current.deactivate();
            }
        };
    }, []);

    const loadGroups = async () => {
        try {
            setLoading(true);
            const data = await chatGroupService.getMyGroups();
            setGroups(data);
            groupsRef.current = data;

            // Handle initial group selection from navigation state
            const state = location.state as { selectedGroupId?: number };
            if (state?.selectedGroupId) {
                const groupToSelect = data.find(g => g.id === state.selectedGroupId);
                if (groupToSelect) {
                    setSelectedGroup(groupToSelect);
                }
            }

            // Connect WebSocket after groups are loaded
            initWebSocket(data);
        } catch (error) {
            console.error('Error loading groups:', error);
        } finally {
            setLoading(false);
        }
    };

    // Single WebSocket connection for all chat features
    const initWebSocket = (allGroups: ChatGroupResponse[]) => {
        if (stompClientRef.current) {
            stompClientRef.current.deactivate();
        }

        const token = localStorage.getItem('token');
        const stompClient = new Client({
            webSocketFactory: () => new SockJS(WS_URL),
            connectHeaders: {
                Authorization: `Bearer ${token}`
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                console.info('[MessagesPage] WebSocket Connected');

                // 1. Subscribe to ALL groups for message updates, deletions, and read receipts
                allGroups.forEach(group => {
                    // Message subscription
                    const msgId = `messages_${group.id}`;
                    if (subscriptionsRef.current[msgId]) subscriptionsRef.current[msgId].unsubscribe();
                    subscriptionsRef.current[msgId] = stompClient.subscribe(`/topic/chat/${group.id}`, (message) => {
                        const msg = JSON.parse(message.body);
                        const user = JSON.parse(localStorage.getItem('user') || '{}');
                        const currentUserId = Number(user.id);
                        const isOwnMessage = Number(msg.senderId) === currentUserId;

                        // If this group is currently selected, update messages list
                        if (selectedGroupRef.current?.id === group.id) {
                            const newMsg: ChatMessageResponse = { ...msg, isOwn: isOwnMessage };

                            // If window is focused and it's NOT our message, mark as read immediately
                            if (document.hasFocus() && !isOwnMessage) {
                                newMsg.isRead = true;
                                const user = JSON.parse(localStorage.getItem('user') || '{}');
                                if (user && user.id) {
                                    newMsg.readers = [...(newMsg.readers || []), {
                                        userId: Number(user.id),
                                        fullName: user.fullName || user.username,
                                        avatar: user.avatar || ''
                                    }];
                                }
                                triggerMarkAsRead(group.id);
                            }

                            setMessages(prev => {
                                // 1. If this exact ID is already there, ignore
                                if (prev.find(m => m.id === newMsg.id)) return prev;

                                // 2. If this is our own message, it might be replacing an optimistic one
                                if (isOwnMessage) {
                                    const filtered = prev.filter(m => {
                                        if (!m.isSending) return true;
                                        // Match by type and content/filename
                                        if (m.type !== newMsg.type) return true;
                                        if (m.type === 'TEXT') return m.content !== newMsg.content;
                                        return m.attachmentName !== newMsg.attachmentName;
                                    });
                                    return [...filtered, newMsg];
                                }

                                // 3. For others' messages, just append
                                return [...prev, newMsg];
                            });
                            scrollToBottom();
                        }

                        // Update sidebar
                        setGroups(prevGroups => {
                            const updatedGroups = prevGroups.map(g => {
                                if (g.id === group.id) {
                                    return {
                                        ...g,
                                        lastMessage: {
                                            senderName: msg.senderName,
                                            content: msg.content,
                                            type: msg.type,
                                            sentAt: msg.sentAt
                                        },
                                        unreadCount: (selectedGroupRef.current?.id !== group.id && !isOwnMessage)
                                            ? (g.unreadCount || 0) + 1
                                            : (selectedGroupRef.current?.id === group.id ? 0 : g.unreadCount)
                                    };
                                }
                                return g;
                            });

                            return [...updatedGroups].sort((a, b) => {
                                const timeA = a.lastMessage?.sentAt ? new Date(a.lastMessage.sentAt).getTime() : 0;
                                const timeB = b.lastMessage?.sentAt ? new Date(b.lastMessage.sentAt).getTime() : 0;
                                return timeB - timeA;
                            });
                        });
                    });

                    // Read receipt subscription for this group
                    const readId = `read_${group.id}`;
                    if (subscriptionsRef.current[readId]) subscriptionsRef.current[readId].unsubscribe();
                    subscriptionsRef.current[readId] = stompClient.subscribe(`/topic/chat/${group.id}/read`, (message) => {
                        const data = JSON.parse(message.body);
                        const { messageIds, reader } = data;

                        console.log(`[READ RECEIPT] Received for group ${group.id}:`, {
                            messageIds,
                            reader,
                            currentMessages: messages.length
                        });

                        if (!messageIds || !reader) {
                            console.warn('[READ RECEIPT] Missing messageIds or reader, ignoring');
                            return;
                        }

                        setMessages(prev => {
                            console.log('[READ RECEIPT] Processing', prev.length, 'messages');
                            const updated = prev.map(m => {
                                const isMatch = messageIds.some((id: any) => Number(id) === Number(m.id));
                                if (isMatch) {
                                    const alreadyRead = m.readers?.find(r => Number(r.userId) === Number(reader.userId));
                                    if (!alreadyRead) {
                                        console.log('[READ RECEIPT] Adding reader to message', m.id, reader.fullName);
                                        return {
                                            ...m,
                                            isRead: true,
                                            readers: [...(m.readers || []), {
                                                userId: Number(reader.userId),
                                                fullName: reader.fullName,
                                                avatar: reader.avatar
                                            }]
                                        };
                                    } else {
                                        console.log('[READ RECEIPT] Reader already exists for message', m.id);
                                    }
                                }
                                return m;
                            });
                            console.log('[READ RECEIPT] Updated messages count:', updated.filter(m => m.readers?.length).length);
                            return updated;
                        });
                    });
                    console.log(`[SUBSCRIPTION] Created /read subscription for group ${group.id}`);

                    // Delete subscription for this group
                    const deleteId = `delete_${group.id}`;
                    if (subscriptionsRef.current[deleteId]) subscriptionsRef.current[deleteId].unsubscribe();
                    subscriptionsRef.current[deleteId] = stompClient.subscribe(`/topic/chat/${group.id}/delete`, (message) => {
                        const deletedMsg = JSON.parse(message.body) as ChatMessageResponse;
                        setMessages(prev => prev.map(m => m.id === deletedMsg.id ? { ...m, isDeleted: true } : m));
                    });
                });

                // 2. Subscribe to user-specific notifications for read status sync
                const userNotificationsId = 'user_notifications';
                if (subscriptionsRef.current[userNotificationsId]) subscriptionsRef.current[userNotificationsId].unsubscribe();
                subscriptionsRef.current[userNotificationsId] = stompClient.subscribe('/user/queue/chat-notifications', (message) => {
                    const data = JSON.parse(message.body);
                    console.debug('[MessagesPage] User notification received:', data);

                    if (data.type === 'READ_UPDATE') {
                        console.debug(`[MessagesPage] Syncing unread count for group ${data.groupId}`);
                        setGroups(prevGroups => prevGroups.map(g =>
                            g.id === Number(data.groupId) ? { ...g, unreadCount: 0 } : g
                        ));
                    }
                });

                // 3. Trigger reactive subscription check
                setGroups(prev => [...prev]); // Trigger re-render to fire useEffect
            },
            onStompError: (frame) => {
                console.error('STOMP error:', frame);
                toast.error('Lỗi kết nối máy chủ chat');
            }
        });
        stompClient.activate();
        stompClientRef.current = stompClient;
    };

    const setupGroupSubscriptions = (client: Client, groupId: number) => {
        // Typing subscription (group-specific, only for selected group)
        const typingId = `typing_${groupId}`;
        if (subscriptionsRef.current[typingId]) subscriptionsRef.current[typingId].unsubscribe();
        subscriptionsRef.current[typingId] = client.subscribe(`/topic/chat/${groupId}/typing`, (message) => {
            const data = JSON.parse(message.body);
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (data.username === (user.fullName || user.username)) return;
            if (data.isTyping) {
                setTypingUsers(prev => [...new Set([...prev, data.username])]);
            } else {
                setTypingUsers(prev => prev.filter(u => u !== data.username));
            }
        });
    };

    useEffect(() => {
        const prevId = selectedGroupRef.current?.id;

        if (selectedGroup) {
            // Always load messages when a group is selected
            setMessages([]);
            isInitialLoad.current = true;
            loadMessages(selectedGroup.id);

            if (stompClientRef.current?.connected) {
                // Clear previous typing subscription only if switching groups
                if (prevId && prevId !== selectedGroup.id) {
                    const typingId = `typing_${prevId}`;
                    if (subscriptionsRef.current[typingId]) subscriptionsRef.current[typingId].unsubscribe();
                }
                setupGroupSubscriptions(stompClientRef.current, selectedGroup.id);

                // Mark as read when group is selected
                stompClientRef.current.publish({
                    destination: `/app/chat.read/${selectedGroup.id}`
                });
                setGroups(prev => prev.map(g => g.id === selectedGroup.id ? { ...g, unreadCount: 0 } : g));

                // Trigger mark as read after a short delay to ensure messages are loaded
                setTimeout(() => {
                    if (selectedGroupRef.current?.id === selectedGroup.id) {
                        triggerMarkAsRead(selectedGroup.id);
                    }
                }, 500);
            } else if (!stompClientRef.current) {
                // If no client, try initializing (shouldn't usually happen but safe fallback)
                loadGroups();
            } else {
                // Client exists but not connected yet - mark as read via REST
                chatGroupService.markAsRead(selectedGroup.id).then(() => {
                    setGroups(prev => prev.map(g => g.id === selectedGroup.id ? { ...g, unreadCount: 0 } : g));
                }).catch(console.error);
            }
        }
    }, [selectedGroup?.id, stompClientRef.current?.connected]);

    // Add window focus listener to trigger read when returning to tab
    useEffect(() => {
        const handleFocus = () => {
            if (selectedGroupRef.current && stompClientRef.current?.connected) {
                console.log('[MessagesPage] Window focused, marking current group as read');
                triggerMarkAsRead(selectedGroupRef.current.id);
            }
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);


    // connectWebSocket removed - logic merged into initWebSocket and setupGroupSubscriptions

    const loadMessages = async (groupId: number) => {
        try {
            setMessagesLoading(true);
            const data = await chatGroupService.getMessages(groupId, 0, 100);
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const currentUserId = Number(user.id);
            const msgList = data.content.map(msg => ({
                ...msg,
                isOwn: Number(msg.senderId) === currentUserId
            })).reverse();
            setMessages(msgList);

            try {
                console.log('[MessagesPage] Marking group as read via REST', groupId);
                await chatGroupService.markAsRead(groupId);
            } catch (err) {
                console.error('[MessagesPage] Failed to mark as read', err);
            }

            // Reset unread count locally for this group and selected state
            setGroups(prevGroups => prevGroups.map(g =>
                g.id === groupId ? { ...g, unreadCount: 0, firstUnreadMessageId: undefined } : g
            ));
            setSelectedGroup(prev => prev?.id === groupId ? { ...prev, unreadCount: 0, firstUnreadMessageId: undefined } : prev);
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setMessagesLoading(false);
        }
    };

    const scrollToBottom = (instant = false) => {
        if (messagesEndRef.current) {
            const scroll = () => {
                messagesEndRef.current?.scrollIntoView({
                    behavior: instant ? 'auto' : 'smooth',
                    block: 'end'
                });
            };

            scroll();
            // Second pass after a small delay to account for dynamic height (images, etc)
            setTimeout(scroll, 100);
        }
    };

    const handleGroupSelect = (group: ChatGroupResponse) => {
        if (selectedGroup?.id === group.id) {
            scrollToBottom();
        } else {
            setSelectedGroup(group);
        }
    };

    useLayoutEffect(() => {
        if (messages.length > 0) {
            // Priority: Always scroll to bottom as requested by user
            scrollToBottom(isInitialLoad.current);

            if (isInitialLoad.current) {
                isInitialLoad.current = false;
            }
        }
    }, [messages.length, selectedGroup?.id]);

    // Helper to remove accents for download and upload
    const removeAccents = (str: string) => {
        return str.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd').replace(/Đ/g, 'D')
            .replace(/\s+/g, '_');
    };

    const downloadFile = async (url: string, fileName: string) => {
        // Check if it's a local file:// URL (optimistic/unsaved upload)
        if (url.startsWith('file://') || url.startsWith('blob:')) {
            toast.error('File này chưa được tải lên server. Vui lòng gửi lại file!', {
                duration: 5000
            });
            return;
        }

        // Strip Cloudinary signing component to get clean public URL
        let cleanUrl = url.replace(/\/s--[^/]+--\//, '/');

        try {
            // Create an anchor and trigger download directly from the clean URL
            const link = document.createElement('a');
            link.href = cleanUrl;
            link.download = removeAccents(fileName);
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Đang tải file...');
        } catch (error) {
            console.error('Download failed:', error);
            toast.error('Không thể tải file. Vui lòng thử lại sau.');
        }
    };


    const handleSendMessage = async () => {
        if ((!newMessage.trim() && selectedFiles.length === 0) || !selectedGroup) return;

        const currentMessage = newMessage;
        const currentFiles = [...selectedFiles];
        const user = JSON.parse(localStorage.getItem('user') || '{}');

        // Optimistic UI: Clear inputs immediately
        setNewMessage('');
        setSelectedFiles([]);
        setFilePreviews([]);

        try {
            // 1. Process Message Text
            if (currentMessage.trim()) {
                const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?(\?.*)?$/;
                const isLink = urlPattern.test(currentMessage.trim());
                chatGroupService.sendMessage(selectedGroup.id, currentMessage, isLink ? 'LINK' : 'TEXT', replyingTo?.id)
                    .catch(err => {
                        console.error('Error sending text message:', err);
                        toast.error('Lỗi khi gửi tin nhắn');
                    });
                setReplyingTo(null);
            }

            // 2. Process File Uploads (Parallel + Optimistic)
            if (currentFiles.length > 0) {
                // Upload each file in parallel using the backend endpoint
                await Promise.all(
                    currentFiles.map(async (file) => {
                        // Generate a temporary ID for the optimistic message
                        const tempId = Number('99' + Math.floor(Math.random() * 1000000));

                        // Add optimistic message to the list
                        const optimisticMsg: ChatMessageResponse = {
                            id: tempId,
                            senderId: Number(user.id),
                            senderName: user.fullName || user.username,
                            senderAvatar: user.avatar || '',
                            senderRole: user.role || '',
                            content: '',
                            type: file.type.startsWith('image/') ? 'IMAGE' : 'FILE',
                            attachmentUrl: URL.createObjectURL(file), // Local preview
                            attachmentName: file.name,
                            sentAt: new Date().toISOString(),
                            isOwn: true,
                            isSending: true,
                            readers: [],
                            replyToId: replyingTo?.id || null,
                            replyToContent: replyingTo?.content || null,
                            replyToAttachmentUrl: replyingTo?.attachmentUrl || null,
                            replyToType: replyingTo?.type || null
                        };

                        setMessages(prev => [...prev, optimisticMsg]);
                        if (isInitialLoad.current) scrollToBottom();

                        try {
                            // Upload via Backend Proxy (Old way but parallel)
                            const finalMsg = await chatGroupService.uploadAndSendFile(
                                selectedGroup.id,
                                file,
                                replyingTo?.id
                            );

                            // Replace optimistic message with the real one
                            setMessages(prev => {
                                // If the real message is already there (from WebSocket), just remove the optimistic one
                                if (prev.some(m => m.id === finalMsg.id)) {
                                    return prev.filter(m => m.id !== tempId);
                                }
                                return prev.map(m => m.id === tempId ? { ...finalMsg, isOwn: true } : m);
                            });
                        } catch (err) {
                            console.error('Failed to upload via backend:', err);
                            toast.error(`Không thể tải lên ${file.name}.`);
                            setMessages(prev => prev.filter(m => m.id !== tempId));
                        }
                    })
                );
            }
        } catch (error) {
            console.error('Error in handleSendMessage:', error);
            toast.error('Có lỗi xảy ra khi gửi tin nhắn');
        }
    };

    const handleDeleteMessage = (messageId: number) => {
        setMessageToDelete(messageId);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedGroup || messageToDelete === null) return;
        try {
            await chatGroupService.deleteMessage(selectedGroup.id, messageToDelete);
            toast.success('Đã thu hồi tin nhắn');
        } catch (error) {
            console.error('Error deleting message:', error);
            toast.error('Không thể xóa tin nhắn');
        } finally {
            setIsDeleteDialogOpen(false);
            setMessageToDelete(null);
        }
    };

    const handleReply = (msg: ChatMessageResponse) => {
        const content = msg.type === 'TEXT' || msg.type === 'LINK'
            ? msg.content
            : msg.type === 'IMAGE'
                ? '[Hình ảnh]'
                : '[Tệp tin]';

        setReplyingTo({
            id: msg.id,
            senderName: msg.senderName,
            content: content,
            attachmentUrl: msg.attachmentUrl,
            type: msg.type
        });

        // Focus input
        setTimeout(() => {
            const input = document.querySelector('input[placeholder="Type a message..."]') as HTMLInputElement;
            if (input) input.focus();
        }, 100);
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0 || !selectedGroup) return;

        setSelectedFiles(prev => [...prev, ...files]);

        files.forEach(file => {
            const id = Math.random().toString(36).substring(7);
            const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');

            if (file.type.startsWith('image/') && !isHeic) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFilePreviews(prev => [...prev, {
                        id,
                        url: reader.result as string,
                        name: file.name,
                        type: file.type
                    }]);
                };
                reader.readAsDataURL(file);
            } else {
                setFilePreviews(prev => [...prev, {
                    id,
                    url: null,
                    name: file.name,
                    type: file.type
                }]);
            }
        });
    };

    const removeSelectedFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setFilePreviews(prev => prev.filter((_, i) => i !== index));
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };


    const handleTyping = useCallback(() => {
        if (!stompClientRef.current?.connected || !selectedGroup) return;
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        stompClientRef.current.publish({
            destination: `/app/chat.typing/${selectedGroup.id}`,
            body: JSON.stringify({ username: user.fullName || user.username, isTyping: true })
        });
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
            if (stompClientRef.current?.connected) {
                stompClientRef.current.publish({
                    destination: `/app/chat.typing/${selectedGroup.id}`,
                    body: JSON.stringify({ username: user.fullName || user.username, isTyping: false })
                });
            }
        }, 2000);
    }, [selectedGroup?.id]);

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    };


    const handleOpenPreview = (url: string, name: string, type: any) => {
        setPreviewData({
            isOpen: true,
            url,
            name,
            type
        });
    };

    const renderMessageContent = (msg: ChatMessageResponse) => {
        if (msg.type === 'IMAGE' && msg.attachmentUrl) {
            return (
                <div className="overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
                    onClick={() => handleOpenPreview(msg.attachmentUrl!, msg.attachmentName || 'Hình ảnh', 'IMAGE')}
                >
                    <div className="max-w-sm rounded-none overflow-hidden bg-gray-100 shadow-sm border border-gray-100">
                        <img
                            src={msg.attachmentUrl && msg.attachmentUrl.includes('cloudinary.com')
                                ? msg.attachmentUrl.replace('/upload/', '/upload/f_auto,q_auto/')
                                : msg.attachmentUrl}
                            alt={msg.attachmentName || 'Image'}
                            className="w-full h-auto block"
                            style={{ maxHeight: '400px', objectFit: 'contain' }}
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23f0f0f0"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="16" fill="%23999" text-anchor="middle" dominant-baseline="middle"%3ELỗi tải ảnh%3C/text%3E%3C/svg%3E';
                            }}
                        />
                    </div>
                    {msg.content && <p className="mt-2 text-sm px-1 pb-1">{msg.content}</p>}
                </div>
            );
        }
        if (msg.type === 'FILE' && msg.attachmentUrl) {
            const fileName = msg.attachmentName || 'Download file';
            const isPDF = fileName.toLowerCase().endsWith('.pdf');
            const isWord = fileName.toLowerCase().endsWith('.doc') || fileName.toLowerCase().endsWith('.docx');
            const isExcel = fileName.toLowerCase().endsWith('.xls') || fileName.toLowerCase().endsWith('.xlsx');

            const viewableUrl = getViewableFileUrl(msg.attachmentUrl);

            const handleDownload = (e: React.MouseEvent) => {
                e.stopPropagation();
                e.preventDefault();
                downloadFile(msg.attachmentUrl!, fileName);
            };

            return (
                <div
                    onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;
                        if (isPDF) {
                            window.open(viewableUrl, '_blank', 'noopener,noreferrer');
                        } else {
                            handleOpenPreview(msg.attachmentUrl!, fileName, 'FILE');
                        }
                    }}
                    className="flex flex-col w-[300px] sm:w-[350px] bg-[#EAF2FF] border-2 border-[#D6E6FF] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group/file"
                >
                    {/* Top Preview Area */}
                    <div className="bg-white m-3 mb-1 rounded-lg h-44 flex items-center justify-center relative overflow-hidden group">
                        {/* Background Icon */}
                        <div className={`relative opacity-20 group-hover:opacity-30 transition-opacity`}>
                            <FileIcon size={80} className="text-gray-400" />
                            <div className="absolute -right-4 -bottom-4 bg-white/50 rounded-lg p-2 rotate-12">
                                <FileIcon size={40} className="text-gray-300" />
                            </div>
                            <div className="absolute -left-4 -top-4 bg-white/50 rounded-lg p-2 -rotate-12">
                                <FileIcon size={40} className="text-gray-300" />
                            </div>
                        </div>

                        {/* Status Overlay */}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 bg-white/80 rounded-full border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-[10px] font-bold text-gray-500">
                                {isPDF ? 'Click để xem PDF' : 'Trạng thái: Sẵn sàng'}
                            </span>
                        </div>
                    </div>

                    {/* Bottom Info Section */}
                    <div className="p-3 flex items-center gap-3">
                        {/* File Icon */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${isPDF ? 'bg-[#FF7A7A]' : isWord ? 'bg-[#4B8BFF]' : isExcel ? 'bg-[#21A366]' : 'bg-gray-400'
                            }`}>
                            {isPDF ? (
                                <span className="text-white font-black text-xs">PDF</span>
                            ) : (
                                <FileText size={24} className="text-white" />
                            )}
                        </div>

                        {/* File Details */}
                        <div className="flex-1 min-w-0 pr-2">
                            <h4 className="text-sm font-bold text-gray-800 truncate leading-tight mb-0.5" title={fileName}>
                                {fileName}
                            </h4>
                            <div className="flex items-center gap-1.5">
                                <div className="flex items-center justify-center w-4 h-4 rounded-full bg-green-100">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                </div>
                                <span className="text-[10px] font-bold text-green-600">Đã có trên hệ thống</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5">
                            {isPDF ? (
                                <a
                                    href={viewableUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1.5 bg-white text-gray-400 hover:text-red-600 rounded-lg border border-gray-100 transition-colors shadow-sm"
                                    title="Xem PDF"
                                >
                                    <Eye size={18} />
                                </a>
                            ) : (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                    className="p-1.5 bg-white text-gray-400 hover:text-blue-600 rounded-lg border border-gray-100 transition-colors shadow-sm"
                                    title="Xem thư mục"
                                >
                                    <Folder size={18} />
                                </button>
                            )}
                            <button
                                onClick={handleDownload}
                                className="p-1.5 bg-white text-gray-400 hover:text-blue-600 rounded-lg border border-gray-100 transition-colors shadow-sm"
                                title="Tải xuống"
                            >
                                <Download size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        if (msg.type === 'LINK' && msg.content) {
            return (
                <a
                    href={msg.content.startsWith('http') ? msg.content : `https://${msg.content}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 underline break-all hover:opacity-80 transition-opacity ${msg.isOwn ? 'text-white' : 'text-blue-600'}`}
                >
                    <ExternalLink size={16} className="flex-shrink-0" />
                    {msg.content}
                </a>
            );
        }
        return <p>{msg.content}</p>;
    };

    return (
        <div className="flex h-[calc(100vh-80px)] bg-gray-50 overflow-hidden">
            {/* Sidebar - Group List */}
            <div className={`${selectedGroup ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 bg-[#FCF8F5] border-r border-gray-100 rounded-r-[32px] br-10 ml-2 mt-4`}>
                <div className="p-6 pt-8 pb-4">
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-6 tracking-tight">Tin nhắn nhóm</h1>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm tên nhóm hoặc id giáo viên"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-12 py-4 border-none rounded-[32px] bg-white shadow-sm focus:ring-2 focus:ring-orange-400 text-sm font-medium placeholder:text-gray-400"
                        />
                        <button
                            onClick={() => setIsUnreadOnly(!isUnreadOnly)}
                            className={`absolute right-4 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-all ${isUnreadOnly ? 'bg-[#FF8C33] text-white' : 'text-gray-400 hover:bg-gray-100'}`}
                            title={isUnreadOnly ? "Hiện tất cả" : "Chỉ hiện chưa xem"}
                        >
                            <MessageCircle size={18} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 border-${themeColor}-500`}></div>
                        </div >
                    ) : (isUnreadOnly ? groups.filter(g => (g.unreadCount || 0) > 0) : groups).filter(group =>
                        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        group.lecturerName?.toLowerCase().includes(searchTerm.toLowerCase())
                    ).length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                            <MessageCircle size={32} className="mb-2" />
                            <p>{isUnreadOnly ? "Không có tin nhắn chưa đọc" : "Chưa có nhóm chat nào"}</p>
                            {role === 'STUDENT' && !isUnreadOnly && (
                                <p className="text-sm text-gray-400 mt-1 text-center px-4">Giảng viên sẽ tạo nhóm chat cho lớp học</p>
                            )}
                        </div>
                    ) : (
                        (isUnreadOnly ? groups.filter(g => (g.unreadCount || 0) > 0) : groups)
                            .filter(group =>
                                group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                group.lecturerName?.toLowerCase().includes(searchTerm.toLowerCase())
                            )
                            .map(group => {
                                const isSelected = selectedGroup?.id === group.id;
                                return (
                                    <div
                                        key={group.id}
                                        onClick={() => handleGroupSelect(group)}
                                        className={`p-4 rounded-[24px] cursor-pointer transition-all duration-300 relative bg-white border-2 ${isSelected
                                            ? 'border-[#FF8C33] shadow-[0_0_15px_rgba(255,140,51,0.25)]'
                                            : 'border-transparent hover:bg-gray-50 shadow-sm'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            {(() => {
                                                const studentMembers = group.members?.filter(m => m.role === 'STUDENT') || [];
                                                const avatars = studentMembers.slice(0, 2);

                                                if (avatars.length === 0) {
                                                    return (
                                                        <div className={`w-14 h-14 ${isSelected ? 'bg-orange-100' : 'bg-[#FFF1E7]'} rounded-[20px] flex items-center justify-center transition-colors flex-shrink-0`}>
                                                            <Users className={isSelected ? 'text-orange-600' : 'text-[#FF8C33]'} size={28} />
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div className="flex -space-x-8 -space-y-4 mx-1 flex-shrink-0">
                                                        {avatars.map((member, idx) => (
                                                            <div
                                                                key={member.userId}
                                                                className={`w-12 h-12 rounded-full border-[3px] border-white dark:border-zinc-950 overflow-hidden shadow-sm relative ${idx === 0 ? 'z-20' : 'z-10 bg-orange-200'}`}
                                                            >
                                                                {member.avatar ? (
                                                                    <>
                                                                        <img
                                                                            src={`${member.avatar}${member.avatar.includes('?') ? '&' : '?'}t=${new Date().getTime()}`}
                                                                            alt={member.fullName}
                                                                            className="w-full h-full object-cover"
                                                                            onError={(e) => {
                                                                                (e.target as HTMLElement).style.display = 'none';
                                                                                (e.target as HTMLElement).nextElementSibling?.classList.remove('hidden');
                                                                            }}
                                                                        />
                                                                        <div className="hidden w-full h-full bg-orange-100 flex text-fpt-orange flex-col items-center justify-center font-bold text-lg uppercase">
                                                                            {member.fullName.split(' ').pop()?.charAt(0) || 'U'}
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <div className="w-full h-full bg-orange-100 flex text-fpt-orange flex-col items-center justify-center font-bold text-lg uppercase">
                                                                        {member.fullName.split(' ').pop()?.charAt(0) || 'U'}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                            <div className=" flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className="font-bold text-lg text-gray-900 truncate tracking-tight">{group.name}</h3>
                                                    <span className="text-[12px] text-gray-400 font-bold whitespace-nowrap pt-1">
                                                        {group.lastMessage?.sentAt ? formatTime(group.lastMessage.sentAt) : ''}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center gap-2">
                                                    <p className="text-sm text-gray-500 truncate font-bold">
                                                        {group.lastMessage
                                                            ? (() => {
                                                                const lm = group.lastMessage;
                                                                let preview = '';
                                                                if (lm.type === 'IMAGE') preview = '🖼️ Hình ảnh';
                                                                else if (lm.type === 'FILE') preview = `📎 ${lm.attachmentName || lm.content || 'Tệp tin'}`;
                                                                else if (lm.type === 'LINK') preview = `🔗 ${lm.content || 'Liên kết'}`;
                                                                else preview = lm.content || '';
                                                                return <>{lm.senderName}: {preview}</>;
                                                            })()
                                                            : `Mr.${group.lecturerName || 'An'}: `
                                                        }
                                                    </p>
                                                    {group.unreadCount !== undefined && group.unreadCount > 0 && !isSelected && (
                                                        <div className="flex-shrink-0 w-5 h-5 bg-[#FF8C33] text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-md">
                                                            {group.unreadCount}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                    )}
                </div >
            </div >

            {/* Chat Area & Detail Sidebar Container */}
            {
                selectedGroup ? (
                    <div className="flex-1 flex flex-row overflow-hidden bg-white m-4 rounded-3xl shadow-sm border border-gray-100 relative">
                        {/* Chat Column */}
                        <div className="flex-1 flex flex-col min-w-0 relative h-full">
                            {/* Chat Header */}
                            <div className="flex items-center gap-3 p-4 bg-white border-b sticky top-0 z-10">
                                <button
                                    onClick={() => setSelectedGroup(null)}
                                    className="md:hidden p-2 hover:bg-gray-100 rounded-full"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                {(() => {
                                    const studentMembers = selectedGroup.members?.filter(m => m.role === 'STUDENT') || [];
                                    const avatars = studentMembers.slice(0, 2);

                                    if (avatars.length === 0) {
                                        return (
                                            <div className={`w-10 h-10 ${bgColorLight} rounded-full flex items-center justify-center flex-shrink-0`}>
                                                <Users className={textColor} size={20} />
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="flex  -space-x-6 -space-y-2 mx-1 flex-shrink-0">
                                            {avatars.map((member, idx) => (
                                                <div
                                                    key={member.userId}
                                                    className={`w-10 h-10 rounded-full border-[2px] border-white dark:border-zinc-950 overflow-hidden shadow-sm relative ${idx === 0 ? 'z-20' : 'z-10 bg-orange-200'}`}
                                                >
                                                    {member.avatar ? (
                                                        <>
                                                            <img
                                                                src={`${member.avatar}${member.avatar.includes('?') ? '&' : '?'}t=${new Date().getTime()}`}
                                                                alt={member.fullName}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    (e.target as HTMLElement).style.display = 'none';
                                                                    (e.target as HTMLElement).nextElementSibling?.classList.remove('hidden');
                                                                }}
                                                            />
                                                            <div className="hidden w-full h-full bg-orange-100 flex text-fpt-orange flex-col items-center justify-center font-bold text-sm uppercase">
                                                                {member.fullName.split(' ').pop()?.charAt(0) || 'U'}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="w-full h-full bg-orange-100 flex text-fpt-orange flex-col items-center justify-center font-bold text-sm uppercase">
                                                            {member.fullName.split(' ').pop()?.charAt(0) || 'U'}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                                <div className="flex-1">
                                    <h2 className="font-extrabold text-2xl text-gray-900 uppercase tracking-tight">{selectedGroup.name}</h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setShowDetailSidebar(!showDetailSidebar);
                                            setDetailViewMode('INFO');
                                        }}
                                        className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${showDetailSidebar ? textColor : 'text-gray-500'}`}
                                        title="Thông tin nhóm"
                                    >
                                        <Info size={20} />
                                    </button>
                                    <button
                                        onClick={() => setShowMembers(!showMembers)}
                                        className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
                                    >
                                        <Users size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Members Panel (Floating) */}
                            {showMembers && selectedGroup.members && (
                                <div className="absolute right-4 top-16 w-64 bg-white shadow-xl border rounded-2xl p-4 z-30">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="font-bold">Thành viên</h3>
                                        <button onClick={() => setShowMembers(false)} className="p-1 hover:bg-gray-100 rounded-full">
                                            <X size={18} />
                                        </button>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto space-y-1">
                                        {selectedGroup.members.map(member => (
                                            <div key={member.userId} className="flex items-center gap-3 py-2 px-1 hover:bg-gray-50 rounded-lg">
                                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                                                    {member.avatar ? (
                                                        <img src={member.avatar} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-xs font-bold text-gray-500">{member.fullName.charAt(0)}</span>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold truncate">{member.fullName}</p>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase">{member.role === 'LECTURER' ? 'Giảng viên' : 'Sinh viên'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FFF5E9]">
                                {messagesLoading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <div className={`animate-spin rounded-full h-8 w-8 border-b-2 border-${themeColor}-500`}></div>
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-30">
                                        <MessageCircle size={64} className="mb-4" />
                                        <p className="text-lg font-bold">Chưa có tin nhắn nào</p>
                                    </div>
                                ) : (
                                    messages.map((msg, index) => {
                                        const showDate = index === 0 ||
                                            formatDate(messages[index - 1].sentAt) !== formatDate(msg.sentAt);
                                        return (
                                            <React.Fragment key={msg.id}>
                                                {showDate && (
                                                    <div className="flex justify-center my-4">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-1.5 bg-gray-100/50 rounded-full">
                                                            {formatDate(msg.sentAt)}
                                                        </span>
                                                    </div>
                                                )}
                                                <div
                                                    ref={el => messageRefs.current[msg.id] = el}
                                                    className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
                                                >
                                                    <div className={`flex gap-3 max-w-[80%] ${msg.isOwn ? 'flex-row-reverse' : ''}`}>
                                                        {!msg.isOwn && (
                                                            <div className="w-9 h-9 bg-orange-100 rounded-full flex-shrink-0 flex items-center justify-center border-2 border-white shadow-sm self-end mb-1">
                                                                {msg.senderAvatar ? (
                                                                    <img src={msg.senderAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                                                                ) : (
                                                                    <span className="text-xs font-bold text-orange-600">{msg.senderName.charAt(0)}</span>
                                                                )}
                                                            </div>
                                                        )}
                                                        <div className="flex flex-col">
                                                            {!msg.isOwn && (
                                                                <div className="flex items-center gap-2 mb-1 px-1">
                                                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{msg.senderName}</span>
                                                                    {msg.senderRole === 'LECTURER' && (
                                                                        <span className="text-[8px] bg-orange-500 text-white px-1.5 py-0.5 rounded-sm font-black flex items-center h-4">GV</span>
                                                                    )}
                                                                    <span className="text-[9px] font-bold text-gray-300 ml-1 italic">{formatTime(msg.sentAt)}</span>
                                                                </div>
                                                            )}
                                                            <div
                                                                className="relative group/msg cursor-pointer"
                                                                onClick={() => setExpandedMessageId(expandedMessageId === msg.id ? null : msg.id)}
                                                            >
                                                                <div className={`relative ${(msg.type === 'IMAGE' || msg.type === 'FILE') && !msg.isDeleted ? 'p-0 overflow-hidden rounded-none shadow-none' : 'p-4 rounded-3xl shadow-sm'} ${msg.isOwn
                                                                    ? `bg-[#FF8C33] ${(msg.type === 'IMAGE' || msg.type === 'FILE') && !msg.isDeleted ? 'bg-transparent' : ''} text-white ${(msg.type === 'IMAGE' || msg.type === 'FILE') && !msg.isDeleted ? '' : 'rounded-br-sm'}`
                                                                    : `bg-white ${(msg.type === 'IMAGE' || msg.type === 'FILE') && !msg.isDeleted ? 'bg-transparent border-none' : 'border border-gray-100'} ${(msg.type === 'IMAGE' || msg.type === 'FILE') && !msg.isDeleted ? '' : 'rounded-bl-sm'} text-gray-800`
                                                                    }`}>
                                                                    {msg.replyToId && (
                                                                        <div className={`mb-2 p-2 rounded-lg text-xs border-l-2 ${msg.isOwn
                                                                            ? 'bg-orange-600/20 border-white/50 text-white/90'
                                                                            : 'bg-gray-100 border-orange-500 text-gray-500'
                                                                            }`}>
                                                                            <p className="font-bold mb-0.5">Trả lời {msg.replyToSenderName || ''}:</p>
                                                                            <div className="flex items-center gap-2">
                                                                                {msg.replyToType === 'IMAGE' && msg.replyToAttachmentUrl && (
                                                                                    <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleOpenPreview(msg.replyToAttachmentUrl!, 'Ảnh trả lời', 'IMAGE');
                                                                                        }}
                                                                                    >
                                                                                        <img
                                                                                            src={msg.replyToAttachmentUrl.includes('cloudinary.com')
                                                                                                ? msg.replyToAttachmentUrl.replace('/upload/', '/upload/c_thumb,w_100,h_100,f_auto/')
                                                                                                : msg.replyToAttachmentUrl}
                                                                                            alt="Reply thumbnail"
                                                                                            className="w-full h-full object-cover"
                                                                                        />
                                                                                    </div>
                                                                                )}
                                                                                <p className="line-clamp-2 italic text-xs">
                                                                                    {msg.replyToContent || (msg.replyToType === 'IMAGE' ? '[Hình ảnh]' : (msg.replyToType === 'FILE' ? '[Tệp tin]' : ''))}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {msg.isDeleted ? (
                                                                        <p className="text-sm italic opacity-70">Tin nhắn đã bị thu hồi</p>
                                                                    ) : (
                                                                        renderMessageContent(msg)
                                                                    )}
                                                                </div>
                                                                {!msg.isDeleted && msg.isOwn && (
                                                                    <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity z-20 -left-[5.5rem]`}>
                                                                        <button
                                                                            onClick={() => handleReply(msg)}
                                                                            className="p-2 bg-white/90 text-blue-500 rounded-full shadow-md hover:bg-blue-50"
                                                                            title="Trả lời"
                                                                        >
                                                                            <Reply size={14} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteMessage(msg.id)}
                                                                            className="p-2 bg-white/90 text-red-500 rounded-full shadow-md hover:bg-red-50"
                                                                            title="Thu hồi"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </div>
                                                                )}

                                                                {!msg.isDeleted && !msg.isOwn && (
                                                                    <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity z-20 -right-12`}>
                                                                        <button
                                                                            onClick={() => handleReply(msg)}
                                                                            className="p-2 bg-white/90 text-blue-500 rounded-full shadow-md hover:bg-blue-50"
                                                                            title="Trả lời"
                                                                        >
                                                                            <Reply size={14} />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {msg.isOwn && (
                                                                <>
                                                                    {/* Render Read Receipts - Only when clicked OR Latest Message */}
                                                                    {!msg.isDeleted && (expandedMessageId === msg.id || index === messages.length - 1) && msg.readers && msg.readers.filter(r => Number(r.userId) !== Number(msg.senderId)).length > 0 && (
                                                                        <div className="flex items-center mt-1 justify-end px-1 relative z-10 min-h-[20px] gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                                            <div className="flex items-center -space-x-2 transition-all duration-300 hover:space-x-1">
                                                                                {msg.readers
                                                                                    .filter(r => Number(r.userId) !== Number(msg.senderId))
                                                                                    .slice(0, 5)
                                                                                    .map((reader) => (
                                                                                        <div
                                                                                            key={reader.userId}
                                                                                            className="w-5 h-5 rounded-full border-2 border-white shadow-sm overflow-hidden bg-gray-200 flex-shrink-0 transition-transform hover:scale-125 z-0 hover:z-10"
                                                                                            title={reader.fullName}
                                                                                        >
                                                                                            {reader.avatar ? (
                                                                                                <img src={reader.avatar} alt={reader.fullName} className="w-full h-full object-cover" />
                                                                                            ) : (
                                                                                                <div className={`w-full h-full flex items-center justify-center text-[10px] font-bold text-white ${bgColor}`}>
                                                                                                    {reader.fullName?.charAt(0) || '?'}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    ))}
                                                                                {msg.readers.filter(r => Number(r.userId) !== Number(msg.senderId)).length > 5 && (
                                                                                    <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm bg-gray-100 flex items-center justify-center text-[8px] font-bold text-gray-500 z-0">
                                                                                        +{msg.readers.filter(r => Number(r.userId) !== Number(msg.senderId)).length - 5}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex justify-end mt-1 px-1">
                                                                        {msg.isSending && (
                                                                            <span className="text-[9px] font-bold text-orange-400 mr-2 animate-pulse">Đang gửi...</span>
                                                                        )}
                                                                        <span className="text-[9px] font-bold text-gray-300 italic">{formatTime(msg.sentAt)}</span>
                                                                    </div>
                                                                </>
                                                            )}
                                                            {!msg.isOwn && (
                                                                <>
                                                                    {/* Render Read Receipts - Only when clicked OR Latest Message */}
                                                                    {!msg.isDeleted && (expandedMessageId === msg.id || index === messages.length - 1) && msg.readers && msg.readers.filter(r => Number(r.userId) !== Number(msg.senderId)).length > 0 && (
                                                                        <div className="flex items-center mt-1 justify-start px-1 relative z-10 min-h-[20px] gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                                            <div className="flex items-center -space-x-2 transition-all duration-300 hover:space-x-1">
                                                                                {msg.readers
                                                                                    .filter(r => Number(r.userId) !== Number(msg.senderId))
                                                                                    .slice(0, 5)
                                                                                    .map((reader) => (
                                                                                        <div
                                                                                            key={reader.userId}
                                                                                            className="w-5 h-5 rounded-full border-2 border-white shadow-sm overflow-hidden bg-gray-200 flex-shrink-0 transition-transform hover:scale-125 z-0 hover:z-10"
                                                                                            title={reader.fullName}
                                                                                        >
                                                                                            {reader.avatar ? (
                                                                                                <img src={reader.avatar} alt={reader.fullName} className="w-full h-full object-cover" />
                                                                                            ) : (
                                                                                                <div className={`w-full h-full flex items-center justify-center text-[10px] font-bold text-white ${bgColor}`}>
                                                                                                    {reader.fullName?.charAt(0) || '?'}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    ))}
                                                                                {msg.readers.filter(r => Number(r.userId) !== Number(msg.senderId)).length > 5 && (
                                                                                    <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm bg-gray-100 flex items-center justify-center text-[8px] font-bold text-gray-500 z-0">
                                                                                        +{msg.readers.filter(r => Number(r.userId) !== Number(msg.senderId)).length - 5}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </React.Fragment>
                                        );
                                    })
                                )}
                                {typingUsers.length > 0 && (
                                    <div className="flex items-center gap-2 text-gray-400 text-xs font-bold bg-white/50 py-2 px-4 rounded-full w-fit animate-pulse mb-2">
                                        <div className="flex gap-1">
                                            <span className={`w-1.5 h-1.5 ${bgColor} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></span>
                                            <span className={`w-1.5 h-1.5 ${bgColor} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></span>
                                            <span className={`w-1.5 h-1.5 ${bgColor} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></span>
                                        </div>
                                        <span className={`uppercase tracking-wider ${textColor}`}>{typingUsers.join(', ')} đang soạn tin...</span>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-4 bg-white border-t">
                                {/* File Preview Area */}
                                {filePreviews.length > 0 && (
                                    <div className="mb-3 flex flex-wrap gap-3 p-2 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                                        {filePreviews.map((preview, index) => (
                                            <div key={preview.id} className="relative group">
                                                {preview.url ? (
                                                    <div className="relative w-24 h-24 rounded-none overflow-hidden border-2 border-white shadow-sm">
                                                        <img src={preview.url} alt="Preview" className="w-full h-full object-cover" />
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center w-24 h-24 text-gray-600 bg-white p-2 rounded-none border-2 border-white shadow-sm text-center">
                                                        <FileText size={24} className="text-orange-500 mb-1" />
                                                        <span className="text-[10px] font-bold truncate w-full px-1">{preview.name}</span>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => removeSelectedFile(index)}
                                                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg z-10"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}


                                {replyingTo && (
                                    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-b border-gray-100 animate-in slide-in-from-bottom-2 duration-200">
                                        <div className="flex flex-col text-sm border-l-2 border-orange-400 pl-2">
                                            <span className="font-bold text-orange-500 text-xs mb-0.5">Đang trả lời {replyingTo.senderName}</span>
                                            <div className="text-gray-600 line-clamp-1 text-xs flex items-center gap-1">
                                                {replyingTo.content === '[Hình ảnh]' && <ImageIcon size={12} />}
                                                {replyingTo.content === '[Tệp tin]' && <FileIcon size={12} />}
                                                {replyingTo.content}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setReplyingTo(null)}
                                            className="p-1.5 hover:bg-gray-200 rounded-full text-gray-400 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}

                                <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-3xl border border-gray-100">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2.5 bg-[#FF8C33] text-white rounded-full shadow-md hover:bg-orange-600 transition-all active:scale-95 flex items-center justify-center"
                                    >
                                        <Plus size={20} />
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        accept="image/*,.heic,.heif,.pdf,.doc,.docx,.xls,.xlsx"
                                        multiple
                                    />
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => {
                                            setNewMessage(e.target.value);
                                            handleTyping();
                                        }}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Type a message..."
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-800 py-2"
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={(!newMessage.trim() && selectedFiles.length === 0) || !selectedGroup}
                                        className={`p-3 bg-[#FF8C33] text-white rounded-full shadow-lg shadow-orange-200 transition-all active:scale-90 disabled:opacity-50 disabled:grayscale`}
                                    >
                                        <Send size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Detail Sidebar (Now song song Column Chat) */}
                        {showDetailSidebar && (
                            <div className="w-[380px] bg-white border-l h-full flex flex-col animate-in slide-in-from-right duration-300">
                                {/* Sidebar Header */}
                                <div className="p-4 border-b flex items-center gap-3 bg-white sticky top-0 z-10">
                                    <button
                                        onClick={() => detailViewMode === 'INFO' ? setShowDetailSidebar(false) : setDetailViewMode('INFO')}
                                        className="p-1 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                                    >
                                        <ArrowLeft size={20} />
                                    </button>
                                    <h2 className="font-bold text-gray-800 text-sm">
                                        {detailViewMode === 'INFO' && 'Thông tin nhóm'}
                                        {detailViewMode === 'MEMBERS' && 'Thành viên'}
                                        {detailViewMode === 'MEDIA' && 'Ảnh, file, link'}
                                    </h2>
                                </div>

                                {/* Sidebar Content */}
                                <div className="flex-1 overflow-y-auto">
                                    {detailViewMode === 'INFO' && (
                                        <div className="flex flex-col">
                                            {/* Group Banner */}
                                            <div className="py-12 flex flex-col items-center px-6">
                                                {(() => {
                                                    const studentMembers = selectedGroup.members?.filter(m => m.role === 'STUDENT') || [];
                                                    const avatars = studentMembers.slice(0, 2);

                                                    if (avatars.length === 0) {
                                                        return (
                                                            <div className={`w-24 h-24 ${bgColorLight} rounded-[32px] flex items-center justify-center mb-4 transition-transform hover:rotate-3 cursor-pointer`}>
                                                                <Users className="text-[#FF8C33]" size={56} />
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div className="flex -space-x-10 -space-y-6 mb-4 cursor-pointer">
                                                            {avatars.map((member, idx) => (
                                                                <div
                                                                    key={member.userId}
                                                                    className={`w-24 h-24 rounded-full border-[4px] border-white dark:border-zinc-950 overflow-hidden shadow-md relative transition-transform hover:-translate-y-1 ${idx === 0 ? 'z-20' : 'z-10 bg-orange-200'}`}
                                                                >
                                                                    {member.avatar ? (
                                                                        <>
                                                                            <img
                                                                                src={`${member.avatar}${member.avatar.includes('?') ? '&' : '?'}t=${new Date().getTime()}`}
                                                                                alt={member.fullName}
                                                                                className="w-full h-full object-cover"
                                                                                onError={(e) => {
                                                                                    (e.target as HTMLElement).style.display = 'none';
                                                                                    (e.target as HTMLElement).nextElementSibling?.classList.remove('hidden');
                                                                                }}
                                                                            />
                                                                            <div className="hidden w-full h-full bg-orange-100 flex text-fpt-orange flex-col items-center justify-center font-bold text-3xl uppercase">
                                                                                {member.fullName.split(' ').pop()?.charAt(0) || 'U'}
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <div className="w-full h-full bg-orange-100 flex text-fpt-orange flex-col items-center justify-center font-bold text-3xl uppercase">
                                                                            {member.fullName.split(' ').pop()?.charAt(0) || 'U'}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                                <h3 className="text-2xl font-black text-gray-800 text-center leading-tight mb-2 uppercase tracking-tight">{selectedGroup.name}</h3>
                                                <p className="text-gray-500 font-bold text-sm">Giảng viên: {selectedGroup.lecturerName || 'Mr. Alex'}</p>
                                            </div>

                                            {/* Actions List */}
                                            <div className="px-6 space-y-2">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Thông tin về đoạn chat</p>

                                                <button
                                                    onClick={() => setDetailViewMode('MEMBERS')}
                                                    className="w-full flex items-center justify-between py-4 group"
                                                >
                                                    <span className="text-sm font-bold text-gray-700 group-hover:text-orange-500 transition-colors">Xem thành viên trong đoạn chat</span>
                                                    <Users size={16} className="text-gray-400" />
                                                </button>

                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pt-6 mb-4">Hành động khác</p>

                                                <button
                                                    onClick={() => {
                                                        setDetailViewMode('MEDIA');
                                                        setMediaTab('IMAGE');
                                                    }}
                                                    className="w-full flex items-center justify-between py-4 group"
                                                >
                                                    <span className="text-sm font-bold text-gray-700 group-hover:text-orange-500 transition-colors">Ảnh, file, link</span>
                                                    <ImageIcon size={16} className="text-gray-400" />
                                                </button>

                                                <button className="w-full flex items-center justify-between py-4 group">
                                                    <span className="text-sm font-bold text-gray-700 group-hover:text-orange-500 transition-colors">Xem ghi chú lớp học</span>
                                                    <FileText size={16} className="text-gray-400" />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {detailViewMode === 'MEMBERS' && (
                                        <div className="p-4 space-y-4">
                                            {selectedGroup.members?.map(member => (
                                                <div key={member.userId} className="flex items-center gap-4 group">
                                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                                                        {member.avatar ? (
                                                            <img src={member.avatar} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-lg font-bold text-gray-400">{member.fullName.charAt(0)}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-gray-800 truncate">{member.fullName}</p>
                                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{member.role === 'LECTURER' ? 'Host' : 'Member'}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {detailViewMode === 'MEDIA' && (
                                        <div className="flex flex-col h-full">
                                            <div className="flex p-1.5 bg-[#FFF1E7] rounded-[24px] mx-6 mt-4 mb-6">
                                                {(['IMAGE', 'FILE', 'LINK'] as const).map((tab) => (
                                                    <button
                                                        key={tab}
                                                        onClick={() => setMediaTab(tab)}
                                                        className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-[18px] transition-all duration-300 ${mediaTab === tab
                                                            ? 'bg-white shadow-md text-[#FF8C33]'
                                                            : 'text-gray-400 hover:text-orange-500'
                                                            }`}
                                                    >
                                                        {tab === 'IMAGE' ? 'Ảnh' : tab === 'FILE' ? 'File' : 'Link'}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="px-6 pb-6 overflow-y-auto">
                                                {mediaTab === 'IMAGE' && (
                                                    <div className="grid grid-cols-3 gap-3">
                                                        {messages.filter(m => m.type === 'IMAGE' && !m.isDeleted).map(m => (
                                                            <div
                                                                key={m.id}
                                                                onClick={() => handleOpenPreview(m.attachmentUrl!, m.attachmentName || 'Ảnh', 'IMAGE')}
                                                                className="relative w-full pb-[100%] bg-gray-50 rounded-[14px] overflow-hidden shadow-sm hover:scale-[1.05] transition-transform duration-300 cursor-pointer border-2 border-white"
                                                            >
                                                                <img src={m.attachmentUrl && m.attachmentUrl.includes('cloudinary.com')
                                                                    ? m.attachmentUrl.replace('/upload/', '/upload/f_auto,q_auto/')
                                                                    : m.attachmentUrl!} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                                            </div>
                                                        ))}
                                                        {messages.filter(m => m.type === 'IMAGE' && !m.isDeleted).length === 0 && (
                                                            <div className="col-span-3 text-center py-20 opacity-20">
                                                                <ImageIcon size={48} className="mx-auto mb-2" />
                                                                <p className="text-xs font-black uppercase tracking-widest">Không có ảnh</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {mediaTab === 'FILE' && (
                                                    <div className="space-y-4">
                                                        {messages.filter(m => m.type === 'FILE' && !m.isDeleted).map(m => (
                                                            <div
                                                                key={m.id}
                                                                onClick={() => {
                                                                    handleOpenPreview(m.attachmentUrl!, m.attachmentName || 'Untitled File', m.attachmentName?.toLowerCase().endsWith('.pdf') ? 'PDF' : 'FILE');
                                                                }}
                                                                className="flex items-center gap-4 group cursor-pointer"
                                                            >
                                                                <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl group-hover:bg-blue-500 group-hover:text-white transition-all">
                                                                    <FileText size={20} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-bold text-gray-800 truncate group-hover:text-blue-500 transition-colors">{m.attachmentName || 'Untitled File'}</p>
                                                                    <p className="text-[10px] text-gray-400 font-bold uppercase">{formatTime(m.sentAt)}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {messages.filter(m => m.type === 'FILE' && !m.isDeleted).length === 0 && (
                                                            <div className="text-center py-20 opacity-20">
                                                                <FileText size={48} className="mx-auto mb-2" />
                                                                <p className="text-xs font-black uppercase tracking-widest">Không có file</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {mediaTab === 'LINK' && (
                                                    <div className="space-y-4">
                                                        {messages.filter(m => m.type === 'LINK' && !m.isDeleted).map(m => (
                                                            <a
                                                                key={m.id}
                                                                href={m.content?.startsWith('http') ? m.content : `https://${m.content}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-4 group cursor-pointer"
                                                            >
                                                                <div className="p-3 bg-green-50 text-green-500 rounded-2xl group-hover:bg-green-500 group-hover:text-white transition-all">
                                                                    <ExternalLink size={20} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-bold text-gray-800 truncate group-hover:text-green-500 transition-colors">{m.content}</p>
                                                                    <p className="text-[10px] text-gray-400 font-bold uppercase">{formatTime(m.sentAt)}</p>
                                                                </div>
                                                            </a>
                                                        ))}
                                                        {messages.filter(m => m.type === 'LINK' && !m.isDeleted).length === 0 && (
                                                            <div className="text-center py-20 opacity-20">
                                                                <ExternalLink size={48} className="mx-auto mb-2" />
                                                                <p className="text-xs font-black uppercase tracking-widest">Không có link</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50">
                        <div className="text-center text-gray-500">
                            <MessageCircle size={64} className="mx-auto mb-4 opacity-10" />
                            <h2 className="text-xl font-black uppercase tracking-tight mb-2">Chọn một cuộc trò chuyện</h2>
                            <p className="text-sm font-medium">Bắt đầu kết nối với lớp học của bạn</p>
                        </div>
                    </div>
                )
            }

            <ConfirmModal
                isOpen={isDeleteDialogOpen}
                onClose={() => {
                    setIsDeleteDialogOpen(false);
                    setMessageToDelete(null);
                }}
                onConfirm={confirmDelete}
                title="Thu hồi tin nhắn"
                message="Bạn có chắc chắn muốn thu hồi tin nhắn này không? Hành động này không thể hoàn tác."
                confirmLabel="Thu hồi"
                cancelLabel="Hủy"
                type="danger"
            />

            {/* Minimal Zalo-like Preview Overlay */}
            {previewData && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 animate-in fade-in duration-200">
                    {/* Minimal Header */}
                    <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between text-white/70 z-10 bg-gradient-to-b from-black/50 to-transparent">
                        <div className="flex items-center gap-3 pl-4">
                            <span className="text-sm font-bold truncate max-w-[200px] sm:max-w-md">{previewData.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <a
                                href={previewData.url!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:text-white transition-colors"
                                title="Xem bản gốc"
                            >
                                <ExternalLink size={20} />
                            </a>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    downloadFile(previewData.url!, previewData.name || 'file');
                                }}
                                className="p-2 hover:text-white transition-colors"
                                title="Tải xuống"
                            >
                                <Download size={20} />
                            </button>
                            <button
                                onClick={() => setPreviewData(null)}
                                className="p-2 hover:text-white transition-colors ml-2"
                                title="Đóng"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    {/* Media Content */}
                    <div className="w-full h-full flex items-center justify-center p-4 pt-16 overflow-hidden" onClick={() => setPreviewData(null)}>
                        {previewData.type === 'IMAGE' ? (
                            <img
                                src={previewData.url!.includes('cloudinary.com')
                                    ? previewData.url!.replace('/upload/', '/upload/f_auto,q_auto/')
                                    : previewData.url!}
                                alt=""
                                className="max-w-full max-h-full object-contain shadow-2xl animate-in zoom-in-95 duration-200"
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : previewData.type === 'PDF' && !previewData.url?.startsWith('file://') ? (
                            <div className="w-full h-full max-w-6xl max-h-[90vh] bg-white rounded-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                                <iframe
                                    src={previewData.url!}
                                    className="w-full h-full"
                                    title={previewData.name || 'PDF Preview'}
                                    onError={() => {
                                        toast.error('Không tải được tài liệu PDF');
                                        // Fallback to download
                                        downloadFile(previewData.url!, previewData.name || 'document.pdf');
                                        setPreviewData(null);
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="bg-white/10 p-12 rounded-3xl text-white text-center border border-white/10 backdrop-blur-md animate-in slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>
                                <FileText size={80} className="mx-auto mb-6 opacity-30" />
                                <h4 className="text-xl font-bold mb-2 tracking-tight">{previewData.name}</h4>
                                <p className="mb-8 opacity-60 text-sm">Loại file này hiện chưa hỗ trợ xem trực tiếp.</p>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        downloadFile(previewData.url!, previewData.name || 'file');
                                    }}
                                    className="px-8 py-3 bg-[#FF8C33] hover:bg-orange-600 transition-all rounded-full font-bold shadow-lg inline-flex items-center gap-3 active:scale-95 hover:scale-105"
                                >
                                    <Download size={20} />
                                    Tải xuống ngay
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div >
    );
};


export default MessagesPage;

