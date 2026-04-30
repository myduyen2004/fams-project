import React from 'react';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { RoomListTemplate } from '../../components/shared/RoomListTemplate';

export const RoomList: React.FC = () => {
    return (
        <RoomListTemplate
            Layout={LecturerLayout}
            basePath="/lecturer"
        />
    );
};

