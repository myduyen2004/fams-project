import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api/authService';
import { Loader2 } from 'lucide-react';

export const ClassSectionRedirect: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAndRedirect = async () => {
            try {
                const response = await apiClient.get('/v1/semesters/active');
                const semesters = Array.isArray(response.data) ? response.data : [];

                if (semesters.length === 0) {
                    navigate('/academic-staff/semesters');
                    return;
                }

                // Try to find active semester, then upcoming, then the most recent one (end of array)
                const activeSemester = semesters.find((s: any) => s.status === 'active') ||
                    semesters.find((s: any) => s.status === 'upcoming') ||
                    semesters[semesters.length - 1];

                if (activeSemester) {
                    navigate(`/academic-staff/semesters/${activeSemester.code}/class-sections`);
                } else {
                    navigate('/academic-staff/semesters');
                }
            } catch (error) {
                console.error('Error fetching semesters for redirect:', error);
                navigate('/academic-staff/semesters');
            }
        };

        fetchAndRedirect();
    }, [navigate]);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-zinc-950">
            <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-fpt-orange" />
                <span className="text-sm font-medium text-gray-500 dark:text-zinc-400">
                    Đang chuyển hướng đến trang quản lý lớp học phần...
                </span>
            </div>
        </div>
    );
};
