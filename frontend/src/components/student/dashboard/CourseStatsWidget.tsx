import React from 'react';
import { motion, Variants } from 'framer-motion';
import { CheckCircle2, Clock, XCircle, BookOpen } from 'lucide-react';
import { CourseGradeSummary } from '../../../pages/student/StudentAllGradesPage';

interface CourseStatsWidgetProps {
    courses: CourseGradeSummary[];
    totalCourses: number;
    passedCourses: number;
    failedCourses: number;
    pendingCourses: number;
}

export const CourseStatsWidget: React.FC<CourseStatsWidgetProps> = ({
    totalCourses,
    passedCourses,
    failedCourses,
    pendingCourses
}) => {
    // Calculate passing rate (avoid divide by zero)
    const completedCourses = passedCourses + failedCourses;
    const passingRate = completedCourses > 0 ? (passedCourses / completedCourses) * 100 : 0;
    
    // Animation variants for staggered reveal
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20 } }
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-200/50 dark:border-zinc-800 relative overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.1 }}
                    className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700"
                >
                    <BookOpen size={24} className="text-zinc-700 dark:text-zinc-300" strokeWidth={2} />
                </motion.div>
                <div>
                    <h3 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">Tiến độ học tập</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Tổng quan kết quả môn học</p>
                </div>
            </div>

            {/* Main Progress Ring & Primary Stat */}
            <div className="flex items-center gap-8 mb-10">
                <div className="relative w-28 h-28 shrink-0">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                        {/* Background Track */}
                        <path
                            className="text-zinc-100 dark:text-zinc-800"
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="none"
                            strokeLinecap="round"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        {/* Progress Indicator */}
                        <motion.path
                            initial={{ strokeDasharray: "0, 100" }}
                            animate={{ strokeDasharray: `${passingRate}, 100` }}
                            transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                            className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="none"
                            strokeLinecap="round"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-black tracking-tighter text-zinc-900 dark:text-white">{Math.round(passingRate)}%</span>
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Tỷ lệ qua</span>
                    </div>
                </div>

                <div className="flex flex-col justify-center gap-1 flex-1">
                    <span className="text-sm font-medium text-zinc-500 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600"></div>
                        Tổng quan quá trình
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white">{passedCourses}</span>
                        <span className="text-lg font-medium text-zinc-400">/ {totalCourses}</span>
                    </div>
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Môn đã hoàn thành</span>
                </div>
            </div>

            {/* Detailed Stats Grid */}
            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 gap-4 mt-auto"
            >
                <motion.div variants={itemVariants} className="bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl p-4 flex flex-col gap-3 group relative overflow-hidden transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-900/30">
                    <div className="flex items-center justify-between">
                        <div className="p-2 bg-white dark:bg-emerald-900/50 rounded-xl shadow-sm text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={18} strokeWidth={2.5} />
                        </div>
                        <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{passedCourses}</span>
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600/80 dark:text-emerald-500">Đã qua môn</span>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-rose-50 dark:bg-rose-950/20 rounded-2xl p-4 flex flex-col gap-3 group relative overflow-hidden transition-colors hover:bg-rose-100 dark:hover:bg-rose-900/30">
                    <div className="flex items-center justify-between">
                        <div className="p-2 bg-white dark:bg-rose-900/50 rounded-xl shadow-sm text-rose-600 dark:text-rose-400">
                            <XCircle size={18} strokeWidth={2.5} />
                        </div>
                        <span className="text-2xl font-black text-rose-700 dark:text-rose-400">{failedCourses}</span>
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600/80 dark:text-rose-500">Rớt môn</span>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl p-4 flex flex-col gap-3 group relative overflow-hidden transition-colors hover:bg-amber-100 dark:hover:bg-amber-900/30">
                    <div className="flex items-center justify-between">
                        <div className="p-2 bg-white dark:bg-amber-900/50 rounded-xl shadow-sm text-amber-600 dark:text-amber-400">
                            <Clock size={18} strokeWidth={2.5} />
                        </div>
                        <span className="text-2xl font-black text-amber-700 dark:text-amber-400">{pendingCourses}</span>
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600/80 dark:text-amber-500">Đang chờ / Đang học</span>
                </motion.div>

                 <motion.div variants={itemVariants} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 flex flex-col gap-3 group relative overflow-hidden transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <div className="flex items-center justify-between">
                        <div className="p-2 bg-white dark:bg-zinc-700 rounded-xl shadow-sm text-zinc-600 dark:text-zinc-300">
                            <BookOpen size={18} strokeWidth={2.5} />
                        </div>
                        <span className="text-2xl font-black text-zinc-700 dark:text-zinc-300">{totalCourses}</span>
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Tổng Môn</span>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default CourseStatsWidget;

