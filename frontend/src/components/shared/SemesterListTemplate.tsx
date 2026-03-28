import React, { useState, useEffect } from 'react';
import { Search, CalendarRange } from 'lucide-react';
import axios from 'axios';
import apiClient from '../../services/api/authService';

interface Semester {
    code: string;
    name: string;
    startDate: string;
    endDate: string;
    status: 'upcoming' | 'active' | 'ended';
}

interface SemesterListTemplateProps {
    Layout: React.ComponentType<{ children: React.ReactNode; pageTitle: string }>;
}

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'upcoming':
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700 border border-orange-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                    Sắp diễn ra
                </span>
            );
        case 'active':
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 border border-green-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    Đang diễn ra
                </span>
            );
        case 'ended':
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600 border border-gray-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                    Đã kết thúc
                </span>
            );
        default:
            return null;
    }
};

export const SemesterListTemplate: React.FC<SemesterListTemplateProps> = ({ Layout }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSemesters = async () => {
            try {
                setLoading(true);
                const response = await apiClient.get('/v1/semesters/active');
                const data = Array.isArray(response.data) ? response.data : [];
                setSemesters(data);
                setError(null);
            } catch (err: unknown) {
                console.error('Error fetching semesters:', err);
                let errorMessage = 'Không thể tải danh sách học kỳ';
                if (axios.isAxiosError(err)) {
                    errorMessage = err.response?.data?.message || err.message || errorMessage;
                } else if (err instanceof Error) {
                    errorMessage = err.message;
                }
                setError(errorMessage);
                setSemesters([]);
            } finally {
                setLoading(false);
            }
        };
        fetchSemesters();
    }, []);

    const filteredSemesters = semesters.filter(semester =>
        semester.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        semester.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const activeCount = semesters.filter(s => s.status === 'active').length;
    const upcomingCount = semesters.filter(s => s.status === 'upcoming').length;
    const endedCount = semesters.filter(s => s.status === 'ended').length;

    return (
        <Layout pageTitle="Danh sách học kỳ">
            <div className="space-y-6">
                {/* Main card */}
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    {/* Search + Status Summary */}
                    <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm theo tên, mã học kỳ..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-fpt-orange focus:outline-none focus:ring-1 focus:ring-fpt-orange dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                            />
                        </div>
                        {/* Status Summary */}
                        <div className="text-xs font-medium flex gap-4 text-gray-500">
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                Đang diễn ra: <span className="text-gray-700 font-semibold">{activeCount}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                Sắp tới: <span className="text-gray-700 font-semibold">{upcomingCount}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                Đã kết thúc: <span className="text-gray-700 font-semibold">{endedCount}</span>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-fpt-orange text-white">
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider rounded-tl-lg">Tên học kỳ</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Ngày bắt đầu</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Ngày kết thúc</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider rounded-tr-lg">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="py-10 text-center text-gray-400">
                                            <div className="flex justify-center mb-2">
                                                <svg className="h-8 w-8 animate-spin text-fpt-orange" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            </div>
                                            Đang tải dữ liệu...
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan={4} className="py-10 text-center text-red-500">{error}</td>
                                    </tr>
                                ) : filteredSemesters.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-16 text-center">
                                            <div className="flex flex-col items-center gap-2 text-gray-400">
                                                <CalendarRange className="w-10 h-10 opacity-30" />
                                                <span className="text-sm">Không tìm thấy học kỳ nào</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSemesters.map((semester) => (
                                        <tr
                                            key={semester.code}
                                            className="bg-white hover:bg-gray-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 border-b dark:border-zinc-800 transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-white">{semester.name}</p>
                                                    <p className="text-xs text-gray-400 dark:text-zinc-500">{semester.code}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center font-medium text-gray-600 dark:text-zinc-400">{formatDate(semester.startDate)}</td>
                                            <td className="px-4 py-3 text-center font-medium text-gray-600 dark:text-zinc-400">{formatDate(semester.endDate)}</td>
                                            <td className="px-4 py-3 text-center">{getStatusBadge(semester.status)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};
