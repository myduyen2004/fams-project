import React from 'react';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { SemesterListTemplate } from '../../components/shared/SemesterListTemplate';

export const SemestersPage: React.FC = () => {
    return <SemesterListTemplate Layout={LecturerLayout} />;
};
