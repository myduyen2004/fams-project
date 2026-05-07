import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Save, Search, ChevronDown } from 'lucide-react';
import apiClient from '../../services/api/authService';
import toast from "@utils/toast";

interface ClassSection {
    className: string;
    courseCode: string;
    courseName: string;
    semesterCode: string;
    semesterName: string;
    lecturerName: string | null;
    lecturerUsername: string | null;
    enrollmentInfo: string;
    slots: number;
    maxStudents: number;
    status: string;
    semesterStatus: string;
}

interface LecturerOption {
    id: number;
    fullName: string;
    username: string;
}

interface CourseOption {
    id: number;
    code: string;
    name: string;
}

interface ClassSectionFormModalProps {
    isOpen: boolean;
    classSection: ClassSection | null; // null = create mode, object = edit mode
    semesterCode: string;
    onClose: () => void;
    onSuccess: () => void;
}

// Searchable Dropdown Component
const SearchableDropdown: React.FC<{
    label: string;
    value: string;
    displayValue: string;
    options: { value: string; label: string; sublabel?: string }[];
    onChange: (value: string, label: string) => void;
    placeholder: string;
    searchPlaceholder: string;
    disabled?: boolean;
    required?: boolean;
    loading?: boolean;
}> = ({ label, value, displayValue, options, onChange, placeholder, searchPlaceholder, disabled, required, loading }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase()) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(search.toLowerCase()))
    );

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2 block ml-1">
                {label} {required && !disabled && <span className="text-red-500">*</span>}
            </label>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full h-[52px] px-4 border-2 rounded-2xl text-sm focus:outline-none transition-all flex items-center justify-between
                    ${disabled ? 'bg-gray-50 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-800 text-gray-400 cursor-not-allowed' : 'bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 hover:border-fpt-orange/40 text-gray-900 focus:border-fpt-orange focus:ring-4 focus:ring-fpt-orange/10'}`}
            >
                <span className={value ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400'}>
                    {displayValue || placeholder}
                </span>
                {!disabled && <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
            </button>

            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-xl max-h-[300px] overflow-hidden">
                    {/* Search Input */}
                    <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full pl-9 pr-3 h-[44px] bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-fpt-orange focus:ring-4 focus:ring-fpt-orange/10 transition-all text-sm text-gray-900 dark:text-white"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="max-h-[150px] overflow-auto">
                        {loading ? (
                            <div className="p-4 text-center text-sm text-gray-500">
                                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                                Đang tải...
                            </div>
                        ) : filteredOptions.length === 0 ? (
                            <div className="p-4 text-center text-sm text-gray-500">
                                Không tìm thấy kết quả
                            </div>
                        ) : (
                            <>
                                {/* Empty option */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange('', '');
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-700/50"
                                >
                                    {placeholder}
                                </button>
                                {filteredOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => {
                                            onChange(opt.value, opt.label);
                                            setIsOpen(false);
                                            setSearch('');
                                        }}
                                        className={`w-full px-4 py-2 text-left transition-colors hover:bg-orange-50 dark:hover:bg-orange-900/10
                                            ${value === opt.value ? 'bg-orange-50 dark:bg-orange-900/20 text-fpt-orange font-bold' : 'text-gray-700 dark:text-gray-300'}`}
                                    >
                                        <div className="text-sm">{opt.label}</div>
                                        {opt.sublabel && (
                                            <div className="text-[11px] opacity-60">{opt.sublabel}</div>
                                        )}
                                    </button>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const ClassSectionFormModal: React.FC<ClassSectionFormModalProps> = ({
    isOpen,
    classSection,
    semesterCode,
    onClose,
    onSuccess,
}) => {
    const isEditMode = !!classSection;

    // Form state
    const [className, setClassName] = useState('');
    const [courseCode, setCourseCode] = useState('');
    const [courseDisplay, setCourseDisplay] = useState('');
    const [lecturerUsername, setLecturerUsername] = useState('');
    const [lecturerDisplay, setLecturerDisplay] = useState('');
    const [maxStudents, setMaxStudents] = useState<number | ''>(30);

    // Data state
    const [lecturers, setLecturers] = useState<LecturerOption[]>([]);
    const [courses, setCourses] = useState<CourseOption[]>([]);
    const [loadingLecturers, setLoadingLecturers] = useState(false);
    const [loadingCourses, setLoadingCourses] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Fetch lecturers and courses
    useEffect(() => {
        if (isOpen) {
            fetchLecturers();
            fetchCourses();
        }
    }, [isOpen]);

    // Populate form when editing
    useEffect(() => {
        if (isOpen && classSection) {
            setClassName(classSection.className);
            setCourseCode(classSection.courseCode);
            setCourseDisplay(`${classSection.courseCode} - ${classSection.courseName}`);
            setLecturerUsername(classSection.lecturerUsername || '');
            setLecturerDisplay(classSection.lecturerName || '');
            setMaxStudents(classSection.maxStudents);
        } else if (isOpen && !classSection) {
            // Reset form for create mode
            setClassName('');
            setCourseCode('');
            setCourseDisplay('');
            setLecturerUsername('');
            setLecturerDisplay('');
            setMaxStudents(30);
        }
    }, [isOpen, classSection]);

    const fetchLecturers = async () => {
        try {
            setLoadingLecturers(true);
            const response = await apiClient.get('/v1/class-sections/lecturers');
            setLecturers(response.data);
        } catch (error) {
            console.error('Error fetching lecturers:', error);
            toast.error('Không thể tải danh sách giảng viên');
        } finally {
            setLoadingLecturers(false);
        }
    };

    const fetchCourses = async () => {
        try {
            setLoadingCourses(true);
            // Use search endpoint which is more permissive
            const response = await apiClient.get('/courses/search', {
                params: { limit: 1000 }
            });
            setCourses(response.data || []);
        } catch (error) {
            console.error('Error fetching courses:', error);
            toast.error('Không thể tải danh sách môn học');
        } finally {
            setLoadingCourses(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!className.trim()) {
            toast.error('Vui lòng nhập mã lớp học phần');
            return;
        }
        if (!courseCode) {
            toast.error('Vui lòng chọn môn học');
            return;
        }

        try {
            setSubmitting(true);

            const payload = {
                className: className.trim(),
                courseCode,
                semesterCode,
                lecturerUsername: lecturerUsername || null,
                maxStudents: maxStudents || 30,
            };

            if (isEditMode) {
                await apiClient.put(`/v1/class-sections/${encodeURIComponent(classSection!.className)}`, payload);
                toast.success('Cập nhật lớp học phần thành công');
            } else {
                await apiClient.post('/v1/class-sections', payload);
                toast.success('Tạo lớp học phần thành công');
            }

            onSuccess();
        } catch (error: any) {
            console.error('Error saving class section:', error);
            const message = error.response?.data?.message || error.response?.data || 'Có lỗi xảy ra';
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    // Build options for dropdowns
    const courseOptions = courses.map(c => ({
        value: c.code,
        label: `${c.code} - ${c.name}`
    }));

    const lecturerOptions = lecturers.map(l => ({
        value: l.username,
        label: `${l.fullName} (${l.username})`
    }));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 dark:border-zinc-800 overflow-visible">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {isEditMode ? 'Sửa lớp học phần' : 'Tạo lớp học phần mới'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
                            Học kỳ: <span className="font-bold text-fpt-orange">{semesterCode}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all active:scale-95">
                        <X size={20} className="text-gray-400 hover:text-gray-600" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Class Name */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2 block ml-1">
                            Mã lớp học phần {!isEditMode && <span className="text-red-500">*</span>}
                        </label>
                        <input
                            type="text"
                            value={className}
                            onChange={(e) => setClassName(e.target.value)}
                            disabled={isEditMode}
                            placeholder="VD: SE18B02-PRN211"
                            className={`w-full h-[52px] px-4 border-2 rounded-2xl text-sm transition-all focus:outline-none
                                ${isEditMode ? 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white border-gray-100 hover:border-fpt-orange/40 focus:border-fpt-orange focus:ring-4 focus:ring-fpt-orange/10'}`}
                        />
                        {isEditMode && (
                            <p className="text-xs text-gray-400 mt-1">Không thể thay đổi mã lớp học phần</p>
                        )}
                    </div>

                    {/* Course - Searchable Dropdown */}
                    <SearchableDropdown
                        label="Môn học"
                        value={courseCode}
                        displayValue={courseDisplay}
                        options={courseOptions}
                        onChange={(value, label) => {
                            setCourseCode(value);
                            setCourseDisplay(label);
                        }}
                        placeholder="-- Chọn môn học --"
                        searchPlaceholder="Tìm theo mã hoặc tên môn..."
                        disabled={isEditMode}
                        required
                        loading={loadingCourses}
                    />

                    {/* Lecturer - Searchable Dropdown */}
                    <SearchableDropdown
                        label="Giảng viên"
                        value={lecturerUsername}
                        displayValue={lecturerDisplay}
                        options={lecturerOptions}
                        onChange={(value, label) => {
                            setLecturerUsername(value);
                            setLecturerDisplay(label);
                        }}
                        placeholder="-- Chưa phân công --"
                        searchPlaceholder="Tìm theo tên hoặc mã GV..."
                        loading={loadingLecturers}
                    />

                    {/* Max Students */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-zinc-400 mb-2 block ml-1">
                            Số SV tối đa
                        </label>
                        <input
                            type="number"
                            value={maxStudents}
                            onChange={(e) => setMaxStudents(e.target.value ? parseInt(e.target.value) : '')}
                            min={1}
                            max={200}
                            placeholder="30"
                            className="w-full h-[52px] px-4 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 mt-8">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="h-[44px] px-6 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-2xl transition-all active:scale-95 disabled:opacity-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || loadingCourses}
                            className="h-[44px] px-8 bg-fpt-orange hover:bg-orange-600 text-white text-sm font-bold rounded-2xl shadow-lg shadow-fpt-orange/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Đang lưu...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    {isEditMode ? 'Cập nhật' : 'Tạo mới'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

