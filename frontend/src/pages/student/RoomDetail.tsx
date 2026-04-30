import React from 'react';
import { StudentLayout } from '../../layouts/StudentLayout';
import { RoomDetailTemplate } from '../../components/shared/RoomDetailTemplate';

export const RoomDetail: React.FC = () => {
    return (
        <RoomDetailTemplate
            Layout={StudentLayout}
            basePath="/student"
        />
    );
};

