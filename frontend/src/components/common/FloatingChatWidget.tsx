import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Bot, Maximize2, Send, Loader2, User, ExternalLink, X,
    Plus
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router-dom';
import { chatService, AIChatMessage, AIChatSession, ContinuationRequest, MissingField } from '../../services/api/chatService';
import toast from "@utils/toast";
import { format } from 'date-fns';

// ─── Mini Message Item ────────────────────────────────────────────────────────
const MiniMsg: React.FC<{ msg: AIChatMessage; onContinue: (continuation: ContinuationRequest) => void }> = ({ msg, onContinue }) => (
    <div className={`flex gap-2 ${msg.role === 'USER' ? 'flex-row-reverse' : ''}`}>
        <div
            className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'USER' ? 'bg-fpt-orange' : 'bg-orange-100'
                }`}
        >
            {msg.role === 'USER'
                ? <User className="w-3 h-3 text-white" />
                : <Bot className="w-3 h-3 text-fpt-orange" />}
        </div>
        <div className={`max-w-[75%] ${msg.role === 'USER' ? 'items-end' : 'items-start'} flex flex-col`}>
            <div
                className={`px-3 py-2 rounded-2xl text-[11px] leading-relaxed ${msg.role === 'USER'
                    ? 'bg-fpt-orange !text-white rounded-tr-none shadow-orange-200/50'
                    : 'bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 rounded-tl-none border border-gray-100 dark:border-zinc-700'
                    }`}
            >
                <div className={`prose prose-xs max-w-none chat-table-wrapper ${msg.role === 'USER' ? 'prose-invert !text-white' : 'dark:prose-invert'}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
                {msg.redirectPath && (
                    <Link
                        to={msg.redirectPath}
                        className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 hover:text-white hover:bg-fpt-orange px-2 py-0.5 rounded-full border border-orange-200 hover:border-fpt-orange transition-all"
                    >
                        <ExternalLink className="w-2.5 h-2.5" />
                        Xem chi tiết
                    </Link>
                )}
                {msg.continuation && (
                    <button
                        onClick={() => onContinue(msg.continuation!)}
                        className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-orange-200 px-2 py-0.5 text-[10px] font-bold text-orange-600 transition hover:bg-fpt-orange hover:text-white"
                    >
                        <Send className="w-2.5 h-2.5" />
                        Tiếp
                    </button>
                )}
            </div>
            <span className="text-[9px] text-gray-400 mt-0.5 px-1">
                {format(new Date(msg.createdAt), 'HH:mm')}
            </span>
        </div>
    </div>
);

interface PendingFieldRequest {
    fields: MissingField[];
    pendingTool: string;
    originalMessage: string;
    pendingEntities?: Record<string, string>;
    agentLabel?: string;
    actionReview?: boolean;
}

