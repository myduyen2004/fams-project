import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, KeyRound, ArrowLeft, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { authService } from '../../services/api/authService';
import toast from 'react-hot-toast';

type Step = 'email' | 'otp' | 'reset' | 'success';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    document.title = "Quên mật khẩu - FAMS";
  }, []);

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-inter transition-colors duration-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-fpt-orange/10 rounded-2xl">
            <KeyRound size={40} className="text-fpt-orange" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          {step === 'email' && 'Quên mật khẩu?'}
          {step === 'otp' && 'Nhập mã xác thực'}
          {step === 'reset' && 'Đặt lại mật khẩu'}
          {step === 'success' && 'Thành công!'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-zinc-400">
          {step === 'email' && 'Hãy nhập email của bạn, chúng tôi sẽ gửi mã OTP để đặt lại mật khẩu.'}
          {step === 'otp' && `Chúng tôi đã gửi mã xác thực gồm 6 chữ số đến ${email}`}
          {step === 'reset' && 'Vui lòng thiết lập mật khẩu mới cho tài khoản của bạn.'}
          {step === 'success' && 'Mật khẩu của bạn đã được cập nhật thành công.'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-zinc-900 py-8 px-4 shadow-xl shadow-gray-200/50 dark:shadow-none sm:rounded-2xl sm:px-10 border border-gray-100 dark:border-zinc-800 transition-all duration-300">
          
          {/* Step 1: Input Email */}
          {step === 'email' && (
            <form className="space-y-6" onSubmit={handleSendOtp}>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                  Email tài khoản
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-fpt-orange transition-colors">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@fpt.edu.vn"
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-fpt-orange/20 focus:border-fpt-orange bg-white dark:bg-zinc-800 text-gray-900 dark:text-white transition-all sm:text-sm"
                  />
                </div>
              </div>
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-fpt-orange hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fpt-orange transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : 
                    <span className="flex items-center gap-2">Tiếp tục <ArrowRight size={18} /></span>
                  }
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Input OTP */}
          {step === 'otp' && (
            <form className="space-y-6" onSubmit={handleVerifyOtp}>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                  Mã xác thực (OTP)
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="000000"
                  className="block w-full px-3 py-3 border border-gray-300 dark:border-zinc-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-fpt-orange/20 focus:border-fpt-orange bg-white dark:bg-zinc-800 text-gray-900 dark:text-white transition-all text-center text-2xl tracking-[10px] sm:text-3xl font-bold"
                />
              </div>
              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-fpt-orange hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fpt-orange transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : 'Xác thực'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-zinc-300 font-medium transition-colors"
                >
                  Gửi lại mã hoặc đổi email
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Reset Password */}
          {step === 'reset' && (
            <form className="space-y-6" onSubmit={handleResetPassword}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                    Mật khẩu mới
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-fpt-orange transition-colors">
                      <Lock size={18} />
                    </div>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-fpt-orange/20 focus:border-fpt-orange bg-white dark:bg-zinc-800 text-gray-900 dark:text-white transition-all sm:text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
                    Nhập lại mật khẩu mới
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-fpt-orange transition-colors">
                      <Lock size={18} />
                    </div>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-zinc-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-fpt-orange/20 focus:border-fpt-orange bg-white dark:bg-zinc-800 text-gray-900 dark:text-white transition-all sm:text-sm"
                    />
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-fpt-orange hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fpt-orange transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Cập nhật mật khẩu'}
              </button>
            </form>
          )}

          {/* Success State */}
          {step === 'success' && (
            <div className="text-center py-4">
              <div className="flex justify-center mb-6">
                <CheckCircle2 size={64} className="text-green-500" />
              </div>
              <div className="mb-8">
                <p className="text-gray-600 dark:text-zinc-400">
                  Bạn có thể đăng nhập ngay bây giờ bằng mật khẩu mới của mình.
                </p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-fpt-orange hover:bg-orange-600 transition-all"
              >
                Quay lại đăng nhập
              </button>
            </div>
          )}

          {step !== 'success' && (
            <div className="mt-6 text-center">
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-fpt-orange dark:hover:text-fpt-orange transition-colors font-medium"
              >
                <ArrowLeft size={16} /> Quay lại đăng nhập
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 text-center sm:mx-auto sm:w-full sm:max-w-md">
        <div className="p-4 bg-blue-50 dark:bg-zinc-900/50 rounded-xl border border-blue-100 dark:border-zinc-800">
          <div className="flex gap-3">
            <AlertCircle size={20} className="text-blue-500 flex-shrink-0" />
            <p className="text-xs text-blue-700 dark:text-zinc-400 text-left">
              Nếu bạn không nhận được mã OTP, vui lòng kiểm tra thư mục Spam hoặc thử lại sau vài phút.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
