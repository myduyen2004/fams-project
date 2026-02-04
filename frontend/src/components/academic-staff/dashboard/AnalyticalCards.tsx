import { TrendingUp } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, Cell, Tooltip } from 'recharts';



interface StatCardProps {
  title: string;
  value: string;
  trend?: string;
  icon: React.ReactNode;
  variant?: 'orange' | 'blue';
  chartData: { name: string; value: number }[];
}

const StatCard: React.FC<Omit<StatCardProps, 'icon'>> = ({ title, value, trend, variant = 'orange', chartData }) => {
  const isOrange = variant === 'orange';
  
  return (
    <div className={`group/card relative rounded-2xl p-5 shadow-sm border transition-all duration-300 flex flex-col h-full ${
      isOrange 
        ? 'bg-gradient-to-br from-orange-50/80 to-amber-50/80 dark:from-orange-900/5 dark:to-amber-900/5 border-orange-100/50 dark:border-orange-800/20'
        : 'bg-gradient-to-br from-blue-50/80 to-sky-50/80 dark:from-blue-900/5 dark:to-sky-900/5 border-blue-100/50 dark:border-blue-800/20'
    } hover:shadow-md`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className={`text-xs font-bold tracking-wide uppercase ${
            isOrange ? 'text-zinc-500 dark:text-zinc-400' : 'text-zinc-500 dark:text-zinc-400'
          }`}>{title}</p>
        </div>
        <div>
          {trend && (
            <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full ${
              isOrange 
               ? 'text-emerald-600 bg-emerald-100/50 dark:bg-emerald-500/10 dark:text-emerald-400'
               : 'text-emerald-600 bg-emerald-100/50 dark:bg-emerald-500/10 dark:text-emerald-400'
            }`}>
              <TrendingUp size={12} />
              {trend}
            </div>
          )}
        </div>
      </div>
      
      <div className="mb-2">
        <h3 className="text-2xl font-black text-zinc-800 dark:text-white tabular-nums tracking-tight">{value}</h3>
      </div>

      <div className="mt-auto h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <Tooltip 
              cursor={{ fill: 'transparent' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-zinc-900 text-white px-3 py-1.5 rounded-xl text-[10px] shadow-xl border border-zinc-800">
                      <span className="font-bold text-gray-400 mr-2 uppercase tracking-wider">{data.name}:</span>
                      <span className={`font-black ${isOrange ? 'text-orange-500' : 'text-blue-500'}`}>{payload[0].value?.toLocaleString()}</span>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={variant === 'orange' ? 32 : 28}>
              {chartData.map((_entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={variant === 'orange' ? '#F37021' : '#3B82F6'} 
                  fillOpacity={0.2 + (index / chartData.length) * 0.8} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const AnalyticalCards: React.FC<{ stats?: any }> = ({ stats }) => {
  const studentData = [
    { name: 'CNTT', value: 8432 },
    { name: 'Kinh tế', value: 5210 },
    { name: 'Ngôn ngữ', value: 5400 },
    { name: 'Thiết kế', value: 3100 },
    { name: 'Du lịch', value: 2800 },
    { name: 'Marketing', value: 4200 }
  ];
  
  const lecturerData = [
    { name: 'Toán-Tin', value: 180 },
    { name: 'Kỹ thuật', value: 214 },
    { name: 'Ngoại ngữ', value: 130 },
    { name: 'Kỹ năng', value: 95 },
    { name: 'Lý luận', value: 64 },
    { name: 'Thể chất', value: 45 }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
      <StatCard
        title="SINH VIÊN"
        value={stats?.totalStudents?.toLocaleString() || '19,042'}
        trend="+12%"
        chartData={studentData}
      />
      <StatCard
        title="GIẢNG VIÊN"
        value={stats?.totalLecturers?.toLocaleString() || '524'}
        variant="blue"
        chartData={lecturerData}
      />
    </div>
  );
};
