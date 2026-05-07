import React from 'react';
import { StudentSidebar } from '../components/student/StudentSidebar';
import { CommonHeader } from '../components/common/CommonHeader';
import { authService } from '../services/api/authService';

interface StudentLayoutProps {
    children: React.ReactNode;
    pageTitle: string;
}

export const StudentLayout: React.FC<StudentLayoutProps> = ({ children, pageTitle }) => {
    const user = authService.getUser();

    React.useEffect(() => {
        document.title = `${pageTitle} - FAMS Student`;
    }, [pageTitle]);

    if (user && user.role !== 'STUDENT') {
        // Basic protection if needed, though ProtectedRoute handles most
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
            {/* Sidebar */}
            <StudentSidebar />

            {/* Main Content Area */}
            <div className="ml-16 transition-all duration-300">
                {/* Header */}
                <CommonHeader title={pageTitle} />

                {/* Page Content */}
                <main className="p-6">
                    {children}
                </main>
            </div>
        </div>
    );
};

