import { userService as baseUserService } from './userService';
import apiClient from './authService';

export interface ImportJobStatus {
    jobId: string;
    type: string;
    status: string;
    filename: string | null;
    totalRecords: number | null;
    processedRecords: number | null;
    successCount: number | null;
    failedCount: number | null;
    errorMessage: string | null;
    createdAt: string;
    completedAt: string | null;
    percentage: number;
}

export const userService = {
    ...baseUserService,

    getImportJobStatus: async (jobId: string): Promise<ImportJobStatus> => {
        const response = await apiClient.get<ImportJobStatus>(`/users/import-job/${jobId}`);
        return response.data;
    }
};
