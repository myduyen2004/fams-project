import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { newsService } from '../../services/api/newsService';
import { NewsRequest, NewsTargetType, NewsType, NewsStatus } from '../../types/news';
import toast from 'react-hot-toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { CloudUpload, Loader2, Trash2 } from 'lucide-react';
import apiClient from '../../services/api/authService';
import axios from 'axios';

export const CreateNewsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAcademicStaff = location.pathname.startsWith('/academic-staff');
  const basePath = useMemo(() => isAcademicStaff ? '/academic-staff' : '/admin', [isAcademicStaff]);
  const Layout = isAcademicStaff ? AcademicStaffLayout : AdminLayout;

  const [form, setForm] = useState<NewsRequest>(() => {
    const saved = localStorage.getItem('createNewsDraft');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore JSON parse error
      }
    }
    return {
      title: '',
      content: '',
      targetType: NewsTargetType.ALL,
      type: NewsType.EVENT,
      thumbnailImage: '',
      attachmentUrls: []
    };
  });

  const [sendType, setSendType] = useState<'NOW' | 'SCHEDULED' | 'DRAFT'>(() => {
    return (localStorage.getItem('createNewsSendType') as 'NOW' | 'SCHEDULED' | 'DRAFT') || 'NOW';
  });
  const [scheduledDate, setScheduledDate] = useState(() => {
    return localStorage.getItem('createNewsScheduledDate') || '';
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingContentImg, setUploadingContentImg] = useState(false);
  const quillRef = useRef<ReactQuill>(null);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('createNewsDraft', JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    localStorage.setItem('createNewsSendType', sendType);
  }, [sendType]);

  useEffect(() => {
    localStorage.setItem('createNewsScheduledDate', scheduledDate);
  }, [scheduledDate]);

  const clearDraft = () => {
    localStorage.removeItem('createNewsDraft');
    localStorage.removeItem('createNewsSendType');
    localStorage.removeItem('createNewsScheduledDate');
  };

  // Custom image handler: uploads to Cloudinary instead of embedding base64
  const handleContentImageInsert = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        setUploadingContentImg(true);
        const sigRes = await apiClient.get('/v1/cloudinary/signature?folder=news_content');
        const { signature, timestamp, apiKey, cloudName, folder } = sigRes.data;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', apiKey);
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);
        formData.append('folder', folder);
        const uploadRes = await axios.post(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, formData);
        const url: string = uploadRes.data.secure_url;
        const editor = quillRef.current?.getEditor();
        if (editor) {
          const range = editor.getSelection(true);
          editor.insertEmbed(range.index, 'image', url);
          editor.setSelection(range.index + 1, 0);
        }
      } catch {
        toast.error('Lỗi khi tải ảnh nội dung lên Cloudinary');
      } finally {
        setUploadingContentImg(false);
      }
    };
    input.click();
  }, []);

  // Editor modules
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        [{ 'font': [] }],
        [{ 'size': [] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote', 'code-block'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        ['link', 'image', 'video'],
        ['clean']
      ],
      handlers: {
        image: handleContentImageInsert,
      }
    }
  }), [handleContentImageInsert]);

  const [uploadingImg, setUploadingImg] = useState(false);

  const uploadToCloudinary = async (file: File) => {
    try {
      setUploadingImg(true);
      const res = await apiClient.get('/v1/cloudinary/signature?folder=news_thumbnails');
      const { signature, timestamp, apiKey, cloudName, folder } = res.data;
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      formData.append('folder', folder);

      const uploadRes = await axios.post(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, formData);
      setForm(prev => ({ ...prev, thumbnailImage: uploadRes.data.secure_url }));
      toast.success('Tải ảnh bìa thành công');
    } catch (e) {
      toast.error('Lỗi khi tải ảnh lên Cloudinary');
    } finally {
      setUploadingImg(false);
    }
  };

  const deleteFromCloudinary = async (url: string) => {
    try {
        const parts = url.split('/');
        const fileWithExt = parts.pop();
        const folder = parts.pop();
        const publicId = `${folder}/${fileWithExt?.split('.')[0]}`;
        await apiClient.delete(`/v1/cloudinary/image?publicId=${publicId}`);
    } catch (e) {
        console.error('Failed to delete old image', e);
    }
  };

  const handleUploadImage = async (file?: File) => {
    if (!file) return;
    if (form.thumbnailImage && form.thumbnailImage.includes('cloudinary.com')) {
      await deleteFromCloudinary(form.thumbnailImage);
    }
    await uploadToCloudinary(file);
  };

  const handleRemoveImage = async () => {
    if (form.thumbnailImage && form.thumbnailImage.includes('cloudinary.com')) {
      await deleteFromCloudinary(form.thumbnailImage);
    }
    setForm(prev => ({ ...prev, thumbnailImage: '' }));
  };

  const handleSave = async (status: NewsStatus) => {
    if (!form.title.trim()) {
      toast.error('Vui lòng nhập tiêu đề bài viết');
      return;
    }
    if (!form.content.trim()) {
      toast.error('Vui lòng nhập nội dung');
      return;
    }

    // Strip any stray base64 images that might have slipped in (safety net)
    const safeContent = form.content.replace(/<img[^>]+src="data:image[^"]*"[^>]*>/gi, '');
    let payload = { ...form, content: safeContent, status };

    if (sendType === 'SCHEDULED') {
      if (!scheduledDate) {
        toast.error('Vui lòng chọn ngày giờ lên lịch gửi');
        return;
      }
      const selectedTime = new Date(scheduledDate).getTime();
      const currentTime = new Date().getTime();
      
      if (selectedTime <= currentTime) {
        toast.error('Ngày giờ lên lịch không hợp lệ. Vui lòng chọn thời gian trong tương lai.');
        return;
      }

      payload.scheduledAt = scheduledDate.length === 16 ? scheduledDate + ':00' : scheduledDate;
    }

    try {
      setSubmitting(true);
      await newsService.createNews(payload);
      toast.success(status === NewsStatus.DRAFT ? 'Đã lưu nháp' : 'Tạo bài viết thành công');
      clearDraft();
      navigate(`${basePath}/news-management`);
    } catch {
      toast.error('Không thể xử lý yêu cầu bài viết');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout pageTitle="Tạo tin tức">
      <div className="max-w-[1400px] mx-auto p-4 md:p-6 bg-gray-50 dark:bg-zinc-950 min-h-[calc(100vh-100px)] flex flex-col">
        
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tạo bài viết mới</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
          
          {/* CỘT TRÁI - NỘI DUNG CHÍNH */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800 space-y-6 h-full flex flex-col">
              
              {/* Tiêu đề bài viết */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Tiêu đề bài viết <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nhập tiêu đề tin tức..."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-fpt-orange/20 transition-all outline-none"
                />
              </div>

              {/* Nội dung chi tiết (thay thế tóm tắt ngắn) */}
              <div className="flex-1 flex flex-col">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Nội dung <span className="text-red-500">*</span>
                </label>
                <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex-1 flex flex-col">
                  {uploadingContentImg && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-sm border-b border-gray-200 dark:border-zinc-700">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang tải ảnh lên, vui lòng chờ...
                    </div>
                  )}
                  <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={form.content}
                    onChange={(val) => {
                      const newForm = { ...form, content: val };
                      // Tự động lấy ảnh Cloudinary đầu tiên làm ảnh bìa nếu chưa có
                      if (!form.thumbnailImage) {
                        const cloudImgRe = new RegExp('<img[^>]+src="(https://[^"]+)"');
                        const match = val.match(cloudImgRe);
                        if (match && match[1]) {
                          newForm.thumbnailImage = match[1];
                          toast.success('Đã tự động lấy ảnh đầu tiên làm ảnh bìa');
                        }
                      }
                      setForm(newForm);
                    }}
                    placeholder="Nhập nội dung bài viết..."
                    modules={modules}
                    className="flex-1 outline-none min-h-[400px]"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* CỘT PHẢI - CÀI ĐẶT */}
          <div className="lg:col-span-1 space-y-6 sticky top-6 h-fit">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800 space-y-6">
              
              {/* Ảnh bìa */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Ảnh bìa (Thumbnail)
                </label>
                
                {/* Khung Kéo thả / Xem chi tiết ảnh */}
                <div className="border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 p-2 flex flex-col items-center justify-center text-center relative overflow-hidden mb-3 min-h-[200px]">
                  {uploadingImg ? (
                    <div className="flex flex-col items-center justify-center p-8">
                       <Loader2 className="w-8 h-8 text-fpt-orange animate-spin mb-2" />
                       <span className="text-sm">Đang tải ảnh lên...</span>
                    </div>
                  ) : form.thumbnailImage ? (
                    <div className="relative w-full h-full group flex items-center justify-center">
                      <img src={form.thumbnailImage} alt="Thumbnail preview" className="max-w-full object-contain rounded-xl" style={{ maxHeight: '200px' }} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                        <button 
                          onClick={handleRemoveImage}
                          className="px-4 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 shadow-lg"
                        >
                          <Trash2 size={16} /> Xóa ảnh
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors w-full h-full"
                         onDragOver={(e) => e.preventDefault()}
                         onDrop={(e) => { e.preventDefault(); handleUploadImage(e.dataTransfer.files?.[0]); }}
                    >
                      <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/20 text-fpt-orange rounded-full flex items-center justify-center mb-4 transition-transform hover:scale-110">
                        <CloudUpload className="w-7 h-7" />
                      </div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">
                        Kéo thả ảnh vào đây<br/>hoặc
                      </p>
                      <label className="px-5 py-2.5 bg-fpt-orange text-white text-sm font-medium rounded-xl cursor-pointer hover:bg-[#e06912] transition-colors shadow-sm inline-block">
                        Chọn file
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadImage(e.target.files?.[0])} />
                      </label>
                    </div>
                  )}
                </div>

                {/* Hoặc nhập URL */}
                <input
                  type="text"
                  placeholder="Hoặc nhập URL hình ảnh..."
                  value={form.thumbnailImage || ''}
                  onChange={(e) => setForm({ ...form, thumbnailImage: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-fpt-orange/20 transition-all text-sm outline-none"
                />
              </div>

              {/* Hình thức & Danh mục */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Danh mục
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as NewsType })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-fpt-orange/20 outline-none mb-6 text-sm"
                >
                  <option value={NewsType.EVENT}>Sự kiện</option>
                  <option value={NewsType.IMPORTANT}>Thông báo quan trọng</option>
                  <option value={NewsType.OTHER}>Khác</option>
                </select>

                {/* Đối tượng */}
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Đối tượng người nhận
                </label>
                <select
                  value={form.targetType}
                  onChange={(e) => setForm({ ...form, targetType: e.target.value as NewsTargetType })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-fpt-orange/20 outline-none mb-6 text-sm"
                >
                  <option value={NewsTargetType.ALL}>Toàn trường</option>
                  <option value={NewsTargetType.STUDENT}>Tất cả sinh viên</option>
                  <option value={NewsTargetType.LECTURER}>Tất cả giảng viên</option>
                </select>

                {/* Lịch gửi */}
                <div className="space-y-4 mt-4">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${sendType === 'NOW' ? 'border-fpt-orange' : 'border-gray-300 dark:border-zinc-600'}`}>
                      {sendType === 'NOW' && <div className="w-3 h-3 bg-fpt-orange rounded-full" />}
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                      Gửi ngay
                    </span>
                    <input 
                      type="radio" 
                      name="sendType" 
                      className="hidden" 
                      checked={sendType === 'NOW'} 
                      onChange={() => setSendType('NOW')} 
                    />
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${sendType === 'DRAFT' ? 'border-fpt-orange' : 'border-gray-300 dark:border-zinc-600'}`}>
                      {sendType === 'DRAFT' && <div className="w-3 h-3 bg-fpt-orange rounded-full" />}
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                      Lưu nháp
                    </span>
                    <input 
                      type="radio" 
                      name="sendType" 
                      className="hidden" 
                      checked={sendType === 'DRAFT'} 
                      onChange={() => setSendType('DRAFT')} 
                    />
                  </label>
                  
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${sendType === 'SCHEDULED' ? 'border-fpt-orange' : 'border-gray-300 dark:border-zinc-600'}`}>
                        {sendType === 'SCHEDULED' && <div className="w-3 h-3 bg-fpt-orange rounded-full" />}
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                        Lên lịch gửi
                      </span>
                      <input 
                        type="radio" 
                        name="sendType" 
                        className="hidden" 
                        checked={sendType === 'SCHEDULED'} 
                        onChange={() => setSendType('SCHEDULED')} 
                      />
                    </label>
                    
                    {sendType === 'SCHEDULED' && (
                      <div className="pl-8 animate-in slide-in-from-top-2 fade-in duration-200 mt-2">
                        <input
                          type="datetime-local"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm bg-gray-50 dark:bg-zinc-800 outline-none focus:ring-2 focus:ring-fpt-orange/20"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Vui lòng chọn thời gian xuất bản trong tương lai.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* BUTTONS XUỐNG DƯỚI GÓC PHẢI */}
            <div className="flex flex-wrap items-center justify-end gap-3 mt-4">
              <button 
                onClick={() => navigate(`${basePath}/news-management`)}
                className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-zinc-700 font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors text-sm"
              >
                Hủy
              </button>

              <button 
                disabled={submitting} 
                onClick={() => handleSave(sendType === 'DRAFT' ? NewsStatus.DRAFT : sendType === 'SCHEDULED' ? NewsStatus.SCHEDULED : NewsStatus.SENT)}
                className="px-5 py-2.5 rounded-xl bg-fpt-orange hover:bg-[#e06912] text-white font-medium shadow-sm shadow-orange-500/20 transition-colors flex items-center gap-2 text-sm disabled:opacity-70"
              >
                {submitting ? 'Đang xử lý...' : sendType === 'DRAFT' ? 'Lưu nháp' : sendType === 'SCHEDULED' ? 'Lên lịch gửi' : 'Xuất bản tin tức'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
};

export default CreateNewsPage;
