export const GRADE_TYPE_PRIORITY: Record<string, number> = {
    'PARTICIPATION': 1,
    'QUIZ': 2,
    'PROGRESS_TEST': 3,
    'WORKSHOP': 4,
    'PROJECT': 5,
    'PRESENTATION': 6,
    'ASSIGNMENT': 7,
    'MID_TERM': 8,
    'PRACTICAL_EXAM': 9,
};

export const CATEGORY_PRIORITY: Record<string, number> = {
    'participation': 1,
    'quiz': 2,
    'progress test': 3,
    'workshop': 4,
    'project': 5,
    'presentation': 6,
    'assignment': 7,
    'midterm test': 8,
    'practical exam': 9,
};

/**
 * Interface representing common properties for sorting grade components
 */
export interface SortableGradeComponent {
    id: number;
    name: string;
    type: string;
    weight: number;
    isResit: boolean;
}

/**
 * Standardized sorting for Grade Components
 * 1. Final Exam and Resit ALWAYS at the bottom
 * 2. Others grouped by Type, ordered by total weight of type (ascending)
 * 3. Tied types ordered by predefined priority
 * 4. Items within same type sorted numerically by Name (Progress Test 1, 2, 3...)
 */
export const sortGradeComponents = <T extends SortableGradeComponent>(components: T[]): T[] => {
    if (!components || components.length === 0) return [];

    // Calculate total weight for each type (excluding FE and Resit groups)
    const weightByType = components.reduce((acc, curr) => {
        const isSpecial = curr.isResit || curr.type === 'FINAL_EXAM' || curr.type === 'RESIT';
        if (!isSpecial) {
            acc[curr.type] = (acc[curr.type] || 0) + curr.weight;
        }
        return acc;
    }, {} as Record<string, number>);

    return [...components].sort((a, b) => {
        const isAResit = a.isResit || a.type === 'RESIT';
        const isBResit = b.isResit || b.type === 'RESIT';
        const isAFinal = a.type === 'FINAL_EXAM';
        const isBFinal = b.type === 'FINAL_EXAM';

        // 1. Priority: Resit is absolute bottom
        if (isAResit !== isBResit) return isAResit ? 1 : -1;
        if (isAResit && isBResit) return a.id - b.id;

        // 2. Priority: Final Exam is above Resit but below others
        if (isAFinal !== isBFinal) return isAFinal ? 1 : -1;
        if (isAFinal && isBFinal) return a.id - b.id;

        // 3. Priority: Total weight of type (ascending)
        const totalWeightA = weightByType[a.type] || 0;
        const totalWeightB = weightByType[b.type] || 0;
        if (Math.abs(totalWeightA - totalWeightB) > 0.01) {
            return totalWeightA - totalWeightB;
        }

        // 4. Priority: Type predefined vertical order
        const priorityA = GRADE_TYPE_PRIORITY[a.type] || 99;
        const priorityB = GRADE_TYPE_PRIORITY[b.type] || 99;
        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }

        // 5. Priority: Natural numerical name sorting
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
};

/**
 * Natural alphabetical sorting with numeric support (e.g. "Item 1", "Item 2", "Item 10")
 */
export const naturalSort = (a: string, b: string) => {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
};

/**
 * Standardized sorting for Student Grade Categories
 */
export const sortGradeCategories = <T extends { categoryName: string, items: any[], totalWeight: number }>(categories: T[]): T[] => {
    if (!categories || categories.length === 0) return [];

    return [...categories]
        .sort((a, b) => {
            const nameA = a.categoryName.toLowerCase();
            const nameB = b.categoryName.toLowerCase();

            // 1. Resit is always last
            const isAResit = nameA === 'resit';
            const isBResit = nameB === 'resit';
            if (isAResit !== isBResit) return isAResit ? 1 : -1;
            if (isAResit && isBResit) return 0;

            // 2. Final Exam is second to last
            const isAFinal = nameA.includes('final');
            const isBFinal = nameB.includes('final');
            if (isAFinal !== isBFinal) return isAFinal ? 1 : -1;
            if (isAFinal && isBFinal) return 0;

            // 3. Sort by Total Weight (ascending)
            if (Math.abs(a.totalWeight - b.totalWeight) > 0.01) {
                return a.totalWeight - b.totalWeight;
            }

            // 4. Sort by Type Priority
            const priorityA = CATEGORY_PRIORITY[nameA] || 99;
            const priorityB = CATEGORY_PRIORITY[nameB] || 99;

            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }

            // 5. Final tie-breaker: Alphabetical
            return a.categoryName.localeCompare(b.categoryName);
        })
        .map(category => ({
            ...category,
            items: [...category.items].sort((a: any, b: any) => {
                // "Total" always at the end
                if (a.itemName === 'Total') return 1;
                if (b.itemName === 'Total') return -1;

                // Natural alphabetical sort for others
                return naturalSort(a.itemName, b.itemName);
            })
        }));
};
