import React, { useState, useEffect, useRef } from 'react';
import { Edit2, Save, X, Camera, Eye, EyeOff, Lock, Key, Loader2 } from 'lucide-react';
import { LecturerLayout } from '../../layouts/LecturerLayout';
import { userService } from '../../services/api/userService';
import { CustomDatePicker } from '../../components/common/CustomDatePicker';
import toast from "@utils/toast";

interface UserProfile {
  id: number;
  fullName: string;
  email: string;
  code: string;
  phone?: string;
  dob?: string;
  role: string;
  avatar?: string;
}

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const LecturerProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load user profile from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setProfile(userData);
        setEditedProfile(userData);
      } catch (e) {
        console.error('Failed to parse user data:', e);
        toast.error('Không thể tải thông tin hồ sơ');
      }
    }
  }, []);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (editedProfile) {
      try {
        setIsUploadingAvatar(true);
        const updateData = {
          dob: editedProfile.dob,
          phone: editedProfile.phone
        };

        const updatedUser = await userService.updateProfile(updateData, selectedAvatarFile || undefined);

        const mergedUser = { ...profile, ...updatedUser };
        setProfile(mergedUser as any);
        localStorage.setItem('user', JSON.stringify(mergedUser));
        setIsEditing(false);
        setSelectedAvatarFile(null);

        // Dispatch event for Header to update avatar in real-time
        window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: updatedUser }));

        toast.success('Cập nhật hồ sơ thành công!');
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Không thể cập nhật hồ sơ');
      } finally {
        setIsUploadingAvatar(false);
      }
    }
  };

  const handleChange = (field: keyof UserProfile, value: string) => {
    if (editedProfile) {
      setEditedProfile({ ...editedProfile, [field]: value });
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh!');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh không được vượt quá 5MB!');
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newAvatar = e.target?.result as string;
        if (editedProfile) {
          setEditedProfile({ ...editedProfile, avatar: newAvatar });
        }
        setIsEditing(true);
      };
      reader.readAsDataURL(file);
      setSelectedAvatarFile(file);

      toast.success('Đã chọn ảnh. Nhấn Lưu để cập nhật!');
    } catch (error) {
      console.error('Avatar upload failed:', error);
      toast.error('Không thể tải ảnh lên. Vui lòng thử lại!');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Vui lòng điền đầy đủ thông tin!');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Mật khẩu mới phải có ít nhất 8 ký tự!');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp!');
      return;
    }

    if (passwordData.newPassword === passwordData.currentPassword) {
      toast.error('Mật khẩu mới phải khác mật khẩu hiện tại!');
      return;
    }

    try {
      setIsChangingPassword(true);
      await userService.changePassword(passwordData.currentPassword, passwordData.newPassword);

      toast.success('Đổi mật khẩu thành công!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      console.error('Password change failed:', error);
      toast.error(error.response?.data?.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại!');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!profile) {
    return (
      <LecturerLayout pageTitle="Hồ sơ cá nhân">
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </LecturerLayout>
    );
  }

  const displayProfile = isEditing ? editedProfile! : profile;

  return (
    <LecturerLayout pageTitle="Hồ sơ cá nhân">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Profile Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
          <div className="h-32 bg-gradient-to-r from-fpt-orange via-orange-500 to-orange-400 rounded-t-2xl"></div>

          <div className="relative px-8 pb-8">
            {/* Avatar */}
            <div className="absolute -top-16 left-8">
              <div className="relative">
                <div className="w-32 h-32 rounded-full border-4 border-white dark:border-zinc-900 bg-gradient-to-br from-fpt-orange to-orange-600 overflow-hidden">
                  {displayProfile.avatar ? (
                    <img
                      src={displayProfile.avatar.startsWith('data:')
                        ? displayProfile.avatar
                        : `${displayProfile.avatar}${displayProfile.avatar.includes('?') ? '&' : '?'}t=${new Date().getTime()}`}
                      alt={displayProfile.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold">
                      {displayProfile.fullName?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleAvatarClick}
                  disabled={isUploadingAvatar}
                  className="absolute bottom-0 right-0 w-10 h-10 bg-fpt-orange text-white rounded-full flex items-center justify-center shadow-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  <Camera size={20} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end pt-4 gap-2">
              {!isEditing ? (
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-fpt-orange text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <Edit2 size={18} />
                  Chỉnh sửa
                </button>
              ) : (
                <>
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-600 transition-colors"
                  >
                    <X size={18} />
                    Hủy
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isUploadingAvatar}
                    className="flex items-center gap-2 px-4 py-2 bg-fpt-orange text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                  >
                    {isUploadingAvatar ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Lưu
                  </button>
                </>
              )}
            </div>

            {/* Profile Info */}
            <div className="mt-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Tên đầy đủ
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={displayProfile.fullName}
                      onChange={(e) => handleChange('fullName', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-fpt-orange focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white font-medium">
                      {displayProfile.fullName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Email
                  </label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {displayProfile.email}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Mã số
                  </label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {displayProfile.code}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Số điện thoại
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={displayProfile.phone || ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9+]/g, '');
                        if (val.length <= 11) handleChange('phone', val);
                      }}
                      placeholder="Ví dụ: 0912345678"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-fpt-orange focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white font-medium">
                      {displayProfile.phone || 'Chưa cập nhật'}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Ngày sinh
                  </label>
                  {isEditing ? (
                    <CustomDatePicker
                      value={displayProfile.dob || ''}
                      onChange={(value) => handleChange('dob', value)}
                      className="w-full"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white font-medium">
                      {displayProfile.dob || 'Chưa cập nhật'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Vai trò
                  </label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {displayProfile.role}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Password Change Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-fpt-orange rounded-full flex items-center justify-center">
              <Lock className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Đổi mật khẩu
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Cập nhật mật khẩu để bảo mật tài khoản
              </p>
            </div>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Mật khẩu hiện tại
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="text-gray-400" size={20} />
                </div>
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-fpt-orange focus:border-transparent"
                  placeholder="Nhập mật khẩu hiện tại"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPasswords.current ? <EyeOff className="text-gray-400" size={20} /> : <Eye className="text-gray-400" size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Mật khẩu mới
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="text-gray-400" size={20} />
                </div>
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-fpt-orange focus:border-transparent"
                  placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPasswords.new ? <EyeOff className="text-gray-400" size={20} /> : <Eye className="text-gray-400" size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Xác nhận mật khẩu mới
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="text-gray-400" size={20} />
                </div>
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-fpt-orange focus:border-transparent"
                  placeholder="Nhập lại mật khẩu mới"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPasswords.confirm ? <EyeOff className="text-gray-400" size={20} /> : <Eye className="text-gray-400" size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isChangingPassword}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-fpt-orange text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50"
            >
              {isChangingPassword ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Lock size={18} />
              )}
              {isChangingPassword ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
            </button>
          </form>
        </div>
      </div>
    </LecturerLayout>
  );
};

