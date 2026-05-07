export interface Course {
    id: number;
    code: string;
    name: string;
    description?: string;
    credits: number;
    numberOfSlots: number;
    semester?: number; // Học kỳ được gán khi thêm vào chuyên ngành
    status: 'ACTIVE' | 'INACTIVE';
    orderIndex?: number;
    canDelete?: boolean;
    totalWeight?: number;
    isCalculatedInGpa?: boolean;
    prerequisites?: CoursePrerequisite[];
}

export interface CoursePrerequisite {
    id: number;
    code: string;
    name: string;
}

export interface CourseSearchParams {
    keyword?: string;
    status?: 'ACTIVE' | 'INACTIVE' | null;
    page?: number;
    size?: number;
}

export interface CourseCreateRequest {
    code: string;
    name: string;
    description?: string;
    credits: number;
    numberOfSlots: number;
    isCalculatedInGpa?: boolean;
}

export interface CourseImportDTO {
    rowNumber: number;
    code: string;
    name: string;
    credits: number;
    numberOfSlots: number;
    description?: string;
    isCalculatedInGpa?: boolean;
    statusValue: string; // ACTIVE, INACTIVE from Excel
    status: string; // VALID, WARNING, ERROR - validation status
    errorMessage?: string;
    warningMessage?: string;
}
