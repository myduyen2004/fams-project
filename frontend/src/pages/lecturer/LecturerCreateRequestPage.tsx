import React, { useState, useEffect, useRef } from 'react';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Info, Check, Trash2, FileText, AlertCircle, Calendar, Clock, MapPin, Loader2 } from 'lucide-react';
import toast from "@utils/toast";
import { scheduleRequestService, ClassSlotResponse, CreateScheduleRequestPayload, ConflictCheckResponse } from '../../services/api/scheduleRequestService';
import { RoomSelectionCard } from '../../components/lecturer/request/RoomSelectionCard';
import { Room } from '../../types/room';
import { uploadFile } from '../../services/utils/fileUploadService';
import { CustomSelect } from '../../components/common/CustomSelect';
import { CustomDatePicker } from '../../components/common/CustomDatePicker';

export const LecturerCreateRequestPage: React.FC = () => {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);

    const [selectedClass, setSelectedClass] = useState('');
    const [classes, setClasses] = useState<string[]>([]);
    const [slots, setSlots] = useState<ClassSlotResponse[]>([]);
    const [selectedOriginalDate, setSelectedOriginalDate] = useState<string>('');
    const [selectedSlotId, setSelectedSlotId] = useState<string>('');
    const [selectedSlot, setSelectedSlot] = useState<ClassSlotResponse | null>(null);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [newDate, setNewDate] = useState<string>('');
    const [newSlot, setNewSlot] = useState<number | null>(null);
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

    const [reason, setReason] = useState<string>('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [conflictResult, setConflictResult] = useState<ConflictCheckResponse | null>(null);
    const [checkingConflict, setCheckingConflict] = useState(false);
    const hasConflict = conflictResult?.hasConflict === true;

    // Get tomorrow's date in YYYY-MM-DD format
    const getTomorrowString = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    };

    // Handle file upload
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (hasConflict) {
            toast.error('Không thể tải tài liệu khi đang có xung đột lịch học');
            if (e.target) e.target.value = '';
            return;
        }

        const files = e.target.files;
        if (files) {
            const newFiles = Array.from(files).filter(file => {
                if (file.size > 10 * 1024 * 1024) {
                    toast.error(`File ${file.name} vượt quá 10MB`);
                    return false;
                }
                if (uploadedFiles.some(f => f.name === file.name)) {
                    toast.error(`File ${file.name} đã được thêm`);
                    return false;
                }
                return true;
            });
            setUploadedFiles(prev => [...prev, ...newFiles]);
        }
        if (e.target) e.target.value = '';
    };

    const formatDateDDMMYYYY = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const data = await scheduleRequestService.getClasses();
                setClasses(data);
            } catch (error) {
                console.error("Error fetching classes:", error);
                toast.error("Không thể tải danh sách lớp học");
            }
        };
        fetchClasses();
    }, []);

    useEffect(() => {
        if (selectedClass) {
            const fetchSlots = async () => {
                try {
                    const data = await scheduleRequestService.getSlotsForClass(selectedClass);
                    setSlots(data);
                    setSelectedSlotId('');
                    setSelectedSlot(null);
                } catch (error) {
                    console.error("Error fetching slots:", error);
                    toast.error("Không thể tải danh sách slot cho lớp này");
                }
            };
            fetchSlots();
        } else {
            setSlots([]);
            setSelectedSlotId('');
            setSelectedSlot(null);
        }
    }, [selectedClass]);

    useEffect(() => {
        const checkConflict = async () => {
            if (!selectedClass || !selectedSlotId || !newDate || !newSlot) {
                setConflictResult(null);
                return;
            }
            try {
                setCheckingConflict(true);
                const result = await scheduleRequestService.checkConflicts(
                    selectedClass,
                    newDate,
                    newSlot,
                    parseInt(selectedSlotId)
                );
                setConflictResult(result);
            } catch (error) {
                console.error('Error checking conflicts:', error);
                setConflictResult(null);
            } finally {
                setCheckingConflict(false);
            }
        };
        checkConflict();
    }, [selectedClass, selectedSlotId, newDate, newSlot]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedClass) { toast.error('Vui lòng chọn lớp học'); return; }
        if (!selectedSlotId || !selectedSlot) { toast.error('Vui lòng chọn ngày và slot ban đầu'); return; }
        if (!newDate) { toast.error('Vui lòng chọn ngày cần đổi'); return; }
        if (!newSlot) { toast.error('Vui lòng chọn slot mới'); return; }
        if (!selectedRoom) { toast.error('Vui lòng chọn phòng học mới'); return; }
        if (!reason.trim()) { toast.error('Vui lòng nhập lý do thay đổi'); return; }

        if (conflictResult?.hasConflict) {
            toast.error('Không thể tạo yêu cầu khi có xung đột lịch. Vui lòng chọn ngày hoặc slot khác.');
            return;
        }

        setSubmitting(true);
        try {
            let fileUrls: string[] = [];
            if (uploadedFiles.length > 0) {
                for (const file of uploadedFiles) {
                    const uploadResult = await uploadFile(file);
                    const url = uploadResult.url || uploadResult.secure_url;
                    if (url) fileUrls.push(url);
                }
            }

            const payload: CreateScheduleRequestPayload = {
                originalSlotId: parseInt(selectedSlotId),
                type: 'RESCHEDULE',
                reason: reason.trim(),
                requestedDate: newDate,
                requestedSlotTypeId: newSlot,
                requestedRoomId: selectedRoom.id,
                file: fileUrls.length > 0 ? JSON.stringify(fileUrls) : undefined
            };

            await scheduleRequestService.createRequest(payload);
            toast.success('Yêu cầu đã được gửi thành công!');
            navigate('/lecturer/requests');
        } catch (error: any) {
            console.error('Error creating request:', error);
            const errorMessage = error.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu';
            toast.error(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <LecturerLayout pageTitle="Tạo yêu cầu mới">
            <div className="max-w-[1440px] mx-auto w-full p-6 animate-in fade-in duration-500">
                {/* Header Back Link */}
                <div className="mb-8 space-y-4">
                    <Link to="/lecturer/requests" className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-fpt-orange transition-all group w-fit">
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        QUAY LẠI DANH SÁCH
                    </Link>
                    <div className="flex items-center gap-4">
                        <div>
                            <h2 className="text-3xl font-bold text-[#001D4A] dark:text-white tracking-tight">Tạo yêu cầu thay đổi lịch dạy</h2>
                            <p className="text-gray-500 dark:text-zinc-400 font-medium">Hoàn thiện các thông tin dưới đây để gửi yêu cầu cho Ban đào tạo</p>
                        </div>
                    </div>
                </div>

                {/* Warning/Info Box */}
                <div className="p-6 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10 rounded-[24px] mb-8 border-2 border-orange-100 dark:border-orange-900/30 flex items-start gap-4">
                    <div className="p-2 bg-white dark:bg-zinc-900 rounded-xl shadow-sm text-fpt-orange">
                        <Info size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-orange-900 dark:text-orange-200 uppercase text-xs tracking-widest mb-1">Lưu ý quan trọng</h4>
                        <p className="text-sm text-orange-800/80 dark:text-orange-200/70 leading-relaxed font-medium">
                            Vui lòng kiểm tra kỹ thông tin trước khi gửi. Mọi yêu cầu sẽ được Ban đào tạo xem xét và phản hồi trong vòng 24h làm việc qua hệ thống và email.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8 pb-12">
                    {/* General Info */}
                    <section className="bg-white dark:bg-zinc-900 rounded-[32px] border-2 border-gray-100 dark:border-zinc-800 p-8 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                            <h3 className="text-xl font-bold text-[#001D4A] dark:text-white tracking-tight">Thông tin chung</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="block text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em] ml-1">LỚP HỌC <span className="text-fpt-orange">*</span></label>
                                <CustomSelect
                                    value={selectedClass}
                                    onChange={setSelectedClass}
                                    options={[
                                        { value: '', label: 'Chọn lớp học' },
                                        ...classes.map(cls => ({ value: cls, label: cls }))
                                    ]}
                                    className="h-[52px] rounded-2xl bg-gray-50/50 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-700 hover:border-fpt-orange transition-all"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="block text-[11px] font-black text-gray-400 dark:text-zinc-500 tracking-[0.2em] ml-1">LOẠI YÊU CẦU</label>
                                <div className="w-full bg-gray-50 dark:bg-zinc-800/50 border-2 border-transparent rounded-2xl px-5 h-[52px] flex items-center text-sm font-bold text-gray-700 dark:text-zinc-300">
                                    <Check size={18} className="mr-2 text-emerald-500" /> Đổi lịch dạy (Reschedule)
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Change Details */}
                    <section className="bg-white dark:bg-zinc-900 rounded-[32px] border-2 border-gray-100 dark:border-zinc-800 p-8 shadow-sm transition-all hover:shadow-md relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16" />

                        <div className="flex items-center gap-3 mb-8 relative z-10">
                            <div className="w-1.5 h-6 bg-fpt-orange rounded-full" />
                            <h3 className="text-xl font-bold text-[#001D4A] dark:text-white tracking-tight">Chi tiết thay đổi</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 relative z-10">
                            {/* NGÀY BAN ĐẦU */}
                            <div className="space-y-3">
                                <label className="block text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em] ml-1">NGÀY BAN ĐẦU</label>
                                <div className="relative">
                                    <CustomSelect
                                        value={selectedOriginalDate}
                                        onChange={(date) => {
                                            setSelectedOriginalDate(date);
                                            setSelectedSlotId('');
                                            setSelectedSlot(null);
                                        }}
                                        disabled={!selectedClass}
                                        options={[
                                            { value: '', label: 'Chọn ngày' },
                                            ...(() => {
                                                const tomorrow = getTomorrowString();
                                                const uniqueDates = Array.from(new Set(
                                                    slots.filter(s => s.date >= tomorrow).map(s => s.date)
                                                )).sort();
                                                return uniqueDates.map(date => ({ value: date, label: formatDateDDMMYYYY(date) }));
                                            })()
                                        ]}
                                        className="h-[52px] rounded-2xl bg-gray-50/50 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-700 font-bold"
                                    />
                                    <Calendar size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                                </div>
                            </div>

                            {/* SLOT BAN ĐẦU */}
                            <div className="space-y-3">
                                <label className="block text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em] ml-1">SLOT BAN ĐẦU</label>
                                <div className="relative">
                                    <CustomSelect
                                        value={selectedSlotId}
                                        onChange={(slotId) => {
                                            setSelectedSlotId(slotId);
                                            const found = slots.find(s => s.id.toString() === slotId) || null;
                                            setSelectedSlot(found);
                                        }}
                                        disabled={!selectedOriginalDate}
                                        options={[
                                            { value: '', label: 'Chọn slot' },
                                            ...(selectedOriginalDate ? slots
                                                .filter(s => s.date === selectedOriginalDate)
                                                .sort((a, b) => a.slotNumber - b.slotNumber)
                                                .map(slot => ({ value: slot.id.toString(), label: `Slot ${slot.slotNumber}` })) : [])
                                        ]}
                                        className="h-[52px] rounded-2xl bg-gray-50/50 dark:bg-zinc-800/50 border-gray-100 dark:border-zinc-700 font-bold"
                                    />
                                    <Clock size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                                </div>
                            </div>

                            {/* PHÒNG BAN ĐẦU */}
                            <div className="space-y-3">
                                <label className="block text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em] ml-1">PHÒNG BAN ĐẦU</label>
                                <div className="w-full bg-gray-100/50 dark:bg-zinc-800/30 border-2 border-transparent rounded-2xl px-5 h-[52px] flex items-center text-sm font-bold text-gray-500 dark:text-zinc-500 italic">
                                    <MapPin size={18} className="mr-2 opacity-50" /> {selectedSlot ? selectedSlot.roomName : '—'}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em] ml-1">NGÀY CẦN ĐỔI <span className="text-fpt-orange">*</span></label>
                                <CustomDatePicker
                                    value={newDate}
                                    min={getTomorrowString()}
                                    onChange={(value) => setNewDate(value)}
                                    className="h-[52px] rounded-2xl bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 shadow-sm"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="block text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em] ml-1">SLOT MỚI <span className="text-fpt-orange">*</span></label>
                                <CustomSelect
                                    value={newSlot?.toString() || ''}
                                    onChange={(value) => {
                                        setNewSlot(value ? parseInt(value) : null);
                                        setSelectedRoom(null);
                                    }}
                                    options={[
                                        { value: '', label: 'Chọn slot mới' },
                                        { value: '1', label: 'Slot 1' },
                                        { value: '2', label: 'Slot 2' },
                                        { value: '3', label: 'Slot 3' },
                                        { value: '4', label: 'Slot 4' }
                                    ]}
                                    className="h-[52px] rounded-2xl bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 shadow-sm font-black text-fpt-orange"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Conflict Warnings */}
                    {hasConflict && (
                        <div className="p-6 bg-rose-50 dark:bg-rose-900/10 rounded-[24px] border-2 border-rose-100 dark:border-rose-900/30 animate-in slide-in-from-top-4 duration-300">
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-white dark:bg-zinc-900 rounded-xl shadow-sm text-rose-500">
                                    <AlertCircle size={24} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-black text-rose-900 dark:text-rose-200 uppercase text-xs tracking-widest mb-3">Phát hiện xung đột lịch học!</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {conflictResult.conflicts.map((conflict, index) => (
                                            <div key={index} className="flex items-center gap-3 bg-white/50 dark:bg-zinc-900/50 p-3 rounded-xl border border-rose-100 dark:border-rose-900/20">
                                                <div className="w-1.5 h-1.5 bg-rose-500 rounded-full flex-shrink-0" />
                                                <span className="text-sm text-rose-800 dark:text-rose-300 font-bold">{conflict.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-rose-500 dark:text-rose-400 mt-4 italic font-medium flex items-center gap-1">
                                        <Info size={12} /> Vui lòng chọn ngày hoặc slot khác để đảm bảo không bị trùng lịch dạy/học.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {checkingConflict && (
                        <div className="p-4 bg-gray-50/50 dark:bg-zinc-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-700 flex items-center justify-center gap-3">
                            <Loader2 className="animate-spin text-fpt-orange" size={20} />
                            <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Đang kiểm tra xung đột...</span>
                        </div>
                    )}

                    {/* Room Selection */}
                    {!conflictResult?.hasConflict && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <RoomSelectionCard
                                selectedRoom={selectedRoom}
                                onRoomSelect={setSelectedRoom}
                                selectedDate={newDate}
                                selectedSlot={newSlot}
                            />
                        </div>
                    )}

                    {/* Content & Docs */}
                    <section className="bg-white dark:bg-zinc-900 rounded-[32px] border-2 border-gray-100 dark:border-zinc-800 p-8 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                            <h3 className="text-xl font-black text-[#001D4A] dark:text-white uppercase tracking-tight">Nội dung & Tài liệu</h3>
                        </div>

                        {hasConflict && (
                            <div className="mb-6 rounded-[20px] border-2 border-dashed border-amber-200 bg-amber-50/50 p-6 text-center text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-300 font-bold">
                                Phần này đang được khóa để bảo vệ dữ liệu. Vui lòng giải quyết xung đột lịch trước.
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-4">
                                <label className="block text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em] ml-1">LÝ DO THAY ĐỔI <span className="text-fpt-orange">*</span></label>
                                <textarea
                                    className={`w-full bg-gray-50 dark:bg-zinc-800/50 border-2 border-gray-100 dark:border-zinc-700 rounded-[24px] px-6 py-5 text-sm font-medium focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange outline-none transition-all text-gray-700 dark:text-zinc-200 min-h-[220px] ${hasConflict ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    placeholder="Ví dụ: Nghỉ ốm (có giấy xác nhận), Công tác đột xuất của trường,..."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    disabled={hasConflict}
                                    required
                                ></textarea>
                            </div>
                            <div className="space-y-4">
                                <label className="block text-[11px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em] ml-1">TỆP ĐÍNH KÈM (MINH CHỨNG)</label>
                                <div
                                    className={`flex justify-center px-6 pt-10 pb-10 border-2 border-gray-200 dark:border-zinc-700 border-dashed rounded-[24px] transition-all min-h-[220px] flex-col relative group ${hasConflict ? 'cursor-not-allowed opacity-50 bg-gray-50/50' : 'hover:border-fpt-orange hover:bg-orange-50/5 cursor-pointer'}`}
                                    onClick={() => !hasConflict && fileInputRef.current?.click()}
                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                    onDrop={(e) => {
                                        e.preventDefault(); e.stopPropagation();
                                        if (hasConflict) { toast.error('Không thể tải tài liệu khi đang có xung đột lịch học'); return; }
                                        const files = e.dataTransfer.files;
                                        if (files.length) {
                                            const event = { target: { files, value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>;
                                            handleFileChange(event);
                                        }
                                    }}
                                >
                                    <div className="space-y-3 text-center">
                                        <div className="w-16 h-16 bg-gray-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto text-gray-400 group-hover:text-fpt-orange group-hover:scale-110 transition-all duration-300 shadow-sm border border-gray-100 dark:border-zinc-700">
                                            <Upload size={28} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-black text-gray-700 dark:text-zinc-200">
                                                Tải tệp lên <span className="text-fpt-orange">hoặc kéo thả</span>
                                            </p>
                                            <p className="text-xs text-gray-400 font-medium tracking-tight">Hỗ trợ PNG, JPG, PDF (Tối đa 10MB)</p>
                                        </div>
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        className="hidden"
                                        type="file"
                                        multiple
                                        accept="image/*,.pdf"
                                        onChange={handleFileChange}
                                        disabled={hasConflict}
                                    />
                                </div>

                                {/* Display uploaded files */}
                                {uploadedFiles.length > 0 && (
                                    <div className="grid grid-cols-1 gap-3 mt-4 animate-in slide-in-from-top-2">
                                        {uploadedFiles.map((file, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between p-4 bg-white dark:bg-zinc-800 shadow-sm rounded-2xl border-2 border-gray-100 dark:border-zinc-700 hover:border-fpt-orange/50 transition-all group"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-lg">
                                                        <FileText size={18} />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-sm font-black text-gray-900 dark:text-white truncate" title={file.name}>
                                                            {file.name}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                            {(file.size / 1024).toFixed(1)} KB
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center shadow-inner">
                                                        <Check size={14} strokeWidth={3} />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const newFiles = [...uploadedFiles];
                                                            newFiles.splice(index, 1);
                                                            setUploadedFiles(newFiles);
                                                        }}
                                                        className="w-8 h-8 rounded-full bg-gray-50 dark:bg-zinc-700 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center"
                                                        title="Xóa file"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    <div className="flex pt-8 mb-12 justify-end gap-4 border-t border-gray-100 dark:border-zinc-800">
                        <Link
                            to="/lecturer/requests"
                            className="flex h-[52px] items-center px-8 bg-white dark:bg-zinc-800 border-2 border-gray-100 dark:border-zinc-800 text-gray-700 dark:text-gray-200 font-bold rounded-2xl transition-all hover:border-gray-300 dark:hover:border-zinc-600 active:scale-95 uppercase tracking-widest text-xs"
                        >
                            Hủy bỏ
                        </Link>
                        <button
                            type="submit"
                            disabled={submitting || hasConflict}
                            className={`flex h-[52px] items-center gap-3 px-10 bg-fpt-orange hover:bg-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-fpt-orange/20 transition-all active:scale-95 uppercase tracking-widest text-sm ${submitting || hasConflict ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Đang gửi...
                                </>
                            ) : (
                                <>
                                    Gửi yêu cầu ngay
                                    <Check size={20} strokeWidth={3} />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </LecturerLayout>
    );
};
