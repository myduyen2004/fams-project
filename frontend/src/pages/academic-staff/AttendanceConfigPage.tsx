import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  UserCheck, 
  Wifi, 
  ShieldCheck, 
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import apiClient from '../../services/api/authService';

interface AttendanceConfig {
  id?: number;
  manualEnabled: boolean;
  lateThresholdMinutes: number;
  absentThresholdMinutes: number;
  openBeforeMinutes: number;
  closeAfterMinutes: number;
  minAttendancePercentage: number;
  faceRecognitionEnabled: boolean;
  livenessEnabled: boolean;
  maxAttempts: number;
  faceMatchThreshold: number;
  wifiLocationEnabled: boolean;
  forceCampusWifi: boolean;
  minMatchedAps: number;
  wifiRssiThreshold: number;
}

const DEFAULT_CONFIG: AttendanceConfig = {
  manualEnabled: true,
  lateThresholdMinutes: 15,
  absentThresholdMinutes: 30,
  openBeforeMinutes: 15,
  closeAfterMinutes: 15,
  minAttendancePercentage: 80,
  faceRecognitionEnabled: true,
  livenessEnabled: true,
  maxAttempts: 5,
  faceMatchThreshold: 0.85,
  wifiLocationEnabled: false,
  forceCampusWifi: false,
  minMatchedAps: 1,
  wifiRssiThreshold: -75
};

