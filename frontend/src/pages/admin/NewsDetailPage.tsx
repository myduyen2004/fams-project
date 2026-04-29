import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AcademicStaffLayout } from '../../layouts/AcademicStaffLayout';
import { newsService } from '../../services/api/newsService';
import { NewsItem, NewsStatus } from '../../types/news';
import toast from "@utils/toast";
import { Calendar, Send, Edit3, Tag } from 'lucide-react';

export const NewsDetailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const isAcademicStaff = location.pathname.startsWith('/academic-staff');
  const basePath = useMemo(() => isAcademicStaff ? '/academic-staff' : '/admin', [isAcademicStaff]);
  const Layout = isAcademicStaff ? AcademicStaffLayout : AdminLayout;
  
  const [news, setNews] = useState<NewsItem | null>(null);
  const [recentNews, setRecentNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const data = await newsService.getAdminNewsById(Number(id));
        setNews(data);
      } catch {
        toast.error('Không thể tải chi tiết tin tức');
      }
    };
    load();
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    const loadRecent = async () => {
      try {
        const data = await newsService.getAdminNews({ page: 0, size: 5 });
        if (data && data.content) {
          setRecentNews(data.content.filter(n => n.id !== Number(id)).slice(0, 3));
        }
      } catch (e) {
        // fail silently for related news
      }
    };
    if (id) loadRecent();
  }, [id]);

  const handlePublish = async () => {
    if (!news) return;
    try {
      await newsService.publishNews(news.id);
      toast.success('Đã xuất bản tin tức');
      const data = await newsService.getAdminNewsById(news.id);
      setNews(data);
    } catch {
      toast.error('Không thể xuất bản tin tức');
    }
  };

  if (!news) {
    return (
      <Layout pageTitle="Chi tiết tin tức">
        <div className="p-6 flex items-center justify-center min-h-[500px]">
          <div className="w-8 h-8 border-4 border-fpt-orange border-t-transparent flex-shrink-0 rounded-full animate-spin"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Chi tiết tin tức">
      <div className="pb-12 bg-gray-50 dark:bg-zinc-950 min-h-screen">
        
        {/* BANNER SECTION */}
        <div className="relative w-full overflow-hidden bg-gradient-to-b from-orange-50 to-white dark:from-orange-950/20 dark:to-zinc-950 pb-8 pt-12">
          {/* Mờ ảnh nền */}
          <div className="absolute inset-0 z-0 select-none pointer-events-none">
            {news.thumbnailImage ? (
              <img src={news.thumbnailImage} className="w-full h-full object-cover opacity-50 dark:opacity-20 select-none" alt="" />
            ) : (
              <img src="/images/logo.png" className="w-full h-full object-cover opacity-20 dark:opacity-10 select-none p-10" alt="FPT Logo" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-gray-50/80 to-transparent dark:from-zinc-950 dark:via-zinc-950/80"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50/90 via-gray-50/40 to-transparent dark:from-zinc-950/90 dark:via-zinc-950/40"></div>
          </div>
          
          <div className="relative z-10 max-w-[1400px] mx-auto px-4 md:px-8">
            <div className="flex flex-wrap items-center justify-end gap-4 mb-4">
              
              <div className="flex items-center gap-3">
                <button onClick={() => navigate(`${basePath}/news-management`)} className="px-4 py-2 bg-white/80 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-zinc-700 transition-colors backdrop-blur-sm">
                  Quay lại danh sách
                </button>
                <button onClick={() => navigate(`${basePath}/news/edit/${id}`)} className="px-5 py-2 bg-fpt-orange hover:bg-[#e06912] text-white rounded-xl text-sm font-semibold shadow-sm shadow-orange-500/20 transition-colors flex items-center gap-2">
                  <Edit3 className="w-4 h-4" /> Chỉnh sửa tin tức
                </button>
                {news.status !== NewsStatus.SENT && news.status !== NewsStatus.SCHEDULED && (
                  <button onClick={handlePublish} className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-green-600/20 transition-colors flex items-center gap-2">
                    <Send className="w-4 h-4" /> Xuất bản ngay
                  </button>
                )}
              </div>
            </div>

            <h1 className="text-3xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-[1.2] mb-6 max-w-5xl tracking-tight">
              {news.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400 mb-8">
              <span className={`px-3 py-2 rounded-xl border backdrop-blur-sm ${
                news.status === NewsStatus.SENT || news.status === NewsStatus.SCHEDULED
                  ? 'bg-green-100/80 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400'
                  : 'bg-amber-100/80 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-400'
              }`}>
                {news.status === NewsStatus.SENT ? 'Đã xuất bản' : news.status === NewsStatus.SCHEDULED ? 'Đã lên lịch' : 'Bản nháp'}
              </span>
              <span className="flex items-center gap-1.5 bg-white/60 dark:bg-zinc-800/60 px-3 py-2 rounded-xl border border-gray-200/50 dark:border-zinc-700/50 backdrop-blur-sm">
                <Tag className="w-4 h-4" />
                {news.type === 'FEATURED' ? 'Sự kiện nổi bật' : news.type === 'EVENT' ? 'Sự kiện' : news.type === 'IMPORTANT' ? 'Quan trọng' : 'Tin tức'}
              </span>
              <span className="flex items-center gap-1.5 bg-white/60 dark:bg-zinc-800/60 px-3 py-2 rounded-xl border border-gray-200/50 dark:border-zinc-700/50 backdrop-blur-sm">
                <Calendar className="w-4 h-4" />
                {new Date(news.publishedAt || news.createdAt).toLocaleString('vi-VN')}
              </span>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT SECTION */}
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column (Content) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Rich Text Content */}
              <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 text-justify md:p-10 shadow-sm border border-gray-100 dark:border-zinc-800">
                <div 
                  className="prose prose-lg md:prose-xl max-w-none dark:prose-invert prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-white prose-a:text-fpt-orange hover:prose-a:text-orange-600 prose-img:rounded-2xl prose-img:shadow-sm" 
                  dangerouslySetInnerHTML={{ __html: news.content }} 
                />
              </div>
            </div>

            {/* Right Column (Sidebar) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Related News Card */}
              <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-zinc-800">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1.5 h-6 bg-fpt-orange rounded-full"></div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Tin tức</h3>
                </div>
                
                <div className="space-y-5">
                  {recentNews.length > 0 ? recentNews.map(item => (
                    <div key={item.id} className="flex gap-4 group cursor-pointer" onClick={() => navigate(`${basePath}/news/${item.id}`)}>
                      <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 shadow-sm">
                        {item.thumbnailImage ? (
                          <img src={item.thumbnailImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.title} />
                        ) : (
                          <img src="/images/logo.png" className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-500" alt="FPT Logo" />
                        )}
                      </div>
                      <div className="flex flex-col flex-1 py-1">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 group-hover:text-fpt-orange transition-colors leading-snug">
                          {item.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
                          {new Date(item.createdAt).toLocaleString('vi-VN')}
                        </p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-500 text-center py-4">Chưa có bản ghi nào khác.</p>
                  )}
                </div>
              </div>

              {/* Article Info Card */}
              <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-zinc-800">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1.5 h-6 bg-fpt-orange rounded-full"></div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Thông tin Quản lý</h3>
                </div>
                
                <div className="space-y-0 text-sm">
                  <div className="flex justify-between items-center py-4 border-b border-gray-100 dark:border-zinc-800/60">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">ID Bài viết:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{news.id}</span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-gray-100 dark:border-zinc-800/60">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Trạng thái:</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {news.status === NewsStatus.SENT ? 'Đã xuất bản' : news.status === NewsStatus.SCHEDULED ? 'Đã lên lịch' : 'Bản nháp'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-gray-100 dark:border-zinc-800/60">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Đối tượng:</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {news.targetType === 'ALL' ? 'Toàn trường' : news.targetType === 'STUDENT' ? 'Sinh viên' : 'Giảng viên'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-gray-100 dark:border-zinc-800/60">
                    <span className="text-gray-500 dark:text-gray-400 font-medium">Người đăng:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{news.senderName}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default NewsDetailPage;

