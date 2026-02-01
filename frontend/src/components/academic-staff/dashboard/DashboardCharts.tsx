import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const lineData = [
  { name: 'Thứ 2', thucTe: 400, duKien: 500 },
  { name: 'Thứ 3', thucTe: 550, duKien: 480 },
  { name: 'Thứ 4', thucTe: 420, duKien: 460 },
  { name: 'Thứ 5', thucTe: 600, duKien: 440 },
  { name: 'Thứ 6', thucTe: 480, duKien: 420 },
  { name: 'Thứ 7', thucTe: 380, duKien: 400 },
  { name: 'Chủ Nhật', thucTe: 320, duKien: 380 },
];

const pieData = [
  { name: 'Đã điểm danh', value: 85, color: '#F37021' },
  { name: 'Vắng mặt', value: 15, color: '#E5E7EB' },
];

export const AttendanceFrequencyChart: React.FC = () => {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-zinc-800 h-[400px] flex flex-col">
      <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-100 dark:border-zinc-800">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Thống kê tần suất nghỉ học
          </h3>
          <p className="text-[10px] text-gray-400 mt-1">Dữ liệu tổng hợp chuyên cần trong 7 ngày gần nhất</p>
        </div>
        <div className="flex gap-4 text-[10px] font-bold">
          <div className="flex items-center gap-1.5 text-orange-500">
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
            Thực tế
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[250px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={lineData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }}
              dy={10}
              padding={{ left: 30, right: 30 }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 'bold' }}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '12px' }}
            />
            <Line 
              type="linear" 
              dataKey="thucTe" 
              stroke="#F37021" 
              strokeWidth={3} 
              dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 6, stroke: '#F37021', strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const DailyAttendanceDonut: React.FC<{ stats?: any }> = () => {
  const percent = 85; // Mock as per image
  const today = new Date();
  const dateStr = today.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-zinc-800 flex flex-col h-[400px]">
      <div className="pb-2 mb-2 border-b border-gray-100 dark:border-zinc-800">
         <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tỷ lệ chuyên cần ngày</h3>
         <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-wider">{dateStr}</p>
      </div>
      
      <div className="flex-1 flex items-center justify-center relative mt-2">
        <div className="w-52 h-52 relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                innerRadius={65}
                outerRadius={85}
                paddingAngle={0}
                dataKey="value"
                startAngle={90}
                endAngle={450}
                cornerRadius={40}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
            <span className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">{percent}%</span>
          </div>
        </div>
      </div>

      <div className="w-full mt-auto space-y-2 pt-2">
          <div className="flex justify-between items-center text-[11px]">
            <div className="flex items-center gap-2 font-bold text-zinc-500">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              Đã điểm danh
            </div>
            <span className="font-bold text-zinc-800 dark:text-gray-300">16,185</span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <div className="flex items-center gap-2 font-bold text-zinc-500">
              <div className="w-2 h-2 rounded-full bg-gray-200"></div>
              Vắng mặt
            </div>
            <span className="font-bold text-zinc-800 dark:text-gray-300">2,857</span>
          </div>
        </div>
    </div>
  );
};
