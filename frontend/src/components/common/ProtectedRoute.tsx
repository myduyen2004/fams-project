/* eslint-disable react-hooks/error-boundaries */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles 
}) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const location = useLocation();

  // Check if user is authenticated
  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    
    // Check if password change required (first login)
    // Redirect to change-password if user hasn't changed password yet
    // Exclude Admin role and change-password page itself
    if (
      user.isPasswordChanged === false &&
      user.role !== 'ADMIN' &&
      location.pathname !== '/change-password'
    ) {
      // eslint-disable-next-line react-hooks/error-boundaries
      return <Navigate to="/change-password" replace state={{ firstLogin: true }} />;
    }
    
    // Check if user has required role
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(user.role)) {
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
        return <Navigate to="/login" replace />;
      }
    }

    return <>{children}</>;
  } catch (e) {
    console.error('Failed to parse user data:', e);
    return <Navigate to="/login" replace />;
  }
};

