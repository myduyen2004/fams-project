import React from 'react';
import { Navigate } from 'react-router-dom';

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

  // Check if user is authenticated
  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    
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
