import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Clock, CheckCircle, FileText } from 'lucide-react';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { academicStaffService, ScheduleRequestResponse } from '../../services/api/academicStaffService';
import toast from 'react-hot-toast';
import RequestFilters from '../../components/academic-staff/request/RequestFilters';
import RequestTableRow from '../../components/academic-staff/request/RequestTableRow';

export const ScheduleRequestPage = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<ScheduleRequestResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalElements, setTotalElements] = useState(0);
    const [page, setPage] = useState(0);
    const [size] = useState(10);
    const [filters, setFilters] = useState({
        search: '',
        role: '',
        reason: '',
        status: '',
        startDate: '',
        endDate: ''
    });
    const [isExporting, setIsExporting] = useState(false);
    const [stats, setStats] = useState({ pending: 0, processed: 0 });

    const fetchRequests = useCallback(async () => {
        try {
            setLoading(true);
            const data = await academicStaffService.getScheduleRequests({
                ...filters,
                page,
                size,
                sort: 'createdAt,desc'
            });
            setRequests(data.content || []);
            setTotalElements(data.totalElements || 0);

            const statsData = await academicStaffService.getScheduleRequestStats();
            setStats({
                pending: statsData.pending || 0,
                processed: statsData.processed || 0
            });
        } catch (error) {
            console.error('Error fetching requests:', error);
            toast.error('Không thể tải danh sách yêu cầu');
        } finally {
            setLoading(false);
        }
    }, [page, size, filters]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleFilterChange = (newFilters: Partial<typeof filters>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setPage(0);
    };

    const handleViewRequest = (request: ScheduleRequestResponse) => {
        navigate(`/academic-staff/requests/${request.id}`);
    };

    const handleExport = async () => {
        try {
            setIsExporting(true);
            console.log('Exporting with filters:', filters);

            const blob = await academicStaffService.exportScheduleRequests(filters);
            console.log('Received blob:', blob);
            console.log('Blob type:', blob?.type);
            console.log('Blob size:', blob?.size);

            if (!blob) {
                throw new Error('No blob received from server');
            }

            // Ensure blob has correct type for maximum compatibility
            const properBlob = new Blob([blob], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            // Create download link
            const url = window.URL.createObjectURL(properBlob);
            console.log('Created blob URL:', url);

            const dateStr = new Date().toISOString().split('T')[0];
            const filename = `danh-sach-yeu-cau-${dateStr}.xlsx`;

            const link = document.createElement('a');
            link.style.display = 'none';
            link.href = url;
            link.download = filename;
            // Set attribute explicitly for better compatibility
            link.setAttribute('download', filename);
            console.log('Setting filename:', filename);

            document.body.appendChild(link);

            // Small delay before click for Safari compatibility
            setTimeout(() => {
                link.click();
                console.log('Download triggered');
            }, 10);

            // Cleanup after download starts
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                console.log('Cleanup complete');
            }, 100);

            toast.success('Xuất Excel thành công');
        } catch (error) {
            console.error('Error exporting requests:', error);
            toast.error('Lỗi khi xuất file Excel');
        } finally {
            setIsExporting(false);
        }
    };

    const totalPages = Math.ceil(totalElements / size);

    return (
        <AcademicStaffLayout pageTitle="Quản lý Yêu cầu">
            <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Yêu cầu chờ xử lý</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</h3>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600">
                            <CheckCircle size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Yêu cầu đã xử lý</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.processed}</h3>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                            <FileText size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-zinc-400">Tổng số yêu cầu</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{totalElements}</h3>
                        </div>
                    </div>
                </div>

                <RequestFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onExportClick={handleExport}
                    isExporting={isExporting}
                />

                {/* Content Table Container */}
                <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
                    <div className="flex flex-col gap-6">
                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-fpt-orange text-white">
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider rounded-tl-lg">
                                            Người gửi
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                                            Vai trò
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                                            Lớp / Nhóm
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                                            Lý do
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                                            Ngày gửi
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                                            Trạng thái
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider rounded-tr-lg">
                                            Hành động
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="py-20 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Loader2 className="w-8 h-8 animate-spin text-fpt-orange mx-auto" />
                                                    <span className="text-sm font-medium text-gray-500">Đang tải yêu cầu...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (requests && requests.length === 0) ? (
                                        <tr>
                                            <td colSpan={7} className="py-20 text-center text-gray-500 italic">
                                                Không tìm thấy yêu cầu nào
                                            </td>
                                        </tr>
                                    ) : (
                                        requests.map((request) => (
                                            <RequestTableRow
                                                key={request.id}
                                                request={request}
                                                onView={() => handleViewRequest(request)}
                                            />
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalElements > 0 && (
                            <div className="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-zinc-800 text-sm text-gray-500">
                                <div>
                                    Hiển thị <span className="font-medium text-gray-900 dark:text-white">{page * size + 1}</span> đến{' '}
                                    <span className="font-medium text-gray-900 dark:text-white">{Math.min((page + 1) * size, totalElements)}</span> trong số{' '}
                                    <span className="font-medium text-gray-900 dark:text-white">{totalElements}</span> yêu cầu
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setPage(p => Math.max(0, p - 1))}
                                        disabled={page === 0}
                                        className="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 text-gray-500"
                                    >
                                        Trước
                                    </button>
                                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                        let pageNum = i;
                                        if (totalPages > 5) {
                                            if (page < 3) pageNum = i;
                                            else if (page > totalPages - 4) pageNum = totalPages - 5 + i;
                                            else pageNum = page - 2 + i;
                                        }
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setPage(pageNum)}
                                                className={`w-8 h-8 flex items-center justify-center rounded-lg font-medium transition-colors ${page === pageNum
                                                    ? 'bg-fpt-orange text-white'
                                                    : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-400'
                                                    }`}
                                            >
                                                {pageNum + 1}
                                            </button>
                                        );
                                    })}
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                        disabled={page >= totalPages - 1}
                                        className="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 text-gray-500"
                                    >
                                        Sau
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AcademicStaffLayout>
    );
};

export default ScheduleRequestPage;
