import React from 'react';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { RoomDetailTemplate } from '../../components/shared/RoomDetailTemplate';

export const RoomDetail: React.FC = () => {
    return (
        <RoomDetailTemplate
            Layout={LecturerLayout}
            basePath="/lecturer"
        />
    );
};
