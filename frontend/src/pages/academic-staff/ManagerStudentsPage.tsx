import { useState, useEffect, useCallback } from 'react';
import { Loader2, Users } from 'lucide-react';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { academicStaffService, StudentResponse } from '../../services/api/academicStaffService';
import toast from 'react-hot-toast';
import {
    StudentFilters,
    StudentTableRow,
    ViewStudentModal,
    EditStudentModal,
    ImportStudentModal
} from '../../components/academic-staff/students';

export const ManagerStudentsPage = () => {
    const [students, setStudents] = useState<StudentResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [majorFilter, setMajorFilter] = useState('all');
    const [specializationFilter, setSpecializationFilter] = useState('all');

    const [majors, setMajors] = useState<string[]>([]);
    const [specializations, setSpecializations] = useState<string[]>([]);

    const [page, setPage] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [selectedStudents, setSelectedStudents] = useState<number[]>([]);

    const [isExporting, setIsExporting] = useState(false);

    // Modal states
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<StudentResponse | null>(null);

    // Fetch Majors and Specializations for filters
    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const [mList, sList] = await Promise.all([
                    academicStaffService.getAllMajors(),
                    academicStaffService.getAllSpecializations()
                ]);
                setMajors(mList);
                setSpecializations(sList);
            } catch (error) {
                console.error('Failed to fetch majors/specializations for filters');
            }
        };
        fetchFilters();
    }, []);

    const fetchStudents = useCallback(async () => {
        try {
            setLoading(true);
            const data = await academicStaffService.getStudents({
                status: statusFilter === 'all' ? undefined : statusFilter,
                major: majorFilter === 'all' ? undefined : majorFilter,
                specialization: specializationFilter === 'all' ? undefined : specializationFilter,
                search,
                page,
                size: 50,
                sort: 'id,asc'
            });
            setStudents(data.content);
            setTotalElements(data.totalElements);
        } catch (error) {
            toast.error('Không thể tải danh sách sinh viên');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, majorFilter, specializationFilter, search, page]);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    // Handlers
    const handleView = useCallback((student: StudentResponse) => {
        setSelectedStudent(student);
        setIsViewModalOpen(true);
    }, []);

    const handleEdit = useCallback((student: StudentResponse) => {
        setSelectedStudent(student);
        setIsEditModalOpen(true);
    }, []);

    const handleSelectStudent = useCallback((id: number) => {
        setSelectedStudents(prev =>
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    }, []);

    // Export Excel handler
    const handleExport = useCallback(async () => {
        try {
            setIsExporting(true);
            const blob = await academicStaffService.exportStudents({
                major: majorFilter === 'all' ? undefined : majorFilter,
                specialization: specializationFilter === 'all' ? undefined : specializationFilter,
                subSpecialization: undefined, // Add if subSpecializationFilter state is added
                status: statusFilter === 'all' ? undefined : statusFilter
            });

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `danh-sach-sinh-vien-${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success('Xuất Excel thành công');
        } catch (error) {
            toast.error('Lỗi khi xuất file Excel');
        } finally {
            setIsExporting(false);
        }
    }, [majorFilter, specializationFilter, statusFilter]);

    const handleEditSuccess = useCallback(() => {
        setIsEditModalOpen(false);
        fetchStudents();
    }, [fetchStudents]);

    const handleImportSuccess = useCallback(() => {
        setIsImportModalOpen(false);
        fetchStudents();
    }, [fetchStudents]);

    const totalPages = Math.ceil(totalElements / 50);

    return (
        <AcademicStaffLayout pageTitle="Quản lý Sinh viên">
            <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">

                {/* Filters */}
                <StudentFilters
                    search={search}
                    onSearchChange={setSearch}
                    statusFilter={statusFilter}
                    onStatusFilterChange={setStatusFilter}

                    majorFilter={majorFilter}
                    onMajorFilterChange={setMajorFilter}
                    majors={majors}

                    specializationFilter={specializationFilter}
                    onSpecializationFilterChange={setSpecializationFilter}
                    specializations={specializations}

                    showImportButton={true}
                    showExportButton={true}
                    onExportClick={handleExport}
                    onImportClick={() => setIsImportModalOpen(true)}

                    isExporting={isExporting}
                />

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-fpt-orange text-white">
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider rounded-tl-lg">
                                    Sinh viên
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                                    Mã số SV (MSSV)
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                                    Ngành học
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                                    Chuyên ngành
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                                    Khóa
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                                    GPA
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
                                    <td colSpan={8} className="py-10 text-center text-gray-400">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                        Đang tải dữ liệu...
                                    </td>
                                </tr>
                            ) : students.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-10 text-center text-gray-400">
                                        <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        Không tìm thấy sinh viên nào
                                    </td>
                                </tr>
                            ) : (
                                students.map((student) => (
                                    <StudentTableRow
                                        key={student.id}
                                        student={student}
                                        isSelected={selectedStudents.includes(student.id)}
                                        onSelect={handleSelectStudent}
                                        onView={handleView}
                                        onEdit={handleEdit}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalElements > 0 && (
                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100 dark:border-zinc-800 text-sm text-gray-500">
                        <div>
                            Hiển thị <span className="font-medium text-gray-900 dark:text-white">{page * 50 + 1}</span> đến{' '}
                            <span className="font-medium text-gray-900 dark:text-white">{Math.min((page + 1) * 50, totalElements)}</span> trong số{' '}
                            <span className="font-medium text-gray-900 dark:text-white">{totalElements}</span> sinh viên
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

            {/* Modals */}
            {isViewModalOpen && selectedStudent && (
                <ViewStudentModal
                    student={selectedStudent}
                    onClose={() => setIsViewModalOpen(false)}
                />
            )}
            {isEditModalOpen && selectedStudent && (
                <EditStudentModal
                    student={selectedStudent}
                    onClose={() => setIsEditModalOpen(false)}
                    onSuccess={handleEditSuccess}
                />
            )}
            {isImportModalOpen && (
                <ImportStudentModal
                    onClose={() => setIsImportModalOpen(false)}
                    onSuccess={handleImportSuccess}
                />
            )}
        </AcademicStaffLayout>
    );
};

export default ManagerStudentsPage;
