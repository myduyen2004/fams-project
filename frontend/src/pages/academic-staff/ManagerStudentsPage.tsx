import { useState, useEffect, useCallback } from 'react';
import { Loader2, Users } from 'lucide-react';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { academicStaffService, StudentResponse } from '../../services/api/academicStaffService';
import toast from "@utils/toast";
import {
    StudentFilters,
    StudentTableRow,
    ViewStudentModal,
    EditStudentModal,
    ImportStudentModal
} from '../../components/academic-staff/students';
import { usePagination } from '../../hooks/usePagination';

export const ManagerStudentsPage = () => {
    const [students, setStudents] = useState<StudentResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [subSpecializationFilter, setSubSpecializationFilter] = useState('all');
    const [majorFilter, setMajorFilter] = useState('all');
    const [specializationFilter, setSpecializationFilter] = useState('all');
    const [subSpecializations, setSubSpecializations] = useState<string[]>([]);

    const [majors, setMajors] = useState<string[]>([]);
    const [specializations, setSpecializations] = useState<string[]>([]);

    const [totalElements, setTotalElements] = useState(0);
    const [selectedStudents, setSelectedStudents] = useState<number[]>([]);

    // Use custom pagination hook - auto resets to page 0 when filters change
    const { page, setPage } = usePagination({
        resetDependencies: [subSpecializationFilter, majorFilter, specializationFilter, search]
    });

    const [isExporting, setIsExporting] = useState(false);

    // Modal states
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<StudentResponse | null>(null);

    // Fetch Majors for filters on mount
    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const mList = await academicStaffService.getAllMajors();
                setMajors(mList);
            } catch (error) {
                console.error('Failed to fetch majors for filters');
            }
        };
        fetchFilters();
    }, []);

    // Reset other filters and fetch specializations when major filter changes
    useEffect(() => {
        const fetchSpecs = async () => {
            setSpecializationFilter('all');
            setSubSpecializationFilter('all');
            setSubSpecializations([]);

            try {
                if (majorFilter !== 'all') {
                    const sList = await academicStaffService.getSpecializationsByMajor(majorFilter);
                    setSpecializations(sList);
                } else {
                    const sList = await academicStaffService.getAllSpecializations();
                    setSpecializations(sList);
                }
            } catch (error) {
                console.error('Failed to fetch specializations');
                setSpecializations([]);
            }
        };
        fetchSpecs();
    }, [majorFilter]);

    // Fetch sub-specializations when specialization filter changes
    useEffect(() => {
        const fetchSubSpecs = async () => {
            setSubSpecializationFilter('all'); // Reset sub-specialization when specialization changes
            if (specializationFilter !== 'all') {
                try {
                    const ssList = await academicStaffService.getSubSpecializationsBySpecialization(specializationFilter);
                    setSubSpecializations(ssList);
                } catch (error) {
                    console.error('Failed to fetch sub-specializations');
                    setSubSpecializations([]);
                }
            } else {
                setSubSpecializations([]);
            }
        };
        fetchSubSpecs();
    }, [specializationFilter]);

    const fetchStudents = useCallback(async () => {
        try {
            setLoading(true);
            const data = await academicStaffService.getStudents({
                major: majorFilter === 'all' ? undefined : majorFilter,
                specialization: specializationFilter === 'all' ? undefined : specializationFilter,
                subSpecialization: subSpecializationFilter === 'all' ? undefined : subSpecializationFilter,
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
    }, [subSpecializationFilter, majorFilter, specializationFilter, search, page]);

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
                subSpecialization: subSpecializationFilter === 'all' ? undefined : subSpecializationFilter,
                status: undefined
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
    }, [majorFilter, specializationFilter, subSpecializationFilter]);

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
            <div className="space-y-6">
                {/* Header & Filter Card */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-8 shadow-sm mb-6 animate-in fade-in duration-500">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Quản lý sinh viên</h1>
                            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">Quản lý hồ sơ và thông tin học tập của sinh viên</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                onClick={handleExport}
                                disabled={isExporting}
                                className="flex h-[52px] items-center gap-2 px-6 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm text-gray-700 dark:text-gray-200 font-bold hover:border-fpt-orange/40 hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isExporting ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <Users className="h-[18px] w-[18px]" />}
                                {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
                            </button>
                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="flex h-[52px] items-center gap-2 rounded-2xl bg-fpt-orange px-8 text-sm font-bold text-white hover:bg-orange-600 transition-all shadow-lg shadow-fpt-orange/20 active:scale-95"
                            >
                                <Users className="h-[18px] w-[18px]" />
                                Import sinh viên
                            </button>
                        </div>
                    </div>

                    <StudentFilters
                        search={search}
                        onSearchChange={setSearch}
                        subSpecializationFilter={subSpecializationFilter}
                        onSubSpecializationFilterChange={setSubSpecializationFilter}
                        subSpecializations={subSpecializations}

                        majorFilter={majorFilter}
                        onMajorFilterChange={setMajorFilter}
                        majors={majors}

                        specializationFilter={specializationFilter}
                        onSpecializationFilterChange={setSpecializationFilter}
                        specializations={specializations}

                        showImportButton={false}
                        showExportButton={false}
                    />
                </div>

                {/* Table Block */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden animate-in fade-in duration-700">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-fpt-orange text-white">
                                    <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                                        Sinh viên
                                    </th>
                                    <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                                        Mã số SV
                                    </th>
                                    <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                                        Ngành học
                                    </th>
                                    <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                                        Chuyên ngành
                                    </th>
                                    <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                                        Khóa
                                    </th>
                                    <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                                        GPA
                                    </th>
                                    <th className="px-4 py-5 text-left text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                                        Chuyên ngành hẹp
                                    </th>
                                    <th className="px-4 py-5 text-center w-24 text-xs font-bold uppercase tracking-widest whitespace-nowrap">
                                        Thao tác
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
                        <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-900/50 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between text-sm text-gray-500">
                            <div>
                                Hiển thị <span className="font-bold text-gray-900 dark:text-white">{page * 50 + 1}</span> đến{' '}
                                <span className="font-bold text-gray-900 dark:text-white">{Math.min((page + 1) * 50, totalElements)}</span> trong số{' '}
                                <span className="font-bold text-gray-900 dark:text-white">{totalElements}</span> sinh viên
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