// ─── Main Widget ──────────────────────────────────────────────────────────────
export const FloatingChatWidget: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_sessions, setSessions] = useState<AIChatSession[]>([]);
    const [currentSession, setCurrentSession] = useState<AIChatSession | null>(null);
    const [messages, setMessages] = useState<AIChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [hasNewMsg, setHasNewMsg] = useState(false);
    const [userRole, setUserRole] = useState('');
    const [userId, setUserId] = useState<string | null>(null);
    const [pendingFieldRequest, setPendingFieldRequest] = useState<PendingFieldRequest | null>(null);
    const [missingFieldValues, setMissingFieldValues] = useState<Record<string, string>>({});

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const lastUserIdRef = useRef<string | null>(null);

    // Load user role & ID - re-sync on route change
    useEffect(() => {
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const userData = JSON.parse(userStr);
                setUserRole(userData.role || '');
                setUserId(userData.id?.toString() || null);
            } else {
                setUserRole('');
                setUserId(null);
            }
        } catch {
            setUserRole('');
            setUserId(null);
        }
    }, [location.pathname]);

    // Reset session if user changes (account switch)
    useEffect(() => {
        if (userId && userId !== lastUserIdRef.current) {
            setCurrentSession(null);
            setMessages([]);
            lastUserIdRef.current = userId;
        }
    }, [userId]);

    // Load or create session on first open
    useEffect(() => {
        if (isOpen && !currentSession) {
            initSession();
        }
    }, [isOpen]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen) {
            setHasNewMsg(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const initSession = async () => {
        try {
            const data = await chatService.getSessions();
            if (data.length > 0) {
                const session = data[0];
                setCurrentSession(session);
                const msgs = await chatService.getMessages(session.id);
                setMessages(msgs);
                setPendingFieldRequest(null);
            } else {
                await handleNewSession();
            }
        } catch {
            // silently fail; widget still opens
        }
    };

    const handleNewSession = async () => {
        try {
            const newSession = await chatService.createSession();
            setSessions(prev => [newSession, ...prev]);
            setCurrentSession(newSession);
            setMessages([]);
            setPendingFieldRequest(null);
        } catch {
            toast.error('Không thể tạo phiên chat mới');
        }
    };

    const handleSend = useCallback(async () => {
        if (!inputValue.trim() || !currentSession || isLoading) return;
        const content = inputValue.trim();
        setInputValue('');
        setIsLoading(true);
        setPendingFieldRequest(null);

        const optimistic: AIChatMessage = {
            id: Date.now(),
            content,
            role: 'USER',
            createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimistic]);

        try {
            const response = await chatService.sendMessage(
                currentSession.id,
                content,
                'llama-3.1-8b-instant',
                'llama-3.3-70b-versatile'
            );
            const aiMsg: AIChatMessage = {
                id: Date.now() + 1,
                content: response.answer,
                role: 'ASSISTANT',
                createdAt: new Date().toISOString(),
                redirectPath: response.redirectPath,
                continuation: response.continuation,
            };
            setMessages(prev => [...prev, aiMsg]);
            if (response.missingFields?.length && response.pendingTool && response.originalMessage) {
                setPendingFieldRequest({
                    fields: response.missingFields,
                    pendingTool: response.pendingTool,
                    originalMessage: response.originalMessage,
                    pendingEntities: response.pendingEntities,
                    agentLabel: response.agentLabel,
                    actionReview: response.actionReview,
                });
                const initialValues: Record<string, string> = {};
                response.missingFields.forEach((field) => {
                    initialValues[field.id] = response.pendingEntities?.[field.id] ?? field.value ?? '';
                });
                setMissingFieldValues(initialValues);
            }

            if (!isOpen) setHasNewMsg(true);

            if (messages.length === 0) {
                const data = await chatService.getSessions();
                setSessions(data);
            }
        } catch {
            toast.error('Lỗi khi gửi tin nhắn');
        } finally {
            setIsLoading(false);
        }
    }, [inputValue, currentSession, isLoading, isOpen, messages.length]);

    const handleSubmitMissingFields = useCallback(async () => {
        if (!currentSession || !pendingFieldRequest || isLoading) return;
        setIsLoading(true);
        const mergedEntities = {
            ...(pendingFieldRequest.pendingEntities || {}),
            ...missingFieldValues,
        };
        if (pendingFieldRequest.actionReview) {
            mergedEntities.__action_confirmed__ = 'true';
        }

        try {
            const response = await chatService.sendMessage(
                currentSession.id,
                'Bổ sung thông tin cho yêu cầu trước',
                'llama-3.1-8b-instant',
                'llama-3.3-70b-versatile',
                mergedEntities,
                pendingFieldRequest.pendingTool,
                pendingFieldRequest.originalMessage,
                mergedEntities
            );

            const summary = Object.entries(missingFieldValues)
                .filter(([, value]) => value?.trim())
                .map(([key, value]) => `- ${key}: ${value}`)
                .join('\n');

            if (summary) {
                setMessages(prev => [...prev, {
                    id: Date.now(),
                    content: `Bổ sung thông tin:\n${summary}`,
                    role: 'USER',
                    createdAt: new Date().toISOString(),
                }]);
            }

            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                content: response.answer,
                role: 'ASSISTANT',
                createdAt: new Date().toISOString(),
                redirectPath: response.redirectPath,
                continuation: response.continuation,
            }]);

            if (response.missingFields?.length && response.pendingTool && response.originalMessage) {
                setPendingFieldRequest({
                    fields: response.missingFields,
                    pendingTool: response.pendingTool,
                    originalMessage: response.originalMessage,
                    pendingEntities: response.pendingEntities || mergedEntities,
                    agentLabel: response.agentLabel,
                    actionReview: response.actionReview,
                });
                const initialValues: Record<string, string> = {};
                response.missingFields.forEach((field) => {
                    initialValues[field.id] = (response.pendingEntities || mergedEntities)?.[field.id] ?? field.value ?? '';
                });
                setMissingFieldValues(initialValues);
            } else {
                setPendingFieldRequest(null);
                setMissingFieldValues({});
            }
        } catch {
            toast.error('Không thể gửi thông tin bổ sung');
        } finally {
            setIsLoading(false);
        }
    }, [currentSession, pendingFieldRequest, isLoading, missingFieldValues]);

    const handleContinue = useCallback(async (continuation: ContinuationRequest) => {
        if (!currentSession || isLoading) return;
        setIsLoading(true);

        try {
            const response = await chatService.sendMessage(
                currentSession.id,
                'Tiếp',
                'llama-3.1-8b-instant',
                'llama-3.3-70b-versatile',
                undefined,
                undefined,
                undefined,
                undefined,
                continuation
            );

            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                content: response.answer,
                role: 'ASSISTANT',
                createdAt: new Date().toISOString(),
                redirectPath: response.redirectPath,
                continuation: response.continuation,
            }]);
        } catch {
            toast.error('Không thể tải thêm kết quả');
        } finally {
            setIsLoading(false);
        }
    }, [currentSession, isLoading]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleExpand = () => {
        navigate('/chatbot');
        setIsOpen(false);
    };

    // Hide chatbot on auth pages, full chatbot page, or if not logged in
    const isAuthPage = ['/login', '/forgot-password', '/change-password'].includes(location.pathname);
    const isFullChatPage = location.pathname.startsWith('/chatbot');
    const userJson = localStorage.getItem('user');
    const isAuthenticated = !!userJson;

    if (isAuthPage || isFullChatPage || !isAuthenticated) {
        return null;
    }

    const widgetRight = 'max(16px, env(safe-area-inset-right, 0px))';
    const widgetBottom = 'calc(88px + env(safe-area-inset-bottom, 0px))';
    const fabBottom = 'calc(24px + env(safe-area-inset-bottom, 0px))';

    return (
        <>
            {/* ── Popup Widget ─────────────────────────────────────────────────── */}
            <div
                className={`fixed z-[9998] transition-all duration-300 ease-out ${isOpen
                    ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                    : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
                    }`}
                style={{
                    width: 'min(380px, calc(100vw - 32px))',
                    right: widgetRight,
                    bottom: widgetBottom,
                }}
            >
                <div
                    className="bg-white rounded-[26px] shadow-2xl shadow-black/20 overflow-hidden border border-gray-100 flex flex-col"
                    style={{ height: 'min(640px, calc(100vh - 120px))' }}
                >

                    {/* Header */}
                    <div className="bg-fpt-orange px-4 py-3.5 flex items-center gap-3 flex-shrink-0">
                        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-sm leading-tight">
                                {userRole ? `FAMS AI ${userRole.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}` : 'FAMS AI Assistant'}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
                                <span className="text-orange-100 text-[10px] font-medium">Online</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleNewSession}
                                title="Chat mới"
                                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleExpand}
                                title="Mở rộng"
                                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
                            >
                                <Maximize2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                title="Đóng"
                                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div
                        className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2.5 bg-gray-50"
                    >
                        {messages.length === 0 && !isLoading && (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-6">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-fpt-orange to-orange-600 flex items-center justify-center shadow-lg">
                                    <Bot className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-[13px] font-bold text-gray-800">Xin chào! 👋</p>
                                    <p className="text-[11px] text-gray-500 mt-1">Tôi có thể giúp gì cho bạn hôm nay?</p>
                                </div>
                                <div className="grid grid-cols-1 gap-1.5 w-full px-2">
                                    {(userRole === 'LECTURER'
                                        ? ['Lịch dạy của tôi hôm nay', 'Danh sách lớp tôi dạy', 'Thông tin học kỳ']
                                        : userRole === 'STUDENT'
                                            ? ['Lịch học của tôi hôm nay', 'Điểm số học kỳ này', 'Thông tin học kỳ']
                                            : userRole === 'ACADEMIC_STAFF'
                                                ? ['Số sinh viên ngành CNTT', 'Thống kê điểm số', 'Thông tin học kỳ']
                                                : ['Lịch học của tôi hôm nay', 'Số sinh viên ngành CNTT', 'Thông tin học kỳ']
                                    ).map(s => (
                                        <button
                                            key={s}
                                            onClick={() => { setInputValue(s); inputRef.current?.focus(); }}
                                            className="text-left text-[11px] px-3 py-2 rounded-xl border border-orange-100 hover:border-fpt-orange hover:bg-orange-50 text-gray-600 hover:text-fpt-orange transition-all"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map(msg => (
                            <MiniMsg key={msg.id} msg={msg} onContinue={handleContinue} />
                        ))}

                        {pendingFieldRequest && (
                            <div className="rounded-2xl border border-orange-200 bg-white p-3 shadow-sm">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-fpt-orange">
                                    {pendingFieldRequest.agentLabel || 'Agent hỗ trợ'}
                                </p>
                                <p className="mt-1 text-[11px] font-semibold text-gray-800">
                                    {pendingFieldRequest.actionReview ? 'Xác nhận thông tin trước khi thực hiện thao tác' : 'Cần thêm thông tin để trả lời chính xác'}
                                </p>
                                <div className="mt-3 space-y-2">
                                    {pendingFieldRequest.fields.map((field) => (
                                        <div key={field.id} className="space-y-1">
                                            <label className="text-[10px] font-semibold text-gray-600">{field.label}</label>
                                            <input
                                                type={field.inputType === 'number' ? 'number' : field.inputType === 'date' ? 'date' : 'text'}
                                                value={missingFieldValues[field.id] || ''}
                                                onChange={(e) => setMissingFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                                placeholder={field.placeholder}
                                                className="w-full rounded-xl border border-orange-100 bg-orange-50/40 px-3 py-2 text-[11px] text-gray-800 outline-none focus:border-fpt-orange"
                                            />
                                        </div>
                                    ))}
                                    <div className="flex gap-2 pt-1">
                                        <button
                                            onClick={handleSubmitMissingFields}
                                            disabled={isLoading}
                                            className="flex-1 rounded-xl bg-fpt-orange px-3 py-2 text-[11px] font-bold text-white transition hover:bg-fpt-orange/90 disabled:opacity-60"
                                        >
                                            {pendingFieldRequest.actionReview ? 'Xác nhận và thực hiện' : 'Tiếp tục'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setPendingFieldRequest(null);
                                                setMissingFieldValues({});
                                            }}
                                            disabled={isLoading}
                                            className="rounded-xl border border-gray-200 px-3 py-2 text-[11px] font-semibold text-gray-500 transition hover:text-red-500"
                                        >
                                            Bỏ qua
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isLoading && (
                            <div className="flex gap-2">
                                <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center bg-orange-100">
                                    <Bot className="w-3 h-3 text-fpt-orange" />
                                </div>
                                <div className="px-3 py-2 bg-gray-100 rounded-2xl rounded-tl-none">
                                    <div className="flex gap-1 items-center h-4">
                                        <span className="w-1.5 h-1.5 rounded-full bg-fpt-orange animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-1.5 h-1.5 rounded-full bg-fpt-orange animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-1.5 h-1.5 rounded-full bg-fpt-orange animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="bg-white border-t border-gray-100 px-3.5 pb-6 pt-2.5 relative flex-shrink-0">
                        <div className="flex items-center gap-2 rounded-full bg-gray-50/80 px-2 py-1.5 transition-all duration-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-gray-100">
                            <div className="min-w-0 flex-1 rounded-full bg-white px-3 shadow-sm ring-1 ring-gray-200/60 transition-all focus-within:ring-gray-400">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputValue}
                                    onChange={e => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Nhập câu hỏi..."
                                    disabled={isLoading || !currentSession}
                                    className="h-8 w-full bg-transparent text-[11px] text-gray-700 placeholder:text-gray-400 outline-none border-none focus:ring-0"
                                />
                            </div>
                            <button
                                onClick={handleSend}
                                disabled={isLoading || !inputValue.trim() || !currentSession}
                                className="h-8 w-8 rounded-full bg-fpt-orange hover:bg-fpt-orange/90 text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 flex-shrink-0 shadow-sm"
                            >
                                {isLoading
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <Send className="w-3 h-3" />}
                            </button>
                        </div>
                        <div className="absolute bottom-1.5 left-0 right-0">
                            <p className="text-center text-[7px] text-gray-300 font-medium tracking-[0.2em] uppercase opacity-70">
                                Powered by FAMS AI
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── FAB Button ───────────────────────────────────────────────────── */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed z-[9999] w-14 h-14 rounded-full bg-fpt-orange shadow-lg shadow-orange-500/40 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
                    style={{
                        background: 'linear-gradient(135deg, #f97316, #ea580c)',
                        right: widgetRight,
                        bottom: fabBottom,
                    }}
                    title="FAMS AI Assistant"
                >
                    <Bot className="w-6 h-6 text-white" />

                    {hasNewMsg && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-white animate-pulse" />
                    )}
                </button>
            )}

            <style>{`
        .prose-xs p { margin: 0; }
        .prose-xs ul { margin: 0.25rem 0; padding-left: 1rem; }
        .prose-xs li { margin: 0.1rem 0; }
      `}</style>
        </>
    );
};

