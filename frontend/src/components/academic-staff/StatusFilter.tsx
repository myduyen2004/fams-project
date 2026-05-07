import React from 'react';
import { CustomSelect } from '../common/CustomSelect';

interface StatusFilterProps {
    value: 'ACTIVE' | 'INACTIVE';
    onChange: (status: 'ACTIVE' | 'INACTIVE') => void;
    isOpen?: boolean; // Kept for prop compatibility, but CustomSelect handles its own state or we can sync
    onToggle?: () => void;
    activeLabel?: string;
    inactiveLabel?: string;
}

/**
 * StatusFilter - Refactored to use CustomSelect for robust positioning and standard design
 */
export const StatusFilter: React.FC<StatusFilterProps> = ({
    value,
    onChange,
    activeLabel = 'Đang mở',
    inactiveLabel = 'Ngừng hoạt động'
}) => {
    const options = [
        { label: activeLabel, value: 'ACTIVE' },
        { label: inactiveLabel, value: 'INACTIVE' }
    ];

    return (
        <div className="min-w-[180px]">
            <CustomSelect
                label="Trạng thái"
                value={value}
                onChange={(v) => onChange(v as 'ACTIVE' | 'INACTIVE')}
                options={options}
                placeholder="Chọn trạng thái"
            />
        </div>
    );
};

export default StatusFilter;

