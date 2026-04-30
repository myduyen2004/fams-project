import { Search, Download, Calendar, Loader2 } from 'lucide-react';
import { CustomDatePicker } from '../../common/CustomDatePicker';
import { CustomSelect } from '../../common/CustomSelect';

interface RequestFiltersProps {
    filters: {
        search: string;
        reason: string;
        status: string;
        startDate: string;
        endDate: string;
        requestType?: string;
    };
    onFilterChange: (newFilters: Partial<RequestFiltersProps['filters']>) => void;
    onExportClick?: () => void;
    isExporting?: boolean;
    showRequestTypeFilter?: boolean;
}

const RequestFilters: React.FC<RequestFiltersProps> = ({
    filters,
    onFilterChange,
    onExportClick,
    isExporting,
    showRequestTypeFilter = false
}) => {
    return (
        <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-gray-100 dark:border-zinc-700 w-full mb-6">
            <div className="flex flex-col lg:flex-row lg:items-end gap-4 pb-1">

                {/* Search */}
                <div className="flex-1 lg:min-w-[200px] relative">
                    <label className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1.5 ml-1">Tìm kiếm</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Người gửi, mã, lớp..."
                            value={filters.search}
                            onChange={(e) => onFilterChange({ search: e.target.value })}
                            className="pl-10 pr-4 h-[52px] w-full border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange text-gray-900 dark:text-white transition-all shadow-sm"
                        />
                    </div>
                </div>

                {/* Request Type Filter - Conditionally Shown */}
                {showRequestTypeFilter && (
                    <div className="w-full lg:w-64">
                        <label className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1.5 ml-1">Loại yêu cầu</label>
                        <CustomSelect
                            value={filters.requestType || ''}
                            onChange={(val) => onFilterChange({ requestType: val as string })}
                            options={[
                                { value: '', label: 'Tất cả loại' },
                                { value: 'PAUSE_SEMESTER', label: 'Xin tạm nghỉ học' },
                                { value: 'RETAKE_COURSE', label: 'Đăng ký học lại' },
                                { value: 'CHANGE_CLASS', label: 'Yêu cầu đổi lớp' },
                                { value: 'OVERLOAD_STUDY', label: 'Đăng ký học vượt' },
                                { value: 'ABSENT_REQUEST', label: 'Đề nghị miễn điểm danh' },
                                { value: 'GRADE_APPEAL', label: 'Đề nghị phúc khảo' },
                                { value: 'CHANGE_MAJOR', label: 'Đề nghị chuyển ngành' },
                                { value: 'CHANGE_SPECIALIZATION', label: 'Đề nghị đổi chuyên ngành hẹp' },
                                { value: 'OTHERS', label: 'Các loại đơn khác' }
                            ]}
                        />
                    </div>
                )}

                {/* Status */}
                <div className="w-full lg:w-64">
                    <label className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1.5 ml-1">Trạng thái</label>
                    <CustomSelect
                        value={filters.status}
                        onChange={(val) => onFilterChange({ status: val as string })}
                        options={[
                            { value: '', label: 'Tất cả trạng thái' },
                            { value: 'PENDING', label: 'Đang chờ' },
                            { value: 'APPROVED', label: 'Đã duyệt' },
                            { value: 'REJECTED', label: 'Đã từ chối' }
                        ]}
                    />
                </div>

                {/* Date Range */}
                <div className="flex-1 lg:max-w-md grid grid-cols-2 gap-3">
                    <div className="relative">
                        <label className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1.5 ml-1">Từ ngày</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <CustomDatePicker
                                value={filters.startDate}
                                onChange={(value) => onFilterChange({ startDate: value })}
                                className="w-full"
                            />
                        </div>
                    </div>

                    <div className="relative">
                        <label className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1.5 ml-1">Đến ngày</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <CustomDatePicker
                                value={filters.endDate}
                                onChange={(value) => onFilterChange({ endDate: value })}
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>

                {/* Export Button */}
                {onExportClick && (
                    <div className="w-full lg:w-auto">
                        <button
                            onClick={onExportClick}
                            disabled={isExporting}
                            className="w-full lg:w-auto px-6 h-[52px] bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 text-gray-700 dark:text-white text-sm font-bold rounded-2xl hover:border-fpt-orange/40 hover:shadow-lg hover:shadow-fpt-orange/5 transition-all flex items-center justify-center gap-2 shadow-sm whitespace-nowrap disabled:opacity-50"
                        >
                            {isExporting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Đang xuất...
                                </>
                            ) : (
                                <>
                                    <Download size={16} />
                                    Xuất Excel
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RequestFilters;

