import React from 'react';
import { Pencil, Trash2, Power, PowerOff } from 'lucide-react';

interface SelectionActionBarProps {
    selectedCount: number;
    showDeactivate: boolean;
    onUpdate?: () => void;
    onDelete?: () => void;
    onStatusChange: (status: 'ACTIVE' | 'INACTIVE') => void;
    canDelete?: boolean;
    isDeleting?: boolean;
    itemLabel?: string;
    activateLabel?: string;
    deactivateLabel?: string;
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
    itemLabel = 'mục',
    activateLabel = 'Mở hoạt động',
    deactivateLabel = 'Ngừng hoạt động'
}) => {
    if (selectedCount === 0) return null;

    if (showDeactivate) {
        // Red bar - items are ACTIVE, show deactivate option
        return (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 shadow-sm">
                <div className="flex items-center gap-3 ml-2">
                    <span className="text-sm font-bold text-red-600">
                        Đã chọn {selectedCount} {itemLabel}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    {selectedCount === 1 && onUpdate && (
                        <button
                            type="button"
                            onClick={onUpdate}
                            className="h-[44px] px-6 text-sm bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 active:scale-95"
                        >
                            <Pencil size={16} />
                            Cập nhật
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => onStatusChange('INACTIVE')}
                        className="h-[44px] px-6 text-sm bg-amber-500 text-white rounded-2xl font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 active:scale-95"
                    >
                        <PowerOff size={16} />
                        {deactivateLabel}
                    </button>
                    {canDelete && onDelete && (
                        <button
                            type="button"
                            onClick={onDelete}
                            disabled={isDeleting}
                            className="h-[44px] px-6 text-sm bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 flex items-center gap-2 disabled:opacity-50 active:scale-95"
                        >
                            <Trash2 size={16} />
                            {isDeleting ? 'Đang xóa...' : 'Xóa'}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Green bar - items are INACTIVE, show activate and delete options
    return (
        <div className="mb-6 p-3 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 shadow-sm">
            <div className="flex items-center gap-3 ml-2">
                <span className="text-sm font-bold text-green-600">
                    Đã chọn {selectedCount} {itemLabel}
                </span>
            </div>
            <div className="flex items-center gap-3">
                {selectedCount === 1 && onUpdate && (
                    <button
                        type="button"
                        onClick={onUpdate}
                        className="h-[44px] px-6 text-sm bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 active:scale-95"
                    >
                        <Pencil size={16} />
                        Cập nhật
                    </button>
                )}
                <button
                        type="button"
                    onClick={() => onStatusChange('ACTIVE')}
                    className="h-[44px] px-6 text-sm bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 flex items-center gap-2 active:scale-95"
                >
                    <Power size={16} />
                    {activateLabel}
                </button>
                {canDelete && onDelete && (
                    <button
                        type="button"
                        onClick={onDelete}
                        disabled={isDeleting}
                        className="h-[44px] px-6 text-sm bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 flex items-center gap-2 disabled:opacity-50 active:scale-95"
                    >
                        <Trash2 size={16} />
                        {isDeleting ? 'Đang xóa...' : 'Xóa'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default SelectionActionBar;


