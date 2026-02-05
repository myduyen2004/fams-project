import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Save, Search, ChevronDown } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

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
            <label className="text-sm font-bold text-gray-700 mb-2 block">
                {label} {required && !disabled && <span className="text-red-500">*</span>}
            </label>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 transition-all flex items-center justify-between
                    ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white hover:border-gray-300'}`}
            >
                <span className={value ? 'text-gray-900' : 'text-gray-400'}>
                    {displayValue || placeholder}
                </span>
                {!disabled && <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
            </button>

            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
                    {/* Search Input */}
                    <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="max-h-48 overflow-auto">
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
                                    className="w-full px-4 py-2.5 text-left text-sm text-gray-400 hover:bg-gray-50"
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
                                        className={`w-full px-4 py-2.5 text-left text-sm hover:bg-orange-50 transition-colors
                                            ${value === opt.value ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-700'}`}
                                    >
                                        <div>{opt.label}</div>
                                        {opt.sublabel && (
                                            <div className="text-xs text-gray-400">{opt.sublabel}</div>
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
            const response = await axios.get('/api/v1/class-sections/lecturers');
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
            const response = await axios.get('/api/courses/search', {
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
                await axios.put(`/api/v1/class-sections/${encodeURIComponent(classSection!.className)}`, payload);
                toast.success('Cập nhật lớp học phần thành công');
            } else {
                await axios.post('/api/v1/class-sections', payload);
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
        label: `${c.code} - ${c.name}`,
        sublabel: c.name
    }));

    const lecturerOptions = lecturers.map(l => ({
        value: l.username,
        label: `${l.fullName} (${l.username})`,
        sublabel: l.username
    }));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">
                            {isEditMode ? 'Sửa lớp học phần' : 'Tạo lớp học phần mới'}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Học kỳ: <span className="font-medium text-orange-600">{semesterCode}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={20} className="text-gray-400 hover:text-gray-600" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Class Name */}
                    <div>
                        <label className="text-sm font-bold text-gray-700 mb-2 block">
                            Mã lớp học phần {!isEditMode && <span className="text-red-500">*</span>}
                        </label>
                        <input
                            type="text"
                            value={className}
                            onChange={(e) => setClassName(e.target.value)}
                            disabled={isEditMode}
                            placeholder="VD: SE18B02-PRN211"
                            className={`w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 transition-all
                                ${isEditMode ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
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
                        <label className="text-sm font-bold text-gray-700 mb-2 block">
                            Số SV tối đa
                        </label>
                        <input
                            type="number"
                            value={maxStudents}
                            onChange={(e) => setMaxStudents(e.target.value ? parseInt(e.target.value) : '')}
                            min={1}
                            max={200}
                            placeholder="30"
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-500 transition-all"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || loadingCourses}
                            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-lg shadow-lg shadow-orange-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
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
