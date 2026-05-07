import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * This page previously handled slot-based assignments.
 * Assignments are now managed on the dedicated /lecturer/assignments page.
 * This component redirects there automatically.
 */
export const LecturerClassAssignmentPage: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        navigate('/lecturer/assignments', { replace: true });
    }, [navigate]);

    return null;
};

