import React, { useState, useEffect } from 'react';
import { Settings, Calendar, Plus, ArrowLeft, Trash2, Clock, Check, AlertCircle, ChevronRight } from 'lucide-react';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';

interface SlotTime {
  startTime: string;
  endTime: string;
}

interface Holiday {
  holidayDate: string;
  description: string;
}

interface SemesterConfig {
  semesterName: string;
  startDate: string;
  endDate: string;
  selectedDays: string[];
  maxSlotsPerDay: number;
  slotsPerSubjectPerWeek: number;
  slotType: '90' | '135';
  slots: SlotTime[];
  holidays: Holiday[];
  isPublished: boolean;
}

const DAYS_OF_WEEK = [
  { id: 'MON', label: 'T2' },
  { id: 'TUE', label: 'T3' },
  { id: 'WED', label: 'T4' },
  { id: 'THU', label: 'T5' },
  { id: 'FRI', label: 'T6' },
  { id: 'SAT', label: 'T7' },
  { id: 'SUN', label: 'CN' },
];

const VIETNAMESE_HOLIDAYS_PRESETS = [
  { name: 'Tết Dương Lịch', month: 1, day: 1, type: 'solar' },
  { name: 'Tết Nguyên Đán (Dự kiến)', month: 2, day: 16, type: 'solar', days: 7 }, // 2026 specific
  { name: 'Giỗ Tổ Hùng Vương', month: 4, day: 26, type: 'solar' }, // 2026 specific
  { name: 'Ngày Giải phóng Miền Nam', month: 4, day: 30, type: 'solar' },
  { name: 'Ngày Quốc tế Lao động', month: 5, day: 1, type: 'solar' },
  { name: 'Ngày Quốc khánh', month: 9, day: 2, type: 'solar', days: 2 },
  { name: 'Ngày Nhà giáo Việt Nam', month: 11, day: 20, type: 'solar' },
];

