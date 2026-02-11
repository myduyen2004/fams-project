import React from 'react';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import MessagesPage from '../../components/chat/MessagesPage';

export const LecturerMessagesPage: React.FC = () => {
    return (
        <LecturerLayout pageTitle="Tin nhắn">
            <div className="-m-6 -mt-4">
                <MessagesPage role="LECTURER" />
            </div>
        </LecturerLayout>
    );
};
