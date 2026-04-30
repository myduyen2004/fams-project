import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  UserCheck, 
  ShieldCheck, 
  AlertCircle,
  ChevronRight,
  ArrowLeft,
  Check,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from "@utils/toast";
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import apiClient from '../../services/api/authService';

interface AttendanceConfig {
  id?: number;
  manualEnabled: boolean;
  absentThresholdMinutes: number;
  minAttendancePercentage: number;
  faceRecognitionEnabled: boolean;
  maxAttempts: number;
  wifiLocationEnabled: boolean;
}

const DEFAULT_CONFIG: AttendanceConfig = {
  manualEnabled: true,
  absentThresholdMinutes: 30,
  minAttendancePercentage: 80,
  faceRecognitionEnabled: true,
  maxAttempts: 5,
  wifiLocationEnabled: true
};

const ConfigGroup: React.FC<{ 
  title: string; 
  icon: React.ReactNode; 
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
  <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col h-full font-sans">
    <div className="px-5 py-3 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-gray-50/30 dark:bg-zinc-800/30">
      <div className="flex items-center gap-3">
        <div className="text-gray-400">
          {icon}
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h2>
      </div>
    </div>
    <div className="p-6 space-y-6">
      {children}
    </div>
  </div>
);

const ToggleItem = React.memo<{
  label: string;
  description: string;
  value: boolean;
  onChange: (val: boolean) => void;
  isReadOnly: boolean;
}>(({ label, description, value, onChange, isReadOnly }) => (
  <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 dark:bg-zinc-800/20 border border-gray-100 dark:border-zinc-800/50 min-h-[85px] font-sans">
    <div className="flex-1 pr-4">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">{label}</h4>
      <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">{description}</p>
    </div>
    <div className="flex flex-col items-center justify-center gap-1.5 w-44 shrink-0 border-l border-gray-100 dark:border-zinc-800/50 pl-4">
      <button
        type="button"
        disabled={isReadOnly}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-500 ease-in-out focus:outline-none active:scale-95 ${
          value ? 'bg-fpt-orange shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]' : 'bg-gray-300 dark:bg-zinc-700'
        } ${isReadOnly ? 'opacity-60 cursor-not-allowed scale-100' : 'hover:brightness-110'}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ${
            value ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
      <span className={`text-[10px] font-bold tracking-tighter uppercase ${value ? 'text-fpt-orange' : 'text-gray-400'}`}>
        {value ? 'ĐANG BẬT' : 'ĐANG TẮT'}
      </span>
    </div>
  </div>
));

const InputItem = React.memo<{
  label: string;
  description: string;
  type?: string;
  value: any;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (val: any) => void;
  isReadOnly: boolean;
}>(({ label, description, type = "number", value, min, max, step = 1, unit, onChange, isReadOnly }) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleIncrement = () => {
    const newVal = (parseFloat(localValue) || 0) + step;
    if (max !== undefined && newVal > max) return;
    onChange(newVal);
  };

  const handleDecrement = () => {
    const newVal = (parseFloat(localValue) || 0) - step;
    if (min !== undefined && newVal < min) return;
    onChange(newVal);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    
    if (type === 'number') {
      const isNegativeAllowed = min === undefined || min < 0;
      const regex = isNegativeAllowed ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;
      
      if (val === '' || regex.test(val)) {
        const floatVal = parseFloat(val);
        if (!isNaN(floatVal)) {
          if (min !== undefined && floatVal < min) return;
          if (max !== undefined && floatVal > max) return;
        }
        onChange(val);
      }
    } else {
      onChange(val);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 dark:bg-zinc-800/20 border border-gray-100 dark:border-zinc-800/50 min-h-[85px] font-sans">
      <div className="flex-1 pr-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">{label}</h4>
        <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">{description}</p>
      </div>
      <div className="w-44 shrink-0 border-l border-gray-100 dark:border-zinc-800/50 pl-4">
        {isReadOnly ? (
          <div className="bg-white dark:bg-zinc-800/50 rounded-lg px-2 py-2 text-xs font-bold text-gray-900 dark:text-white border border-gray-100 dark:border-zinc-700 text-center shadow-sm">
            {value}
            {unit && <span className="text-[10px] text-gray-400 ml-1.5 uppercase tracking-tighter">{unit}</span>}
          </div>
        ) : (
          <div className="flex items-center bg-white dark:bg-zinc-800 border-2 border-gray-200 dark:border-zinc-700 rounded-lg overflow-hidden transition-all hover:border-orange-400 focus-within:border-orange-500 shadow-sm">
            <div className="flex flex-col border-r border-gray-100 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800">
              <button 
                type="button"
                onClick={handleIncrement}
                className="px-2 py-1 flex items-center justify-center hover:bg-orange-100 dark:hover:bg-orange-900/30 text-gray-400 hover:text-orange-600 border-b border-gray-100 dark:border-zinc-700 transition-colors"
              >
                <ChevronUp size={12} />
              </button>
              <button 
                type="button"
                onClick={handleDecrement}
                className="px-2 py-1 flex items-center justify-center hover:bg-orange-100 dark:hover:bg-orange-900/30 text-gray-400 hover:text-orange-600 transition-colors"
              >
                <ChevronDown size={12} />
              </button>
            </div>

            <input
              type={type === 'number' ? 'text' : type}
              value={localValue}
              onChange={handleInputChange}
              className="w-full bg-transparent py-2 px-2 text-xs font-bold text-gray-900 dark:text-white outline-none border-none focus:ring-0 text-center"
            />

            {unit && (
              <div className="bg-gray-50 dark:bg-zinc-800/50 border-l border-gray-100 dark:border-zinc-700 px-2 py-2.5 shrink-0 flex items-center min-w-[40px] justify-center text-center">
                <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-tighter">
                  {unit}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});


export const AttendanceConfigPage: React.FC = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<AttendanceConfig>(DEFAULT_CONFIG);
  const [originalConfig, setOriginalConfig] = useState<AttendanceConfig | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await apiClient.get('/v1/attendance-config');
        if (response.data) {
          const mergedConfig = { ...DEFAULT_CONFIG, ...response.data };
          setConfig(mergedConfig);
          setOriginalConfig(mergedConfig);
        }
      } catch (error) {
        console.error('Failed to fetch config:', error);
        toast.error('Không thể tải cấu hình điểm danh');
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleCancelChanges = () => {
    if (originalConfig) {
      setConfig(originalConfig);
      setIsReadOnly(true);
      toast.success('Đã hủy các thay đổi');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put('/v1/attendance-config', config);
      toast.success('Cập nhật cấu hình thành công');
      setOriginalConfig(config);
      setIsReadOnly(true);
    } catch (error) {
      console.error('Failed to save config:', error);
      toast.error('Có lỗi xảy ra khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AcademicStaffLayout pageTitle="Cấu hình hệ thống">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 border-4 border-orange-500/20 border-t-fpt-orange rounded-full animate-spin mb-4"></div>
          <p className="text-sm text-gray-500 animate-pulse">Đang tải cấu hình...</p>
        </div>
      </AcademicStaffLayout>
    );
  }

  return (
    <AcademicStaffLayout pageTitle="Cấu hình điểm danh">
      <div className="max-w-7xl mx-auto space-y-3 pb-20 pt-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <button onClick={() => navigate('/academic-staff/dashboard')} className="hover:text-orange-600 transition-colors flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Bảng điều khiển
            </button>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <span className="text-gray-900 dark:text-white font-bold uppercase tracking-tight">Cài đặt điểm danh</span>
            
            {isReadOnly ? (
              <span className="ml-2 px-2.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-bold border border-blue-100 dark:border-blue-800/30 flex items-center gap-1.5 uppercase tracking-wide">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Chế độ xem
              </span>
            ) : (
              <span className="ml-2 px-2.5 py-0.5 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full text-[10px] font-bold border border-orange-100 dark:border-orange-800/30 flex items-center gap-1.5 uppercase tracking-wide">
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
                  className="px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-gray-600 dark:text-zinc-400 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-all"
                >
                  HỦY THAY ĐỔI
                </button>
                <button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="px-6 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-xs font-bold text-white shadow-lg shadow-orange-600/20 transition-all active:scale-95 flex items-center gap-2"
                >
                  {saving ? <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  LƯU CẤU HÌNH
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ConfigGroup
            key="general-config"
            title="Cấu hình điểm danh chung"
            icon={<UserCheck size={20} />}
          >
            <div className="space-y-6">
              <ToggleItem
                key="manual-enabled"
                label="Cho phép điểm danh thủ công"
                description="Giảng viên có thể ghi nhận diện diện trực tiếp khi sinh viên gặp sự cố hệ thống."
                value={config.manualEnabled}
                onChange={(val) => setConfig({ ...config, manualEnabled: val })}
                isReadOnly={isReadOnly}
              />
              
              <InputItem
                key="absent-threshold"
                label="Thời gian điểm danh tối đa"
                description="Tổng thời gian kể từ khi bắt đầu slot để sinh viên có thể tự thực hiện điểm danh."
                value={config.absentThresholdMinutes}
                unit="PHÚT"
                min={0}
                onChange={(val) => setConfig({ ...config, absentThresholdMinutes: val })}
                isReadOnly={isReadOnly}
              />

              <InputItem
                key="min-attendance"
                label="Tỉ lệ hiện diện tối thiểu"
                description="Yêu cầu tối thiểu để sinh viên đủ điều kiện tham gia kỳ thi."
                value={config.minAttendancePercentage}
                unit="%"
                min={0}
                max={100}
                onChange={(val) => setConfig({ ...config, minAttendancePercentage: val })}
                isReadOnly={isReadOnly}
              />
            </div>
          </ConfigGroup>

          <ConfigGroup
            key="biometric-config"
            title="Xác thực sinh trắc học & Vị trí"
            icon={<ShieldCheck size={20} />}
          >
            <div className="space-y-6">
              <ToggleItem
                key="face-recognition"
                label="Kích hoạt nhận diện gương mặt"
                description="Cho phép sử dụng Camera để Check-in trên thiết bị di động."
                value={config.faceRecognitionEnabled}
                onChange={(val) => setConfig({ ...config, faceRecognitionEnabled: val })}
                isReadOnly={isReadOnly}
              />
              
              <ToggleItem
                key="wifi-location"
                label="Bật xác thực vị trí (WiFi)"
                description="Quét tín hiệu WiFi để xác minh sinh viên đang ở trong phòng học."
                value={config.wifiLocationEnabled}
                onChange={(val) => setConfig({ ...config, wifiLocationEnabled: val })}
                isReadOnly={isReadOnly}
              />

              <InputItem
                key="max-attempts"
                label="Số lần thử tối đa"
                description="Giới hạn số lần Check-in thất bại trước khi yêu cầu xác thực thủ công."
                value={config.maxAttempts}
                unit="LẦN"
                min={1}
                onChange={(val) => setConfig({ ...config, maxAttempts: val })}
                isReadOnly={isReadOnly}
              />
            </div>
          </ConfigGroup>

        </div>

        <div className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl p-6 border border-amber-100 dark:border-amber-900/30 flex gap-4">
          <div className="shrink-0 text-amber-500">
            <AlertCircle size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-400 mb-1 leading-tight">Lưu ý quan trọng</h4>
            <p className="text-xs text-amber-800/80 dark:text-amber-500/80 leading-relaxed italic">
              Việc thay đổi các cấu hình bảo mật và thời gian sẽ có hiệu lực ngay lập tức đối với tất cả các buổi điểm danh đang diễn ra. Hãy kiểm tra kỹ các tham số trước khi lưu.
            </p>
          </div>
        </div>
      </div>
    </AcademicStaffLayout>
  );
};

