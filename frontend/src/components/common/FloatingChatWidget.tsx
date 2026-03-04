import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bot, X, Maximize2, Send, Loader2, User, ExternalLink,
    Plus
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import { chatService, AIChatMessage, AIChatSession } from '../../services/api/chatService';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

// ─── Mini Message Item ────────────────────────────────────────────────────────
const MiniMsg: React.FC<{ msg: AIChatMessage }> = ({ msg }) => (
    <div className={`flex gap-2 ${msg.role === 'USER' ? 'flex-row-reverse' : ''}`}>
        <div
            className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'USER' ? 'bg-fpt-orange' : 'bg-orange-100'
                }`}
        >
            {msg.role === 'USER'
                ? <User className="w-3.5 h-3.5 text-white" />
                : <Bot className="w-3.5 h-3.5 text-fpt-orange" />}
        </div>
        <div className={`max-w-[75%] ${msg.role === 'USER' ? 'items-end' : 'items-start'} flex flex-col`}>
            <div
                className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${msg.role === 'USER'
                    ? 'bg-fpt-orange text-white rounded-tr-none'
                    : 'bg-gray-100 text-gray-800 rounded-tl-none'
                    }`}
            >
                <div className="prose prose-xs max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
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
            </div>
            <span className="text-[9px] text-gray-400 mt-0.5 px-1">
                {format(new Date(msg.createdAt), 'HH:mm')}
            </span>
        </div>
    </div>
);

// ─── Main Widget ──────────────────────────────────────────────────────────────
export const FloatingChatWidget: React.FC = () => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [_sessions, setSessions] = useState<AIChatSession[]>([]);
    const [currentSession, setCurrentSession] = useState<AIChatSession | null>(null);
    const [messages, setMessages] = useState<AIChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [hasNewMsg, setHasNewMsg] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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
        } catch {
            toast.error('Không thể tạo phiên chat mới');
        }
    };

    const handleSend = useCallback(async () => {
        if (!inputValue.trim() || !currentSession || isLoading) return;
        const content = inputValue.trim();
        setInputValue('');
        setIsLoading(true);

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
            };
            setMessages(prev => [...prev, aiMsg]);

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

    return (
        <>
            {/* ── Popup Widget ─────────────────────────────────────────────────── */}
            <div
                className={`fixed bottom-24 right-6 z-[9998] transition-all duration-300 ease-out ${isOpen
                    ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                    : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
                    }`}
                style={{ width: 360 }}
            >
                <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 overflow-hidden border border-gray-100">

                    {/* Header */}
                    <div className="bg-fpt-orange px-4 py-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-sm leading-tight">FAMS AI Assistant</p>
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
                                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="h-80 overflow-y-auto p-3 space-y-3 bg-gray-50">
                        {messages.length === 0 && !isLoading && (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-6">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-fpt-orange to-orange-600 flex items-center justify-center shadow-lg">
                                    <Bot className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">Xin chào! 👋</p>
                                    <p className="text-xs text-gray-500 mt-1">Tôi có thể giúp gì cho bạn hôm nay?</p>
                                </div>
                                <div className="grid grid-cols-1 gap-1.5 w-full px-2">
                                    {[
                                        'Lịch học của tôi hôm nay',
                                        'Số sinh viên ngành CNTT',
                                        'Thông tin học kỳ hiện tại',
                                    ].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => { setInputValue(s); inputRef.current?.focus(); }}
                                            className="text-left text-xs px-3 py-2 rounded-xl border border-orange-100 hover:border-fpt-orange hover:bg-orange-50 text-gray-600 hover:text-fpt-orange transition-all"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map(msg => (
                            <MiniMsg key={msg.id} msg={msg} />
                        ))}

                        {isLoading && (
                            <div className="flex gap-2">
                                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center bg-orange-100">
                                    <Bot className="w-3.5 h-3.5 text-fpt-orange" />
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

                    {/* Input */}
                    <div className="p-3 bg-white border-t border-gray-100">
                        <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 pr-2 py-1.5">
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Nhập câu hỏi..."
                                disabled={isLoading || !currentSession}
                                className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none min-w-0"
                            />
                            <button
                                onClick={handleSend}
                                disabled={isLoading || !inputValue.trim() || !currentSession}
                                className="w-8 h-8 rounded-full bg-fpt-orange hover:bg-fpt-orange/90 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-90 flex-shrink-0"
                            >
                                {isLoading
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <Send className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                        <p className="text-center text-[9px] text-gray-300 mt-1.5 font-medium tracking-wide">
                            Powered by FAMS AI
                        </p>
                    </div>
                </div>
            </div>

            {/* ── FAB Button ───────────────────────────────────────────────────── */}
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className={`fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-fpt-orange shadow-lg shadow-orange-500/40 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${isOpen ? 'rotate-0' : ''
                    }`}
                style={{
                    background: 'linear-gradient(135deg, #f97316, #ea580c)',
                }}
                title="FAMS AI Assistant"
            >
                {isOpen
                    ? <X className="w-6 h-6 text-white" />
                    : <Bot className="w-6 h-6 text-white" />}

                {/* Unread badge */}
                {hasNewMsg && !isOpen && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-white animate-pulse" />
                )}
            </button>

            <style>{`
        .prose-xs p { margin: 0; }
        .prose-xs ul { margin: 0.25rem 0; padding-left: 1rem; }
        .prose-xs li { margin: 0.1rem 0; }
      `}</style>
        </>
    );
};
