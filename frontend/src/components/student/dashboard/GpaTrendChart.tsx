import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { CourseGradeSummary } from '../../../pages/student/StudentAllGradesPage';

interface GpaTrendChartProps {
    courses: CourseGradeSummary[];
    currentGpa: number | null;
}

interface SemesterData {
    semester: string;
    gpa: number;
    term: number;
}

export const GpaTrendChart: React.FC<GpaTrendChartProps> = ({ courses, currentGpa }) => {
    // Process data to calculate GPA per semester
    const chartData = useMemo(() => {
        if (!courses || courses.length === 0) return [];

        // Group by semesterCode or term
        const grouped = courses.reduce((acc, course) => {
            // Only consider courses that have grades and are calculated in GPA
            if (course.grade === null || !course.isCalculatedInGpa || (course.status !== 'PASSED' && course.status !== 'FAILED')) {
                return acc;
            }

            const key = course.semesterCode || `Kỳ ${course.term}`;
            if (!acc[key]) {
                acc[key] = {
                    semester: key,
                    term: course.term,
                    totalPoints: 0,
                    totalCredits: 0
                };
            }

            acc[key].totalPoints += course.grade * course.credits;
            acc[key].totalCredits += course.credits;

            return acc;
        }, {} as Record<string, { semester: string; term: number; totalPoints: number; totalCredits: number }>);

        // Convert to array and calculate GPA
        const processedData: SemesterData[] = Object.values(grouped).map(group => ({
            semester: group.semester,
            term: group.term,
            gpa: Number((group.totalPoints / group.totalCredits).toFixed(2))
        }));

        // Sort chronologically by term
        return processedData.sort((a, b) => a.term - b.term);
    }, [courses]);

    if (chartData.length === 0) {
        return (
            <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-200/50 dark:border-zinc-800 relative overflow-hidden h-full flex flex-col min-h-[380px]">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl">
                        <TrendingUp size={20} className="text-zinc-500" />
                    </div>
                    <h3 className="text-lg font-medium tracking-tight text-zinc-900 dark:text-white pb-1">Biểu đồ học lực</h3>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
                    <TrendingUp size={48} className="mb-4 opacity-20" />
                    <p className="text-sm font-medium">Chưa có đủ dữ liệu GPA để hiển thị biểu đồ</p>
                </div>
            </div>
        );
    }

    // Determine Y-axis domain based on max GPA scale (either 4.0 or 10.0)
    const isBase4 = currentGpa !== null && currentGpa <= 4.0;
    const maxDomain = isBase4 ? 4.0 : 10.0;

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-200/50 dark:border-zinc-800 relative overflow-hidden h-full flex flex-col min-h-[380px]">
            {/* Ambient Background Glow */}
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-fpt-orange/5 rounded-full blur-3xl pointer-events-none" />

            {/* Header Content */}
            <div className="relative z-10 flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 100, damping: 20 }}
                        className="p-3 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-900/10 rounded-2xl border border-orange-200/50 dark:border-orange-500/10 shadow-sm"
                    >
                        <TrendingUp size={24} className="text-fpt-orange" strokeWidth={2} />
                    </motion.div>
                    <div>
                        <h3 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">Xu hướng học tập</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Lịch sử GPA theo từng học kỳ</p>
                    </div>
                </div>
                
                {chartData.length >= 2 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="hidden sm:flex flex-col items-end"
                    >
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-700">
                            {chartData[chartData.length - 1].gpa >= chartData[chartData.length - 2].gpa ? (
                                <>
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">+{(chartData[chartData.length - 1].gpa - chartData[chartData.length - 2].gpa).toFixed(2)} pts</span>
                                </>
                            ) : (
                                <>
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                    <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">{(chartData[chartData.length - 1].gpa - chartData[chartData.length - 2].gpa).toFixed(2)} pts</span>
                                </>
                            )}
                        </div>
                        <span className="text-[10px] text-zinc-400 mt-1.5 font-medium uppercase tracking-wider">So với kỳ trước</span>
                    </motion.div>
                )}
            </div>

            {/* Chart Area */}
            <div className="flex-1 w-full relative z-10 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorGpa" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#F37021" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#F37021" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E4E4E7" strokeOpacity={0.5} />
                        <XAxis 
                            dataKey="semester" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 12, fill: '#A1A1AA', fontWeight: 500 }}
                            dy={15}
                        />
                        <YAxis 
                            domain={[0, maxDomain]}
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 12, fill: '#A1A1AA', fontWeight: 500 }}
                            dx={-10}
                        />
                        <Tooltip
                            contentStyle={{ 
                                borderRadius: '1rem', 
                                border: '1px solid rgba(228, 228, 231, 0.5)', 
                                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.1)',
                                padding: '12px 16px',
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                backdropFilter: 'blur(8px)'
                            }}
                            cursor={{ stroke: '#F37021', strokeWidth: 1, strokeDasharray: '4 4' }}
                            formatter={(value: any) => [
                                <span key="val" className="font-bold text-zinc-900">{Number(value).toFixed(2)} / {maxDomain.toFixed(1)}</span>, 
                                <span key="lbl" className="text-zinc-500 font-medium ml-2">GPA</span>
                            ]}
                            labelStyle={{ color: '#71717A', fontWeight: 600, marginBottom: '8px', fontSize: '13px' }}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="gpa" 
                            stroke="#F37021" 
                            strokeWidth={4} 
                            dot={{ r: 5, strokeWidth: 3, fill: '#fff', stroke: '#F37021' }}
                            activeDot={{ r: 8, strokeWidth: 0, fill: '#F37021', style: { filter: 'drop-shadow(0px 4px 8px rgba(243, 112, 33, 0.4))' } }}
                            animationDuration={1500}
                            animationEasing="ease-out"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default GpaTrendChart;

