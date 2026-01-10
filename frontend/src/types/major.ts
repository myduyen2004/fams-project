export interface Major {
    id: number;
    code: string;
    name: string;
    description: string;
    programDuration: string;
    status: 'ACTIVE' | 'INACTIVE';
    numberOfSpecializations?: number;
    canDelete?: boolean;
}

export interface MajorCreateRequest {
    code: string;
    name: string;
    description?: string;
    programDuration: string;
    status?: 'ACTIVE' | 'INACTIVE';
}

export interface MajorSearchParams {
    keyword?: string;
    status?: 'ACTIVE' | 'INACTIVE' | null;
    page?: number;
    size?: number;
}

export interface Page<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
}
