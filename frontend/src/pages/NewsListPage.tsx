import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AcademicStaffLayout } from '../layouts/AcademicStaffLayout';
import { LecturerLayout } from '../layouts/LecturerLayout';
import { StudentLayout } from '../layouts/StudentLayout';
import { authService } from '../services/api/authService';
import { newsService } from '../services/api/newsService';
import { NewsItem } from '../types/news';
import { Loader2, Newspaper, ChevronRight, ChevronLeft, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const roleLayouts = {
  STUDENT: StudentLayout,
  ACADEMIC_STAFF: AcademicStaffLayout,
  LECTURER: LecturerLayout,
  ADMIN: AdminLayout,
} as const;

export const NewsListPage = () => {
  const navigate = useNavigate();
  const user = authService.getUser();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 5;
  
  const Layout = roleLayouts[(user?.role as keyof typeof roleLayouts) || 'ADMIN'] || AdminLayout;

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Fetch a large number of items for client-side pagination and extracting Important news
        const data = await newsService.getPublishedNews(0, 100);
        setItems(data.content || []);
      } catch {
        toast.error('Không thể tải tin tức');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  const translateType = (type: string | undefined) => {
    switch (type) {
      case 'EVENT': return 'Sự kiện';
      case 'IMPORTANT': return 'Quan trọng';
      case 'ACADEMIC': return 'Học tập';
      case 'ATTENDANCE': return 'Điểm danh';
      case 'GRADE': return 'Điểm số';
      case 'CHAT': return 'Tin nhắn';
      case 'SCHEDULE': return 'Lịch trình';
      case 'SYSTEM': return 'Hệ thống';
      case 'OTHER': return 'Khác';
      default: return 'Tin tức';
    }
  };

  const sortedItems = [...items].sort((a, b) => {
    const dateA = new Date(a.publishedAt || a.createdAt || 0).getTime();
    const dateB = new Date(b.publishedAt || b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  const heroNews = sortedItems[0];
  
  // Find important news that are NOT the hero news
  const importantNews = sortedItems
    .filter(n => n.type === 'IMPORTANT' && n.targetType === 'ALL' && n.id !== heroNews?.id)
    .slice(0, 3);
  
  // The rest of the news for the main list
  const listNews = sortedItems
    .filter(n => n.id !== heroNews?.id && !importantNews.find(i => i.id === n.id));

  // Pagination logic
  const totalPages = Math.ceil(listNews.length / pageSize);
  const currentList = listNews.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const fallbackImage = '/images/logo.png';

  return (
    <Layout pageTitle="Tin tức & Sự kiện">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 space-y-12">
        
        {loading ? (
          <div className="text-center py-20 flex flex-col items-center">
            <Loader2 className="w-10 h-10 animate-spin text-fpt-orange mb-4" />
            <p className="text-gray-500 font-medium">Đang tải tin tức...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-gray-500 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-gray-200 dark:border-zinc-800">
            <Newspaper className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">Chưa có tin tức nào được đăng tải.</p>
          </div>
        ) : (
          <>
            {/* HERO SECTION */}
            {heroNews && (
              <div 
                className="relative w-full h-[400px] md:h-[550px] rounded-[32px] overflow-hidden group cursor-pointer shadow-xl shadow-gray-200/50 dark:shadow-black/50"
                onClick={() => navigate(`/news/${heroNews.id}`)}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10 z-10 transition-colors group-hover:bg-black/40"></div>
                {heroNews.thumbnailImage ? (
                  <img 
                    src={heroNews.thumbnailImage} 
                    alt={heroNews.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                  />
                ) : (
                  <img 
                    src={fallbackImage} 
                    alt="FPT Logo"
                    className="absolute inset-0 w-full h-full object-contain p-12 md:p-24 opacity-80 transition-transform duration-1000 group-hover:scale-105" 
                  />
                )}
                
                <div className="absolute inset-0 z-20 flex flex-col justify-end p-8 md:p-14 text-white">
                  <div className="mb-6 flex">
                    <span className="bg-fpt-orange text-white text-xs font-bold px-4 py-2 rounded-full uppercase tracking-wider shadow-lg shadow-orange-500/30">
                      {heroNews.type === 'EVENT' ? 'Sự kiện nổi bật' : (heroNews.type === 'IMPORTANT' ? 'Thông báo khẩn' : 'Tin tức nổi bật')}
                    </span>
                  </div>
                  <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-5 leading-[1.1] max-w-4xl text-white drop-shadow-md">
                    {heroNews.title}
                  </h1>
                  <p className="text-gray-200 line-clamp-2 max-w-2xl mb-8 text-base md:text-xl font-medium drop-shadow-sm">
                    {stripHtml(heroNews.content)}
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    <button className="bg-fpt-orange hover:bg-orange-600 text-white px-8 py-3.5 rounded-full font-bold transition-all shadow-xl shadow-orange-500/20 flex items-center gap-2 text-sm md:text-base hover:-translate-y-0.5" onClick={(e) => { e.stopPropagation(); navigate(`/news/${heroNews.id}`) }}>
                      Đọc chi tiết <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TWO COLUMNS LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              
              {/* LEFT COLUMN: NEWS LIST */}
              <div className="lg:col-span-8 space-y-8">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">Tin mới cập nhật</h2>
                  </div>
                </div>
                
                <div className="space-y-6">
                  {currentList.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => navigate(`/news/${item.id}`)}
                      className="group bg-white dark:bg-zinc-900 rounded-[28px] p-4 flex flex-col sm:flex-row gap-6 border border-gray-100 dark:border-zinc-800 hover:border-gray-200 dark:hover:border-zinc-700 hover:shadow-2xl hover:shadow-gray-200/40 dark:hover:shadow-black/40 transition-all duration-300 cursor-pointer"
                    >
                      {/* THUMBNAIL */}
                      <div className="w-full sm:w-[280px] h-[200px] rounded-[20px] overflow-hidden flex-shrink-0 relative bg-gray-50 dark:bg-zinc-800">
                        {item.thumbnailImage ? (
                          <img 
                            src={item.thumbnailImage} 
                            alt={item.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                          />
                        ) : (
                          <img 
                            src={fallbackImage} 
                            alt="FPT Logo"
                            className="w-full h-full object-contain p-8 transition-transform duration-700 group-hover:scale-105" 
                          />
                        )}
                      </div>
                      
                      {/* CONTENT */}
                      <div className="flex flex-col flex-1 py-1 pr-2">
                        <div className="flex items-center gap-4 mb-3 text-sm">
                          <span className="text-fpt-orange font-bold uppercase tracking-widest text-[11px] bg-orange-50 dark:bg-orange-950/30 px-3 py-1 rounded-full">
                            {translateType(item.type)}
                          </span>
                          <span className="text-gray-300 dark:text-zinc-700">•</span>
                          <span className="text-gray-500 dark:text-gray-400 font-semibold flex items-center gap-1.5 text-xs">
                            {new Date(item.publishedAt || item.createdAt).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-fpt-orange transition-colors line-clamp-2 leading-snug">
                          {item.title}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 line-clamp-2 text-sm md:text-base leading-relaxed mb-auto">
                          {stripHtml(item.content)}
                        </p>
                        <div className="mt-5 flex items-center text-fpt-orange font-bold text-sm">
                          Xem thêm <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* PAGINATION */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-end gap-2 pt-6 border-t border-gray-100 dark:border-zinc-800">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                      className="p-2 rounded-xl bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-orange-50 hover:text-fpt-orange disabled:opacity-50 disabled:hover:bg-gray-50 disabled:hover:text-gray-600 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    
                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentPage(idx)}
                          className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                            currentPage === idx 
                              ? 'bg-fpt-orange text-white shadow-md shadow-orange-500/20' 
                              : 'bg-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>

                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={currentPage === totalPages - 1}
                      className="p-2 rounded-xl bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-orange-50 hover:text-fpt-orange disabled:opacity-50 disabled:hover:bg-gray-50 disabled:hover:text-gray-600 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: IMPORTANT NEWS SIDEBAR */}
              <div className="lg:col-span-4 space-y-8">
                {importantNews.length > 0 && (
                  <div className="bg-[#F8F9FA] dark:bg-zinc-800/40 rounded-[28px] p-7 border border-gray-100 dark:border-zinc-800 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-fpt-orange/5 rounded-bl-full -z-10"></div>
                    
                    <div className="flex items-center gap-2 mb-6">
                      <Zap className="w-5 h-5 text-fpt-orange" />
                      <h4 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
                        Tin Quan Trọng
                      </h4>
                    </div>
                    
                    <div className="space-y-4">
                      {importantNews.map((item, idx) => (
                        <div 
                          key={item.id}
                          onClick={() => navigate(`/news/${item.id}`)}
                          className={`group flex gap-4 items-start cursor-pointer border-b border-gray-200 dark:border-zinc-700/50 pb-4 ${idx === importantNews.length - 1 ? 'border-0 pb-0' : ''}`}
                        >
                          <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-white dark:bg-zinc-900 relative border border-gray-100 dark:border-zinc-800">
                            {item.thumbnailImage ? (
                              <img 
                                src={item.thumbnailImage} 
                                alt={item.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                              />
                            ) : (
                              <img 
                                src={fallbackImage} 
                                alt="FPT Logo"
                                className="w-full h-full object-contain p-3 transition-transform duration-500 group-hover:scale-110" 
                              />
                            )}
                          </div>
                          <div className="flex-1">
                            <span className="text-[10px] uppercase font-bold text-fpt-orange tracking-wider block mb-1">
                              {new Date(item.publishedAt || item.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                            <h5 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-3 group-hover:text-fpt-orange transition-colors leading-snug">
                              {item.title}
                            </h5>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default NewsListPage;
