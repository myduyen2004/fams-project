import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Hook that provides a role-aware navigate function.
 * When a LECTURER accesses academic-staff pages via granted permissions,
 * it automatically translates academic-staff paths to lecturer/granted paths.
 */
export const useRoleAwareNavigate = () => {
  const navigate = useNavigate();

  const roleAwareNavigate = useCallback((path: string | number, options?: { replace?: boolean }) => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;

    if (typeof path === 'string' && user?.role === 'LECTURER' && path.startsWith('/academic-staff/')) {
      // Map academic-staff paths to lecturer/granted paths
      const mappedPath = path
        .replace('/academic-staff/specializations/', '/lecturer/granted/specializations/')
        .replace('/academic-staff/majors', '/lecturer/granted/majors')
        .replace('/academic-staff/courses', '/lecturer/granted/courses')
        .replace('/academic-staff/students', '/lecturer/granted/users')
        .replace('/academic-staff/lecturers', '/lecturer/granted/lecturers')
        .replace('/academic-staff/semesters', '/lecturer/granted/semesters')
        .replace('/academic-staff/logs', '/lecturer/granted/logs')
        .replace('/academic-staff/schedule', '/lecturer/granted/schedule')
        .replace('/academic-staff/classes', '/lecturer/classes')
        .replace('/academic-staff/class-sections', '/lecturer/granted/class-sections');

      navigate(mappedPath, options);
    } else {
      // @ts-ignore - navigate accepts string or number
      navigate(path, options);
    }
  }, [navigate]);

  return roleAwareNavigate;
};
