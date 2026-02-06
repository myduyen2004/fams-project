import React, { useState, useEffect, useRef } from 'react';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Info, Check, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { REQUEST_TYPE_LABELS, RequestType } from '../../types/requestType';
import { scheduleRequestService, ClassSlotResponse, CreateScheduleRequestPayload, ConflictCheckResponse } from '../../services/api/scheduleRequestService';
import { RoomSelectionCard } from '../../components/lecturer/request/RoomSelectionCard';
import { Room } from '../../types/room';
import { uploadFile } from '../../services/utils/fileUploadService';

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
    const [dateError, setDateError] = useState<string>('');
    const [reason, setReason] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [conflictResult, setConflictResult] = useState<ConflictCheckResponse | null>(null);
    const [checkingConflict, setCheckingConflict] = useState(false);

    // Get today's date in YYYY-MM-DD format
    const getTodayString = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    // Get tomorrow's date in YYYY-MM-DD format
    const getTomorrowString = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    };

    // Handle date change with validation (must be tomorrow or later)
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedDate = e.target.value;
        const tomorrow = getTomorrowString();

        if (selectedDate && selectedDate < tomorrow) {
            setDateError('Ngày thay đổi phải từ ngày mai trở đi');
            setNewDate('');
        } else {
            setDateError('');
            setNewDate(selectedDate);
            // Reset selected room when date changes
            setSelectedRoom(null);
        }
    };

    // Handle file upload
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const newFiles = Array.from(files).filter(file => {
                // Check file size (max 10MB)
                if (file.size > 10 * 1024 * 1024) {
                    toast.error(`File ${file.name} vượt quá 10MB`);
                    return false;
                }
                // Check if file already exists
                if (uploadedFiles.some(f => f.name === file.name)) {
                    toast.error(`File ${file.name} đã được thêm`);
                    return false;
                }
                return true;
            });
            setUploadedFiles(prev => [...prev, ...newFiles]);
        }
        // Reset input value to allow re-uploading same file
        if (e.target) e.target.value = '';
    };

    // State for slot number selection (used for resetting only)


    // Format Date: dd/MM/yyyy
    const formatDateDDMMYYYY = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    // Fetch classes on mount
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
                    // Reset slot selection when class changes
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

    // Check for conflicts when date/slot changes
    useEffect(() => {
        const checkConflict = async () => {
            console.log('Checking conflicts:', { selectedClass, selectedSlotId, newDate, newSlot });

            if (!selectedClass || !selectedSlotId || !newDate || !newSlot) {
                setConflictResult(null);
                return;
            }
            try {
                setCheckingConflict(true);
                console.log('Calling checkConflicts API...');
                const result = await scheduleRequestService.checkConflicts(
                    selectedClass,
                    newDate,
                    newSlot,
                    parseInt(selectedSlotId)
                );
                console.log('Conflict result:', result);
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

        // Validation
        if (!selectedSlotId) {
            toast.error('Vui lòng chọn slot cần thay đổi');
            return;
        }
        if (!newDate) {
            toast.error('Vui lòng chọn ngày cần đổi');
            return;
        }
        if (!newSlot) {
            toast.error('Vui lòng chọn slot mới');
            return;
        }
        if (!selectedRoom) {
            toast.error('Vui lòng chọn phòng học mới');
            return;
        }
        if (!reason.trim()) {
            toast.error('Vui lòng nhập lý do thay đổi');
            return;
        }

        setSubmitting(true);
        try {
            // Upload ALL files to Cloudinary
            let fileUrls: string[] = [];
            if (uploadedFiles.length > 0) {
                try {
                    for (const file of uploadedFiles) {
                        const uploadResult = await uploadFile(file);
                        const url = uploadResult.url || uploadResult.secure_url;
                        if (url) fileUrls.push(url);
                    }
                } catch (uploadError) {
                    console.error('File upload failed:', uploadError);
                    toast.error('Không thể upload file. Vui lòng thử lại.');
                    setSubmitting(false);
                    return;
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
                                <select
                                    className="w-full bg-slate-50 dark:bg-zinc-800/50 border-transparent rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-fpt-orange/20 focus:border-fpt-orange outline-none transition-all text-slate-700 dark:text-slate-200"
                                    value={selectedClass}
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                >
                                    <option value="">Chọn lớp học</option>
                                    {classes.map((cls) => (
                                        <option key={cls} value={cls}>{cls}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">LOẠI YÊU CẦU</label>
                                <select className="w-full bg-slate-50 dark:bg-zinc-800/50 border-transparent rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-fpt-orange/20 focus:border-fpt-orange outline-none transition-all text-slate-700 dark:text-slate-200">
                                    <option value="">Chọn loại yêu cầu</option>
                                    {Object.keys(REQUEST_TYPE_LABELS)
                                        .filter(key => key !== RequestType.CANCEL && key !== RequestType.SWAP)
                                        .map((key) => (
                                            <option key={key} value={key}>
                                                {REQUEST_TYPE_LABELS[key]}
                                            </option>
                                        ))}
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* Change Details */}
                    <section className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Chi tiết thay đổi</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                            {/* NGÀY BAN ĐẦU - First (filter dates >= tomorrow) */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">NGÀY BAN ĐẦU</label>
                                <select
                                    className="w-full bg-slate-50 dark:bg-zinc-800/50 border-transparent rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-fpt-orange/20 focus:border-fpt-orange outline-none transition-all text-slate-700 dark:text-slate-200 font-bold"
                                    value={selectedOriginalDate}
                                    onChange={(e) => {
                                        const date = e.target.value;
                                        setSelectedOriginalDate(date);
                                        // Reset slot selection when date changes
                                        setSelectedSlotId('');
                                        setSelectedSlot(null);
                                    }}
                                    disabled={!selectedClass}
                                >
                                    <option value="">Chọn ngày</option>
                                    {(() => {
                                        const tomorrow = getTomorrowString();
                                        // Get unique dates that are >= tomorrow
                                        const uniqueDates = Array.from(new Set(
                                            slots
                                                .filter(s => s.date >= tomorrow)
                                                .map(s => s.date)
                                        )).sort();

                                        return uniqueDates.map(date => (
                                            <option key={date} value={date}>
                                                {formatDateDDMMYYYY(date)}
                                            </option>
                                        ));
                                    })()}
                                </select>
                            </div>
                            {/* SLOT BAN ĐẦU - Second (shows slots for selected date) */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">SLOT BAN ĐẦU</label>
                                <select
                                    className="w-full bg-slate-50 dark:bg-zinc-800/50 border-transparent rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-fpt-orange/20 focus:border-fpt-orange outline-none transition-all text-slate-700 dark:text-slate-200 font-bold"
                                    value={selectedSlotId}
                                    onChange={(e) => {
                                        const slotId = e.target.value;
                                        setSelectedSlotId(slotId);
                                        const found = slots.find(s => s.id.toString() === slotId) || null;
                                        setSelectedSlot(found);
                                    }}
                                    disabled={!selectedOriginalDate}
                                >
                                    <option value="">Chọn slot</option>
                                    {selectedOriginalDate && slots
                                        .filter(s => s.date === selectedOriginalDate)
                                        .sort((a, b) => a.slotNumber - b.slotNumber)
                                        .map(slot => (
                                            <option key={slot.id} value={slot.id}>
                                                Slot {slot.slotNumber}
                                            </option>
                                        ))}
                                </select>
                            </div>
                            {/* PHÒNG BAN ĐẦU - Third (auto-display) */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">PHÒNG BAN ĐẦU</label>
                                <div className="w-full bg-slate-50 dark:bg-zinc-800/50 border-transparent rounded-lg px-4 py-3 text-sm text-slate-700 dark:text-slate-200 font-bold min-h-[46px] flex items-center">
                                    {selectedSlot ? selectedSlot.roomName : '-'}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">NGÀY CẦN ĐỔI</label>
                                <input
                                    className="w-full bg-slate-50 dark:bg-zinc-800/50 border-transparent rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-fpt-orange/20 focus:border-fpt-orange outline-none transition-all text-slate-700 dark:text-slate-200 font-bold"
                                    type="date"
                                    value={newDate}
                                    min={getTodayString()}
                                    onChange={handleDateChange}
                                />
                                {dateError && (
                                    <p className="text-xs text-red-500 mt-1">{dateError}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">SLOT MỚI</label>
                                <select
                                    className="w-full bg-slate-50 dark:bg-zinc-800/50 border-transparent rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-fpt-orange/20 focus:border-fpt-orange outline-none transition-all text-slate-700 dark:text-slate-200 font-bold"
                                    value={newSlot || ''}
                                    onChange={(e) => {
                                        setNewSlot(e.target.value ? parseInt(e.target.value) : null);
                                        // Reset selected room when new slot changes
                                        setSelectedRoom(null);
                                    }}
                                >
                                    <option value="">Chọn slot mới</option>
                                    <option value="1">Slot 1</option>
                                    <option value="2">Slot 2</option>
                                    <option value="3">Slot 3</option>
                                    <option value="4">Slot 4</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* Conflict Warnings */}
                    {conflictResult?.hasConflict && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-900/30">
                            <div className="flex items-start gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-red-700 dark:text-red-400 mb-2">Phát hiện xung đột lịch học!</p>
                                    <ul className="space-y-1">
                                        {conflictResult.conflicts.map((conflict, index) => (
                                            <li key={index} className="text-sm text-red-600 dark:text-red-300 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0"></span>
                                                {conflict.message}
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="text-xs text-red-500 dark:text-red-400 mt-3 italic">
                                        Vui lòng chọn ngày hoặc slot khác để tránh xung đột.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    {checkingConflict && (
                        <div className="p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-200 dark:border-zinc-700 flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-sm text-slate-500">Đang kiểm tra xung đột...</span>
                        </div>
                    )}

                    {/* Room Selection - Hidden when conflicts exist */}
                    {!conflictResult?.hasConflict && (
                        <RoomSelectionCard
                            selectedRoom={selectedRoom}
                            onRoomSelect={setSelectedRoom}
                            selectedDate={newDate}
                            selectedSlot={newSlot}
                        />
                    )}

                    {/* Content & Docs */}
                    <section className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Nội dung & Tài liệu</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">LÝ DO THAY ĐỔI <span className="text-red-500">*</span></label>
                                <textarea
                                    className="w-full bg-slate-50 dark:bg-zinc-800/50 border-transparent rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-fpt-orange/20 focus:border-fpt-orange outline-none transition-all text-slate-700 dark:text-slate-200"
                                    placeholder="Nhập lý do chi tiết..."
                                    rows={8}
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    required
                                ></textarea>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">TỆP ĐÍNH KÈM</label>
                                <div
                                    className="flex justify-center px-6 pt-5 pb-6 border-2 border-slate-200 dark:border-slate-800 border-dashed rounded-lg hover:border-fpt-orange transition-colors cursor-pointer group h-[190px] flex-col"
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const files = e.dataTransfer.files;
                                        if (files.length) {
                                            const event = { target: { files, value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>;
                                            handleFileChange(event);
                                        }
                                    }}
                                >
                                    <div className="space-y-1 text-center">
                                        <Upload className="mx-auto h-10 w-10 text-slate-400 group-hover:text-fpt-orange transition-colors" />
                                        <div className="flex text-sm text-slate-600 dark:text-slate-400 justify-center">
                                            <span className="font-medium text-fpt-orange hover:underline">Tải tệp lên</span>
                                            <p className="pl-1">hoặc kéo và thả vào đây</p>
                                        </div>
                                        <p className="text-xs text-slate-500">PNG, JPG, PDF lên đến 10MB</p>
                                    </div>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    className="hidden"
                                    type="file"
                                    multiple
                                    accept="image/*,.pdf"
                                    onChange={handleFileChange}
                                />

                                {/* Display uploaded files */}
                                {uploadedFiles.length > 0 && (
                                    <div className="mt-4 space-y-2 max-h-[150px] overflow-y-auto pr-2">
                                        {uploadedFiles.map((file, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-800/50 rounded-xl border border-slate-100 dark:border-slate-800/50 hover:border-fpt-orange/50 transition-colors group"
                                            >
                                                <div className="flex flex-col min-w-0 pr-4">
                                                    <span className="text-xs font-bold text-slate-800 dark:text-gray-100 truncate mb-1" title={file.name}>
                                                        {file.name}
                                                    </span>
                                                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                                        {(file.size / 1024).toFixed(2)} KB
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-3 flex-shrink-0">
                                                    <div className="flex items-center justify-center w-5 h-5 rounded-full border border-green-500 text-green-500 bg-green-50 dark:bg-green-900/10">
                                                        <Check size={12} strokeWidth={3} />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const newFiles = [...uploadedFiles];
                                                            newFiles.splice(index, 1);
                                                            setUploadedFiles(newFiles);
                                                        }}
                                                        className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-slate-200 dark:hover:bg-zinc-700"
                                                        title="Xóa file"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    <div className="flex pt-4 mb-12 justify-end">
                        <button
                            type="submit"
                            disabled={submitting}
                            className={`w-auto min-w-[200px] px-8 bg-fpt-orange hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-[0.95] flex items-center justify-center gap-2 text-base uppercase tracking-wider ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {submitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Đang gửi...
                                </>
                            ) : (
                                "Gửi yêu cầu"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </LecturerLayout>
    );
};
