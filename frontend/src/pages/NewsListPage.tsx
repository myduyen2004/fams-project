import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AcademicStaffLayout } from '../layouts/AcademicStaffLayout';
import { LecturerLayout } from '../layouts/LecturerLayout';
import { StudentLayout } from '../layouts/StudentLayout';
import { authService } from '../services/api/authService';
import { newsService } from '../services/api/newsService';
import { NewsItem } from '../types/news';
import { Loader2, Newspaper } from 'lucide-react';
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
  const Layout = roleLayouts[(user?.role as keyof typeof roleLayouts) || 'ADMIN'] || AdminLayout;

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await newsService.getPublishedNews(0, 50);
        setItems(data.content || []);
      } catch {
        toast.error('Không thể tải tin tức');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <Layout pageTitle="Tin tức">
      <div className="max-w-5xl mx-auto space-y-4">
        {loading ? (
          <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-fpt-orange" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Newspaper className="w-10 h-10 mx-auto mb-3" />
            Chưa có tin tức nào.
          </div>
        ) : (
          items.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(`/news/${item.id}`)}
              className="w-full text-left p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 hover:border-fpt-orange/40"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{item.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{new Date(item.publishedAt || item.createdAt).toLocaleString('vi-VN')}</p>
            </button>
          ))
        )}
      </div>
    </Layout>
  );
};

export default NewsListPage;
