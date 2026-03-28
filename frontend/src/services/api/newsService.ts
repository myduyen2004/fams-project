import apiClient from './apiClient';
import {
  NewsAdminFilter,
  NewsItem,
  NewsPageResponse,
  NewsRequest,
} from '../../types/news';

export const newsService = {
  getPublishedNews: async (page = 0, size = 10): Promise<NewsPageResponse> => {
    const response = await apiClient.get<NewsPageResponse>('/news', { params: { page, size } });
    return response.data;
  },

  getNewsById: async (id: number): Promise<NewsItem> => {
    const response = await apiClient.get<NewsItem>(`/news/${id}`);
    return response.data;
  },

  markNewsAsRead: async (id: number): Promise<void> => {
    await apiClient.post(`/news/${id}/read`);
  },

  getUnreadNewsCount: async (): Promise<number> => {
    const response = await apiClient.get<{ count: number }>('/news/unread-count');
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

    const response = await apiClient.get<NewsPageResponse>('/admin/news', { params });
    return response.data;
  },

  getAdminNewsById: async (id: number): Promise<NewsItem> => {
    const response = await apiClient.get<NewsItem>(`/admin/news/${id}`);
    return response.data;
  },

  createNews: async (data: NewsRequest): Promise<NewsItem> => {
    const response = await apiClient.post<NewsItem>('/admin/news', data);
    return response.data;
  },

  updateNews: async (id: number, data: NewsRequest): Promise<NewsItem> => {
    const response = await apiClient.put<NewsItem>(`/admin/news/${id}`, data);
    return response.data;
  },

  publishNews: async (id: number): Promise<NewsItem> => {
    const response = await apiClient.post<NewsItem>(`/admin/news/${id}/publish`);
    return response.data;
  },

  deleteNews: async (id: number): Promise<void> => {
    await apiClient.delete(`/admin/news/${id}`);
  },

  bulkDeleteNews: async (ids: number[]): Promise<void> => {
    await apiClient.post('/admin/news/bulk-delete', { ids });
  },
};
