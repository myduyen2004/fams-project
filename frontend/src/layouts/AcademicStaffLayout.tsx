import React from 'react';
import { AcademicStaffSidebar } from '../components/academic-staff/AcademicStaffSidebar';
import { CommonHeader } from '../components/common/CommonHeader';

interface AcademicStaffLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
}

export const AcademicStaffLayout: React.FC<AcademicStaffLayoutProps> = ({ children, pageTitle }) => {
  React.useEffect(() => {
    document.title = `${pageTitle} - FAMS`;
  }, [pageTitle]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-zinc-950">
      {/* Sidebar */}
      <AcademicStaffSidebar />
      <div className="w-16 flex-shrink-0" />
      
      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <CommonHeader title={pageTitle} />
        
        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
