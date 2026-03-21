import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { permissionService } from '../../services/api/permissionService';

interface PermissionProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission: string;
}

/**
 * Route guard that checks if the current LECTURER user has a specific permission.
 * If not, redirects to the lecturer dashboard.
 * For ACADEMIC_STAFF, always allows access (they have all permissions by default).
 */
export const PermissionProtectedRoute: React.FC<PermissionProtectedRouteProps> = ({
  children,
  requiredPermission
}) => {
  const [checking, setChecking] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const location = useLocation();

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    const checkPermission = async () => {
      if (!user) {
        setChecking(false);
        return;
      }

      // Academic staff always has all permissions
      if (user.role === 'ACADEMIC_STAFF') {
        setHasPermission(true);
        setChecking(false);
        return;
      }

      // For lecturers, check granted permissions
      if (user.role === 'LECTURER') {
        try {
          // Check cached permissions first
          const cachedPermissions = sessionStorage.getItem('user_permissions');
          const cacheTime = sessionStorage.getItem('user_permissions_time');
          const now = Date.now();

          if (cachedPermissions && cacheTime && (now - parseInt(cacheTime)) < 10000) {
            // Cache valid for 10 seconds
            const perms = JSON.parse(cachedPermissions) as string[];
            setHasPermission(perms.includes(requiredPermission));
            setChecking(false);
            return;
          }

          // Fetch fresh permissions
          const permissions = await permissionService.getMyPermissions();
          sessionStorage.setItem('user_permissions', JSON.stringify(permissions));
          sessionStorage.setItem('user_permissions_time', now.toString());
          setHasPermission(permissions.includes(requiredPermission));
        } catch (error) {
          console.error('Failed to check permissions:', error);
          setHasPermission(false);
        }
      }

      setChecking(false);
    };

    checkPermission();
  }, [requiredPermission, location.pathname]);

  if (checking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-fpt-orange border-t-transparent" />
          <span className="text-sm font-medium text-gray-500 dark:text-zinc-400">Đang kiểm tra quyền...</span>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    // Redirect to appropriate dashboard
    if (user?.role === 'LECTURER') {
      return <Navigate to="/lecturer/dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
