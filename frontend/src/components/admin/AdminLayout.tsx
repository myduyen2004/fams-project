import React from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { authService } from '../../services/api/authService';
import { Navigate } from 'react-router-dom';

interface AdminLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, pageTitle }) => {
  const user = authService.getUser();
  
  React.useEffect(() => {
    document.title = `${pageTitle} - FAMS`;
  }, [pageTitle]);

  if (user && user.role !== 'ADMIN' && user.isPasswordChanged === false) {
    return <Navigate to="/change-password" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content Area */}
      <div className="ml-16 transition-all duration-300">
        {/* Header */}
        <AdminHeader title={pageTitle} />

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
