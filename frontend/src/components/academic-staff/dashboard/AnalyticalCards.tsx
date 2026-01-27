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
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-gray-100 dark:border-zinc-800 flex flex-col h-full hover:shadow-[0_20px_60px_rgba(0,0,0,0.15)] transition-all duration-500 group/card">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-[11px] font-black text-zinc-800 dark:text-white tracking-[0.2em] uppercase">{title}</p>
        </div>
        <div>
          {trend && (
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">
              <TrendingUp size={12} />
              {trend}
            </div>
          )}
        </div>
      </div>
      
      <div className="mb-2">
        <h3 className="text-2xl font-black text-zinc-900 dark:text-white tabular-nums tracking-tight">{value}</h3>
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
                      <span className="font-black text-orange-500">{payload[0].value?.toLocaleString()}</span>
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
