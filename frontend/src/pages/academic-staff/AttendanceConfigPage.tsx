import React, { useState, useEffect } from 'react';
import {
  Settings,
  UserCheck,
  ShieldCheck,
  AlertCircle,
  Check,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
// import { useNavigate } from 'react-router-dom';
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
  <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-xl overflow-hidden flex flex-col h-full font-sans">
    <div className="px-6 py-4 border-b border-gray-50 dark:border-zinc-800 flex items-center justify-between bg-gray-50/30 dark:bg-zinc-900/50">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-xl bg-fpt-orange/10">
          <div className="text-fpt-orange">
            {icon}
          </div>
        </div>
        <h2 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">{title}</h2>
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
    <div className="flex flex-col items-center justify-center gap-1.5 w-32 shrink-0 border-l border-gray-100 dark:border-zinc-800/50 pl-4">
      <button
        type="button"
        disabled={isReadOnly}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none active:scale-90 ${value ? 'bg-fpt-orange' : 'bg-gray-300 dark:bg-zinc-700'
          } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110'}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-300 ${value ? 'translate-x-5' : 'translate-x-0'
            }`}
        />
      </button>
      <span className={`text-[9px] font-black tracking-widest uppercase ${value ? 'text-fpt-orange' : 'text-gray-400'}`}>
        {value ? 'BẬT' : 'TẮT'}
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
    <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/30 dark:bg-zinc-800/10 border border-gray-100 dark:border-zinc-800/50 min-h-[85px] font-sans">
      <div className="flex-1 pr-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">{label}</h4>
        <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">{description}</p>
      </div>
      <div className="w-52 shrink-0 border-l border-gray-100 dark:border-zinc-800/50 pl-4">
        {isReadOnly ? (
          <div className="bg-white dark:bg-zinc-800/50 rounded-lg px-2 py-2 text-xs font-bold text-gray-900 dark:text-white border border-gray-100 dark:border-zinc-700 text-center shadow-sm">
            {value}
            {unit && <span className="text-[10px] text-gray-400 ml-1.5 uppercase tracking-tighter">{unit}</span>}
          </div>
        ) : (
          <div className="flex items-center bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl overflow-hidden transition-all hover:border-fpt-orange/40 focus-within:border-fpt-orange focus-within:ring-4 focus-within:ring-fpt-orange/10 shadow-sm">
            <div className="flex flex-col border-r border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 self-stretch">
              <button
                type="button"
                onClick={handleIncrement}
                className="px-3 flex-1 flex items-center justify-center hover:bg-orange-50 dark:hover:bg-orange-900/20 text-gray-400 hover:text-fpt-orange border-b border-gray-100 dark:border-zinc-800 transition-colors"
              >
                <ChevronUp size={12} strokeWidth={3} />
              </button>
              <button
                type="button"
                onClick={handleDecrement}
                className="px-3 flex-1 flex items-center justify-center hover:bg-orange-50 dark:hover:bg-orange-900/20 text-gray-400 hover:text-fpt-orange transition-colors"
              >
                <ChevronDown size={12} strokeWidth={3} />
              </button>
            </div>

            <input
              type={type === 'number' ? 'text' : type}
              value={localValue}
              onChange={handleInputChange}
              className="w-full bg-transparent py-2 px-1 text-sm font-black text-gray-900 dark:text-white outline-none border-none focus:ring-0 text-center"
            />

            {unit && (
              <div className="bg-gray-50 dark:bg-zinc-900 border-l border-gray-100 dark:border-zinc-800 px-3 shrink-0 flex items-center min-w-[44px] justify-center text-center self-stretch">
                <span className="text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-tighter">
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
  // const navigate = useNavigate();
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
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {/* <button onClick={() => navigate('/academic-staff/dashboard')} className="flex h-[44px] items-center gap-2 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 px-5 text-[10px] font-black text-gray-600 hover:border-fpt-orange hover:text-fpt-orange hover:shadow-lg transition-all active:scale-95 uppercase tracking-widest leading-none">
              <ArrowLeft className="w-3.5 h-3.5" /> Bảng điều khiển
            </button> */}

            {isReadOnly ? (
              <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black border border-blue-100 flex items-center gap-1.5 uppercase tracking-widest">
                <div className="w-1 h-1 rounded-full bg-blue-500" />
                Chế độ xem
              </span>
            ) : (
              <span className="px-3 py-1 bg-fpt-orange/10 text-fpt-orange rounded-full text-[9px] font-black border border-fpt-orange/20 flex items-center gap-1.5 uppercase tracking-widest animate-pulse">
                <div className="w-1 h-1 rounded-full bg-fpt-orange" />
                Đang chỉnh sửa
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {isReadOnly ? (
              <button
                onClick={() => setIsReadOnly(false)}
                className="flex h-[44px] items-center gap-2 rounded-2xl bg-blue-600 px-6 text-[10px] font-black text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all active:scale-95 uppercase tracking-widest"
              >
                <Settings className="w-3.5 h-3.5" /> CHỈNH SỬA
              </button>
            ) : (
              <>
                <button
                  onClick={handleCancelChanges}
                  className="flex h-[44px] items-center px-5 rounded-2xl bg-gray-100 dark:bg-zinc-800 text-gray-600 text-[10px] font-black hover:bg-gray-200 transition-all active:scale-95 uppercase tracking-widest"
                >
                  HỦY THAY ĐỔI
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex h-[44px] items-center gap-2 rounded-2xl bg-fpt-orange px-6 text-[10px] font-black text-white hover:bg-orange-600 shadow-lg shadow-fpt-orange/20 transition-all active:scale-95 uppercase tracking-widest"
                >
                  {saving ? <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" strokeWidth={3} />}
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

        <div className="bg-fpt-orange/5 border border-fpt-orange/10 rounded-3xl p-6 flex gap-4">
          <div className="shrink-0 text-fpt-orange">
            <AlertCircle size={24} />
          </div>
          <div>
            <h4 className="text-xs font-black text-gray-900 dark:text-white mb-1 leading-tight uppercase tracking-widest">Lưu ý quan trọng</h4>
            <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-relaxed font-bold uppercase tracking-tight">
              Việc thay đổi các cấu hình bảo mật và thời gian sẽ có hiệu lực ngay lập tức đối với tất cả các buổi điểm danh đang diễn ra. Hãy kiểm tra kỹ các tham số trước khi lưu.
            </p>
          </div>
        </div>
      </div>
    </AcademicStaffLayout>
  );
};

