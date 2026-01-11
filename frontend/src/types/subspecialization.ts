import { Course } from './course';

export interface SubSpecialization {
    id: number;
    code: string;
    name: string;
    description?: string;
    status: 'ACTIVE' | 'INACTIVE';
    specializationId: number;
    totalCredits?: number;
    courseCount?: number;
    courses?: Course[];
    canDelete?: boolean;
}

export interface SubSpecializationSearchParams {
    keyword?: string;
    status?: 'ACTIVE' | 'INACTIVE' | null;
    page?: number;
    size?: number;
}

export interface SubSpecializationCreateRequest {
    code: string;
    name: string;
    description?: string;
    specializationId: number;
}
