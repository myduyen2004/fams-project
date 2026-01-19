import React from 'react';
import { StudentLayout } from '../../layouts/StudentLayout';
import { Card } from '../../components/common/Card';
import {
    Sparkles,
    MapPin,
    Clock,
    CheckCircle2,
    XCircle,
    Trophy,
    ArrowUpRight,
    BookOpen,
    Users
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
    return (
        <StudentLayout pageTitle="Tổng quan">
            <div className="space-y-6">

                {/* Top Section: GPA & AI Suggestions */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* GPA Card */}
                    <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white border-none relative overflow-hidden flex flex-col justify-between min-h-[180px]">
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-sm font-medium opacity-90">Điểm trung bình (GPA)</h3>
                                    <p className="text-xs opacity-75">Học kỳ Spring 2024</p>
                                </div>
                                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                    <Trophy size={20} className="text-white" />
                                </div>
                            </div>

                            <div className="flex items-baseline gap-2 mb-4">
                                <span className="text-4xl font-bold">3.45</span>
                                <span className="text-lg opacity-80">/ 4.0</span>
                            </div>

                            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-sm w-fit">
                                <ArrowUpRight size={14} />
                                <span>+0.15 so với kỳ trước</span>
                            </div>
                        </div>

                        {/* Decorative circles */}
                        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                    </Card>

                    {/* AI Suggestions */}
                    <div className="lg:col-span-2">
                        <Card className="h-full p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="text-fpt-orange" size={20} />
                                    <h3 className="font-bold text-gray-900 dark:text-white">Đề xuất cải thiện từ AI</h3>
                                </div>
                                <button className="text-xs text-fpt-orange hover:underline">Xem tất cả đề xuất</button>
                            </div>

                            <div className="space-y-4">
                                {/* Suggestion 1 */}
                                <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer border border-transparent hover:border-gray-100 dark:hover:border-zinc-800">
                                    <div className="p-2 rounded-lg bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-400 mt-1">
                                        <BookOpen size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-medium text-gray-900 dark:text-white text-sm">Tăng cường ôn tập Toán cao cấp</h4>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">Cao</span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Điểm bài kiểm tra gần đây thấp hơn trung bình 15%</p>
                                    </div>
                                    <ArrowUpRight size={16} className="text-gray-300 mt-1" />
                                </div>

                                {/* Suggestion 2 */}
                                <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer border border-transparent hover:border-gray-100 dark:hover:border-zinc-800">
                                    <div className="p-2 rounded-lg bg-blue-50 text-blue-500 dark:bg-blue-900/30 dark:text-blue-400 mt-1">
                                        <Users size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-medium text-gray-900 dark:text-white text-sm">Tham gia thảo luận nhóm</h4>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Tăng chuyên cần môn Lập trình C++</p>
                                    </div>
                                    <ArrowUpRight size={16} className="text-gray-300 mt-1" />
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Schedule Section */}
                <Card className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Lịch học hôm nay</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">31/12/2025</p>
                        </div>
                        <div className="flex gap-4 text-xs">
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500"></span> Đầy đủ</div>
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Trung bình</div>
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> Thiếu nhiều</div>
                        </div>
                    </div>

                    <div className="relative">
                        {/* Timeline markers */}
                        <div className="hidden md:grid grid-cols-4 gap-4 text-xs text-gray-400 mb-2 px-1">
                            <span className="pl-1">12:00</span>
                            <span className="pl-1">14:00</span>
                            <span className="pl-1">16:00</span>
                            <span className="pl-1">18:00</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Class Card 1 */}
                            <div className="border border-gray-100 dark:border-zinc-800 rounded-xl p-4 hover:shadow-md transition-shadow relative group bg-white dark:bg-zinc-900 h-full flex flex-col justify-between">
                                <div className="absolute top-4 right-4 text-[10px] font-bold text-gray-400">MAE101</div>
                                <div className="mb-6">
                                    <h4 className="font-bold text-gray-900 dark:text-white">MAE101</h4>
                                    <p className="text-xs text-gray-500">SE18807</p>
                                </div>
                                <div>
                                    <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400 mb-3">
                                        <div className="flex items-center gap-2">
                                            <Clock size={14} /> 09:00 - 10:15
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin size={14} /> Gamma - 101
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Class Card 2 (Active/Now) */}
                            <div className="border-2 border-orange-200 dark:border-orange-500/30 rounded-xl p-4 shadow-sm relative group bg-orange-50 dark:bg-orange-900/10 h-full flex flex-col justify-between">
                                <div className="absolute top-4 right-4 text-[10px] font-bold text-orange-600 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded">NOW</div>
                                <div className="mb-6">
                                    <h4 className="font-bold text-fpt-orange">MAE101</h4>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">SE18807</p>
                                </div>
                                <div>
                                    <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300 mb-3">
                                        <div className="flex items-center gap-2">
                                            <Clock size={14} /> 10:30 - 11:45
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin size={14} /> Gamma - 101
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500">
                                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Class Card 3 */}
                            <div className="border border-gray-100 dark:border-zinc-800 rounded-xl p-4 hover:shadow-md transition-shadow relative group bg-white dark:bg-zinc-900 h-full flex flex-col justify-between">
                                <div className="absolute top-4 right-4 text-[10px] font-bold text-gray-400">MAE101</div>
                                <div className="mb-6">
                                    <h4 className="font-bold text-gray-900 dark:text-white">MAE101</h4>
                                    <p className="text-xs text-gray-500">SE18807</p>
                                </div>
                                <div>
                                    <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400 mb-3">
                                        <div className="flex items-center gap-2">
                                            <Clock size={14} /> 12:00 - 13:00
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin size={14} /> Gamma - 101
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500">
                                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Class Card 4 */}
                            <div className="border border-gray-100 dark:border-zinc-800 rounded-xl p-4 hover:shadow-md transition-shadow relative group bg-white dark:bg-zinc-900 h-full flex flex-col justify-between opacity-60">
                                <div className="absolute top-4 right-4 text-[10px] font-bold text-gray-400">MAE101</div>
                                <div className="mb-6">
                                    <h4 className="font-bold text-gray-900 dark:text-white">MAE101</h4>
                                    <p className="text-xs text-gray-500">SE18807</p>
                                </div>
                                <div>
                                    <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400 mb-3">
                                        <div className="flex items-center gap-2">
                                            <Clock size={14} /> 13:15 - 14:30
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin size={14} /> Gamma - 101
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500">
                                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Bottom Section: Absence Rate */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Tỷ lệ vắng mặt</h3>
                            <button className="text-xs text-fpt-orange hover:underline">Chi tiết</button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
                            {/* Item 1 */}
                            <div>
                                <div className="flex justify-between text-sm mb-1.5">
                                    <span className="font-medium text-gray-900 dark:text-white">Lập trình C++</span>
                                    <span className="font-bold text-green-500 text-xs">95%</span>
                                </div>
                                <p className="text-[10px] text-gray-400 mb-2 uppercase tracking-wide">PRO192</p>
                                <div className="h-1.5 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 rounded-full" style={{ width: '95%' }}></div>
                                </div>
                                <div className="flex items-center gap-1 mt-2 text-[10px] text-green-600 font-medium">
                                    <CheckCircle2 size={12} /> An toàn
                                </div>
                            </div>

                            {/* Item 2 */}
                            <div>
                                <div className="flex justify-between text-sm mb-1.5">
                                    <span className="font-medium text-gray-900 dark:text-white">Toán cao cấp</span>
                                    <span className="font-bold text-yellow-500 text-xs">80%</span>
                                </div>
                                <p className="text-[10px] text-gray-400 mb-2 uppercase tracking-wide">MAT101</p>
                                <div className="h-1.5 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-yellow-500 rounded-full" style={{ width: '80%' }}></div>
                                </div>
                                <div className="flex items-center gap-1 mt-2 text-[10px] text-green-600 font-medium">
                                    <CheckCircle2 size={12} /> An toàn
                                </div>
                            </div>

                            {/* Item 3 */}
                            <div>
                                <div className="flex justify-between text-sm mb-1.5">
                                    <span className="font-medium text-gray-900 dark:text-white">Kỹ năng mềm</span>
                                    <span className="font-bold text-green-500 text-xs">90%</span>
                                </div>
                                <p className="text-[10px] text-gray-400 mb-2 uppercase tracking-wide">SSG104</p>
                                <div className="h-1.5 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 rounded-full" style={{ width: '90%' }}></div>
                                </div>
                                <div className="flex items-center gap-1 mt-2 text-[10px] text-green-600 font-medium">
                                    <CheckCircle2 size={12} /> An toàn
                                </div>
                            </div>

                            {/* Item 4 */}
                            <div>
                                <div className="flex justify-between text-sm mb-1.5">
                                    <span className="font-medium text-gray-900 dark:text-white">Triết học</span>
                                    <span className="font-bold text-red-500 text-xs">75%</span>
                                </div>
                                <p className="text-[10px] text-gray-400 mb-2 uppercase tracking-wide">PHI102</p>
                                <div className="h-1.5 w-full bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-500 rounded-full" style={{ width: '75%' }}></div>
                                </div>
                                <div className="flex items-center gap-1 mt-2 text-[10px] text-red-600 font-medium">
                                    <XCircle size={12} /> Cảnh báo cấm thi
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Right side spacer or other widgets can go here */}
                </div>
            </div>
        </StudentLayout>
    );
};