export const AttendanceConfigPage: React.FC = () => {
  const [config, setConfig] = useState<AttendanceConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await apiClient.get('/attendance-configs');
        if (response.data) {
          setConfig(response.data);
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

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put('/attendance-configs', config);
      toast.success('Cập nhật cấu hình thành công');
    } catch (error) {
      console.error('Failed to save config:', error);
      toast.error('Có lỗi xảy ra khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  const ConfigGroup: React.FC<{ 
    title: string; 
    icon: React.ReactNode; 
    description: string;
    children: React.ReactNode;
  }> = ({ title, icon, description, children }) => (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
      <div className="p-6 border-b border-gray-50 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/30">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-fpt-orange">
            {icon}
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tight">{title}</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-zinc-400 ml-11">{description}</p>
      </div>
      <div className="p-8 space-y-6">
        {children}
      </div>
    </div>
  );

  const ToggleItem: React.FC<{
    label: string;
    description: string;
    value: boolean;
    onChange: (val: boolean) => void;
  }> = ({ label, description, value, onChange }) => (
    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 dark:bg-zinc-800/20 border border-gray-100 dark:border-zinc-800/50 transition-colors hover:bg-gray-100/50 dark:hover:bg-zinc-800/40">
      <div className="flex-1 pr-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">{label}</h4>
        <p className="text-xs text-gray-500 dark:text-zinc-400">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          value ? 'bg-fpt-orange' : 'bg-gray-200 dark:bg-zinc-700'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            value ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );

  const InputItem: React.FC<{
    label: string;
    description: string;
    type?: string;
    value: any;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    onChange: (val: any) => void;
  }> = ({ label, description, type = "number", value, min, max, step, unit, onChange }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center p-4 rounded-xl border border-transparent hover:border-gray-100 dark:hover:border-zinc-800 transition-all">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">{label}</h4>
        <p className="text-xs text-gray-500 dark:text-zinc-400">{description}</p>
      </div>
      <div className="relative flex items-center">
        <input
          type={type}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) : e.target.value)}
          className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-fpt-orange transition-all"
        />
        {unit && (
          <span className="absolute right-3 text-xs font-medium text-gray-400 dark:text-zinc-500">{unit}</span>
        )}
      </div>
    </div>
  );

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
      <div className="max-w-5xl mx-auto space-y-8 pb-20">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-fpt-orange mb-1">
              <div className="p-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <Settings size={20} className="animate-spin-slow" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest">System Settings</span>
            </div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">CÀI ĐẶT ĐIỂM DANH</h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400">Thiết lập các tham số vận hành cho hệ thống ghi nhận sự diện.</p>
          </div>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center gap-2 group relative overflow-hidden bg-fpt-orange hover:bg-orange-600 disabled:bg-gray-400 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-orange-500/25 transition-all active:scale-95"
          >
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={18} />
            )}
            <span>{saving ? 'ĐANG LƯU...' : 'LƯU THAY ĐỔI'}</span>
          </button>
        </div>

        {/* Settings Content */}
        <div className="grid grid-cols-1 gap-8">
          
          {/* Cấu hình chung */}
          <ConfigGroup
            title="Cấu hình điểm danh chung"
            icon={<UserCheck size={20} />}
            description="Thiết lập các quy tắc cơ bản và tham số thời gian cho buổi học."
          >
            <div className="space-y-6">
              <ToggleItem
                label="Cho phép điểm danh thủ công"
                description="Giảng viên có thể ghi nhận diện diện trực tiếp khi sinh viên gặp sự cố hệ thống."
                value={config.manualEnabled}
                onChange={(val) => setConfig({ ...config, manualEnabled: val })}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <InputItem
                  label="Thời gian tính đi muộn"
                  description="Sau bao lâu kể từ khi bắt đầu slot sẽ tính là Present - Late."
                  value={config.lateThresholdMinutes}
                  unit="phút"
                  onChange={(val) => setConfig({ ...config, lateThresholdMinutes: val })}
                />
                <InputItem
                  label="Thời gian tính vắng mặt"
                  description="Sau bao lâu sẽ không thể Check-in và tính là Absent."
                  value={config.absentThresholdMinutes}
                  unit="phút"
                  onChange={(val) => setConfig({ ...config, absentThresholdMinutes: val })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputItem
                  label="Mở điểm danh trước"
                  description="Sinh viên có thể Check-in trước khi slot bắt đầu."
                  value={config.openBeforeMinutes}
                  unit="phút"
                  onChange={(val) => setConfig({ ...config, openBeforeMinutes: val })}
                />
                <InputItem
                  label="Đóng điểm danh sau"
                  description="Thời gian gia hạn để ghi nhận sau khi slot kết thúc."
                  value={config.closeAfterMinutes}
                  unit="phút"
                  onChange={(val) => setConfig({ ...config, closeAfterMinutes: val })}
                />
              </div>

              <InputItem
                label="Tỉ lệ hiện diện tối thiểu"
                description="Yêu cầu tối thiểu để sinh viên đủ điều kiện tham gia kỳ thi."
                value={config.minAttendancePercentage}
                unit="%"
                min={0}
                max={100}
                onChange={(val) => setConfig({ ...config, minAttendancePercentage: val })}
              />
            </div>
          </ConfigGroup>

          {/* Cấu hình Gương mặt */}
          <ConfigGroup
            title="Cấu hình điểm danh gương mặt"
            icon={<ShieldCheck size={20} />}
            description="Điều chỉnh độ chính xác và bảo mật cho công nghệ sinh trắc học."
          >
            <div className="space-y-6">
              <ToggleItem
                label="Kích hoạt nhận diện gương mặt"
                description="Cho phép sử dụng Camera để Check-in trên thiết bị di động."
                value={config.faceRecognitionEnabled}
                onChange={(val) => setConfig({ ...config, faceRecognitionEnabled: val })}
              />
              
              <ToggleItem
                label="Bắt buộc kiểm tra Liveness"
                description="Yêu cầu sinh viên thực hiện các hành động thực tế (chớp mắt, mỉm cười) để chống spoofing."
                value={config.livenessEnabled}
                onChange={(val) => setConfig({ ...config, livenessEnabled: val })}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <InputItem
                  label="Số lần thử tối đa"
                  description="Giới hạn số lần Check-in thất bại trước khi yêu cầu xác thực thủ công."
                  value={config.maxAttempts}
                  unit="lần"
                  min={1}
                  onChange={(val) => setConfig({ ...config, maxAttempts: val })}
                />
                <InputItem
                  label="Ngưỡng khớp (Matching)"
                  description="Độ tương đồng tối thiểu để xác nhận danh tính thành công."
                  value={config.faceMatchThreshold}
                  step={0.01}
                  min={0.5}
                  max={1.0}
                  onChange={(val) => setConfig({ ...config, faceMatchThreshold: val })}
                />
              </div>
            </div>
          </ConfigGroup>

          {/* Cấu hình vị trí WiFi */}
          <ConfigGroup
            title="CÀI ĐẶT XÁC THỰC VỊ TRÍ / WIFI"
            icon={<Wifi size={20} />}
            description="Đảm bảo sinh viên đang có mặt tại đúng phòng học quy định."
          >
            <div className="space-y-6">
              <ToggleItem
                label="Bật xác thực vị trí (WiFi)"
                description="Yêu cầu quét tín hiệu WiFi để xác minh sinh viên đang ở trong phòng học."
                value={config.wifiLocationEnabled}
                onChange={(val) => setConfig({ ...config, wifiLocationEnabled: val })}
              />

              <ToggleItem
                label="Bắt buộc kết nối WiFi trường"
                description="Chỉ cho phép Check-in nếu sinh viên đang kết nối với mạng WiFi của trường."
                value={config.forceCampusWifi}
                onChange={(val) => setConfig({ ...config, forceCampusWifi: val })}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <InputItem
                  label="Số AP tối thiểu cần match"
                  description="Số lượng Access Point hợp lệ tối thiểu phát hiện được trong phòng."
                  value={config.minMatchedAps}
                  unit="AP"
                  min={1}
                  onChange={(val) => setConfig({ ...config, minMatchedAps: val })}
                />
                <InputItem
                  label="Ngưỡng tín hiệu (RSSI)"
                  description="Cường độ tín hiệu tối thiểu để chấp nhận thiết bị đang ở gần AP (Càng gần 0 càng mạnh)."
                  value={config.wifiRssiThreshold}
                  unit="dBm"
                  max={-30}
                  min={-100}
                  onChange={(val) => setConfig({ ...config, wifiRssiThreshold: val })}
                />
              </div>
            </div>
          </ConfigGroup>

        </div>

        {/* Warning Section */}
        <div className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl p-6 border border-amber-100 dark:border-amber-900/30 flex gap-4">
          <div className="shrink-0 text-amber-500">
            <AlertCircle size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-400 mb-1 leading-tight">Lưu ý quan trọng</h4>
            <p className="text-xs text-amber-800/80 dark:text-amber-500/80 leading-relaxed italic">
              Việc thay đổi các cấu hình bảo mật (Ngưỡng khớp gương mặt, Liveness, WiFi) sẽ có hiệu lực ngay lập tức đối với tất cả các buổi điểm danh đang diễn ra. Hãy kiểm tra kỹ các tham số trước khi lưu.
            </p>
          </div>
        </div>
      </div>
    </AcademicStaffLayout>
  );
};
