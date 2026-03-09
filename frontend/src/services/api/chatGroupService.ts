import apiClient from './authService';
import axios from 'axios';

export interface ChatGroupResponse {
    id: number;
    name: string;
    className: string;
    type: string;
    lecturerName: string;
    memberCount: number;
    createdAt: string;
    lastMessage: {
        senderName: string;
        content: string;
        type: string;
        attachmentName?: string;
        sentAt: string;
    } | null;
    members?: ChatMemberDTO[];
    unreadCount?: number;
    firstUnreadMessageId?: number;
}

export interface ChatMemberDTO {
    userId: number;
    fullName: string;
    avatar: string;
    role: string;
    memberRole: string;
}

export interface ReadReceiptDTO {
    userId: number;
    fullName: string;
    avatar: string;
}

export interface ChatMessageResponse {
    id: number;
    senderId: number;
    senderName: string;
    senderAvatar: string;
    senderRole: string;
    content: string;
    type: string;
    attachmentUrl: string | null;
    attachmentName: string | null;
    replyToId: number | null;
    replyToContent: string | null;
    replyToAttachmentUrl?: string | null;
    replyToType?: string | null;
    replyToSenderName?: string | null;
    sentAt: string;
    isOwn: boolean;
    isDeleted?: boolean;
    isRead?: boolean;
    readers?: ReadReceiptDTO[];
    isSending?: boolean; // For Optimistic UI
}

export interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

export const chatGroupService = {
    createGroupForClass: async (className: string): Promise<ChatGroupResponse> => {
        const response = await apiClient.post<ChatGroupResponse>(`/v1/chat-groups/class/${className}`);
        return response.data;
    },

    getMyGroups: async (): Promise<ChatGroupResponse[]> => {
        const response = await apiClient.get<ChatGroupResponse[]>('/v1/chat-groups');
        return response.data;
    },

    getGroupById: async (groupId: number): Promise<ChatGroupResponse> => {
        const response = await apiClient.get<ChatGroupResponse>(`/v1/chat-groups/${groupId}`);
        return response.data;
    },

    checkGroupExists: async (className: string): Promise<boolean> => {
        const response = await apiClient.get<{ exists: boolean }>(`/v1/chat-groups/class/${className}/exists`);
        return response.data.exists;
    },

    getMessages: async (groupId: number, page = 0, size = 50): Promise<PageResponse<ChatMessageResponse>> => {
        const response = await apiClient.get<PageResponse<ChatMessageResponse>>(`/v1/chat-groups/${groupId}/messages`, {
            params: { page, size }
        });
        return response.data;
    },

    sendMessage: async (groupId: number, content: string | null, type: string = 'TEXT', replyToId?: number, attachmentUrl?: string, attachmentName?: string): Promise<ChatMessageResponse> => {
        const response = await apiClient.post<ChatMessageResponse>(`/v1/chat-messages/${groupId}`, {
            content,
            type,
            replyToId,
            attachmentUrl,
            attachmentName
        });
        return response.data;
    },

    getUploadSignature: async (): Promise<{ signature: string; timestamp: number; apiKey: string; cloudName: string; folder: string }> => {
        const response = await apiClient.get('/cloudinary/signature');
        return response.data;
    },

    uploadToCloudinaryDirect: async (file: File, signature: string, timestamp: number, apiKey: string, cloudName: string, folder: string): Promise<{ secure_url: string; original_filename: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('signature', signature);
        formData.append('timestamp', timestamp.toString());
        formData.append('api_key', apiKey);
        formData.append('folder', folder);

        const response = await axios.post(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, formData);
        return response.data;
    },

    uploadAndSendFile: async (groupId: number, file: File, replyToId?: number): Promise<ChatMessageResponse> => {
        const formData = new FormData();
        formData.append('file', file);
        if (replyToId) {
            formData.append('replyToId', replyToId.toString());
        }
        const response = await apiClient.post<ChatMessageResponse>(`/v1/chat-messages/${groupId}/upload`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    deleteMessage: async (groupId: number, messageId: number): Promise<ChatMessageResponse> => {
        const response = await apiClient.delete<ChatMessageResponse>(`/v1/chat-messages/${groupId}/${messageId}`);
        return response.data;
    },

    markAsRead: async (groupId: number): Promise<void> => {
        await apiClient.post(`/v1/chat-messages/groups/${groupId}/read`);
    },
};
