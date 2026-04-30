import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, Clock, CheckCircle, FileText, User } from 'lucide-react';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { academicStaffService, ScheduleRequestResponse } from '../../services/api/academicStaffService';
import { academicRequestService, AcademicRequest } from '../../services/api/academicRequestService';
import toast from "@utils/toast";
import RequestFilters from '../../components/academic-staff/request/RequestFilters';
import RequestTableRow from '../../components/academic-staff/request/RequestTableRow';
import StudentRequestTableRow from '../../components/academic-staff/request/StudentRequestTableRow';
import { usePagination } from '../../hooks/usePagination';

type RequestTab = 'LECTURER' | 'STUDENT';

export const ScheduleRequestPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState<RequestTab>(() => {
        const params = new URLSearchParams(window.location.search);
        return (params.get('tab') === 'STUDENT') ? 'STUDENT' : 'LECTURER';
    });
    const [lecturerRequests, setLecturerRequests] = useState<ScheduleRequestResponse[]>([]);
    const [studentRequests, setStudentRequests] = useState<AcademicRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalElements, setTotalElements] = useState(0);
    const [size] = useState(10);
    const [filters, setFilters] = useState({
        search: '',
        reason: '',
        status: '',
        startDate: '',
        endDate: '',
        requestType: ''
    });
    const [isExporting, setIsExporting] = useState(false);
    const [stats, setStats] = useState({ pending: 0, processed: 0 });
    const [studentStats, setStudentStats] = useState({ pending: 0, approved: 0, rejected: 0 });

    // Use custom pagination hook - auto resets to page 0 when filters or tab change
    const { page, setPage } = usePagination({
        resetDependencies: [activeTab, filters.search, filters.reason, filters.status, filters.startDate, filters.endDate, filters.requestType]
    });

    const fetchLecturerRequests = useCallback(async () => {
        try {
            const data = await academicStaffService.getScheduleRequests({
                ...filters,
                page,
                size,
                sort: 'createdAt,desc'
            });
            setLecturerRequests(data.content || []);
            setTotalElements(data.totalElements || 0);

            const statsData = await academicStaffService.getScheduleRequestStats();
            setStats({
                pending: statsData.pending || 0,
                processed: statsData.processed || 0
            });
        } catch (error) {
            console.error('Error fetching lecturer requests:', error);
            toast.error('Không thể tải danh sách yêu cầu giảng viên');
        }
    }, [page, size, filters]);

    const fetchStudentRequests = useCallback(async () => {
        try {
            const data = await academicRequestService.getRequests(
                page,
                size,
                'createdAt,desc',
                {
                    search: filters.search,
                    status: filters.status,
                    requestType: filters.requestType,
                }
            );
            setStudentRequests(data.content || []);
            setTotalElements(data.totalElements || 0);

            const statsData = await academicRequestService.getStats();
            setStudentStats({
                pending: statsData.pending || 0,
                approved: statsData.approved || 0,
                rejected: statsData.rejected || 0
            });
        } catch (error) {
            console.error('Error fetching student requests:', error);
            toast.error('Không thể tải danh sách yêu cầu sinh viên');
        }
    }, [page, size, filters]);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        if (activeTab === 'LECTURER') {
            await fetchLecturerRequests();
        } else {
            await fetchStudentRequests();
        }
        setLoading(false);
    }, [activeTab, fetchLecturerRequests, fetchStudentRequests]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        if (tab === 'STUDENT') {
            setActiveTab('STUDENT');
        } else if (tab === 'LECTURER') {
            setActiveTab('LECTURER');
        }
    }, [location.search]);

    const handleFilterChange = (newFilters: Partial<typeof filters>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    };

    const handleViewRequest = (request: ScheduleRequestResponse) => {
        navigate(`/academic-staff/requests/${request.id}`);
    };

    const handleViewStudentRequest = (request: AcademicRequest) => {
        navigate(`/academic-staff/student-requests/${request.id}`);
    };

    const handleExport = async () => {
        try {
            setIsExporting(true);
            if (activeTab === 'LECTURER') {
                const blob = await academicStaffService.exportScheduleRequests(filters);
                downloadBlob(blob, `danh-sach-yeu-cau-lich-day-${new Date().toISOString().split('T')[0]}.xlsx`);
            } else {
                // Implement student request export if needed, or show message
                toast.error('Tính năng xuất Excel cho yêu cầu sinh viên đang phát triển');
            }
        } catch (error) {
            console.error('Error exporting requests:', error);
            toast.error('Lỗi khi xuất file Excel');
        } finally {
            setIsExporting(false);
        }
    };

    const downloadBlob = (blob: Blob, filename: string) => {
        if (!blob) return;
        const properBlob = new Blob([blob], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const url = window.URL.createObjectURL(properBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('Xuất Excel thành công');
    };

    const totalPages = Math.ceil(totalElements / size);

    return (
        <AcademicStaffLayout pageTitle="Quản lý Yêu cầu">
            <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 group hover:border-amber-200 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600">
                                <Clock size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Đang chờ xử lý</p>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {activeTab === 'LECTURER' ? stats.pending : studentStats.pending}
                                </h3>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 group hover:border-emerald-200 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Đã xử lý</p>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {activeTab === 'LECTURER' ? stats.processed : (studentStats.approved + studentStats.rejected)}
                                </h3>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 group hover:border-blue-200 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                                <FileText size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tổng số yêu cầu</p>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{totalElements}</h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-zinc-800">
                    <button
                        onClick={() => setActiveTab('LECTURER')}
                        className={`px-6 py-3 text-sm font-semibold transition-all border-b-2 ${activeTab === 'LECTURER'
                            ? 'border-fpt-orange text-fpt-orange'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <User size={18} />
                            Thay đổi lịch dạy (Giảng viên)
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('STUDENT')}
                        className={`px-6 py-3 text-sm font-semibold transition-all border-b-2 ${activeTab === 'STUDENT'
                            ? 'border-fpt-orange text-fpt-orange'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <FileText size={18} />
                            Yêu cầu học thuật (Sinh viên)
                        </div>
                    </button>
                </div>

                <RequestFilters
                    filters={filters as any}
                    onFilterChange={handleFilterChange}
                    onExportClick={activeTab === 'LECTURER' ? handleExport : undefined}
                    isExporting={isExporting}
                    showRequestTypeFilter={activeTab === 'STUDENT'}
                />

                {/* Content Table Container */}
                <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
                    <div className="flex flex-col gap-6">
                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50/50 dark:bg-zinc-800/50">
                                        <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                                            Người gửi
                                        </th>
                                        <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                                            Vai trò
                                        </th>
                                        <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                                            {activeTab === 'LECTURER' ? 'Lớp / Nhóm' : 'Tiêu đề'}
                                        </th>
                                        <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                                            Loại yêu cầu
                                        </th>
                                        <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                                            Ngày gửi
                                        </th>
                                        <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                                            Trạng thái
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="py-20 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Loader2 className="w-8 h-8 animate-spin text-fpt-orange mx-auto" />
                                                    <span className="text-sm font-medium text-gray-500">Đang tải yêu cầu...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (totalElements === 0) ? (
                                        <tr>
                                            <td colSpan={6} className="py-20 text-center text-gray-500 italic">
                                                Không tìm thấy yêu cầu nào
                                            </td>
                                        </tr>
                                    ) : (
                                        activeTab === 'LECTURER' ? (
                                            lecturerRequests.map((request) => (
                                                <RequestTableRow
                                                    key={request.id}
                                                    request={request}
                                                    onView={() => handleViewRequest(request)}
                                                />
                                            ))
                                        ) : (
                                            studentRequests.map((request) => (
                                                <StudentRequestTableRow
                                                    key={request.id}
                                                    request={request}
                                                    onView={() => handleViewStudentRequest(request)}
                                                />
                                            ))
                                        )
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
                                        onClick={() => setPage(Math.max(0, page - 1))}
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
                                        onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
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



