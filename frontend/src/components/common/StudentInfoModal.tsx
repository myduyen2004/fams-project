import React, { useEffect, useState } from 'react';
import { studentGradeService } from '../../services/api/studentGradeService';
import { X, Mail, Phone, Calendar, BookOpen, GraduationCap, Award, User as UserIcon, Loader2 } from 'lucide-react';

interface StudentInfo {
    id: number;
    code: string;
    fullName: string;
    email: string;
    phone: string;
    dob: string;
    roleName: string;
    avatar: string;
    major: string;
    specialization: string;
    subSpecialization: string;
    course: string;
    gpa: number;
}

interface StudentInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentCode: string | null;
}

export const StudentInfoModal: React.FC<StudentInfoModalProps> = ({ isOpen, onClose, studentCode }) => {
    const [student, setStudent] = useState<StudentInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && studentCode) {
            fetchStudentInfo();
        } else {
            setStudent(null);
            setError(null);
        }
    }, [isOpen, studentCode]);

    const fetchStudentInfo = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await studentGradeService.getStudentInfo(studentCode!);
            setStudent(data as unknown as StudentInfo);
        } catch (err: any) {
            console.error('Failed to fetch student info:', err);
            setError('Không thể tải thông tin sinh viên');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 dark:border-zinc-800 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with Background Pattern */}
                <div className="relative h-24 bg-gradient-to-r from-orange-400 to-fpt-orange">
                    <button 
                        onClick={onClose}
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors z-10"
                    >
                        <X size={18} />
                    </button>
                    
                    {/* Avatar Overlap */}
                    <div className="absolute -bottom-10 left-6">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-2xl border-4 border-white dark:border-zinc-900 overflow-hidden bg-gray-100 dark:bg-zinc-800 shadow-md">
                                {student?.avatar ? (
                                    <img src={student.avatar} alt={student.fullName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <UserIcon size={32} />
                                    </div>
                                )}
                            </div>
                            <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full"></div>
                        </div>
                    </div>
                </div>

                <div className="pt-12 px-6 pb-6">
                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center space-y-3">
                            <Loader2 size={32} className="animate-spin text-fpt-orange" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Đang tải thông tin...</p>
                        </div>
                    ) : error ? (
                        <div className="py-8 text-center">
                            <p className="text-red-500 font-medium">{error}</p>
                            <button 
                                onClick={fetchStudentInfo}
                                className="mt-4 text-sm text-fpt-orange hover:underline font-medium"
                            >
                                Thử lại
                            </button>
                        </div>
                    ) : student ? (
                        <div className="space-y-6">
                            {/* Name and Code */}
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {student.fullName}
                                </h3>
                                <p className="text-sm font-mono text-fpt-orange font-bold uppercase tracking-wider mt-0.5">
                                    {student.code}
                                </p>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-1 gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                                        <Mail size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Email</p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate font-medium">{student.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                                        <Phone size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Số điện thoại</p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{student.phone || '--'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                                        <BookOpen size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Ngành học</p>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                                            {student.major}
                                            {student.specialization && ` - ${student.specialization}`}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
                                            <Calendar size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Ngày sinh</p>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                                                {student.dob ? new Date(student.dob).toLocaleDateString('vi-VN') : '--'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400">
                                            <Award size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">GPA</p>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 font-bold">{student.gpa?.toFixed(2) || '--'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Status */}
                            <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    {student.course}
                                </span>
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-900/20 text-fpt-orange border border-orange-100 dark:border-orange-900/30">
                                    <GraduationCap size={12} />
                                    <span className="text-[10px] font-bold uppercase">{student.roleName}</span>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};
