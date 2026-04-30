import React from 'react';
import { CustomSelect } from '../common/CustomSelect';

interface SemesterFilterProps {
    value: number;
    onChange: (semester: number) => void;
    // Keeping these for prop compatibility with existing components, 
    // although CustomSelect manages its own state.
    isOpen?: boolean; 
    onToggle?: () => void;
}

/**
 * SemesterFilter - Refactored to use CustomSelect for design consistency and portal support
 */
export const SemesterFilter: React.FC<SemesterFilterProps> = ({ value, onChange }) => {
    const semesters = [
        { label: 'Học kỳ 1', value: '1' },
        { label: 'Học kỳ 2', value: '2' },
        { label: 'Học kỳ 3', value: '3' },
        { label: 'Học kỳ 4', value: '4' },
        { label: 'Học kỳ 5', value: '5' },
        { label: 'Học kỳ 6', value: '6' },
        { label: 'Học kỳ 7', value: '7' },
        { label: 'Học kỳ 8', value: '8' },
        { label: 'Học kỳ 9', value: '9' },
    ];

    return (
        <div className="w-full">
            <CustomSelect
                label="Học kỳ"
                value={value.toString()}
                onChange={(v) => onChange(parseInt(v))}
                options={semesters}
                placeholder="Chọn học kỳ"
            />
        </div>
    );
};

export default SemesterFilter;

