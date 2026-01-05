import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/api/authService';
import toast from 'react-hot-toast';
import { Lock, Loader2, ArrowRight, AlertTriangle } from 'lucide-react';

export const ChangePasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Detect if this is first login
  const isFirstLogin = location.state?.firstLogin || false;
  const user = authService.getUser();
  const isPasswordChangeRequired = user && user.isPasswordChanged === false;

  React.useEffect(() => {
    document.title = (isFirstLogin || isPasswordChangeRequired) ? "Đổi mật khẩu lần đầu - FAMS" : "Đổi mật khẩu - FAMS";
  }, [isFirstLogin, isPasswordChangeRequired]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Mật khẩu nhập lại không khớp');
      return;
    }
    if (password.length < 8) {
      toast.error('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    try {
      setLoading(true);
      await authService.changePassword(password);
      
      // Update local storage user info
      const user = authService.getUser();
      if (user) {
        user.isPasswordChanged = true;
        localStorage.setItem('user', JSON.stringify(user));
      }
      
      toast.success('Đổi mật khẩu thành công');
      
      // Navigate based on role after successful password change
      if (user?.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (user?.role === 'LECTURER') {
        navigate('/lecturer/dashboard');
      } else if (user?.role === 'STUDENT') {
        navigate('/student/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error('Đổi mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
            <div className="w-16 h-16 bg-fpt-orange/10 rounded-2xl flex items-center justify-center mb-4">
                <Lock size={32} className="text-fpt-orange" />
            </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          {isFirstLogin || isPasswordChangeRequired ? 'Đổi mật khẩu lần đầu' : 'Đổi mật khẩu'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-zinc-400">
          {isFirstLogin || isPasswordChangeRequired 
            ? 'Vui lòng đổi mật khẩu mới để bảo mật tài khoản' 
            : 'Cập nhật mật khẩu mới cho tài khoản của bạn'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {/* First Login Warning Banner */}
        {(isFirstLogin || isPasswordChangeRequired) && (
          <div className="mb-6 mx-4 sm:mx-0">
            <div className="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 p-4 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-orange-800 dark:text-orange-300">
                    Yêu cầu đổi mật khẩu
                  </h3>
                  <p className="mt-1 text-sm text-orange-700 dark:text-orange-400">
                    Đây là lần đăng nhập đầu tiên. Bạn cần đổi mật khẩu trước khi sử dụng hệ thống.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 py-8 px-4 shadow-xl shadow-gray-100 dark:shadow-none sm:rounded-2xl sm:px-10 border border-gray-100 dark:border-zinc-800">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                Mật khẩu mới
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  placeholder="Tối thiểu 8 ký tự"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-fpt-orange focus:border-fpt-orange sm:text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
                Mật khẩu phải có ít nhất 8 ký tự
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">
                Nhập lại mật khẩu
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  placeholder="Nhập lại mật khẩu mới"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-fpt-orange focus:border-fpt-orange sm:text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-fpt-orange hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fpt-orange disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : 
                    <span className="flex items-center gap-2">Xác nhận <ArrowRight size={16}/></span>
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
