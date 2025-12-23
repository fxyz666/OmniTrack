
import React, { useEffect, useState, useMemo } from 'react';
import { UsageLog, DeviceType, ActivityCategory } from '../types';
import { DeviceIcons, DeviceColors, CategoryIcons, CategoryColors } from '../constants';
import { Maximize2, Minimize2, SlidersHorizontal, Edit2, X, Check } from 'lucide-react';

interface TimelineProps {
  logs: UsageLog[];
  filterDevice: DeviceType | 'All';
  selectedDate: Date;
  onDelete?: (id: string) => void;
  onUpdate?: (updatedLog: UsageLog) => void;
}

const Timeline: React.FC<TimelineProps> = ({ logs, filterDevice, selectedDate, onDelete, onUpdate }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [zoomFactor, setZoomFactor] = useState(1.0); // 0.5 to 2.5
  const [visibleRange, setVisibleRange] = useState<[number, number]>([0, 24]);
  const [editingLog, setEditingLog] = useState<UsageLog | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const isSameDay = (d1: Date, d2: Date) => 
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const dayLogs = useMemo(() => {
    return logs
      .filter(log => isSameDay(new Date(log.startTime), selectedDate))
      .filter(log => filterDevice === 'All' || log.deviceType === filterDevice)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [logs, selectedDate, filterDevice]);

  const hours = useMemo(() => {
    const all = Array.from({ length: 24 }, (_, i) => i);
    return all.filter(h => h >= visibleRange[0] && h < visibleRange[1]);
  }, [visibleRange]);

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const getDuration = (start: string, end: string) => {
    const diff = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
    return Math.round(diff);
  };

  const handleSaveEdit = () => {
    if (editingLog && onUpdate) {
      onUpdate(editingLog);
      setEditingLog(null);
    }
  };

  const isSelectedToday = isSameDay(selectedDate, new Date());
  const hourHeight = 100 * zoomFactor;

  return (
    <div className="relative mt-8 bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
      
      {/* --- Timeline Control Hub --- */}
      <div className="sticky top-0 z-[60] bg-white/80 backdrop-blur-xl border-b border-slate-50 p-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6 w-full md:w-auto">
          <div className="flex items-center gap-3">
             <SlidersHorizontal className="w-4 h-4 text-slate-400" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">时间密度</span>
          </div>
          <div className="flex-1 md:w-48 flex items-center gap-3">
             <Minimize2 className="w-3 h-3 text-slate-300" />
             <input 
               type="range" 
               min="0.5" 
               max="2.5" 
               step="0.1" 
               value={zoomFactor} 
               onChange={(e) => setZoomFactor(parseFloat(e.target.value))}
               className="flex-1 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
             />
             <Maximize2 className="w-3 h-3 text-slate-300" />
          </div>
        </div>

        <div className="flex items-center gap-6 w-full md:w-auto">
           <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">显示范围</span>
              <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black">
                {visibleRange[0].toString().padStart(2, '0')}:00 - {visibleRange[1].toString().padStart(2, '0')}:00
              </span>
           </div>
           <div className="flex-1 md:w-64 relative pt-2">
              <input 
                type="range" 
                min="0" 
                max="24" 
                step="1" 
                value={visibleRange[0]} 
                onChange={(e) => setVisibleRange([Math.min(parseInt(e.target.value), visibleRange[1] - 1), visibleRange[1]])}
                className="absolute w-full h-1 bg-transparent appearance-none pointer-events-none z-10 accent-indigo-600 [&::-webkit-slider-thumb]:pointer-events-auto"
              />
              <input 
                type="range" 
                min="0" 
                max="24" 
                step="1" 
                value={visibleRange[1]} 
                onChange={(e) => setVisibleRange([visibleRange[0], Math.max(parseInt(e.target.value), visibleRange[0] + 1)])}
                className="absolute w-full h-1 bg-transparent appearance-none pointer-events-none z-10 accent-indigo-600 [&::-webkit-slider-thumb]:pointer-events-auto"
              />
              <div className="w-full h-1 bg-slate-100 rounded-full"></div>
           </div>
        </div>
      </div>

      <div className="relative p-4 md:p-12 overflow-visible">
        {/* 24H Vertical Axis */}
        <div 
          className="absolute left-[70px] md:left-[110px] top-12 bottom-12 w-px bg-slate-100 hidden md:block"
          style={{ transition: 'all 0.3s ease-out' }}
        ></div>

        {/* Current Time Indicator (only for today if in range) */}
        {isSelectedToday && currentTime.getHours() >= visibleRange[0] && currentTime.getHours() < visibleRange[1] && (
          <div 
            className="absolute left-0 right-0 z-30 flex items-center pointer-events-none"
            style={{ 
              top: `${((currentTime.getHours() - visibleRange[0]) * hourHeight) + (currentTime.getMinutes() * (hourHeight/60)) + 48}px`,
              transition: 'top 0.3s ease-out'
            }}
          >
            <div className="w-16 md:w-24 text-right pr-4">
               <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">NOW</span>
            </div>
            <div className="w-3 h-3 bg-rose-500 rounded-full border-4 border-white shadow-sm -ml-1.5"></div>
            <div className="flex-1 h-px bg-rose-500/30 ml-2"></div>
          </div>
        )}

        <div className="relative z-10">
          {hours.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300">
              <Minimize2 className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-bold">此时间段暂无记录</p>
            </div>
          ) : hours.map(hour => {
            const hourLogs = dayLogs.filter(log => new Date(log.startTime).getHours() === hour);
            
            return (
              <div 
                key={hour} 
                className="flex group/hour relative transition-all duration-300 ease-out"
                style={{ minHeight: `${hourHeight}px` }}
              >
                {/* Hour Marker */}
                <div className="w-16 md:w-24 shrink-0 -mt-3 pr-4 text-right relative">
                   <span className="text-xs font-black text-slate-300 tabular-nums">
                     {hour.toString().padStart(2, '0')}:00
                   </span>
                </div>

                {/* Slot */}
                <div className="flex-1 pl-6 md:pl-16 pb-8 space-y-6">
                  {hourLogs.map((log) => (
                    <div key={log.id} className="relative animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <div 
                        onClick={() => setEditingLog({...log})}
                        className="group relative bg-white border border-slate-100 p-7 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-indigo-100 transition-all group-hover:-translate-y-1 cursor-pointer"
                      >
                        
                        {/* Left Badge (Device) */}
                        <div className={`absolute -left-[42px] md:-left-[76px] top-7 w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${DeviceColors[log.deviceType]} border-4 border-white transition-transform group-hover:scale-110 z-20`}>
                          {DeviceIcons[log.deviceType]}
                        </div>

                        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                          <div className="space-y-3 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                               <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-[10px] font-black uppercase tracking-wider ${CategoryColors[log.category || ActivityCategory.Other]}`}>
                                  {CategoryIcons[log.category || ActivityCategory.Other]}
                                  {log.category || ActivityCategory.Other}
                               </div>
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                 {formatTime(log.startTime)} — {formatTime(log.endTime)}
                               </span>
                               <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-black">
                                 {getDuration(log.startTime, log.endTime)} MIN
                               </span>
                            </div>
                            
                            <h4 className="text-2xl font-black text-slate-900 tracking-tight">{log.appName}</h4>
                            <p className="text-slate-500 text-sm font-medium leading-relaxed">
                              {log.activityDescription || "专注于此项活动中..."}
                            </p>
                          </div>

                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {log.syncStatus === 'synced' && (
                              <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl" title="已同步至坚果云">
                                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                 </svg>
                              </div>
                            )}
                            {onDelete && (
                              <button 
                                onClick={() => onDelete(log.id)}
                                className="p-2.5 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- Edit Modal --- */}
      {editingLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-10 md:p-14">
                 <div className="flex justify-between items-center mb-10">
                    <h3 className="text-3xl font-black tracking-tighter">编辑活动详情</h3>
                    <button onClick={() => setEditingLog(null)} className="p-3 text-slate-400 hover:text-rose-500 transition-colors bg-slate-50 rounded-2xl"><X /></button>
                 </div>
                 
                 <div className="space-y-8">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">应用/活动名称</label>
                       <input 
                          type="text" 
                          className="w-full p-6 rounded-2xl bg-slate-50 border border-slate-100 font-bold focus:border-indigo-600 outline-none transition-all"
                          value={editingLog.appName}
                          onChange={e => setEditingLog({...editingLog, appName: e.target.value})}
                       />
                    </div>

                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">活动分类</label>
                       <div className="flex flex-wrap gap-2">
                          {Object.values(ActivityCategory).map(cat => (
                            <button 
                              key={cat}
                              onClick={() => setEditingLog({...editingLog, category: cat})}
                              className={`flex items-center gap-2 px-5 py-3 rounded-full text-xs font-black transition-all ${editingLog.category === cat ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 border border-slate-100 hover:border-indigo-200'}`}
                            >
                              {CategoryIcons[cat]} {cat}
                            </button>
                          ))}
                       </div>
                    </div>

                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">详细描述</label>
                       <textarea 
                          rows={3}
                          className="w-full p-6 rounded-2xl bg-slate-50 border border-slate-100 font-medium focus:border-indigo-600 outline-none transition-all"
                          value={editingLog.activityDescription}
                          onChange={e => setEditingLog({...editingLog, activityDescription: e.target.value})}
                          placeholder="当时在做什么？"
                       />
                    </div>

                    <button 
                       onClick={handleSaveEdit}
                       className="w-full py-7 bg-indigo-600 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-indigo-700 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                    >
                       <Check className="w-6 h-6" /> 保存修改
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Timeline;
