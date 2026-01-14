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
  slotType: '90' | '45';
  slots: SlotTime[];
  holidays: Holiday[];
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
    holidays: []
  });

  const addMinutes = (time: string, minutes: number): string => {
    if (!time) return '';
    const [hours, mins] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins + minutes);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  useEffect(() => {
    const duration = parseInt(config.slotType);
    const updatedSlots = config.slots.map(slot => ({
      ...slot,
      endTime: slot.startTime ? addMinutes(slot.startTime, duration) : ''
    }));
    const hasChanged = updatedSlots.some((slot, i) => slot.endTime !== config.slots[i].endTime);
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
          setConfig(prev => ({
            ...prev,
            semesterName: data.name,
            startDate: data.startDate,
            endDate: data.endDate
          }));
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
    const duration = parseInt(config.slotType);
    const updatedSlots = [...config.slots];
    updatedSlots[index] = {
      startTime: value,
      endTime: value ? addMinutes(value, duration) : ''
    };
    setConfig(prev => ({ ...prev, slots: updatedSlots }));
  };

  const addSlot = () => {
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

  const handleSubmit = () => {
    const err = validateSchedule();
    if (err) { toast.error(err); return; }
    if (!config.semesterName || config.selectedDays.length === 0) { toast.error('Thiếu thông tin bắt buộc'); return; }
    toast.success('Lưu cấu hình thành công!');
  };

  return (
    <AcademicStaffLayout pageTitle="Cấu hình kỳ học">
      <div className="max-w-7xl mx-auto space-y-6 pb-32 pt-2">
        
        {/* Top Header & Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <button onClick={() => navigate('/academic-staff/semesters')} className="hover:text-orange-600 transition-colors flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Quản lý học kỳ
            </button>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <span className="text-gray-900 font-bold">{semesterCode || 'SPRING 2026'}</span>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 bg-white hover:bg-gray-50 transition-all">
              HỦY THAY ĐỔI
            </button>
            <button onClick={handleSubmit} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-xs font-bold text-white shadow-lg shadow-orange-600/20 transition-all active:scale-95">
              XÁC NHẬN CẤU HÌNH
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          
            {/* Row 1: Basic Information */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6">
              <div className="flex items-center gap-2 mb-6">
                 <div className="w-1.5 h-5 bg-orange-500 rounded-full" />
                 <h2 className="text-base font-bold text-gray-900 uppercase tracking-tight">Thông tin chung</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Tên học kỳ */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 uppercase">Tên học kỳ</label>
                  <input type="text" placeholder="VD: SPRING 2026" value={config.semesterName} readOnly
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-500 cursor-not-allowed outline-none" />
                </div>

                {/* Thời gian kỳ học */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 uppercase">Thời gian kỳ học</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={config.startDate} readOnly
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-500 cursor-not-allowed outline-none" />
                    <input type="date" value={config.endDate} readOnly
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-500 cursor-not-allowed outline-none" />
                  </div>
                </div>

                {/* Ngày học trong tuần */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 uppercase block">Ngày học trong tuần</label>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS_OF_WEEK.map(day => (
                      <button key={day.id} onClick={() => toggleDay(day.id)}
                        className={`w-10 h-10 rounded-xl text-[11px] font-bold transition-all border-2 ${config.selectedDays.includes(day.id) ? 'bg-orange-600 border-orange-600 text-white shadow-md' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300'}`}>
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          {/* Row 2: Logical Grouping: Content & Slots */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Sidebar: Training Params */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Training Parameters (Now at top of sidebar) */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-8 h-full">
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-5 bg-blue-600 rounded-full" />
                    <h2 className="text-base font-bold text-gray-900 uppercase tracking-tight">Cài đặt đào tạo</h2>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" /> Loại tiết học (Duration)
                      </label>
                      <div className="flex bg-gray-200/50 p-1 rounded-2xl border border-gray-100">
                        <button onClick={() => handleInputChange('slotType', '90')} 
                          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all duration-300 ${config.slotType === '90' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
                          90 PHÚT
                        </button>
                        <button onClick={() => handleInputChange('slotType', '45')} 
                          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all duration-300 ${config.slotType === '45' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
                          45 PHÚT
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-700 uppercase">Max Slots / Ngày</label>
                        <div className="flex items-center bg-gray-100 border-2 border-gray-200 rounded-xl overflow-hidden px-4 hover:border-orange-400 focus-within:bg-white focus-within:border-orange-500 transition-all">
                          <Settings className="w-4 h-4 text-gray-500" />
                          <input type="number" value={config.maxSlotsPerDay} onChange={(e) => handleInputChange('maxSlotsPerDay', parseInt(e.target.value))}
                            className="w-full bg-transparent py-3 px-3 text-sm font-bold text-gray-900 outline-none border-none focus:ring-0" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-700 uppercase">Slots / Môn / Tuần</label>
                        <div className="flex items-center bg-gray-100 border-2 border-gray-200 rounded-xl overflow-hidden px-4 hover:border-orange-400 focus-within:bg-white focus-within:border-orange-500 transition-all">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <input type="number" value={config.slotsPerSubjectPerWeek} onChange={(e) => handleInputChange('slotsPerSubjectPerWeek', parseInt(e.target.value))}
                            className="w-full bg-transparent py-3 px-3 text-sm font-bold text-gray-900 outline-none border-none focus:ring-0" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 mt-auto">
                  <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
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
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-5 bg-orange-500 rounded-full" />
                    <h2 className="text-base font-bold text-gray-900 uppercase tracking-tight">Cấu hình khung giờ (Slots)</h2>
                  </div>
                </div>

                <div className="flex-1 overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">STT</th>
                        <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">Giờ bắt đầu</th>
                        <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">Giờ kết thúc (Auto)</th>
                        <th className="px-8 py-4 w-16 border-b border-gray-100"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {config.slots.map((slot, index) => (
                        <tr key={index} className="group hover:bg-orange-50/30 transition-all duration-200">
                          <td className="px-8 py-5">
                            <span className="text-xs font-bold text-gray-500 group-hover:text-orange-600">SLOT {index + 1}</span>
                          </td>
                          <td className="px-8 py-5">
                            <input type="time" value={slot.startTime} onChange={(e) => handleSlotTimeChange(index, e.target.value)}
                              className="bg-gray-100 border border-gray-300 hover:border-orange-400 rounded-xl px-4 py-2 text-sm font-bold text-gray-900 focus:border-orange-500 focus:bg-white outline-none shadow-sm transition-all" />
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-900 bg-gray-100 group-hover:bg-white group-hover:shadow-sm px-4 py-2 rounded-xl transition-all">
                                {slot.endTime || '--:--'}
                              </span>
                              <Check className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <button onClick={() => removeSlot(index)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100" title="Xóa slot">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-8 bg-gray-50/30 border-t border-gray-100">
                  <button onClick={addSlot} className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center gap-3 text-gray-400 hover:text-orange-600 hover:border-orange-300 hover:bg-white transition-all font-bold text-xs uppercase tracking-widest">
                    <Plus className="w-4 h-4" /> Thêm tiết học mới
                  </button>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Row 3: Full-width Holiday Selection */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-red-500 rounded-full" />
              <h2 className="text-base font-bold text-gray-900 uppercase tracking-tight">Kế hoạch nghỉ lễ của học kỳ</h2>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={loadStandardHolidays}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100 hover:bg-red-600 hover:text-white transition-all shadow-sm"
              >
                <Calendar className="w-4 h-4" /> NẠP NGÀY LỄ VIỆT NAM
              </button>
              <button 
                onClick={addHoliday}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-all"
              >
                <Plus className="w-4 h-4" /> THÊM NGÀY NGHỈ
              </button>
            </div>
          </div>

          <div className="p-8">
            {config.holidays.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                <p className="text-sm text-gray-400 italic font-medium">Chưa có ngày nghỉ nào được thiết lập cho học kỳ này</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {config.holidays.map((holiday, index) => (
                  <div key={index} className="flex gap-3 p-4 bg-gray-50 border border-gray-100 rounded-2xl group hover:bg-white hover:border-orange-200 hover:shadow-md transition-all duration-300 animate-in fade-in zoom-in-95">
                    <div className="space-y-3 flex-1">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Ngày nghỉ</label>
                        <input 
                          type="date" 
                          value={holiday.holidayDate} 
                          onChange={(e) => handleHolidayChange(index, 'holidayDate', e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:border-orange-500 outline-none transition-all" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Lý do / Mô tả</label>
                        <input 
                          type="text" 
                          placeholder="VD: Nghỉ Tết Nguyên Đán" 
                          value={holiday.description} 
                          onChange={(e) => handleHolidayChange(index, 'description', e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:border-orange-500 outline-none transition-all" 
                        />
                      </div>
                    </div>
                    <button 
                      onClick={() => removeHoliday(index)} 
                      className="p-2 text-gray-300 hover:text-red-500 h-fit transition-all flex items-center justify-center rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons Section */}
        <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 text-gray-400 text-xs italic font-medium">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            Dữ liệu sẽ được lưu trữ an toàn trên hệ thống
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/academic-staff/semesters')} 
              className="px-8 py-3 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-all uppercase"
            >
              Hủy bỏ
            </button>
            <button 
              onClick={handleSubmit} 
              className="px-10 py-3 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xl shadow-orange-600/20 transition-all active:scale-95 uppercase"
            >
              Lưu cấu hình
            </button>
          </div>
        </div>

      </div>
    </AcademicStaffLayout>
  );
};

export default SlotTypePage;
