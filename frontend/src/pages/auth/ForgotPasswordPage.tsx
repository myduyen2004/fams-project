import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { authService } from '../../services/api/authService';
import toast from "@utils/toast";

type Step = 'email' | 'otp' | 'reset' | 'success';

// --- Illustrations ---
const SignpostIllustration = () => (
  <svg width="180" height="120" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M100 130V40" stroke="#18181B" strokeWidth="3" strokeLinecap="round" strokeDasharray="0.1 8"/>
    <rect x="75" y="30" width="70" height="30" rx="4" fill="white" stroke="#18181B" strokeWidth="2.5"/>
    <path d="M85 45H135" stroke="#18181B" strokeWidth="2" strokeLinecap="round"/>
    <path d="M135 45L128 40" stroke="#18181B" strokeWidth="2" strokeLinecap="round"/>
    <path d="M135 45L128 50" stroke="#18181B" strokeWidth="2" strokeLinecap="round"/>
    <path d="M60 130C90 125 110 125 140 130" stroke="#18181B" strokeWidth="3" strokeLinecap="round"/>
    <path d="M70 115L75 120" stroke="#18181B" strokeWidth="2" strokeLinecap="round"/>
    <path d="M130 115L125 120" stroke="#18181B" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const MailboxIllustration = () => (
  <svg width="180" height="120" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="70" y="40" width="80" height="50" rx="10" fill="white" stroke="#18181B" strokeWidth="2.5"/>
    <path d="M70 45H150C155.5 45 160 49.5 160 55V75C160 80.5 155.5 85 150 85H70" stroke="#18181B" strokeWidth="2.5"/>
    <path d="M100 90V130" stroke="#18181B" strokeWidth="3" strokeLinecap="round" strokeDasharray="0.1 8"/>
    <rect x="80" y="55" width="25" height="15" rx="2" fill="#F26F21"/>
    <path d="M80 130C100 125 120 125 140 130" stroke="#18181B" strokeWidth="3" strokeLinecap="round"/>
    <path d="M110 60L135 75" stroke="#18181B" strokeWidth="2" strokeLinecap="round" opacity="0.3"/>
  </svg>
);

const OtpIllustration = () => (
  <svg width="180" height="120" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="70" r="40" fill="white" stroke="#18181B" strokeWidth="2.5"/>
    <path d="M90 60V80" stroke="#F26F21" strokeWidth="4" strokeLinecap="round"/>
    <path d="M100 60V80" stroke="#F26F21" strokeWidth="4" strokeLinecap="round"/>
    <path d="M110 60V80" stroke="#F26F21" strokeWidth="4" strokeLinecap="round"/>
    <path d="M80 130C100 125 120 125 140 130" stroke="#18181B" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    document.title = "Quên mật khẩu - FAMS";
  }, []);

  useEffect(() => {
    // Basic password strength logic
    let strength = 0;
    if (newPassword.length >= 8) strength += 1;
    if (/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword)) strength += 1;
    if (/[0-9]/.test(newPassword)) strength += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) strength += 1;
    setPasswordStrength(strength);
  }, [newPassword]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      toast.success('Mã OTP đã được gửi đến email của bạn');
      setStep('otp');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể gửi mã OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.verifyOtp(email, otp);
      toast.success('Mã OTP hợp lệ');
      setStep('reset');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Mã OTP không chính xác hoặc đã hết hạn');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu không khớp');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword({
        email,
        otp,
        newPassword
      } as any);
      toast.success('Đổi mật khẩu thành công');
      setStep('success');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Đã có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const getStrengthLabel = () => {
    if (passwordStrength <= 1) return { label: 'Weak', color: 'bg-red-500' };
    if (passwordStrength === 2) return { label: 'Medium', color: 'bg-yellow-500' };
    if (passwordStrength === 3) return { label: 'Strong', color: 'bg-green-400' };
    return { label: 'Excellent', color: 'bg-green-600' };
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
          <span className="text-xl font-semibold text-gray-900 dark:text-white">FAMS</span>
        </div>

        {/* Card */}
        <div className="w-full bg-white dark:bg-zinc-900 p-8 md:p-12 rounded-[40px] shadow-[0_50px_150px_-20px_rgba(0,0,0,0.25)] dark:shadow-none border border-white dark:border-zinc-800 transition-all duration-500">
          
          {/* Step Illustration */}
          <div className="flex justify-center mb-8">
            {step === 'email' && <SignpostIllustration />}
            {step === 'otp' && <OtpIllustration />}
            {step === 'reset' && <MailboxIllustration />}
            {step === 'success' && (
               <div className="w-32 h-32 bg-green-50 dark:bg-green-900/10 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 size={64} className="text-green-500" />
               </div>
            )}
          </div>

          {/* Heading */}
          <div className="text-center mb-10">
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mb-2 tracking-tight">
              {step === 'email' && 'Quên mật khẩu?'}
              {step === 'otp' && 'Nhập mã xác thực'}
              {step === 'reset' && 'Đặt lại mật khẩu'}
              {step === 'success' && 'Đặt lại thành công!'}
            </h1>
            <p className="text-gray-500 dark:text-zinc-400 text-sm">
              {step === 'email' && 'Nhập email của bạn để chúng tôi gửi mã xác thực đặt lại mật khẩu'}
              {step === 'otp' && `Chúng tôi đã gửi mã xác thực 6 chữ số đến ${email}`}
              {step === 'reset' && 'Vui lòng thiết lập mật khẩu mới cho tài khoản của bạn.'}
              {step === 'success' && 'Mật khẩu của bạn đã được cập nhật thành công.'}
            </p>
          </div>

          {/* Forms */}
          <div className="space-y-6">
            {step === 'email' && (
              <form onSubmit={handleSendOtp} className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-2 px-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ví dụ: username@fpt.edu.vn"
                    className="w-full px-6 py-4 bg-white dark:bg-zinc-800 border-2 border-gray-100 dark:border-zinc-700 rounded-2xl focus:outline-none focus:border-fpt-orange/50 focus:ring-4 focus:ring-fpt-orange/5 text-gray-900 dark:text-white placeholder:text-gray-300 transition-all text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-fpt-orange hover:bg-orange-600 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={24} className="animate-spin" /> : 'Gửi Email'}
                </button>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="flex justify-center gap-2">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="••••••"
                    className="w-full px-6 py-4 bg-white dark:bg-zinc-800 border-2 border-gray-100 dark:border-zinc-700 rounded-2xl focus:outline-none focus:border-fpt-orange/50 focus:ring-4 focus:ring-fpt-orange/5 text-gray-900 dark:text-white placeholder:text-gray-300 transition-all text-center text-3xl font-semibold tracking-[10px]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-fpt-orange hover:bg-orange-600 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={24} className="animate-spin" /> : 'Xác thực'}
                </button>
                <div className="text-center">
                  <button type="button" onClick={() => setStep('email')} className="text-sm text-gray-400 hover:text-fpt-orange transition-colors">
                    Thử bằng email khác
                  </button>
                </div>
              </form>
            )}

            {step === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-2 px-1">
                      Mật khẩu mới
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-6 py-4 bg-white dark:bg-zinc-800 border-2 border-gray-100 dark:border-zinc-700 rounded-2xl focus:outline-none focus:border-fpt-orange/50 focus:ring-4 focus:ring-fpt-orange/5 text-gray-900 dark:text-white placeholder:text-gray-300 transition-all text-sm pr-12"
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
                         Độ mạnh mật khẩu: <span className={`font-semibold ${passwordStrength > 0 ? strength.color.replace('bg-', 'text-') : ''}`}>{strength.label === 'Weak' ? 'Yếu' : strength.label === 'Medium' ? 'Trung bình' : strength.label === 'Strong' ? 'Mạnh' : 'Tuyệt vời'}</span>
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
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-6 py-4 bg-white dark:bg-zinc-800 border-2 border-gray-100 dark:border-zinc-700 rounded-2xl focus:outline-none focus:border-fpt-orange/50 focus:ring-4 focus:ring-fpt-orange/5 text-gray-900 dark:text-white placeholder:text-gray-300 transition-all text-sm"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-fpt-orange hover:bg-orange-600 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={24} className="animate-spin" /> : 'Đặt lại mật khẩu'}
                </button>
              </form>
            )}

            {step === 'success' && (
              <div className="text-center">
                 <button
                   onClick={() => navigate('/login')}
                   className="w-full bg-fpt-orange hover:bg-orange-600 text-white font-semibold py-4 rounded-2xl shadow-xl shadow-orange-500/30 transition-all hover:-translate-y-0.5"
                 >
                   Quay lại đăng nhập
                 </button>
              </div>
            )}
          </div>

          {/* Footer Back Link */}
          {step !== 'success' && (
            <div className="mt-8 text-center">
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-fpt-orange transition-colors font-medium group"
              >
                <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
                Quay lại đăng nhập
              </button>
            </div>
          )}
        </div>

        {/* Support Alert */}
        {step !== 'success' && (
          <div className="mt-12 flex items-center gap-3 px-6 py-4 bg-orange-50/50 dark:bg-orange-950/5 rounded-2xl border border-orange-100/50 dark:border-orange-900/10">
            <AlertCircle size={18} className="text-fpt-orange flex-shrink-0" />
            <p className="text-[11px] text-orange-900/60 dark:text-orange-400/60 leading-relaxed">
              Nếu bạn không nhận được mã OTP, vui lòng kiểm tra thư mục thư rác hoặc thử lại sau vài phút.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

