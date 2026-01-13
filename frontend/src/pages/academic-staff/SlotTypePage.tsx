import React, { useState } from 'react';
import { Settings, List, Calendar, Plus, ArrowLeft } from 'lucide-react';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { useNavigate, useParams } from 'react-router-dom';

interface SlotTime {
  startTime: string;
  endTime: string;
}

interface SlotConfig {
  slotType: '90' | '45';
  slots: SlotTime[];
}

export const SlotTypePage: React.FC = () => {
  const navigate = useNavigate();
  const { semesterCode } = useParams<{ semesterCode: string }>();
  
  // Form state
  const [semesterName, setSemesterName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [studyDays, setStudyDays] = useState('');
  const [maxSlotsPerDay, setMaxSlotsPerDay] = useState('');
  const [slotsPerSubjectPerWeek, setSlotsPerSubjectPerWeek] = useState('');
  
  // Slot configuration
  const [slotConfig, setSlotConfig] = useState<SlotConfig>({
    slotType: '90',
    slots: [
      { startTime: '', endTime: '' },
      { startTime: '', endTime: '' },
      { startTime: '', endTime: '' },
      { startTime: '', endTime: '' },
    ]
  });

  const handleSlotTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSlotConfig(prev => ({
      ...prev,
      slotType: e.target.value as '90' | '45'
    }));
  };

  const handleSlotTimeChange = (index: number, field: 'startTime' | 'endTime', value: string) => {
    setSlotConfig(prev => ({
      ...prev,
      slots: prev.slots.map((slot, i) => 
        i === index ? { ...slot, [field]: value } : slot
      )
    }));
  };

  const handleSubmit = async () => {
    // TODO: Call API to save semester configuration
    console.log({
      semesterName,
      startDate,
      endDate,
      studyDays,
      maxSlotsPerDay,
      slotsPerSubjectPerWeek,
      slotConfig
    });
    alert('Cấu hình đã được lưu!');
  };

  return (
    <AcademicStaffLayout pageTitle="Cấu hình kỳ học">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/academic-staff/semesters')}
                className="text-gray-500 hover:text-orange-500 transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Học kỳ: <span className="text-gray-400">{semesterCode || '[Tên học kỳ]'}</span>
                </h1>
                <p className="text-sm text-gray-500 mt-1">Cấu hình chi tiết cho học kỳ</p>
              </div>
            </div>
            <button className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-md font-medium text-sm flex items-center gap-2 transition shadow-sm">
              <Plus className="w-4 h-4" /> Phân công học kỳ
            </button>
          </div>
        </div>

        {/* Cấu hình kỳ học Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-5 h-5 text-orange-500" />
            <h2 className="text-orange-500 text-lg font-bold uppercase">Cấu hình kỳ học</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Tên kỳ học */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">
                <span className="text-red-500">*</span> Tên kỳ học:
              </label>
              <input 
                type="text" 
                placeholder="VD: SPRING 2026" 
                value={semesterName}
                onChange={(e) => setSemesterName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
              />
            </div>
            
            {/* Thời gian kỳ học */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">
                <span className="text-red-500">*</span> Thời gian của kỳ:
              </label>
              <div className="flex gap-4">
                <div className="relative w-full">
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                  />
                </div>
                <div className="relative w-full">
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cấu hình chi tiết Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <List className="w-5 h-5 text-orange-500" />
            <h2 className="text-orange-500 text-lg font-bold uppercase mr-2">Cấu hình chi tiết</h2>
            <span className="text-sm text-gray-400 italic">
              Xem các ràng buộc theo chương trình học tại ĐH FPT{' '}
              <a href="#" className="text-orange-500 underline hover:text-orange-700">tại đây</a>
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Ngày học trong tuần */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">
                  <span className="text-red-500">*</span> Ngày học trong tuần:
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Chọn khoảng ngày (VD: Thứ 2 - Thứ 7)" 
                    value={studyDays}
                    onChange={(e) => setStudyDays(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pr-10 outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                  <Calendar className="absolute right-3 top-3 w-4 h-4 text-orange-500 pointer-events-none" />
                </div>
              </div>

              {/* Slot/ngày (max) */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">
                  <span className="text-red-500">*</span> Slot/ngày (max):
                </label>
                <input 
                  type="number" 
                  placeholder="VD: 2" 
                  value={maxSlotsPerDay}
                  onChange={(e) => setMaxSlotsPerDay(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* Số slot (1 môn)/tuần */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">
                  <span className="text-red-500">*</span> Số slot (1 môn)/tuần:
                </label>
                <input 
                  type="number" 
                  placeholder="VD: 2" 
                  value={slotsPerSubjectPerWeek}
                  onChange={(e) => setSlotsPerSubjectPerWeek(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* Cài đặt nghỉ lễ */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">
                  <span className="text-red-500">*</span> Cài đặt nghỉ lễ:
                </label>
                <button className="w-full md:w-auto flex items-center justify-center bg-orange-50 text-orange-500 px-4 py-2.5 rounded-lg border border-orange-200 font-semibold hover:bg-orange-100 transition">
                  <Calendar className="w-4 h-4 mr-2" /> Chọn ngày nghỉ +
                </button>
              </div>
            </div>

            {/* Right Column - Slot Configuration */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-4">
                <span className="text-red-500">*</span> Cài đặt Slot:
              </label>

              <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                {/* Loại slot */}
                <div className="flex items-center mb-6">
                  <span className="text-sm font-semibold w-24">Loại slot:</span>
                  <div className="relative flex-1">
                    <select 
                      value={slotConfig.slotType}
                      onChange={handleSlotTypeChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500 bg-white appearance-none cursor-pointer"
                    >
                      <option value="90">90 phút</option>
                      <option value="45">45 phút</option>
                    </select>
                  </div>
                </div>

                {/* Slot times */}
                <div className="space-y-4">
                  {slotConfig.slots.map((slot, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-600 w-12">Slot {index + 1}</span>
                      <div className="relative flex-1">
                        <input 
                          type="time" 
                          value={slot.startTime}
                          onChange={(e) => handleSlotTimeChange(index, 'startTime', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500"
                        />
                      </div>
                      <div className="relative flex-1">
                        <input 
                          type="time" 
                          value={slot.endTime}
                          onChange={(e) => handleSlotTimeChange(index, 'endTime', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-10 flex flex-col items-start">
            <p className="text-sm text-gray-500 mb-4 italic">
              Sau khi hoàn thành các thao tác cài đặt, click vào <span className="text-orange-500 font-bold">Xác nhận</span>
            </p>
            <button 
              onClick={handleSubmit}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg shadow-md hover:shadow-lg transition font-bold text-base uppercase flex items-center gap-2"
            >
              <Plus className="w-5 h-5" /> Xác nhận
            </button>
          </div>
        </div>
      </div>
    </AcademicStaffLayout>
  );
};

export default SlotTypePage;
