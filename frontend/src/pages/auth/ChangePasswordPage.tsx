import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/api/authService';
import toast from "@utils/toast";
import { Loader2, ArrowRight, AlertTriangle, Eye, EyeOff, ArrowLeft } from 'lucide-react';

// --- Illustration ---
const SecurityIllustration = () => (
  <svg width="180" height="120" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M100 30L140 45V90C140 115 115 130 100 135C85 130 60 115 60 90V45L100 30Z" fill="white" stroke="#18181B" strokeWidth="2.5"/>
    <path d="M100 55V110" stroke="#F26F21" strokeWidth="4" strokeLinecap="round" opacity="0.8"/>
    <path d="M80 80H120" stroke="#F26F21" strokeWidth="4" strokeLinecap="round" opacity="0.8"/>
    <circle cx="100" cy="80" r="15" fill="white" stroke="#18181B" strokeWidth="2"/>
    <path d="M80 135C100 130 120 130 140 135" stroke="#18181B" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

export const ChangePasswordPage: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Detect if this is first login
  const isFirstLogin = location.state?.firstLogin || false;
  const user = authService.getUser();
  const isPasswordChangeRequired = user && user.isPasswordChanged === false;

  useEffect(() => {
    document.title = (isFirstLogin || isPasswordChangeRequired) ? "Đổi mật khẩu lần đầu - FAMS" : "Đổi mật khẩu - FAMS";
  }, [isFirstLogin, isPasswordChangeRequired]);

  useEffect(() => {
    // Basic password strength logic
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    setPasswordStrength(strength);
  }, [password]);

  const handleNavigateToDashboard = () => {
    if (user?.role === 'ADMIN') {
      navigate('/admin/dashboard');
    } else if (user?.role === 'ACADEMIC_STAFF') {
      navigate('/academic-staff/dashboard');
    } else if (user?.role === 'LECTURER') {
      navigate('/lecturer/dashboard');
    } else if (user?.role === 'STUDENT') {
      navigate('/student/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Mật khẩu nhập lại không khớp');
      return;
    }
    if (!currentPassword) {
      toast.error('Vui lòng nhập mật khẩu hiện tại');
      return;
    }
    if (password.length < 8) {
      toast.error('Mật khẩu mới phải có ít nhất 8 ký tự');
      return;
    }
    if (password === currentPassword) {
      toast.error('Mật khẩu mới phải khác mật khẩu hiện tại');
      return;
    }

    try {
      setLoading(true);
      await authService.changePassword(currentPassword, password);
      
      // Update local storage user info
      const user = authService.getUser();
      if (user) {
        user.isPasswordChanged = true;
        localStorage.setItem('user', JSON.stringify(user));
      }
      
      toast.success('Đổi mật khẩu thành công');
      handleNavigateToDashboard();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Đổi mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  const getStrengthLabel = () => {
    if (passwordStrength <= 1) return { label: 'Yếu', color: 'bg-red-500' };
    if (passwordStrength === 2) return { label: 'Trung bình', color: 'bg-yellow-500' };
    if (passwordStrength === 3) return { label: 'Mạnh', color: 'bg-green-400' };
    return { label: 'Tuyệt vời', color: 'bg-green-600' };
  };

  const strength = getStrengthLabel();

  return (
    <div className="min-h-screen bg-[#FFF8F5] dark:bg-zinc-950 flex items-center justify-center relative overflow-hidden font-inter selection:bg-orange-100 selection:text-fpt-orange">
      
      {/* Decorative Curvy Background */}
      <div className="absolute top-0 right-0 w-[60%] h-full bg-fpt-orange pointer-events-none rounded-l-[150px] opacity-100 hidden lg:block transform translate-x-32 translate-y-[-10%] rotate-[-5deg]"></div>
      <div className="absolute top-0 right-0 w-[50%] h-[120%] bg-gradient-to-br from-fpt-orange to-[#EA5C36] pointer-events-none rounded-l-[200px] opacity-100 hidden lg:block transform translate-x-20"></div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-lg px-4 flex flex-col items-center">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-2 mb-12 self-start lg:absolute lg:top-[-100px] lg:left-0">
          <div className="w-10 h-10 bg-fpt-orange rounded-xl flex items-center justify-center p-2 shadow-lg shadow-orange-500/20">
            <img src="/assets/images/fams-logo.png" alt="Logo" className="w-full h-full object-contain brightness-0 invert" />
          </div>
          <span className="text-xl font-semibold text-gray-900 dark:text-white uppercase tracking-wider">FAMS</span>
        </div>

        {/* Card */}
        <div className="w-full bg-white dark:bg-zinc-900 p-8 md:p-12 rounded-[40px] shadow-[0_50px_150px_-20px_rgba(0,0,0,0.25)] dark:shadow-none border border-white dark:border-zinc-800 transition-all duration-500">
          
          {/* Illustration */}
          <div className="flex justify-center mb-8">
            <SecurityIllustration />
          </div>

          {/* Heading */}
          <div className="text-center mb-10">
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mb-2 tracking-tight">
              {isFirstLogin || isPasswordChangeRequired ? 'Đổi mật khẩu lần đầu' : 'Đổi mật khẩu'}
            </h1>
            <p className="text-gray-500 dark:text-zinc-400 text-sm">
              {isFirstLogin || isPasswordChangeRequired 
                ? 'Vui lòng thiết lập mật khẩu mới cho tài khoản của bạn để tiếp tục' 
                : 'Cập nhật mật khẩu mới để bảo vệ tài khoản tốt hơn'}
            </p>
          </div>

          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-2 px-1">
                Mật khẩu hiện tại
              </label>
              <input
                type="password"
                required
                placeholder="Nhập mật khẩu hiện tại"
                className="w-full px-6 py-4 bg-white dark:bg-zinc-800 border-2 border-gray-100 dark:border-zinc-700 rounded-2xl focus:outline-none focus:border-fpt-orange/50 focus:ring-4 focus:ring-fpt-orange/5 text-gray-900 dark:text-white placeholder:text-gray-300 transition-all text-sm"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-2 px-1">
                Mật khẩu mới
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Tối thiểu 8 ký tự"
                  className="w-full px-6 py-4 bg-white dark:bg-zinc-800 border-2 border-gray-100 dark:border-zinc-700 rounded-2xl focus:outline-none focus:border-fpt-orange/50 focus:ring-4 focus:ring-fpt-orange/5 text-gray-900 dark:text-white placeholder:text-gray-300 transition-all text-sm pr-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-fpt-orange transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Strength Meter */}
              <div className="mt-4 space-y-2">
                 <div className="flex gap-1 h-1.5 w-full">
                    {[1, 2, 3, 4].map((i) => (
                      <div 
                        key={i} 
                        className={`h-full flex-1 rounded-full transition-all duration-500 ${i <= passwordStrength ? strength.color : 'bg-gray-100 dark:bg-zinc-800'}`}
                      />
                    ))}
                 </div>
                 <p className="text-[10px] text-gray-400">
                   Độ mạnh mật khẩu: <span className={`font-semibold ${passwordStrength > 0 ? strength.color.replace('bg-', 'text-') : ''}`}>{strength.label}</span>
                 </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-2 px-1">
                Nhập lại mật khẩu
              </label>
              <input
                type="password"
                required
                placeholder="Xác nhận mật khẩu mới"
                className="w-full px-6 py-4 bg-white dark:bg-zinc-800 border-2 border-gray-100 dark:border-zinc-700 rounded-2xl focus:outline-none focus:border-fpt-orange/50 focus:ring-4 focus:ring-fpt-orange/5 text-gray-900 dark:text-white placeholder:text-gray-300 transition-all text-sm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-fpt-orange hover:bg-orange-600 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={24} className="animate-spin" /> : 
                  <span className="flex items-center gap-2">Xác nhận <ArrowRight size={20}/></span>
              }
            </button>
          </form>

          {/* Footer Actions */}
          <div className="mt-10 pt-6 border-t border-gray-100 dark:border-zinc-800 flex flex-col items-center gap-4">
              {isPasswordChangeRequired && (
                <button
                  onClick={handleNavigateToDashboard}
                  className="text-sm font-medium text-gray-400 hover:text-fpt-orange transition-colors"
                >
                  Bỏ qua lúc này
                </button>
              )}
              <button
                onClick={() => {
                  authService.logout();
                  navigate('/login');
                }}
                className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors group"
              >
                <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
                Quay lại đăng nhập
              </button>
          </div>
        </div>
      </div>

      {/* Security Banner */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 hidden md:block">
        <div className="p-4 bg-orange-50/50 dark:bg-orange-950/5 rounded-2xl border border-orange-100/50 dark:border-orange-900/10 flex items-center gap-4">
           <div className="p-2 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
             <AlertTriangle size={20} className="text-orange-500" />
           </div>
           <p className="text-[11px] text-orange-950/60 dark:text-orange-400/60 leading-relaxed">
             <span className="font-semibold">Mẹo bảo mật:</span> Tránh sử dụng thông tin cá nhân như ngày sinh hay tên của bạn làm mật khẩu. Mật khẩu mạnh giúp bảo vệ dữ liệu học tập của bạn an toàn hơn.
           </p>
        </div>
      </div>
    </div>
  );
};

