/* eslint-disable @typescript-eslint/no-explicit-any */
import apiClient from './authService';

export interface AIChatSession {
    id: number;
    title: string;
    status: string;
    createdAt: string;
    lastMessageAt: string;
}

export interface AIChatMessage {
    id: number;
    content: string;
    role: 'USER' | 'ASSISTANT';
    createdAt: string;
    redirectPath?: string;
}

export interface ThinkingStep {
    stage: number;
    name: string;
    status: string;
    detail?: string;
}

export interface ChatResponse {
    answer: string;
    thinkingSteps: ThinkingStep[];
    redirectPath?: string;
}

export const chatService = {
    getSessions: async () => {
        const response = await apiClient.get<AIChatSession[]>('/chat/sessions');
        return response.data;
    },

    createSession: async () => {
        const response = await apiClient.post<AIChatSession>('/chat/sessions');
        return response.data;
    },

    getMessages: async (sessionId: number) => {
        const response = await apiClient.get<AIChatMessage[]>(`/chat/sessions/${sessionId}/messages`);
        return response.data;
    },

    sendMessage: async (sessionId: number, message: string, routingModel?: string, answerModel?: string) => {
        const response = await apiClient.post<ChatResponse>(`/chat/sessions/${sessionId}/send`, {
            message,
            routingModel,
            answerModel
        });
        return response.data;
    },

    uploadFile: async (sessionId: number, file: File, routingModel?: string, answerModel?: string) => {
        const formData = new FormData();
        formData.append('file', file);
        if (routingModel) formData.append('routingModel', routingModel);
        if (answerModel) formData.append('answerModel', answerModel);

        const response = await apiClient.post<ChatResponse>(`/chat/sessions/${sessionId}/upload`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    deleteSession: async (sessionId: number) => {
        await apiClient.delete(`/chat/sessions/${sessionId}`);
    }
};
