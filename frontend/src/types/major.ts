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

export interface MajorImportDTO {
    rowNumber: number;
    code: string;
    name: string;
    description: string;
    programDuration: string;
    statusStr: string;
    status: 'VALID' | 'ERROR';
    errorMessage?: string;
    warningMessage?: string;
}

export interface MajorImportResult {
    created: number;
    updated: number;
    failed: number;
    errors?: string[];
}

export interface Page<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
}
