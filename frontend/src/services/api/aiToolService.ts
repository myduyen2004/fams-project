import apiClient from './authService';

export interface AITool {
  id?: number;
  name: string;
  type: 'SQL_TEMPLATE' | 'BACKEND_ACTION' | 'NAVIGATE_ONLY';
  description: string;
  sqlTemplate?: string;
  accuracyPercentage: number;
  isActive: boolean;
  allowedRoles?: string;
  requiredFields?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AIToolTest {
  id: number;
  isPassed: boolean;
  testQuery?: string;
  testResultSummary?: string;
  logs?: string;
  executionTimeMs?: number;
  createdAt: string;
}

const BASE_PATH = '/admin/ai-tools';

export const aiToolService = {
  getAllTools: async (): Promise<AITool[]> => {
    const response = await apiClient.get<AITool[]>(BASE_PATH);
    return response.data;
  },

  getToolById: async (id: number): Promise<AITool> => {
    const response = await apiClient.get<AITool>(`${BASE_PATH}/${id}`);
    return response.data;
  },

  createTool: async (tool: Partial<AITool>): Promise<AITool> => {
    const response = await apiClient.post<AITool>(BASE_PATH, tool);
    return response.data;
  },

  updateTool: async (id: number, tool: Partial<AITool>): Promise<AITool> => {
    const response = await apiClient.put<AITool>(`${BASE_PATH}/${id}`, tool);
    return response.data;
  },

  deleteTool: async (id: number): Promise<void> => {
    await apiClient.delete(`${BASE_PATH}/${id}`);
  },

  toggleStatus: async (id: number): Promise<AITool> => {
    const response = await apiClient.patch<AITool>(`${BASE_PATH}/${id}/toggle-status`);
    return response.data;
  },

  getLatestTests: async (id: number): Promise<AIToolTest[]> => {
    const response = await apiClient.get<AIToolTest[]>(`${BASE_PATH}/${id}/tests`);
    return response.data;
  },

  runTest: async (id: number, params?: Record<string, any>): Promise<AIToolTest> => {
    const response = await apiClient.post<AIToolTest>(`${BASE_PATH}/${id}/test`, params || {});
    return response.data;
  },
};
