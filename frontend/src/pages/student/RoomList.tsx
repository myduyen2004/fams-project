import React from 'react';
import { StudentLayout } from '../../layouts/StudentLayout';
import { RoomListTemplate } from '../../components/shared/RoomListTemplate';

export const RoomList: React.FC = () => {
    return (
        <RoomListTemplate
            Layout={StudentLayout}
            basePath="/student"
        />
    );
};