export const SlotTypePage: React.FC = () => {
  const navigate = useNavigate();
  const { semesterCode } = useParams<{ semesterCode: string }>();
  
  const [config, setConfig] = useState<SemesterConfig>({
    semesterName: '',
    startDate: '',
    endDate: '',
    selectedDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
    maxSlotsPerDay: 4,
    slotsPerSubjectPerWeek: 2,
    slotType: '90',
    slots: [
      { startTime: '07:30', endTime: '09:00' },
      { startTime: '09:15', endTime: '10:45' },
      { startTime: '11:00', endTime: '12:30' },
      { startTime: '13:30', endTime: '15:00' },
    ],
    holidays: [],
    isPublished: false
  });

  const [isReadOnly, setIsReadOnly] = useState(true);
  const [originalConfig, setOriginalConfig] = useState<SemesterConfig | null>(null);
  
  const DEFAULT_CONFIG: Omit<SemesterConfig, 'semesterName' | 'startDate' | 'endDate' | 'isPublished'> = {
    selectedDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
    maxSlotsPerDay: 4,
    slotsPerSubjectPerWeek: 2,
    slotType: '90',
    slots: [
      { startTime: '07:30', endTime: '09:00' },
      { startTime: '09:15', endTime: '10:45' },
      { startTime: '11:00', endTime: '12:30' },
      { startTime: '13:30', endTime: '15:00' },
    ],
    holidays: []
  };

  const addMinutes = (time: string, minutes: number): string => {
    if (!time) return '';
    const [hours, mins] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins + minutes);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  useEffect(() => {
    const duration = parseInt(config.slotType);
    const BREAK_DURATION = 15; // 15-minute break between slots
    
    // Use reduce to properly chain calculations - each slot depends on the NEWLY calculated previous slot
    const updatedSlots = config.slots.reduce<SlotTime[]>((acc, slot, index) => {
      if (index === 0) {
        // Keep first slot's start time, just update end time
        const startTime = slot.startTime || '07:30';
        acc.push({
          startTime,
          endTime: addMinutes(startTime, duration)
        });
      } else {
        // Calculate start time based on the NEWLY calculated previous slot's end time + break
        const prevCalculatedSlot = acc[index - 1];
        const newStartTime = addMinutes(prevCalculatedSlot.endTime, BREAK_DURATION);
        acc.push({
          startTime: newStartTime,
          endTime: addMinutes(newStartTime, duration)
        });
      }
      return acc;
    }, []);
    
    const hasChanged = updatedSlots.some((slot, i) => 
      slot.startTime !== config.slots[i].startTime || slot.endTime !== config.slots[i].endTime
    );
    
    if (hasChanged) {
      setConfig(prev => ({ ...prev, slots: updatedSlots }));
    }
  }, [config.slotType]);
  
  // Fetch semester data
  useEffect(() => {
    if (semesterCode) {
      axios.get(`/api/v1/semesters/get-by-code/${semesterCode}`)
        .then(response => {
          const data = response.data;
          const loadedConfig: SemesterConfig = {
            ...config,
            semesterName: data.name,
            startDate: data.startDate,
            endDate: data.endDate,
            isPublished: data.isPublished || false,
            // Load configuration if exists
            selectedDays: data.selectedDays || config.selectedDays,
            maxSlotsPerDay: data.maxSlotsPerDay || config.maxSlotsPerDay,
            slotsPerSubjectPerWeek: data.slotsPerSubjectPerWeek || config.slotsPerSubjectPerWeek,
            slotType: data.slotDuration ? data.slotDuration.toString() : config.slotType,
            slots: data.slots || config.slots,
            holidays: data.holidays || config.holidays
          };
          
          setConfig(loadedConfig);
          setOriginalConfig(loadedConfig);
          
          // If configuration exists (e.g. maxSlotsPerDay is not null), stay in read-only mode
          if (data.maxSlotsPerDay) {
            setIsReadOnly(true);
          } else {
            setIsReadOnly(false); // New semester configuration
          }
        })
        .catch(error => {
          console.error('Error fetching semester:', error);
          toast.error('Không thể tải thông tin học kỳ');
        });
    }
  }, [semesterCode]);

  const handleInputChange = (field: keyof SemesterConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const toggleDay = (dayId: string) => {
    setConfig(prev => {
      const isSelected = prev.selectedDays.includes(dayId);
      const newDays = isSelected 
        ? prev.selectedDays.filter(d => d !== dayId)
        : [...prev.selectedDays, dayId];
      return { ...prev, selectedDays: newDays };
    });
  };

  const handleSlotTimeChange = (index: number, value: string) => {
    if (isReadOnly) return;
    const duration = parseInt(config.slotType);
    const updatedSlots = [...config.slots];
    updatedSlots[index] = {
      startTime: value,
      endTime: value ? addMinutes(value, duration) : ''
    };
    setConfig(prev => ({ ...prev, slots: updatedSlots }));
  };

  const addSlot = () => {
    if (isReadOnly) return;
    if (config.slots.length >= 10) {
      toast.error('Tối đa 10 slot');
      return;
    }
    const lastSlot = config.slots[config.slots.length - 1];
    let newStartTime = '07:30';
    if (lastSlot && lastSlot.endTime) {
      newStartTime = addMinutes(lastSlot.endTime, 15);
    }
    const duration = parseInt(config.slotType);
    setConfig(prev => ({
      ...prev,
      slots: [...prev.slots, { startTime: newStartTime, endTime: addMinutes(newStartTime, duration) }]
    }));
  };

  const removeSlot = (index: number) => {
    if (config.slots.length <= 1) return;
    const updatedSlots = config.slots.filter((_, i) => i !== index);
    setConfig(prev => ({ ...prev, slots: updatedSlots }));
  };

  const addHoliday = () => {
    setConfig(prev => ({
      ...prev,
      holidays: [...prev.holidays, { holidayDate: '', description: '' }]
    }));
  };

  const removeHoliday = (index: number) => {
    setConfig(prev => ({
      ...prev,
      holidays: prev.holidays.filter((_, i) => i !== index)
    }));
  };

  const handleHolidayChange = (index: number, field: keyof Holiday, value: string) => {
    setConfig(prev => {
      const updatedHolidays = [...prev.holidays];
      updatedHolidays[index] = { ...updatedHolidays[index], [field]: value };
      return { ...prev, holidays: updatedHolidays };
    });
  };

  const handleCancelChanges = () => {
    if (originalConfig) {
      setConfig(originalConfig);
      setIsReadOnly(true);
      toast.success('Đã hủy các thay đổi');
    }
  };

  const handleResetToDefault = () => {
    setConfig(prev => ({
      ...prev,
      ...DEFAULT_CONFIG
    }));
    toast.success('Đã đặt lại về cấu hình mặc định');
  };

  const loadStandardHolidays = () => {
    if (!config.startDate || !config.endDate) {
      toast.error('Vui lòng chờ tải thông tin thời gian kỳ học');
      return;
    }

    const start = new Date(config.startDate);
    const end = new Date(config.endDate);
    const year = start.getFullYear();

    const standardHolidays: Holiday[] = [];
    let holidaysInRange = 0;
    
    VIETNAMESE_HOLIDAYS_PRESETS.forEach(preset => {
      const daysToLoad = preset.days || 1;
      for (let i = 0; i < daysToLoad; i++) {
        const holidayDate = new Date(year, preset.month - 1, preset.day + i);
        if (holidayDate >= start && holidayDate <= end) {
          holidaysInRange++;
          const formattedDate = holidayDate.toISOString().split('T')[0];
          // Avoid duplicates
          if (!config.holidays.some(h => h.holidayDate === formattedDate)) {
            standardHolidays.push({
              holidayDate: formattedDate,
              description: preset.name + (daysToLoad > 1 ? ` (Ngày ${i + 1})` : '')
            });
          }
        }
      }
    });

    if (standardHolidays.length > 0) {
      setConfig(prev => ({
        ...prev,
        holidays: [...prev.holidays, ...standardHolidays]
      }));
      toast.success(`Đã nạp thêm ${standardHolidays.length} ngày lễ chuẩn`);
    } else if (holidaysInRange > 0) {
      toast.success('Tất cả ngày nghỉ lễ chuẩn trong kỳ này đã có trong danh sách');
    } else {
      toast.error('Không tìm thấy ngày lễ chuẩn nào trong khoảng thời gian này');
    }
  };

  const validateSchedule = () => {
    for (let i = 0; i < config.slots.length; i++) {
      const cur = config.slots[i];
      for (let j = i + 1; j < config.slots.length; j++) {
        const next = config.slots[j];
        if (cur.startTime < next.endTime && next.startTime < cur.endTime) return `Trùng lặp: Slot ${i + 1} và Slot ${j + 1}`;
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validateSchedule();
    if (err) { toast.error(err); return; }
    if (!config.semesterName || config.selectedDays.length === 0) { toast.error('Thiếu thông tin bắt buộc'); return; }

    // Validate slots and holidays
    const validSlots = config.slots.filter(s => s.startTime && s.endTime);
    if (validSlots.length === 0) {
      toast.error('Cần ít nhất một khung giờ hoàn chỉnh');
      return;
    }

    const validHolidays = config.holidays.filter(h => h.holidayDate);

    try {
      const payload = {
        selectedDays: config.selectedDays,
        maxSlotsPerDay: config.maxSlotsPerDay,
        slotsPerSubjectPerWeek: config.slotsPerSubjectPerWeek,
        slotDuration: parseInt(config.slotType),
        isPublished: config.isPublished,
        slots: validSlots,
        holidays: validHolidays
      };

      await axios.post(`/api/v1/semesters/${semesterCode}/config`, payload);
      toast.success('Lưu cấu hình thành công!');
      setOriginalConfig(config);
      setIsReadOnly(true);
    } catch (error: any) {
      console.error('Error saving configuration:', error);
      const errorMsg = error.response?.data?.message || error.response?.data || error.message || 'Lỗi không xác định';
      toast.error(`Không thể lưu cấu hình: ${typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)}`);
    }
  };

  return (
    <AcademicStaffLayout pageTitle="Cấu hình kỳ học">
      <div className="max-w-7xl mx-auto space-y-3 pb-20 pt-2">
        
        {/* Top Header & Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <button onClick={() => navigate('/academic-staff/semesters')} className="hover:text-orange-600 transition-colors flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Quản lý học kỳ
            </button>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <span className="text-gray-900 font-bold">{semesterCode || 'SPRING 2026'}</span>
            
            {isReadOnly ? (
              <span className="ml-2 px-2.5 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold border border-blue-100 flex items-center gap-1.5 uppercase tracking-wide">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Chế độ xem
              </span>
            ) : (
              <span className="ml-2 px-2.5 py-0.5 bg-orange-50 text-orange-600 rounded-full text-[10px] font-bold border border-orange-100 flex items-center gap-1.5 uppercase tracking-wide">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                Đang chỉnh sửa
              </span>
            )}
          </div>
          
          <div className="flex gap-2">
            {isReadOnly ? (
              <button 
                onClick={() => setIsReadOnly(false)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-bold text-white shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex items-center gap-2"
              >
                <Settings className="w-3.5 h-3.5" /> CHỈNH SỬA
              </button>
            ) : (
              <>
                <button 
                  onClick={handleCancelChanges}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 bg-white hover:bg-gray-50 transition-all"
                >
                  HỦY THAY ĐỔI
                </button>
                <button 
                  onClick={handleSubmit} 
                  className="px-6 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-xs font-bold text-white shadow-lg shadow-orange-600/20 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Check className="w-3.5 h-3.5" /> LƯU CẤU HÌNH
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          
            {/* Row 1: Basic Information */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-4">
              <div className="flex items-center mb-3">
                <h2 className="text-xl font-bold text-gray-800">Thông tin chung</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Tên học kỳ */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Tên học kỳ</label>
                  {isReadOnly ? (
                    <div className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm font-bold text-gray-900">{config.semesterName || '--'}</div>
                  ) : (
                    <input type="text" placeholder="VD: SPRING 2026" value={config.semesterName} onChange={(e) => handleInputChange('semesterName', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none hover:border-orange-400 focus:border-orange-500" />
                  )}
                </div>

                {/* Thời gian kỳ học */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Thời gian kỳ học</label>
                  {isReadOnly ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm font-bold text-gray-900">{config.startDate || '--'}</div>
                      <div className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm font-bold text-gray-900">{config.endDate || '--'}</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <input type="date" value={config.startDate} onChange={(e) => handleInputChange('startDate', e.target.value)} className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm font-bold outline-none hover:border-orange-400 focus:border-orange-500" />
                      <input type="date" value={config.endDate} onChange={(e) => handleInputChange('endDate', e.target.value)} className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm font-bold outline-none hover:border-orange-400 focus:border-orange-500" />
                    </div>
                  )}
                </div>

                {/* Ngày học trong tuần */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 block">Ngày học trong tuần</label>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS_OF_WEEK.map(day => (
                      <button 
                        key={day.id} 
                        onClick={() => toggleDay(day.id)}
                        disabled={isReadOnly}
                        className={`w-10 h-10 rounded-xl text-[11px] font-bold transition-all border-2 ${
                          config.selectedDays.includes(day.id) 
                            ? 'bg-orange-600 border-orange-600 text-white shadow-md' 
                            : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300'
                        } ${isReadOnly ? 'cursor-not-allowed opacity-80 border-transparent' : ''}`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trạng thái công bố */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-sm font-semibold text-gray-700 block text-center lg:text-left">Công bố học kỳ</label>
                  <div className="flex items-center justify-center lg:justify-start gap-4 h-[44px]">
                    <button
                      onClick={() => handleInputChange('isPublished', !config.isPublished)}
                      disabled={isReadOnly}
                      className={`relative inline-flex h-6 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500/50 ${
                        config.isPublished ? 'bg-emerald-500' : 'bg-gray-200'
                      } ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`${config.isPublished ? 'translate-x-7' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm`}
                      />
                    </button>
                    <div className="flex flex-col">
                      <span className={`text-[11px] font-bold tracking-wider leading-none transition-colors duration-300 ${config.isPublished ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {config.isPublished ? 'ĐÃ CÔNG BỐ' : 'CHƯA CÔNG BỐ'}
                      </span>
                      <p className="text-[9px] text-gray-400 font-medium italic mt-0.5">Sinh viên & Giảng viên có thể xem lịch</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          {/* Row 2: Logical Grouping: Content & Slots */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            
            {/* Left Sidebar: Training Params */}
            <div className="lg:col-span-4 space-y-3">
              
              {/* Training Parameters (Now at top of sidebar) */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-4 h-full">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-800">Cài đặt đào tạo</h2>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" /> Loại tiết học (Duration)
                      </label>
                      <div className="flex bg-gray-200/50 p-1 rounded-2xl border border-gray-100">
                        <button onClick={() => handleInputChange('slotType', '90')} 
                          disabled={isReadOnly}
                          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all duration-300 ${config.slotType === '90' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'} ${isReadOnly ? 'cursor-not-allowed' : ''}`}>
                          90 PHÚT
                        </button>
                        <button onClick={() => handleInputChange('slotType', '135')} 
                          disabled={isReadOnly}
                          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all duration-300 ${config.slotType === '135' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'} ${isReadOnly ? 'cursor-not-allowed' : ''}`}>
                          135 PHÚT
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700">Max Slots / Ngày</label>
                        {isReadOnly ? (
                          <div className="flex items-center bg-gray-50 rounded-lg px-3 py-2">
                            <Settings className="w-4 h-4 text-gray-500" />
                            <span className="px-2 text-sm font-bold text-gray-900">{config.maxSlotsPerDay}</span>
                          </div>
                        ) : (
                          <div className="flex items-center bg-gray-100 border-2 border-gray-200 rounded-lg overflow-hidden px-3 transition-all hover:border-orange-400 focus-within:bg-white focus-within:border-orange-500">
                            <Settings className="w-4 h-4 text-gray-500" />
                            <input 
                              type="number" 
                              value={config.maxSlotsPerDay} 
                              onChange={(e) => handleInputChange('maxSlotsPerDay', parseInt(e.target.value))}
                              className="w-full bg-transparent py-2 px-2 text-sm font-bold text-gray-900 outline-none border-none focus:ring-0" 
                            />
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700">Slots / Môn / Tuần</label>
                        {isReadOnly ? (
                          <div className="flex items-center bg-gray-50 rounded-lg px-3 py-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="px-2 text-sm font-bold text-gray-900">{config.slotsPerSubjectPerWeek}</span>
                          </div>
                        ) : (
                          <div className="flex items-center bg-gray-100 border-2 border-gray-200 rounded-lg overflow-hidden px-3 transition-all hover:border-orange-400 focus-within:bg-white focus-within:border-orange-500">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <input 
                              type="number" 
                              value={config.slotsPerSubjectPerWeek} 
                              onChange={(e) => handleInputChange('slotsPerSubjectPerWeek', parseInt(e.target.value))}
                              className="w-full bg-transparent py-2 px-2 text-sm font-bold text-gray-900 outline-none border-none focus:ring-0" 
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 mt-auto">
                  <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-3 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-orange-800 leading-relaxed font-medium">
                      Khi thay đổi <strong>Loại tiết học</strong>, toàn bộ <strong>Giờ kết thúc</strong> bên phải sẽ được tự động đồng bộ lại ngay lập tức.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: The Grid/List */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-full">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-800">Cấu hình khung giờ (Slots)</h2>
                  </div>
                </div>

                <div className="flex-1 overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">STT</th>
                        <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Giờ bắt đầu</th>
                        <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">Giờ kết thúc (Auto)</th>
                        <th className="px-5 py-2.5 w-16 border-b border-gray-100"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {config.slots.map((slot, index) => (
                        <tr key={index} className="group hover:bg-orange-50/30 transition-all duration-200">
                          <td className="px-5 py-2.5">
                            <span className="text-xs font-bold text-gray-500 group-hover:text-orange-600">SLOT {index + 1}</span>
                          </td>
                          <td className="px-5 py-2.5">
                            {isReadOnly ? (
                              <span className="text-sm font-bold text-gray-900">{slot.startTime || '--:--'}</span>
                            ) : (
                              <input 
                                type="time" 
                                value={slot.startTime} 
                                onChange={(e) => handleSlotTimeChange(index, e.target.value)}
                                className="bg-gray-100 border border-gray-300 rounded-xl px-2.5 py-1 text-sm font-bold text-gray-900 outline-none shadow-sm transition-all hover:border-orange-400 focus:border-orange-500 focus:bg-white"
                              />
                            )}
                          </td>
                          <td className="px-5 py-2.5">
                            <div className="flex items-center gap-2">
                              {isReadOnly ? (
                                <span className="text-sm font-bold text-gray-900">{slot.endTime || '--:--'}</span>
                              ) : (
                                <input 
                                  type="time" 
                                  value={slot.endTime || ''} 
                                  disabled
                                  className="bg-gray-100 border border-gray-300 rounded-xl px-2.5 py-1 text-sm font-bold text-gray-900 outline-none shadow-sm cursor-not-allowed opacity-80"
                                />
                              )}
                              {!isReadOnly && <Check className="w-3 h-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />}
                            </div>
                          </td>
                          <td className="px-5 py-2.5 text-right">
                            {!isReadOnly && (
                              <button onClick={() => removeSlot(index)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100" title="Xóa slot">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!isReadOnly && (
                  <div className="p-5 bg-gray-50/30 border-t border-gray-100">
                    <button onClick={addSlot} className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center gap-3 text-gray-400 hover:text-orange-600 hover:border-orange-300 hover:bg-white transition-all font-bold text-xs uppercase tracking-widest">
                      <Plus className="w-4 h-4" /> Thêm tiết học mới
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Row 3: Full-width Holiday Selection */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-800">Kế hoạch nghỉ lễ của học kỳ</h2>
            </div>
            {!isReadOnly && (
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleResetToDefault}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-500 rounded-xl text-[10px] font-bold border border-gray-200 hover:bg-gray-200 transition-all uppercase"
                >
                  Đặt lại mặc định
                </button>
                <button 
                  onClick={loadStandardHolidays}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold border border-red-100 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                >
                  <Calendar className="w-3.5 h-3.5" /> NẠP NGÀY LỄ VIỆT NAM
                </button>
                <button 
                  onClick={addHoliday}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-[10px] font-bold transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> THÊM NGÀY NGHỈ
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto max-h-[400px] custom-scrollbar">
            {config.holidays.length === 0 ? (
              <div className="p-10 text-center">
                <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 text-gray-400">
                  <Calendar className="w-6 h-6" />
                </div>
                <p className="text-sm text-gray-400 italic font-medium">Chưa có ngày nghỉ nào được thiết lập cho học kỳ này</p>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm">
                  <tr>
                    <th className="px-5 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 w-16">STT</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 w-48">Ngày nghỉ</th>
                    <th className="px-5 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">Lý do nghỉ lễ</th>
                    <th className="px-5 py-2.5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 w-24">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {config.holidays.map((holiday, index) => (
                    <tr key={index} className="group hover:bg-orange-50/30 transition-all duration-200">
                      <td className="px-5 py-2">
                        <span className="text-xs font-bold text-gray-400 group-hover:text-orange-600 transition-colors">#{index + 1}</span>
                      </td>
                      <td className="px-5 py-2">
                        {isReadOnly ? (
                          <span className="text-xs font-bold text-gray-900">{holiday.holidayDate || '--'}</span>
                        ) : (
                          <input 
                            type="date" 
                            value={holiday.holidayDate} 
                            onChange={(e) => handleHolidayChange(index, 'holidayDate', e.target.value)}
                            className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-900 outline-none transition-all shadow-sm w-full hover:border-orange-400 focus:border-orange-500" 
                          />
                        )}
                      </td>
                      <td className="px-5 py-2">
                        {isReadOnly ? (
                          <span className="text-xs font-semibold text-gray-900">{holiday.description || '--'}</span>
                        ) : (
                          <input 
                            type="text" 
                            placeholder="Nhập lý do nghỉ lễ..." 
                            value={holiday.description} 
                            onChange={(e) => handleHolidayChange(index, 'description', e.target.value)}
                            className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-900 outline-none transition-all shadow-sm w-full hover:border-orange-400 focus:border-orange-500" 
                          />
                        )}
                      </td>
                      <td className="px-5 py-2 text-right">
                        {!isReadOnly && (
                          <button 
                            onClick={() => removeHoliday(index)} 
                            className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Action Buttons Section */}
        <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-gray-400 text-xs italic font-medium">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            Dữ liệu sẽ được lưu trữ an toàn trên hệ thống
          </div>
          <div className="flex items-center gap-4">
            {isReadOnly ? (
              <button 
                onClick={() => setIsReadOnly(false)} 
                className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xl shadow-blue-600/20 transition-all active:scale-95 uppercase flex items-center gap-2"
              >
                <Settings className="w-4 h-4" /> Bắt đầu chỉnh sửa
              </button>
            ) : (
              <>
                <button 
                  onClick={handleCancelChanges} 
                  className="px-8 py-3 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all uppercase"
                >
                  Hủy thay đổi
                </button>
                <button 
                  onClick={handleSubmit} 
                  className="px-10 py-3 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xl shadow-orange-600/20 transition-all active:scale-95 uppercase flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> Lưu cấu hình
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </AcademicStaffLayout>
  );
};

export default SlotTypePage;
