import apiClient from './apiClient';
import {
  NewsAdminFilter,
  NewsItem,
  NewsPageResponse,
  NewsRequest,
} from '../../types/news';

export const newsService = {
  getPublishedNews: async (page = 0, size = 10): Promise<NewsPageResponse> => {
    const response = await apiClient.get<NewsPageResponse>('/v1/news', { params: { page, size } });
    return response.data;
  },

  getNewsById: async (id: number): Promise<NewsItem> => {
    const response = await apiClient.get<NewsItem>(`/v1/news/${id}`);
    return response.data;
  },

  markNewsAsRead: async (id: number): Promise<void> => {
    await apiClient.post(`/v1/news/${id}/read`);
  },

  getUnreadNewsCount: async (): Promise<number> => {
    const response = await apiClient.get<{ count: number }>('/v1/news/unread-count');
    return response.data.count ?? 0;
  },

  getAdminNews: async (filter: NewsAdminFilter): Promise<NewsPageResponse> => {
    const params: Record<string, unknown> = {
      page: filter.page,
      size: filter.size,
    };

    if (filter.search) params.search = filter.search;
    if (filter.targetType && filter.targetType !== 'ALL') params.targetType = filter.targetType;
    if (filter.status && filter.status !== 'ALL') params.status = filter.status;

    const response = await apiClient.get<NewsPageResponse>('/v1/news/admin', { params });
    return response.data;
  },

  getAdminNewsById: async (id: number): Promise<NewsItem> => {
    const response = await apiClient.get<NewsItem>(`/v1/news/admin/${id}`);
    return response.data;
  },

  createNews: async (data: NewsRequest): Promise<NewsItem> => {
    const response = await apiClient.post<NewsItem>('/v1/news/admin', data);
    return response.data;
  },

  updateNews: async (id: number, data: NewsRequest): Promise<NewsItem> => {
    const response = await apiClient.put<NewsItem>(`/v1/news/admin/${id}`, data);
    return response.data;
  },

  publishNews: async (id: number): Promise<NewsItem> => {
    const response = await apiClient.post<NewsItem>(`/v1/news/admin/${id}/publish`);
    return response.data;
  },

  deleteNews: async (id: number): Promise<void> => {
    await apiClient.delete(`/v1/news/admin/${id}`);
  },

  bulkDeleteNews: async (ids: number[]): Promise<void> => {
    await apiClient.post('/v1/news/admin/bulk-delete', { ids });
  },
};
