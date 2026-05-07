import React from 'react';
import { StudentLayout } from '../../layouts/StudentLayout';
import MessagesPage from '../../components/chat/MessagesPage';

export const StudentMessagesPage: React.FC = () => {
    return (
        <StudentLayout pageTitle="Tin nhắn">
            <div className="-m-6 -mt-4">
                <MessagesPage role="STUDENT" />
            </div>
        </StudentLayout>
    );
};

