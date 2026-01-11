import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';

interface SelectionActionBarProps {
    selectedCount: number;
    showDeactivate: boolean;
    onUpdate?: () => void;
    onDelete?: () => void;
    onStatusChange: (status: 'ACTIVE' | 'INACTIVE') => void;
    canDelete?: boolean;
    isDeleting?: boolean;
    itemLabel?: string;
}

/**
 * SelectionActionBar - Action bar displayed when items are selected
 */
export const SelectionActionBar: React.FC<SelectionActionBarProps> = ({
    selectedCount,
    showDeactivate,
    onUpdate,
    onDelete,
    onStatusChange,
    canDelete = true,
    isDeleting = false,
    itemLabel = 'mục'
}) => {
    if (selectedCount === 0) return null;

    if (showDeactivate) {
        // Red bar - items are ACTIVE, show deactivate option
        return (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                <span className="text-sm font-medium text-red-600">
                    Đã chọn {selectedCount} {itemLabel}
                </span>
                <div className="flex items-center gap-2">
                    {selectedCount === 1 && onUpdate && (
                        <button
                            onClick={onUpdate}
                            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                            <Pencil className="h-4 w-4" />
                            Cập nhật
                        </button>
                    )}
                    <button
                        onClick={() => onStatusChange('INACTIVE')}
                        className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                        Ngừng đào tạo
                    </button>
                </div>
            </div>
        );
    }

    // Green bar - items are INACTIVE, show activate and delete options
    return (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <span className="text-sm font-medium text-green-600">
                Đã chọn {selectedCount} {itemLabel}
            </span>
            <div className="flex items-center gap-2">
                {selectedCount === 1 && onUpdate && (
                    <button
                        onClick={onUpdate}
                        className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <Pencil className="h-4 w-4" />
                        Cập nhật
                    </button>
                )}
                <button
                    onClick={() => onStatusChange('ACTIVE')}
                    className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                    Mở lại
                </button>
                {canDelete && onDelete && (
                    <button
                        onClick={onDelete}
                        disabled={isDeleting}
                        className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <Trash2 className="h-4 w-4" />
                        {isDeleting ? 'Đang xóa...' : 'Xóa'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default SelectionActionBar;
