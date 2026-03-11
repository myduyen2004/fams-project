import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { Send, Bot, User, Loader2, History, ChevronRight, Activity, Terminal, ExternalLink, PanelLeftClose, PanelLeft, Plus, Sparkles, FileSpreadsheet, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatService, AIChatMessage, AIChatSession, ThinkingStep } from '../../services/api/chatService';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { AcademicStaffSidebar } from '../../components/academic-staff/AcademicStaffSidebar';
import { LecturerSidebar } from '../../components/lecturer/LecturerSidebar';
import { StudentSidebar } from '../../components/student/StudentSidebar';
import { AdminSidebar } from '../../components/admin/AdminSidebar';

// --- Constants ---
const MODELS = [
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Groq)' },
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq)' },
    { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B (Groq)' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (Groq)' },
    { id: 'gemma2-9b-it', name: 'Gemma 2 9B (Groq)' }
];

// --- Sub-components for Optimization ---

const ChatMessageItem = memo(({ msg }: { msg: AIChatMessage }) => (
    <div className={`flex gap-4 w-full max-w-5xl md:max-w-7xl ${msg.role === 'USER' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
        <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm ${msg.role === 'USER' ? 'bg-fpt-orange' : 'bg-gray-100 dark:bg-zinc-800'}`}>
            {msg.role === 'USER' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-fpt-orange" />}
        </div>
        <div className={`flex flex-col space-y-1 ${msg.role === 'USER' ? 'items-end' : 'items-start'}`}>
            <div className={`px-7 py-5 rounded-2xl shadow-sm text-lg leading-relaxed overflow-hidden transition-all duration-300 ring-1 ring-black/5 dark:ring-white/5 ${msg.role === 'USER' ? 'bg-fpt-orange text-white rounded-tr-none' : 'bg-white dark:bg-zinc-900 text-gray-800 dark:text-zinc-200 border border-gray-100 dark:border-zinc-800 rounded-tl-none'}`}>
                <div className="prose dark:prose-invert prose-sm max-w-none chat-table-wrapper">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
                {msg.redirectPath && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
                        <Link
                            to={msg.redirectPath}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/10 text-fpt-orange rounded-lg text-xs font-bold hover:bg-fpt-orange hover:text-white transition-all group/link"
                        >
                            <ExternalLink className="w-3 h-3" />
                            Xem chi tiết
                        </Link>
                    </div>
                )}
            </div>
            <span className="text-[10px] text-gray-400 px-1">{format(new Date(msg.createdAt), 'HH:mm')}</span>
        </div>
    </div>
));

interface ChatSidebarProps {
    sessions: AIChatSession[];
    currentSession: AIChatSession | null;
    isSidebarOpen: boolean;
    onSelect: (session: AIChatSession) => void;
    onNewChat: () => void;
    onDelete: (sessionId: number) => void;
}

