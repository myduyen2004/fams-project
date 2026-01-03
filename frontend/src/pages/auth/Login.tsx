import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Sun, User, Lock } from "lucide-react";
import { authService } from "../../services/api/authService";
import toast from "react-hot-toast";
import COLORS from "../../config/colors";

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authService.login(formData);

      // Save to localStorage
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));

      toast.success("Đăng nhập thành công!", {
        style: {
          background: isDark ? COLORS.background.dark : COLORS.background.light,
          color: isDark ? COLORS.text.light : COLORS.text.dark,
          border: `1px solid ${COLORS.success}`,
          borderRadius: '0.5rem',
          fontWeight: '500',
        },
        iconTheme: {
          primary: COLORS.success,
          secondary: COLORS.neutral.white,
        },
      });

      // Check if password change required (first login)
      const { role, isPasswordChanged } = response.user;
      
      if (isPasswordChanged === false && role !== "ADMIN") {
        // First login - force password change
        navigate("/change-password", { 
          replace: true,
          state: { firstLogin: true }
        });
        return;
      }

      // Navigate based on role
      if (role === "ADMIN") {
        navigate("/admin/dashboard");
      } else if (role === "ACADEMIC_STAFF") {
        navigate("/academic-staff/dashboard");
      } else if (role === "LECTURER") {
        navigate("/lecturer/dashboard");
      } else if (role === "STUDENT") {
        navigate("/student/dashboard");
      } else {
        navigate("/dashboard");
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      const message = error.response?.data?.message || "Đăng nhập thất bại";
      
      toast.error(message, {
        style: {
          background: isDark ? COLORS.background.dark : COLORS.background.light,
          color: isDark ? COLORS.text.light : COLORS.text.dark,
          border: `2px solid ${COLORS.error}`,
          borderLeft: `4px solid ${COLORS.error}`,
          borderRadius: '0.5rem',
          fontWeight: '500',
        },
        iconTheme: {
          primary: COLORS.error,
          secondary: COLORS.neutral.white,
        },
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div className={`min-h-screen flex ${isDark ? "dark" : ""}`}>
      {/* Left Panel - Orange Welcome */}
      <div className="hidden lg:flex w-[45%] relative overflow-hidden rounded-tr-[160px] rounded-br-[160px]">
        {/* Background */}
        {/* Decorative Shape */}
        <div className="absolute inset-0 bg-gradient-to-br from-fpt-orange to-primary-600">
          {/* Wave Decorations */}
          <svg className="absolute bottom-0 left-0 w-full h-48 opacity-20" viewBox="0 0 1440 320" preserveAspectRatio="none">
            <path fill="#ffffff" fillOpacity="1" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,144C960,149,1056,139,1152,122.7C1248,107,1344,85,1392,74.7L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
          <svg className="absolute top-0 right-0 w-full h-48 opacity-15" viewBox="0 0 1440 320" preserveAspectRatio="none">
            <path fill="#ffffff" fillOpacity="1" d="M0,192L48,197.3C96,203,192,213,288,192C384,171,480,117,576,112C672,107,768,149,864,154.7C960,160,1056,128,1152,128C1248,128,1344,160,1392,176L1440,192L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
          </svg>
          {/* Circular decorations */}
          <div className="absolute top-20 right-10 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
          <div className="absolute bottom-32 left-10 w-40 h-40 rounded-full bg-white/10 blur-3xl"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12 text-center text-white">
          {/* Title + Logo */}
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-4xl font-bold leading-tight">
              Chào mừng đến với
            </h1>

            {/* Logo FAMS */}
            <img
              src="/assets/images/fams-logo.png"
              alt="FAMS"
              className="h-14 w-auto object-contain"
            />
          </div>

          <p className="text-white/90 text-lg font-light">
            Hệ thống quản lí học vụ thông minh
          </p>

          {/* FPT Logo bottom */}
          <div className="absolute bottom-8 flex flex-col items-center">
            <img
              src="/assets/images/fpt-logo.png"
              alt="FPT University"
              className="h-14 w-auto mb-2"
            />
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center bg-white dark:bg-zinc-900 transition-colors duration-200">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="absolute top-6 right-6 p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun size={24} /> : <Moon size={24} />}
        </button>

        {/* Login Card */}
        <div className="w-full max-w-md px-8">
          {/* Logo - Dùng ảnh */}
          <div className="flex justify-center mb-8">
            <img
              src="/assets/images/fams-logo.png"
              alt="FPT Logo"
              className="h-20 w-auto object-contain"
              onError={(e) => {
                // Fallback nếu không tìm thấy ảnh
                e.currentTarget.src =
                  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"><text x="50%" y="50%" text-anchor="middle" font-size="40" fill="%23F37021" font-weight="bold">FPT</text></svg>';
              }}
            />
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-10">
            Đăng nhập
          </h2>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Input */}
            <div className="relative group">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-fpt-orange transition-colors">
                <User size={20} />
              </div>
              <input
                type="text"
                id="username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                placeholder="Tài khoản"
                required
                disabled={isLoading}
                className="w-full bg-primary-50 dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border border-neutral-200 dark:border-zinc-700 rounded-lg py-3.5 pl-4 pr-10 focus:ring-2 focus:ring-fpt-orange focus:border-transparent focus:bg-white dark:focus:bg-zinc-700 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Password Input */}
            <div className="relative group">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-fpt-orange transition-colors">
                <Lock size={20} />
              </div>
              <input
                type="password"
                id="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Mật khẩu"
                required
                disabled={isLoading}
                className="w-full bg-primary-50 dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border border-neutral-200 dark:border-zinc-700 rounded-lg py-3.5 pl-4 pr-10 focus:ring-2 focus:ring-fpt-orange focus:border-transparent focus:bg-white dark:focus:bg-zinc-700 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Forgot Password */}
            <div className="flex items-center justify-start">
              <a
                href="/forgot-password"
                className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-fpt-orange dark:hover:text-fpt-orange transition-colors"
              >
                Quên mật khẩu?
              </a>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-lg shadow-md text-base font-bold text-white bg-fpt-orange hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fpt-orange dark:focus:ring-offset-zinc-900 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Đang đăng nhập...
                  </>
                ) : (
                  "Đăng nhập"
                )}
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500">
            © 2025 FPT University. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};
