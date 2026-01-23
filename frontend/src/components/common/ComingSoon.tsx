import React from 'react';
import { Construction } from 'lucide-react';

interface ComingSoonProps {
    title?: string;
}

export const ComingSoon: React.FC<ComingSoonProps> = ({ title }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
            <div className="bg-orange-100 dark:bg-orange-900/20 p-6 rounded-full mb-6">
                <Construction size={48} className="text-fpt-orange" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {title || 'Tính năng đang phát triển'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
                Chức năng này đang được xây dựng và sẽ sớm ra mắt.
                Vui lòng quay lại sau!
            </p>
        </div>
    );
};
