import React, { useState } from 'react';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Upload, Info } from 'lucide-react';
import toast from 'react-hot-toast';

export const LecturerCreateRequestPage: React.FC = () => {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast.success('Yêu cầu đã được gửi thành công!');
        setSubmitting(false);
        navigate('/lecturer/requests');
    };

    return (
        <LecturerLayout pageTitle="Tạo yêu cầu mới">
            <div className="max-w-[1440px] mx-auto w-full">
                {/* Header Back Link */}
                <div className="mb-6 mt-4">
                    <Link to="/lecturer/requests" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-fpt-orange transition-colors mb-2">
                        <ArrowLeft size={18} className="mr-1" />
                        Quay lại danh sách
                    </Link>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Tạo yêu cầu thay đổi lịch dạy</h2>
                </div>

                {/* Warning/Info Box */}
                <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-xl mb-8 border border-orange-100 dark:border-orange-900/30">
                    <div className="flex items-start gap-3">
                        <Info className="text-orange-500 text-xl flex-shrink-0" />
                        <p className="text-sm text-orange-800 dark:text-orange-200 leading-relaxed">
                            Vui lòng kiểm tra kỹ thông tin trước khi gửi. Yêu cầu của bạn sẽ được Ban đào tạo xem xét trong vòng 24h làm việc.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8 pb-12">
                    {/* General Info */}
                    <section className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Thông tin chung</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">LỚP HỌC</label>
                                <select className="w-full bg-slate-50 dark:bg-zinc-800/50 border-transparent rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-fpt-orange/20 focus:border-fpt-orange outline-none transition-all text-slate-700 dark:text-slate-200">
                                    <option value="">Chọn lớp học</option>
                                    <option value="SE18809">SE18809</option>
                                    <option value="SE18810">SE18810</option>
                                    <option value="IA1701">IA1701</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">LOẠI YÊU CẦU</label>
                                <select className="w-full bg-slate-50 dark:bg-zinc-800/50 border-transparent rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-fpt-orange/20 focus:border-fpt-orange outline-none transition-all text-slate-700 dark:text-slate-200">
                                    <option value="doi_lich">Đổi lịch</option>
                                    <option value="huy_buoi">Hủy buổi</option>
                                    <option value="doi_slot">Đổi slot</option>
                                    <option value="doi_phong">Đổi phòng</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* Change Details */}
                    <section className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Chi tiết thay đổi</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                <label className="block text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-widest mb-1">SLOT BAN ĐẦU</label>
                                <p className="text-lg font-bold text-slate-800 dark:text-blue-100">Slot 2</p>
                            </div>
                            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                <label className="block text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-widest mb-1">PHÒNG BAN ĐẦU</label>
                                <p className="text-lg font-bold text-slate-800 dark:text-blue-100">Phòng 204</p>
                            </div>
                            <div className="bg-orange-50/50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-100 dark:border-orange-900/30">
                                <label className="block text-[10px] font-bold text-orange-500 dark:text-orange-400 uppercase tracking-widest mb-1">NGÀY THAY ĐỔI</label>
                                <input className="w-full bg-transparent border-none p-0 text-lg font-bold text-orange-600 dark:text-orange-400 placeholder:text-orange-300 focus:ring-0 cursor-pointer" type="date" />
                            </div>
                            <div className="bg-orange-50/50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-100 dark:border-orange-900/30">
                                <label className="block text-[10px] font-bold text-orange-500 dark:text-orange-400 uppercase tracking-widest mb-1">SLOT MỚI</label>
                                <select className="w-full bg-transparent border-none p-0 text-lg font-bold text-orange-600 dark:text-orange-400 focus:ring-0 cursor-pointer appearance-none">
                                    <option className="text-slate-900 dark:text-slate-100 bg-white dark:bg-zinc-800" value="">Chọn slot mới</option>
                                    <option className="text-slate-900 dark:text-slate-100 bg-white dark:bg-zinc-800" value="1">Slot 1</option>
                                    <option className="text-slate-900 dark:text-slate-100 bg-white dark:bg-zinc-800" value="2">Slot 2</option>
                                    <option className="text-slate-900 dark:text-slate-100 bg-white dark:bg-zinc-800" value="3">Slot 3</option>
                                    <option className="text-slate-900 dark:text-slate-100 bg-white dark:bg-zinc-800" value="4">Slot 4</option>
                                    <option className="text-slate-900 dark:text-slate-100 bg-white dark:bg-zinc-800" value="5">Slot 5</option>
                                    <option className="text-slate-900 dark:text-slate-100 bg-white dark:bg-zinc-800" value="6">Slot 6</option>
                                </select>
                            </div>
                            <div className="bg-orange-50/50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-100 dark:border-orange-900/30">
                                <label className="block text-[10px] font-bold text-orange-500 dark:text-orange-400 uppercase tracking-widest mb-1">PHÒNG MỚI</label>
                                <select className="w-full bg-transparent border-none p-0 text-lg font-bold text-orange-600 dark:text-orange-400 focus:ring-0 cursor-pointer appearance-none">
                                    <option className="text-slate-900 dark:text-slate-100 bg-white dark:bg-zinc-800" value="">Chọn phòng mới</option>
                                    <option className="text-slate-900 dark:text-slate-100 bg-white dark:bg-zinc-800" value="201">Phòng 201</option>
                                    <option className="text-slate-900 dark:text-slate-100 bg-white dark:bg-zinc-800" value="202">Phòng 202</option>
                                    <option className="text-slate-900 dark:text-slate-100 bg-white dark:bg-zinc-800" value="203">Phòng 203</option>
                                    <option className="text-slate-900 dark:text-slate-100 bg-white dark:bg-zinc-800" value="301">Phòng 301</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* Content & Docs */}
                    <section className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Nội dung & Tài liệu</h3>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">LÝ DO THAY ĐỔI</label>
                                <textarea
                                    className="w-full bg-slate-50 dark:bg-zinc-800/50 border-transparent rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-fpt-orange/20 focus:border-fpt-orange outline-none transition-all italic text-slate-700 dark:text-slate-200"
                                    placeholder="Nhập lý do chi tiết..."
                                    rows={4}
                                ></textarea>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">TỆP ĐÍNH KÈM</label>
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-200 dark:border-slate-800 border-dashed rounded-lg hover:border-fpt-orange transition-colors cursor-pointer group">
                                    <div className="space-y-1 text-center">
                                        <Upload className="mx-auto h-12 w-12 text-slate-400 group-hover:text-fpt-orange transition-colors" />
                                        <div className="flex text-sm text-slate-600 dark:text-slate-400 justify-center">
                                            <label className="relative cursor-pointer font-medium text-fpt-orange hover:underline">
                                                <span>Tải tệp lên</span>
                                                <input className="sr-only" type="file" />
                                            </label>
                                            <p className="pl-1">hoặc kéo và thả vào đây</p>
                                        </div>
                                        <p className="text-xs text-slate-500">PNG, JPG, PDF lên đến 10MB</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="flex pt-4 mb-12">
                        <button
                            type="submit"
                            disabled={submitting}
                            className={`w-full bg-fpt-orange hover:bg-orange-600 text-white font-bold py-5 rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-[0.99] flex items-center justify-center gap-3 text-lg uppercase tracking-wider ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            <Save size={24} />
                            {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
                        </button>
                    </div>
                </form>
            </div>
        </LecturerLayout>
    );
};
