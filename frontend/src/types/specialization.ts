export interface Specialization {
    id: number;
    code: string;
    name: string;
    description?: string;
    status: 'ACTIVE' | 'INACTIVE';
    majorId: number;
    totalCredits?: number;
    canDelete?: boolean;
}

export interface SpecializationSearchParams {
    keyword?: string;
    status?: 'ACTIVE' | 'INACTIVE' | null;
    page?: number;
    size?: number;
}

export interface SpecializationCreateRequest {
    code: string;
    name: string;
    description?: string;
    majorId: number;
    status?: 'ACTIVE' | 'INACTIVE';
}