const ChatSidebar = memo(({ sessions, currentSession, isSidebarOpen, onSelect, onNewChat, onDelete }: ChatSidebarProps) => (
    <div
        className={`border-r border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col transition-all duration-300 ease-in-out z-20 ${isSidebarOpen ? 'w-72 opacity-100' : 'w-0 opacity-0 -translate-x-full overflow-hidden'}`}
    >
        <div className="p-4 border-b border-gray-200 dark:border-zinc-800">
            <button
                onClick={onNewChat}
                className="w-full py-2.5 px-4 bg-fpt-orange hover:bg-fpt-orange/90 text-white rounded-xl flex items-center justify-center gap-2 transition-all font-semibold shadow-lg shadow-orange-500/20 active:scale-[0.98]"
            >
                <Plus className="w-4 h-4" />
                Chat mới
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {sessions.map((s: AIChatSession) => (
                <div key={s.id} className="relative group/item">
                    <button
                        onClick={() => onSelect(s)}
                        className={`w-full p-3 text-left rounded-lg group flex items-start gap-3 transition-all pr-10 ${currentSession?.id === s.id ? 'bg-orange-50 dark:bg-orange-900/10 text-fpt-orange border border-orange-100 dark:border-orange-900/20' : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300'}`}
                    >
                        <History className={`w-4 h-4 mt-1 flex-shrink-0 ${currentSession?.id === s.id ? 'text-fpt-orange' : 'text-gray-400'}`} />
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium truncate">{s.title || 'Không có tiêu đề'}</p>
                            <p className="text-[10px] opacity-60 mt-0.5">{format(new Date(s.createdAt), 'dd/MM/yyyy HH:mm')}</p>
                        </div>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(s.id);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg opacity-0 group-hover/item:opacity-100 transition-all"
                        title="Xóa phiên chat"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
        </div>
    </div>
));

interface CreditLogProps {
    thinkingSteps: ThinkingStep[];
    isLoading: boolean;
}

const CreditLog = memo(({ thinkingSteps, isLoading }: CreditLogProps) => (
    <div className="w-80 border-l border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col p-6 hidden lg:flex">
        <div className="flex items-center gap-2 mb-6 text-fpt-orange">
            <Activity className="w-5 h-5" />
            <h3 className="font-bold uppercase tracking-wider text-sm">Credit Log</h3>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
            {thinkingSteps.length > 0 ? (
                thinkingSteps.map((step: ThinkingStep) => (
                    <div key={step.stage} className="relative pl-6 border-l-2 border-orange-100 dark:border-orange-900/20 py-1 transition-all hover:border-fpt-orange">
                        <div className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-orange-50 dark:bg-orange-900/10 border-2 border-fpt-orange flex items-center justify-center">
                            <div className="w-1 h-1 rounded-full bg-fpt-orange"></div>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-tight">[Stage {step.stage}] {step.name}</h4>
                                <ChevronRight className="w-3 h-3 text-fpt-orange opacity-40" />
                            </div>
                            <p className="text-xs text-fpt-orange font-medium">{step.status}</p>
                            {step.detail && (
                                <div className="mt-2 p-3 bg-gray-50 dark:bg-zinc-950 rounded-lg border border-gray-100 dark:border-zinc-800">
                                    <div className="flex items-center gap-2 mb-1 opacity-50">
                                        <Terminal className="w-3 h-3" />
                                        <span className="text-[10px] font-mono">DEBUG_INFO</span>
                                    </div>
                                    <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-mono break-words leading-relaxed">{step.detail}</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                    <Activity className="w-10 h-10" />
                    <p className="text-xs font-medium uppercase tracking-widest">Đang chờ xử lý...</p>
                </div>
            )}
        </div>

        {isLoading && (
            <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-xl flex items-center gap-3 border border-orange-100 dark:border-orange-900/20">
                <Loader2 className="w-4 h-4 text-fpt-orange animate-spin" />
                <span className="text-xs font-bold text-fpt-orange animate-pulse">Hệ thống đang suy nghĩ...</span>
            </div>
        )}
    </div>
));

interface ChatInputProps {
    onSendMessage: (msg: string) => void;
    onUploadFile: (file: File) => void;
    isLoading: boolean;
    disabled: boolean;
}

const ChatInput = memo(({ onSendMessage, onUploadFile, isLoading, disabled }: ChatInputProps) => {
    const [localValue, setLocalValue] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (localValue.trim() && !isLoading) {
            onSendMessage(localValue);
            setLocalValue('');
        }
    };

    return (
        <div className="p-6 bg-white dark:bg-zinc-950/50 backdrop-blur-md">
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative group">
                <input
                    type="text"
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    placeholder="Nhập câu hỏi của bạn tại đây..."
                    disabled={isLoading || disabled}
                    className="w-full pl-12 pr-14 py-4 bg-gray-100 dark:bg-zinc-900 border-none rounded-2xl focus:ring-2 focus:ring-fpt-orange text-gray-900 dark:text-white transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-600 shadow-inner"
                />
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            onUploadFile(file);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                        }
                    }}
                    accept=".xlsx, .xls"
                    className="hidden"
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || disabled}
                    className="absolute left-2 top-2 bottom-2 px-3 hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-400 dark:text-zinc-500 rounded-xl transition-all disabled:opacity-50"
                    title="Tải lên file Excel"
                >
                    <FileSpreadsheet className="w-5 h-5" />
                </button>
                <button
                    type="submit"
                    disabled={isLoading || !localValue.trim() || disabled}
                    className="absolute right-2 top-2 bottom-2 px-3 bg-fpt-orange hover:bg-fpt-orange/90 text-white rounded-xl transition-all disabled:bg-gray-300 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed group-hover:scale-105 active:scale-95 flex items-center justify-center"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
            </form>
            <p className="text-center text-[10px] text-gray-400 mt-4 uppercase tracking-widest font-bold">FAMS AI Assistant - High Performance Reasoning Pipeline</p>
        </div>
    );
});

export const ChatPage: React.FC = () => {
    const [sessions, setSessions] = useState<AIChatSession[]>([]);
    const [currentSession, setCurrentSession] = useState<AIChatSession | null>(null);
    const [messages, setMessages] = useState<AIChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
    const [selectedRoutingModel, setSelectedRoutingModel] = useState('llama-3.1-8b-instant');
    const [selectedAnswerModel, setSelectedAnswerModel] = useState('llama-3.1-8b-instant');
    const [userRole, setUserRole] = useState('');
    const [userId, setUserId] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const lastUserIdRef = useRef<string | null>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadSessions = useCallback(async () => {
        try {
            const data = await chatService.getSessions();
            setSessions(data);
            if (data.length > 0 && !currentSession) {
                handleSelectSession(data[0]);
            }
        } catch {
            toast.error('Không thể tải danh sách phiên chat');
        }
    }, [currentSession]);

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    // Read user role & ID from localStorage when location.pathname changes
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

    // Reset session only if user ID actually changes (to prevent infinite loop)
    useEffect(() => {
        if (userId && userId !== lastUserIdRef.current) {
            setCurrentSession(null);
            setMessages([]);
            loadSessions();
            lastUserIdRef.current = userId;
        }
    }, [userId, loadSessions]);

    const handleSelectSession = async (session: AIChatSession) => {
        setCurrentSession(session);
        try {
            const msgs = await chatService.getMessages(session.id);
            setMessages(msgs);
            setThinkingSteps([]);
        } catch {
            toast.error('Không thể tải tin nhắn');
        }
    };

    const handleNewChat = useCallback(async () => {
        try {
            const newSession = await chatService.createSession();
            setSessions(prev => [newSession, ...prev]);
            setCurrentSession(newSession);
            setMessages([]);
            setThinkingSteps([]);
        } catch {
            toast.error('Không thể tạo phiên chat mới');
        }
    }, []);

    const handleDeleteSession = useCallback(async (sessionId: number) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa phiên chat này?')) return;

        try {
            await chatService.deleteSession(sessionId);
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            if (currentSession?.id === sessionId) {
                setCurrentSession(null);
                setMessages([]);
                setThinkingSteps([]);
            }
            toast.success('Đã xóa phiên chat');
        } catch {
            toast.error('Không thể xóa phiên chat');
        }
    }, [currentSession]);

    const handleSendMessage = useCallback(async (content: string) => {
        if (!content.trim() || !currentSession || isLoading) return;

        setIsLoading(true);

        const optimisticUserMsg: AIChatMessage = {
            id: Date.now(),
            content: content,
            role: 'USER',
            createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, optimisticUserMsg]);

        try {
            const response = await chatService.sendMessage(
                currentSession.id,
                content,
                selectedRoutingModel,
                selectedAnswerModel
            );

            const aiMsg: AIChatMessage = {
                id: Date.now() + 1,
                content: response.answer,
                role: 'ASSISTANT',
                createdAt: new Date().toISOString(),
                redirectPath: response.redirectPath
            };
            setMessages(prev => [...prev, aiMsg]);
            setThinkingSteps(response.thinkingSteps);

            // If it was the first message, the title might have changed
            if (messages.length === 0) {
                loadSessions();
            }
        } catch {
            toast.error('Lỗi khi gửi tin nhắn');
        } finally {
            setIsLoading(false);
        }
    }, [currentSession, isLoading, selectedRoutingModel, selectedAnswerModel, messages.length, loadSessions]);

    const handleUploadFile = useCallback(async (file: File) => {
        if (!file || !currentSession) return;

        const allowedExtensions = ['.xlsx', '.xls'];
        const fileName = file.name.toLowerCase();
        if (!allowedExtensions.some(ext => fileName.endsWith(ext))) {
            toast.error('Vui lòng chọn file Excel (.xlsx, .xls)');
            return;
        }

        setIsLoading(true);

        const optimisticUserMsg: AIChatMessage = {
            id: Date.now(),
            content: `Đã tải lên file: ${file.name}`,
            role: 'USER',
            createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, optimisticUserMsg]);

        try {
            const response = await chatService.uploadFile(
                currentSession.id,
                file,
                selectedRoutingModel,
                selectedAnswerModel
            );

            const aiMsg: AIChatMessage = {
                id: Date.now() + 1,
                content: response.answer,
                role: 'ASSISTANT',
                createdAt: new Date().toISOString(),
                redirectPath: response.redirectPath
            };
            setMessages(prev => [...prev, aiMsg]);
            setThinkingSteps(response.thinkingSteps);

            if (messages.length === 0) {
                loadSessions();
            }

            toast.success('Phân tích file hoàn tất');
        } catch {
            toast.error('Lỗi khi tải lên file');
        } finally {
            setIsLoading(false);
        }
    }, [currentSession, selectedRoutingModel, selectedAnswerModel, messages.length, loadSessions]);


    // Render correct sidebar by role
    const renderSidebar = () => {
        switch (userRole) {
            case 'ADMIN': return <AdminSidebar />;
            case 'ACADEMIC_STAFF': return <AcademicStaffSidebar />;
            case 'LECTURER': return <LecturerSidebar />;
            case 'STUDENT': return <StudentSidebar />;
            default: return <AcademicStaffSidebar />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 font-sans">
            {/* Role-based app sidebar */}
            {renderSidebar()}

            {/* Main content — offset by fixed w-16 sidebar */}
            <div className="ml-16 flex flex-col h-screen overflow-hidden">
                {/* Chat area fills the entire height */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Chat sessions sidebar */}
                    <ChatSidebar
                        sessions={sessions}
                        currentSession={currentSession}
                        isSidebarOpen={isSidebarOpen}
                        onSelect={handleSelectSession}
                        onNewChat={handleNewChat}
                        onDelete={handleDeleteSession}
                    />


                    <div className="flex-1 flex flex-col relative min-w-0">
                        <header className="h-16 border-b border-gray-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md flex items-center justify-between px-4 z-10">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-gray-500 dark:text-zinc-400 transition-colors"
                                    title={isSidebarOpen ? "Đóng menu" : "Mở menu"}
                                >
                                    {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
                                </button>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fpt-orange to-orange-600 flex items-center justify-center shadow-md">
                                        <Bot className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                                            {userRole ? `FAMS AI ${userRole.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}` : 'FAMS AI Assistant'}
                                        </h1>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                            <span className="text-[10px] text-gray-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">Cơ chế 4 giai đoạn</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-500">Reasoning Model</label>
                                    <select
                                        value={selectedRoutingModel}
                                        onChange={(e) => setSelectedRoutingModel(e.target.value)}
                                        className="text-xs bg-gray-50 dark:bg-zinc-800 border-none rounded p-1 focus:ring-1 focus:ring-fpt-orange text-gray-700 dark:text-zinc-300"
                                    >
                                        {MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-500">Answer Model</label>
                                    <select
                                        value={selectedAnswerModel}
                                        onChange={(e) => setSelectedAnswerModel(e.target.value)}
                                        className="text-xs bg-gray-50 dark:bg-zinc-800 border-none rounded p-1 focus:ring-1 focus:ring-fpt-orange text-gray-700 dark:text-zinc-300"
                                    >
                                        {MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto px-3 md:px-0 py-6 md:py-8 space-y-6 custom-scrollbar relative flex flex-col items-center w-full">
                            {messages.length === 0 && !isLoading && (
                                <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in duration-700">
                                    <div className="relative">
                                        <div className="absolute -inset-4 bg-orange-500/10 blur-2xl rounded-full animate-pulse"></div>
                                        <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-fpt-orange to-orange-600 flex items-center justify-center shadow-2xl relative">
                                            <Bot className="w-12 h-12 text-white" />
                                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 border-4 border-white dark:border-zinc-950 rounded-full"></div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                                            Chào mừng đến với <span className="text-fpt-orange">FAMS AI</span>
                                        </h2>
                                        <p className="text-gray-500 dark:text-zinc-400 text-lg font-medium">
                                            Trợ lý thông minh hỗ trợ mọi yêu cầu về đào tạo và dữ liệu.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-4">
                                        {[
                                            { text: "Danh sách sinh viên ngành IT", icon: <User className="w-4 h-4" /> },
                                            { text: "Giảng viên chuyên ngành Software", icon: <Sparkles className="w-4 h-4" /> },
                                            { text: "Tra cứu lớp học kỳ Fall 2023", icon: <History className="w-4 h-4" /> },
                                            { text: "Thống kê số lượng sinh viên", icon: <Activity className="w-4 h-4" /> }
                                        ].map(suggestion => (
                                            <button
                                                key={suggestion.text}
                                                onClick={() => handleSendMessage(suggestion.text)}
                                                className="p-5 text-left rounded-2xl border border-gray-200 dark:border-zinc-800 hover:border-fpt-orange dark:hover:border-fpt-orange hover:bg-orange-50/50 dark:hover:bg-orange-900/5 transition-all group relative overflow-hidden active:scale-[0.98]"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-500 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/20 group-hover:text-fpt-orange transition-colors">
                                                        {suggestion.icon}
                                                    </div>
                                                    <p className="text-sm font-semibold text-gray-700 dark:text-zinc-300 group-hover:text-fpt-orange transition-colors">{suggestion.text}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {messages.map((msg) => (
                                <ChatMessageItem key={msg.id} msg={msg} />
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <ChatInput
                            onSendMessage={handleSendMessage}
                            onUploadFile={handleUploadFile}
                            isLoading={isLoading}
                            disabled={!currentSession}
                        />
                    </div>

                    <CreditLog thinkingSteps={thinkingSteps} isLoading={isLoading} />

                    <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
                dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; }
                
                /* ── Chat Table Professional Styling ── */
                .chat-table-wrapper { overflow-x: auto; }
                .chat-table-wrapper table {
                    border-collapse: collapse; width: 100%; margin: 0.75em 0;
                    background: white; border-radius: 8px; overflow: hidden;
                    font-size: 13px; border: 1px solid #e5e7eb;
                }
                .dark .chat-table-wrapper table { background: #18181b; border-color: #27272a; }
                .chat-table-wrapper th {
                    background: #f1f5f9; font-weight: 600; text-align: left;
                    padding: 8px 12px; white-space: nowrap; color: #334155;
                    border-bottom: 2px solid #e2e8f0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.03em;
                }
                .dark .chat-table-wrapper th { background: #1e1e22; color: #a1a1aa; border-bottom-color: #27272a; }
                .chat-table-wrapper td {
                    padding: 6px 12px; border-bottom: 1px solid #f1f5f9; color: #475569;
                }
                .dark .chat-table-wrapper td { border-bottom-color: #27272a; color: #d4d4d8; }
                .chat-table-wrapper tr:nth-child(even) td { background: #f8fafc; }
                .dark .chat-table-wrapper tr:nth-child(even) td { background: #1a1a1e; }
                .chat-table-wrapper tr:hover td { background: #fff7ed; }
                .dark .chat-table-wrapper tr:hover td { background: #1c1917; }
                .chat-table-wrapper tr:last-child td { border-bottom: none; }
            `}</style>
                </div>
            </div>
        </div>
    );
};

