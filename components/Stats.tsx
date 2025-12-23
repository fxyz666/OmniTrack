
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { UsageLog, DeviceType, ActivityCategory } from '../types';
import { CategoryColors } from '../constants';

interface StatsProps {
  logs: UsageLog[];
}

const Stats: React.FC<StatsProps> = ({ logs }) => {
  // Device Distribution
  const deviceData = Object.values(DeviceType).map(type => {
    const totalMins = logs
      .filter(l => l.deviceType === type)
      .reduce((acc, curr) => acc + (new Date(curr.endTime).getTime() - new Date(curr.startTime).getTime()) / 60000, 0);
    return { name: type, value: Math.round(totalMins) };
  }).filter(d => d.value > 0);

  // Category Distribution
  const categoryData = Object.values(ActivityCategory).map(cat => {
    const totalMins = logs
      .filter(l => l.category === cat)
      .reduce((acc, curr) => acc + (new Date(curr.endTime).getTime() - new Date(curr.startTime).getTime()) / 60000, 0);
    return { name: cat, value: Math.round(totalMins) };
  }).filter(d => d.value > 0);

  // Top Apps
  const appDataRaw: Record<string, number> = {};
  logs.forEach(l => {
    const mins = (new Date(l.endTime).getTime() - new Date(l.startTime).getTime()) / 60000;
    appDataRaw[l.appName] = (appDataRaw[l.appName] || 0) + mins;
  });

  const appData = Object.entries(appDataRaw)
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-slate-100 shadow-xl rounded-2xl">
          <p className="font-black text-slate-900 mb-1">{label || payload[0].name}</p>
          <p className="text-indigo-600 font-bold">{payload[0].value} 分钟</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-8">全端设备时长分布</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deviceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {deviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" align="center" iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-8">专注类别分析</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={90}
                  dataKey="value"
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm">
        <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-10">高频应用排行 Top 6</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={appData} layout="vertical" margin={{ left: 40, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                axisLine={false} 
                tickLine={false} 
                fontSize={13} 
                fontWeight={700}
                width={100}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="value" radius={[0, 20, 20, 0]} barSize={32}>
                {appData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Stats;
