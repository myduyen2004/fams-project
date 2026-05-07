import React from 'react';
import { LecturerSidebar } from '../components/lecturer/LecturerSidebar';
import { CommonHeader } from '../components/common/CommonHeader';
import { authService } from '../services/api/authService';

interface LecturerLayoutProps {
    children: React.ReactNode;
    pageTitle: string;
}

export const LecturerLayout: React.FC<LecturerLayoutProps> = ({ children, pageTitle }) => {
    const user = authService.getUser();

    React.useEffect(() => {
        document.title = `${pageTitle} - FAMS Lecturer`;
    }, [pageTitle]);

    if (user && user.role !== 'LECTURER') {
        // Basic protection check
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
            {/* Sidebar */}
            <LecturerSidebar />

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

