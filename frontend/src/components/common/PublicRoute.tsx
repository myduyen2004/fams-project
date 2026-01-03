import React from 'react';
import { Navigate } from 'react-router-dom';

interface PublicRouteProps {
  children: React.ReactNode;
}

/**
 * PublicRoute prevents authenticated users from accessing public pages like /login
 */
export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      // Redirect to appropriate dashboard based on role
      if (user.role === 'ADMIN') {
        return <Navigate to="/admin/dashboard" replace />;
      } else if (user.role === 'LECTURER') {
        return <Navigate to="/lecturer/dashboard" replace />;
      } else if (user.role === 'STUDENT') {
        return <Navigate to="/student/dashboard" replace />;
      } else if (user.role === 'ACADEMIC_STAFF') {
        return <Navigate to="/academic-staff/dashboard" replace />;
      }
      return <Navigate to="/admin/dashboard" replace />;
    } catch (e) {
      // If parsing fails, treat as not logged in
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }

  return <>{children}</>;
};
