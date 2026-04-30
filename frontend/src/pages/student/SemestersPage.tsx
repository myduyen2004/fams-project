import React from 'react';
import { StudentLayout } from '../../layouts/StudentLayout';
import { SemesterListTemplate } from '../../components/shared/SemesterListTemplate';

export const SemestersPage: React.FC = () => {
    return <SemesterListTemplate Layout={StudentLayout} />;
};

