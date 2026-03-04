import apiClient from './authService';
import { ClassSectionResponse } from './LecturerClass';

export interface ClassSectionTransferResponse {
    classSection: ClassSectionResponse;
    hasConflict: boolean;
    conflictDetails: string[];
}

export const classSectionService = {
    getTransferTargets: async (className: string, studentId: number): Promise<ClassSectionTransferResponse[]> => {
        const response = await apiClient.get<ClassSectionTransferResponse[]>(`/v1/class-sections/${className}/transfer-targets-with-conflict`, {
            params: { studentId }
        });
        return response.data;
    }
};

export default classSectionService;
