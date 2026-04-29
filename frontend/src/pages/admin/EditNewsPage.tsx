import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { newsService } from '../../services/api/newsService';
import { NewsRequest, NewsTargetType, NewsType, NewsStatus } from '../../types/news';
import toast from "@utils/toast";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { CloudUpload, Loader2, Trash2, Calendar, Clock } from 'lucide-react';
import apiClient from '../../services/api/authService';
import axios from 'axios';
import { CustomSelect } from '../../components/common/CustomSelect';
import { CustomDateTimePicker } from '../../components/common/CustomDateTimePicker';

export const EditNewsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const isAcademicStaff = location.pathname.startsWith('/academic-staff');
  const basePath = useMemo(() => isAcademicStaff ? '/academic-staff' : '/admin', [isAcademicStaff]);
  const Layout = isAcademicStaff ? AcademicStaffLayout : AdminLayout;

  const [form, setForm] = useState<NewsRequest>({
    title: '',
    content: '',
    targetType: NewsTargetType.ALL,
    type: NewsType.EVENT,
    thumbnailImage: '',
    attachmentUrls: []
  });

  const [sendType, setSendType] = useState<'NOW' | 'SCHEDULED' | 'DRAFT'>('NOW');
  const [scheduledDate, setScheduledDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingContentImg, setUploadingContentImg] = useState(false);
  const quillRef = useRef<ReactQuill>(null);

  // Custom image handler
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
        [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
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
    } catch {
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

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const data = await newsService.getAdminNewsById(Number(id));
        setForm({
          title: data.title,
          content: data.content,
          targetType: data.targetType,
          type: data.type || NewsType.EVENT,
          thumbnailImage: data.thumbnailImage || '',
          attachmentUrls: data.attachmentUrls || []
        });
        
        if (data.status === NewsStatus.DRAFT) {
          setSendType('DRAFT');
        } else if (data.status === NewsStatus.SCHEDULED) {
          setSendType('SCHEDULED');
          if (data.scheduledAt) {
            setScheduledDate(data.scheduledAt.slice(0, 16));
          }
        } else {
          setSendType('NOW');
        }
      } catch {
        toast.error('Không thể tải tin tức');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSave = async (status: NewsStatus) => {
    if (!id) return;
    if (!form.title.trim()) {
      toast.error('Vui lòng nhập tiêu đề bài viết');
      return;
    }
    if (!form.content.trim()) {
      toast.error('Vui lòng nhập nội dung');
      return;
    }

    const payload = { ...form, status };

    if (sendType === 'SCHEDULED') {
      if (!scheduledDate) {
        toast.error('Vui lòng chọn ngày giờ lên lịch');
        return;
      }
      const selectedTime = new Date(scheduledDate).getTime();
      const currentTime = new Date().getTime();
      
      if (selectedTime <= currentTime) {
        toast.error('Ngày giờ lên lịch không hợp lệ. Vui lòng chọn thời gian trong tương lai.');
        return;
      }

      payload.scheduledAt = scheduledDate.length === 16 ? scheduledDate + ':00' : scheduledDate;
    } else {
      payload.scheduledAt = undefined;
    }

    try {
      setSubmitting(true);
      await newsService.updateNews(Number(id), payload);
      toast.success(status === NewsStatus.DRAFT ? 'Đã lưu nháp' : 'Cập nhật tin tức thành công');
      navigate(`${basePath}/news-management`); 
    } catch (error: unknown) {
      const errData = (error as { response?: { data?: { errors?: Record<string, string>; message?: string } } })?.response?.data;
      if (errData?.errors) {
        const messages = Object.values(errData.errors).join('\n');
        toast.error(messages);
      } else if (errData?.message) {
        toast.error(errData.message);
      } else {
        toast.error('Không thể xử lý yêu cầu bài viết');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout pageTitle="Chỉnh sửa tin tức">
        <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-zinc-950">
          <div className="w-8 h-8 border-4 border-fpt-orange border-t-transparent flex-shrink-0 rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Chỉnh sửa tin tức">
      <div className="max-w-[1400px] mx-auto p-4 md:p-6 bg-gray-50 dark:bg-zinc-950 min-h-[calc(100vh-100px)] flex flex-col">
        
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Chỉnh sửa bài viết</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
          
          {/* CỘT TRÁI - NỘI DUNG CHÍNH */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800 space-y-6 h-full flex flex-col">
              
              {/* Tiêu đề bài viết */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2 ml-1">
                  Tiêu đề bài viết <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nhập tiêu đề tin tức..."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full h-[52px] px-4 bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-fpt-orange/10 focus:border-fpt-orange transition-all hover:border-fpt-orange/40 outline-none text-gray-900 dark:text-white font-medium shadow-sm"
                />
              </div>

              {/* Nội dung chi tiết */}
              <div className="flex-1 flex flex-col">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2 ml-1">
                  Nội dung <span className="text-red-500">*</span>
                </label>
                <div className="rounded-2xl overflow-hidden border-2 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-1 flex flex-col shadow-sm">
                  {uploadingContentImg && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-xs border-b border-gray-200 dark:border-zinc-700">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang tải ảnh lên...
                    </div>
                  )}
                  <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={form.content}
                    onChange={(val) => {
                      const newForm = { ...form, content: val };
                      if (!form.thumbnailImage) {
                        const match = val.match(/<img[^>]+src="([^">]+)"/);
                        if (match && match[1]) {
                          newForm.thumbnailImage = match[1];
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
          <div className="lg:col-span-1 space-y-6 sticky top-6 h-fit pb-10">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-zinc-800 space-y-6">
              
              {/* Ảnh bìa */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3 ml-1">
                  Ảnh bìa (Thumbnail)
                </label>
                
                <div className="border-2 border-dashed border-gray-100 dark:border-zinc-800 rounded-2xl bg-gray-50/50 dark:bg-zinc-800/30 p-2 flex flex-col items-center justify-center text-center relative overflow-hidden mb-4 min-h-[180px] group transition-all hover:border-fpt-orange/40">
                  {uploadingImg ? (
                    <div className="flex flex-col items-center justify-center p-8">
                       <Loader2 className="w-8 h-8 text-fpt-orange animate-spin mb-2" />
                       <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Đang tải...</span>
                    </div>
                  ) : form.thumbnailImage ? (
                    <div className="relative w-full h-full group flex items-center justify-center">
                      <img src={form.thumbnailImage} alt="Thumbnail preview" className="max-w-full object-contain rounded-xl shadow-md" style={{ maxHeight: '180px' }} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl backdrop-blur-[2px]">
                        <button 
                          onClick={handleRemoveImage}
                          className="px-4 py-2 bg-red-500 text-white font-bold text-xs rounded-xl hover:bg-red-600 transition-all flex items-center gap-2 shadow-lg active:scale-95"
                        >
                          <Trash2 size={14} /> XÓA ẢNH
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 flex flex-col items-center justify-center cursor-pointer transition-colors w-full h-full"
                         onDragOver={(e) => e.preventDefault()}
                         onDrop={(e) => { e.preventDefault(); handleUploadImage(e.dataTransfer.files?.[0]); }}
                    >
                      <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/20 text-fpt-orange rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 group-hover:rotate-6 shadow-sm">
                        <CloudUpload className="w-6 h-6" />
                      </div>
                      <p className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
                        Kéo thả ảnh hoặc chọn file
                      </p>
                      <label className="px-6 py-2.5 bg-fpt-orange text-white text-[11px] font-black uppercase tracking-widest rounded-xl cursor-pointer hover:bg-orange-600 transition-all shadow-lg shadow-fpt-orange/20 inline-block active:scale-95">
                        Chọn file
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadImage(e.target.files?.[0])} />
                      </label>
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="Hoặc nhập URL hình ảnh..."
                  value={form.thumbnailImage || ''}
                  onChange={(e) => setForm({ ...form, thumbnailImage: e.target.value })}
                  className="w-full h-[48px] px-4 rounded-xl border-2 border-gray-50 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/30 focus:bg-white dark:focus:bg-zinc-900 focus:border-fpt-orange transition-all text-sm outline-none font-medium"
                />
              </div>

              {/* Danh mục */}
              <div>
                <CustomSelect
                  label="Danh mục tin tức"
                  value={form.type as string}
                  onChange={(value) => setForm({ ...form, type: value as NewsType })}
                  options={[
                      { value: NewsType.EVENT, label: 'Sự kiện' },
                      { value: NewsType.FEATURED, label: 'Sự kiện nổi bật' },
                      { value: NewsType.IMPORTANT, label: 'Thông báo quan trọng' },
                      { value: NewsType.OTHER, label: 'Khác' }
                  ]}
                />

                {form.type === NewsType.FEATURED && (
                  <p className="text-[11px] font-bold text-orange-500 mt-2 ml-1 uppercase tracking-wider flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                    Sẽ xuất hiện tại mục nổi bật
                  </p>
                )}
              </div>

              {/* Đối tượng */}
              <div>
                <CustomSelect
                  label="Đối tượng người nhận"
                  value={form.targetType as string}
                  onChange={(value) => setForm({ ...form, targetType: value as NewsTargetType })}
                  options={[
                      { value: NewsTargetType.ALL, label: 'Toàn trường' },
                      { value: NewsTargetType.STUDENT, label: 'Tất cả sinh viên' },
                      { value: NewsTargetType.LECTURER, label: 'Tất cả giảng viên' }
                  ]}
                />
              </div>

              {/* Hình thức gửi */}
              <div className="space-y-3 pt-2">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-gray-400 dark:text-zinc-500 ml-1">
                  Phương thức xuất bản
                </label>
                
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'NOW', label: 'Xuất bản ngay', icon: <Calendar size={14} /> },
                    { id: 'DRAFT', label: 'Lưu bản nháp', icon: <Trash2 size={14} /> },
                    { id: 'SCHEDULED', label: 'Lên lịch gửi', icon: <Clock size={14} /> }
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setSendType(type.id as any)}
                      className={`
                        flex items-center gap-3 px-4 h-[48px] rounded-xl text-sm font-bold transition-all border-2
                        ${sendType === type.id 
                          ? 'bg-orange-50 dark:bg-orange-950/10 border-fpt-orange text-fpt-orange shadow-sm' 
                          : 'bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:border-gray-200'}
                      `}
                    >
                      <div className={`
                        w-6 h-6 rounded-lg flex items-center justify-center
                        ${sendType === type.id ? 'bg-fpt-orange text-white' : 'bg-gray-100 dark:bg-zinc-800'}
                      `}>
                        {type.icon}
                      </div>
                      {type.label}
                    </button>
                  ))}
                </div>

                {sendType === 'SCHEDULED' && (
                  <div className="animate-in slide-in-from-top-2 fade-in duration-300 mt-4">
                    <CustomDateTimePicker
                      label="Thời gian lên lịch"
                      value={scheduledDate}
                      onChange={setScheduledDate}
                    />
                    <p className="text-[10px] text-gray-400 mt-2 ml-1 uppercase font-bold tracking-wider italic">
                      Chọn thời gian trong tương lai
                    </p>
                  </div>
                )}
              </div>

            </div>
            
            <div className="flex flex-col gap-3">
              <button 
                disabled={submitting} 
                onClick={() => handleSave(sendType === 'DRAFT' ? NewsStatus.DRAFT : sendType === 'SCHEDULED' ? NewsStatus.SCHEDULED : NewsStatus.SENT)}
                className="h-[52px] w-full bg-fpt-orange hover:bg-orange-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-fpt-orange/20 transition-all flex items-center justify-center gap-3 disabled:opacity-70 active:scale-[0.98]"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : 'Lưu thay đổi'}
              </button>

              <button 
                onClick={() => navigate(`${basePath}/news-management`)}
                className="h-[52px] w-full bg-white dark:bg-zinc-900 border-2 border-gray-100 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 font-bold uppercase tracking-widest rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all text-xs active:scale-[0.98]"
              >
                Hủy bỏ
              </button>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
};

export default EditNewsPage;

