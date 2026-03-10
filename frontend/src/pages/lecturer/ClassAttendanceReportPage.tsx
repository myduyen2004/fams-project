import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { ArrowLeft, Users } from 'lucide-react';
import attendanceService, { ClassAttendanceReportResponse } from '../../services/api/attendanceService';
import { toast } from 'react-hot-toast';

export const ClassAttendanceReportPage: React.FC = () => {
    const { className } = useParams<{ className: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    
    const isAcademicStaff = location.pathname.includes('/academic-staff/');
    const Layout = isAcademicStaff ? AcademicStaffLayout : LecturerLayout;
    
    const [report, setReport] = useState<ClassAttendanceReportResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (className) {
            fetchReport();
        }
    }, [className]);

    const fetchReport = async () => {
        try {
            setLoading(true);
            const data = await attendanceService.getClassAttendanceReport(className!);
            setReport(data);
        } catch (error) {
            console.error('Failed to fetch attendance report:', error);
            toast.error('Không thể tải dữ liệu báo cáo điểm danh');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout pageTitle="Báo cáo điểm danh">
            <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-fpt-orange transition-colors w-fit group"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Quay lại 
                    </button>
                    
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white uppercase">
                                {className} - BÁO CÁO ĐIỂM DANH
                            </h1>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="p-1 rounded-md bg-orange-100 dark:bg-orange-900/20">
                                    <Users size={18} className="text-fpt-orange" />
                                </div>
                                <span className="text-lg font-bold text-fpt-orange">
                                    {report?.courseCode || '...'} - {report?.courseName || '...'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-gray-100 dark:border-zinc-800 shadow-xl shadow-gray-200/40 dark:shadow-none overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-fpt-orange text-white">
                                    <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-widest whitespace-nowrap sticky left-0 z-10 bg-fpt-orange">
                                        Họ và tên
                                    </th>
                                    {loading ? (
                                        [...Array(10)].map((_, i) => (
                                            <th key={i} className="px-3 py-4 text-center text-[11px] font-black uppercase tracking-widest whitespace-nowrap">
                                                Slot {i + 1}
                                            </th>
                                        ))
                                    ) : report?.slots?.map((slot) => (
                                        <th key={slot.slotId} className="px-2 py-4 text-center text-[11px] font-black uppercase tracking-widest whitespace-nowrap min-w-[60px]">
                                            Slot {slot.slotIndex}
                                        </th>
                                    ))}
                                    <th className="px-6 py-4 text-center text-[11px] font-black uppercase tracking-widest whitespace-nowrap sticky right-0 z-10 bg-fpt-orange">
                                        % Absent
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-4 sticky left-0 z-10 bg-white dark:bg-zinc-900 border-r border-gray-50 dark:border-zinc-800">
                                                <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-32"></div>
                                            </td>
                                            {[...Array(10)].map((_, j) => (
                                                <td key={j} className="px-3 py-4"><div className="h-4 w-4 bg-gray-200 dark:bg-zinc-700 rounded mx-auto"></div></td>
                                            ))}
                                            <td className="px-6 py-4 sticky right-0 z-10 bg-white dark:bg-zinc-900 border-l border-gray-50 dark:border-zinc-800">
                                                <div className="h-4 w-8 bg-gray-200 dark:bg-zinc-700 rounded mx-auto"></div>
                                            </td>
                                        </tr>
                                    ))
                                ) : report?.studentReports?.length === 0 ? (
                                    <tr>
                                        <td colSpan={(report.slots?.length || 0) + 2} className="px-6 py-12 text-center text-gray-500 font-medium">
                                            Không có dữ liệu sinh viên
                                        </td>
                                    </tr>
                                ) : report?.studentReports?.map((student) => (
                                    <tr key={student.studentId} className="hover:bg-gray-50/80 dark:hover:bg-zinc-800/50 transition-colors group">
                                        <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap sticky left-0 z-10 bg-white dark:bg-zinc-900 group-hover:bg-gray-50/80 dark:group-hover:bg-zinc-800/80 border-r border-gray-100 dark:border-zinc-800 transition-colors">
                                            {student.studentName}
                                        </td>
                                        
                                        {report.slots?.map((slot) => {
                                            const detail = student.attendanceDetails?.find(d => d.slotId === slot.slotId);
                                            const status = detail?.status;
                                            
                                            let displayClass = "text-gray-300 dark:text-zinc-600";
                                            let displayText = "-";
                                            
                                            if (status === 'P') {
                                                displayClass = "text-gray-900 dark:text-gray-200 font-bold";
                                                displayText = "P";
                                            } else if (status === 'A') {
                                                displayClass = "text-red-500 font-bold";
                                                displayText = "A";
                                            } else if (status === 'E') {
                                                displayClass = "text-yellow-600 dark:text-yellow-500 font-bold";
                                                displayText = "E";
                                            }

                                            return (
                                                <td key={slot.slotId} className={`px-2 py-4 text-center text-sm ${displayClass}`}>
                                                    {displayText}
                                                </td>
                                            );
                                        })}
                                        
                                        <td className="px-6 py-4 text-center font-bold text-gray-900 dark:text-white sticky right-0 z-10 bg-white dark:bg-zinc-900 group-hover:bg-gray-50/80 dark:group-hover:bg-zinc-800/80 border-l border-gray-100 dark:border-zinc-800 transition-colors">
                                            <span className={student.absentPercentage >= 20 ? 'text-red-500' : ''}>
                                                {student.absentPercentage}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};
