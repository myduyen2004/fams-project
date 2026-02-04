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
}

export interface CourseImportDTO {
    rowNumber: number;
    code: string;
    name: string;
    credits: number;
    numberOfSlots: number;
    description?: string;
    statusValue: string; // ACTIVE, INACTIVE from Excel
    status: string; // VALID, WARNING, ERROR - validation status
    errorMessage?: string;
    warningMessage?: string;
}
