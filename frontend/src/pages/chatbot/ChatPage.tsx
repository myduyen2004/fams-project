import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { Send, Bot, User, Loader2, History, ChevronRight, Activity, ExternalLink, PanelLeftClose, PanelLeft, Plus, Sparkles, FileSpreadsheet, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatService, AIChatMessage, AIChatSession, ContinuationRequest, MissingField, ThinkingStep } from '../../services/api/chatService';
import toast from "@utils/toast";
import { format } from 'date-fns';
import { AcademicStaffSidebar } from '../../components/academic-staff/AcademicStaffSidebar';
import { LecturerSidebar } from '../../components/lecturer/LecturerSidebar';
import { StudentSidebar } from '../../components/student/StudentSidebar';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { CustomSelect } from '../../components/common/CustomSelect';

import { CommonHeader } from '../../components/common/CommonHeader';
import { ConfirmModal } from '../../components/common/ConfirmModal';

// --- Constants ---
const MODELS = [
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Groq)' },
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq)' },
    { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B (Groq)' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (Groq)' },
    { id: 'gemma2-9b-it', name: 'Gemma 2 9B (Groq)' }
];

// --- Sub-components for Optimization ---

const ChatMessageItem = memo(({ msg, onContinue }: { msg: AIChatMessage; onContinue: (continuation: ContinuationRequest) => void }) => (
    <div className={`flex w-full max-w-[min(100%,48rem)] gap-2 px-2 ${msg.role === 'USER' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
        <div className={`h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center border shadow-sm ${msg.role === 'USER' ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800'}`}>
            {msg.role === 'USER' ? <User className="w-4 h-4 text-fpt-orange" /> : <Bot className="w-4 h-4 text-fpt-orange" />}
        </div>
        <div className={`flex flex-col space-y-1 ${msg.role === 'USER' ? 'items-end' : 'items-start'}`}>
            <div className={`w-full overflow-hidden rounded-2xl border px-4 py-3 text-sm leading-6 shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition-all duration-300 ${msg.role === 'USER' ? 'rounded-tr-md border-orange-200 bg-fpt-orange !text-white shadow-orange-500/20' : 'rounded-tl-md border-gray-200 bg-white text-gray-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200'}`}>
                <div className={`prose prose-sm max-w-none break-words chat-table-wrapper ${msg.role === 'USER' ? 'prose-invert !text-white' : 'dark:prose-invert'}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
                {msg.redirectPath && (
                    <div className="mt-3 border-t border-gray-100 pt-3 dark:border-zinc-800">
                        <Link
                            to={msg.redirectPath}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-fpt-orange transition-all hover:bg-fpt-orange hover:text-white dark:border-zinc-700 dark:bg-zinc-900"
                        >
                            <ExternalLink className="w-3 h-3" />
                            Xem chi tiết
                        </Link>
                    </div>
                )}
                {msg.continuation && (
                    <div className="mt-3 border-t border-gray-100 pt-3 dark:border-zinc-800">
                        <button
                            onClick={() => onContinue(msg.continuation!)}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-fpt-orange transition hover:bg-fpt-orange hover:text-white dark:border-zinc-700 dark:bg-zinc-900"
                        >
                            <ChevronRight className="w-3 h-3" />
                            Tiếp
                        </button>
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
                        className={`w-full p-3 text-left rounded-lg group flex items-start gap-3 transition-all pr-10 ${currentSession?.id === s.id ? 'bg-orange-50 dark:bg-orange-900/10 text-fpt-orange border border-gray-200 dark:border-zinc-700' : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300'}`}
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

interface ChatInputProps {
    onSendMessage: (msg: string) => void;
    onUploadFile: (file: File) => void;
    isLoading: boolean;
    disabled: boolean;
}

interface PendingFieldRequest {
    fields: MissingField[];
    pendingTool: string;
    originalMessage: string;
    pendingEntities?: Record<string, string>;
    agentLabel?: string;
    answer?: string;
    actionReview?: boolean;
}

interface MissingFieldFormProps {
    request: PendingFieldRequest;
    isLoading: boolean;
    onSubmit: (values: Record<string, string>) => void;
    onCancel: () => void;
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
        <div className="border-t border-gray-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/80">
            <form
                onSubmit={handleSubmit}
                className="group relative mx-auto max-w-[48rem]"
            >
                <input
                    type="text"
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    placeholder="Nhập câu hỏi của bạn tại đây..."
                    disabled={isLoading || disabled}
                    className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-14 text-sm text-gray-900 shadow-sm transition-all placeholder:text-gray-400 focus:ring-2 focus:ring-orange-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-600"
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
                    className="absolute bottom-2 left-2 top-2 rounded-xl px-2.5 text-gray-400 transition-all hover:bg-orange-50 dark:text-zinc-500 dark:hover:bg-zinc-800 disabled:opacity-50"
                    title="Tải lên file Excel"
                >
                    <FileSpreadsheet className="w-5 h-5" />
                </button>
                <button
                    type="submit"
                    disabled={isLoading || !localValue.trim() || disabled}
                    className="absolute bottom-2 right-2 top-2 flex items-center justify-center rounded-xl bg-fpt-orange px-3 text-white transition-all hover:bg-fpt-orange/90 group-hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-zinc-800"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
            </form>
            <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-gray-400">FAMS AI Assistant</p>
        </div>
    );
});

const MissingFieldForm = memo(({ request, isLoading, onSubmit, onCancel }: MissingFieldFormProps) => {
    const [values, setValues] = useState<Record<string, string>>({});

    useEffect(() => {
        const initialValues: Record<string, string> = {};
        request.fields.forEach((field) => {
            const fromPending = request.pendingEntities?.[field.id];
            initialValues[field.id] = fromPending ?? field.value ?? '';
        });
        setValues(initialValues);
    }, [request]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(values);
    };

    return (
        <div className="mx-auto mb-3 w-full max-w-[min(100%,48rem)] rounded-2xl border border-gray-200 bg-white p-3.5 shadow-[0_8px_18px_rgba(15,23,42,0.05)] dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-fpt-orange">
                        {request.agentLabel || 'Agent hỗ trợ'}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                        {request.actionReview ? 'Xác nhận thông tin trước khi thực hiện thao tác' : 'Cần thêm thông tin để trả lời chính xác'}
                    </h3>
                    {request.answer && (
                        <p className="mt-1.5 text-xs leading-5 text-gray-600 dark:text-zinc-300">{request.answer}</p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] font-semibold text-gray-500 transition hover:border-red-200 hover:text-red-500 dark:border-zinc-800 dark:text-zinc-400"
                >
                    Bỏ qua
                </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                {request.fields.map((field) => (
                    <label key={field.id} className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold text-gray-700 dark:text-zinc-200">{field.label}</span>
                        <span className="text-[11px] leading-4 text-gray-500 dark:text-zinc-400">{field.question || `Nhập ${field.label.toLowerCase()}`}</span>
                        {field.inputType === 'textarea' ? (
                            <textarea
                                value={values[field.id] || ''}
                                onChange={(e) => setValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                placeholder={field.placeholder}
                                required={field.required !== false && field.required !== 'false'}
                                disabled={isLoading}
                                className="min-h-[78px] rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-fpt-orange focus:ring-2 focus:ring-orange-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                            />
                        ) : (
                            <input
                                type={field.inputType === 'number' ? 'number' : field.inputType === 'date' ? 'date' : 'text'}
                                value={values[field.id] || ''}
                                onChange={(e) => setValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                placeholder={field.placeholder}
                                required={field.required !== false && field.required !== 'false'}
                                disabled={isLoading}
                                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-fpt-orange focus:ring-2 focus:ring-orange-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                            />
                        )}
                    </label>
                ))}

                <div className="md:col-span-2 flex items-center justify-end gap-2 pt-1">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="inline-flex items-center gap-2 rounded-xl bg-fpt-orange px-4 py-2.5 text-xs font-bold text-white transition hover:bg-fpt-orange/90 disabled:opacity-60"
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {request.actionReview ? 'Xác nhận và thực hiện' : 'Gửi bổ sung'}
                    </button>
                </div>
            </form>
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
    const [pendingFieldRequest, setPendingFieldRequest] = useState<PendingFieldRequest | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [sessionIdToDelete, setSessionIdToDelete] = useState<number | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const lastUserIdRef = useRef<string | null>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!thinkingSteps.length) return;

        const timestamp = format(new Date(), 'HH:mm:ss');
        console.groupCollapsed(`[FAMS AI] Credit Log ${timestamp}`);
        thinkingSteps.forEach((step) => {
            console.log(`[Stage ${step.stage}] ${step.name} | ${step.status}`);
            if (step.detail) {
                console.log(step.detail);
            }
        });
        console.groupEnd();
    }, [thinkingSteps]);

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

    const handleSelectSession = useCallback(async (session: AIChatSession) => {
        setCurrentSession(session);
        try {
            const msgs = await chatService.getMessages(session.id);
            setMessages(msgs);
            setThinkingSteps([]);
            setPendingFieldRequest(null);
        } catch {
            toast.error('Không thể tải tin nhắn');
        }
    }, []);

    const handleNewChat = useCallback(async () => {
        // 1. If current session is already empty, just stay here
        if (currentSession && messages.length === 0) {
            return;
        }

        // 2. Look for an existing empty session in the list
        // We use a more robust check for placeholder titles or missing titles
        const emptySession = sessions.find(s => {
            const title = (s.title || "").trim().toLowerCase();
            return (
                title === "" || 
                title === "không có tiêu đề" || 
                title === "chat mới" || 
                title === "new chat" || 
                title === "new chat session" ||
                title === "phiên chat mới" ||
                title === "cuộc trò chuyện mới" ||
                title === "new conversation" ||
                title.includes("new chat")
            );
        });

        if (emptySession) {
            handleSelectSession(emptySession);
            return;
        }

        // 3. Create a brand new session if no empty one exists
        try {
            const newSession = await chatService.createSession();
            setSessions(prev => [newSession, ...prev]);
            setCurrentSession(newSession);
            setMessages([]);
            setThinkingSteps([]);
            setPendingFieldRequest(null);
        } catch {
            toast.error('Không thể tạo phiên chat mới');
        }
    }, [currentSession, messages.length, sessions, handleSelectSession]);

    const handleDeleteSession = useCallback((sessionId: number) => {
        setSessionIdToDelete(sessionId);
        setShowDeleteModal(true);
    }, []);

    const confirmDelete = async () => {
        if (!sessionIdToDelete) return;
        try {
            await chatService.deleteSession(sessionIdToDelete);
            setSessions(prev => prev.filter(s => s.id !== sessionIdToDelete));
            if (currentSession?.id === sessionIdToDelete) {
                setCurrentSession(null);
                setMessages([]);
                setThinkingSteps([]);
                setPendingFieldRequest(null);
            }
            toast.success('Đã xóa phiên chat');
        } catch {
            toast.error('Không thể xóa phiên chat');
        } finally {
            setShowDeleteModal(false);
            setSessionIdToDelete(null);
        }
    };

    const handleSendMessage = useCallback(async (content: string) => {
        if (!content.trim() || !currentSession || isLoading) return;

        setIsLoading(true);
        setPendingFieldRequest(null);

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
                redirectPath: response.redirectPath,
                continuation: response.continuation,
            };
            setMessages(prev => [...prev, aiMsg]);
            setThinkingSteps(response.thinkingSteps);
            setPendingFieldRequest(null);
            if (response.missingFields?.length && response.pendingTool && response.originalMessage) {
                setPendingFieldRequest({
                    fields: response.missingFields,
                    pendingTool: response.pendingTool,
                    originalMessage: response.originalMessage,
                    pendingEntities: response.pendingEntities,
                    agentLabel: response.agentLabel,
                    answer: response.answer,
                    actionReview: response.actionReview
                });
            } else {
                setPendingFieldRequest(null);
            }

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

    const handleSubmitMissingFields = useCallback(async (values: Record<string, string>) => {
        if (!currentSession || !pendingFieldRequest || isLoading) return;

        setIsLoading(true);
        const mergedEntities = {
            ...(pendingFieldRequest.pendingEntities || {}),
            ...values,
        };
        if (pendingFieldRequest.actionReview) {
            mergedEntities.__action_confirmed__ = 'true';
        }

        try {
            const response = await chatService.sendMessage(
                currentSession.id,
                'Bổ sung thông tin cho yêu cầu trước',
                selectedRoutingModel,
                selectedAnswerModel,
                mergedEntities,
                pendingFieldRequest.pendingTool,
                pendingFieldRequest.originalMessage,
                mergedEntities
            );

            const userSummary = Object.entries(values)
                .filter(([, value]) => value?.trim())
                .map(([key, value]) => `- ${key}: ${value}`)
                .join('\n');

            if (userSummary) {
                const userMsg: AIChatMessage = {
                    id: Date.now(),
                    content: `Bổ sung thông tin:\n${userSummary}`,
                    role: 'USER',
                    createdAt: new Date().toISOString()
                };
                setMessages(prev => [...prev, userMsg]);
            }

            const aiMsg: AIChatMessage = {
                id: Date.now() + 1,
                content: response.answer,
                role: 'ASSISTANT',
                createdAt: new Date().toISOString(),
                redirectPath: response.redirectPath,
                continuation: response.continuation,
            };
            setMessages(prev => [...prev, aiMsg]);
            setThinkingSteps(response.thinkingSteps);

            if (response.missingFields?.length && response.pendingTool && response.originalMessage) {
                setPendingFieldRequest({
                    fields: response.missingFields,
                    pendingTool: response.pendingTool,
                    originalMessage: response.originalMessage,
                    pendingEntities: response.pendingEntities || mergedEntities,
                    agentLabel: response.agentLabel,
                    answer: response.answer,
                    actionReview: response.actionReview
                });
            } else {
                setPendingFieldRequest(null);
            }
        } catch {
            toast.error('Không thể gửi phần thông tin bổ sung');
        } finally {
            setIsLoading(false);
        }
    }, [currentSession, pendingFieldRequest, isLoading, selectedRoutingModel, selectedAnswerModel]);

    const handleContinueResult = useCallback(async (continuation: ContinuationRequest) => {
        if (!currentSession || isLoading) return;
        setIsLoading(true);

        try {
            const response = await chatService.sendMessage(
                currentSession.id,
                'Tiếp',
                selectedRoutingModel,
                selectedAnswerModel,
                undefined,
                undefined,
                undefined,
                undefined,
                continuation
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
            setThinkingSteps(response.thinkingSteps);
        } catch {
            toast.error('Không thể tải thêm kết quả');
        } finally {
            setIsLoading(false);
        }
    }, [currentSession, isLoading, selectedRoutingModel, selectedAnswerModel]);

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
        <div className="min-h-screen bg-white dark:bg-zinc-950 font-sans">
            {/* Role-based app sidebar */}
            {renderSidebar()}

            {/* Main content — offset by fixed w-16 sidebar */}
            <div className="ml-16 flex flex-col h-screen overflow-hidden">
                <CommonHeader title="Hỏi đáp AI" />
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
                        <div className="pointer-events-none absolute inset-0 overflow-hidden">
                            <div className="chat-ambient-orb chat-ambient-orb-one" />
                            <div className="chat-ambient-orb chat-ambient-orb-two" />
                            <div className="chat-ambient-grid" />
                        </div>
                        <header className="min-h-[72px] h-auto flex-shrink-0 border-b border-gray-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md flex flex-wrap items-center justify-between px-4 py-2 z-10 gap-y-4">
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
                                        <h1 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
                                            {userRole ? `FAMS AI ${userRole.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}` : 'FAMS AI Assistant'}
                                        </h1>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                            <span className="text-[10px] text-gray-500 dark:text-zinc-400 uppercase tracking-wider font-medium">Cơ chế 4 giai đoạn</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] uppercase font-semibold text-gray-400 dark:text-zinc-500">Reasoning Model</label>
                                    <CustomSelect
                                        value={selectedRoutingModel}
                                        onChange={(value) => setSelectedRoutingModel(value)}
                                        options={MODELS.map(m => ({ value: m.id, label: m.name }))}
                                        className="text-xs dark:bg-zinc-800 border-none rounded p-1 text-gray-700 dark:text-zinc-300"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] uppercase font-semibold text-gray-400 dark:text-zinc-500">Answer Model</label>
                                    <CustomSelect
                                        value={selectedAnswerModel}
                                        onChange={(value) => setSelectedAnswerModel(value)}
                                        options={MODELS.map(m => ({ value: m.id, label: m.name }))}
                                        className="text-xs dark:bg-zinc-800 border-none rounded p-1 text-gray-700 dark:text-zinc-300"
                                    />
                                </div>
                            </div>
                        </header>

                        <div className="custom-scrollbar relative z-10 flex w-full flex-1 flex-col items-center space-y-3 overflow-y-auto bg-transparent px-2 py-4 md:px-4 md:py-5">
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
                                        <h2 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
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
                                <ChatMessageItem key={msg.id} msg={msg} onContinue={handleContinueResult} />
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {pendingFieldRequest && (
                            <MissingFieldForm
                                request={pendingFieldRequest}
                                isLoading={isLoading}
                                onSubmit={handleSubmitMissingFields}
                                onCancel={() => setPendingFieldRequest(null)}
                            />
                        )}

                        <div className="relative z-10">
                            <ChatInput
                                onSendMessage={handleSendMessage}
                                onUploadFile={handleUploadFile}
                                isLoading={isLoading}
                                disabled={!currentSession}
                            />
                        </div>
                    </div>

                    <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
                dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; }

                .chat-ambient-orb {
                    position: absolute;
                    border-radius: 9999px;
                    filter: blur(14px);
                    opacity: 0.55;
                    will-change: transform;
                }
                .chat-ambient-orb-one {
                    top: 6%;
                    left: 10%;
                    width: 18rem;
                    height: 18rem;
                    background: radial-gradient(circle, rgba(251, 191, 36, 0.14) 0%, rgba(255, 255, 255, 0) 72%);
                    animation: chatFloatOne 15s ease-in-out infinite;
                }
                .chat-ambient-orb-two {
                    right: 8%;
                    bottom: 10%;
                    width: 22rem;
                    height: 22rem;
                    background: radial-gradient(circle, rgba(249, 115, 22, 0.11) 0%, rgba(255, 255, 255, 0) 74%);
                    animation: chatFloatTwo 19s ease-in-out infinite;
                }
                .chat-ambient-grid {
                    position: absolute;
                    inset: 0;
                    background-image:
                        linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px);
                    background-size: 36px 36px;
                    mask-image: linear-gradient(to bottom, rgba(0,0,0,0.28), transparent 70%);
                    opacity: 0.4;
                }
                @keyframes chatFloatOne {
                    0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
                    50% { transform: translate3d(24px, -16px, 0) scale(1.06); }
                }
                @keyframes chatFloatTwo {
                    0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
                    50% { transform: translate3d(-26px, 18px, 0) scale(1.04); }
                }

                .chat-table-wrapper {
                    max-width: 100%;
                    overflow-x: auto;
                }
                .chat-table-wrapper table {
                    border-collapse: collapse;
                    width: 100%;
                    max-width: 100%;
                    margin: 0.5em 0;
                    background: white;
                    border-radius: 10px;
                    overflow: hidden;
                    font-size: 12px;
                    border: 1px solid #e5e7eb;
                    table-layout: auto;
                }
                .dark .chat-table-wrapper table { background: #18181b; border-color: #27272a; }
                .chat-table-wrapper th {
                    background: #fff7ed;
                    font-weight: 700;
                    text-align: left;
                    padding: 7px 8px;
                    white-space: nowrap;
                    color: #9a3412;
                    border-bottom: 1px solid #e5e7eb;
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                }
                .dark .chat-table-wrapper th { background: #1e1e22; color: #f4f4f5; border-bottom-color: #27272a; }
                .chat-table-wrapper td {
                    padding: 6px 8px;
                    border-bottom: 1px solid #f1f5f9;
                    color: #475569;
                    word-break: break-word;
                    white-space: normal;
                }
                .dark .chat-table-wrapper td { border-bottom-color: #27272a; color: #d4d4d8; }
                .chat-table-wrapper tr:nth-child(even) td { background: #fffdfb; }
                .dark .chat-table-wrapper tr:nth-child(even) td { background: #1a1a1e; }
                .chat-table-wrapper tr:hover td { background: #fff7ed; }
                .dark .chat-table-wrapper tr:hover td { background: #1c1917; }
                .chat-table-wrapper tr:last-child td { border-bottom: none; }
            `}</style>
                </div>
            </div>
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
                title="Xóa phiên chat"
                message="Bạn có chắc chắn muốn xóa phiên chat này không? Toàn bộ lịch sử tin nhắn sẽ bị xóa vĩnh viễn."
                confirmLabel="Xóa ngay"
                cancelLabel="Hủy"
                type="danger"
            />
        </div>
    );
};

