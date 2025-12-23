
import React, { useState, useEffect } from 'react';
import { DeviceIcons, DeviceColors } from '../constants';
import { DeviceType } from '../types';
import { Activity } from 'lucide-react';

interface ActiveTrackerProps {
  isMonitoring: boolean;
  currentActivity?: {
    app: string;
    device: DeviceType;
    startTime: Date;
    content: string;
  };
}

const ActiveTracker: React.FC<ActiveTrackerProps> = ({ isMonitoring, currentActivity }) => {
  const [elapsedText, setElapsedText] = useState("00:00");

  useEffect(() => {
    if (!currentActivity) return;
    const timer = setInterval(() => {
      const diff = Math.floor((Date.now() - currentActivity.startTime.getTime()) / 1000);
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      setElapsedText(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [currentActivity]);

  if (!isMonitoring || !currentActivity) return null;

  return (
    <div className="relative mb-12 group animate-in slide-in-from-top-4 duration-500">
      {/* Dynamic Glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-[3rem] blur-xl opacity-20 group-hover:opacity-30 transition-opacity animate-pulse"></div>
      
      <div className="relative bg-white border border-indigo-100 rounded-[3rem] p-8 shadow-2xl flex flex-col md:flex-row items-center gap-8">
        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-2xl ${DeviceColors[currentActivity.device]} relative`}>
          {DeviceIcons[currentActivity.device]}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white animate-pulse"></div>
        </div>
        
        <div className="flex-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">正在捕获实时足迹</span>
            <span className="text-xs font-black text-slate-300 tabular-nums">开始于 {currentActivity.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">
            {currentActivity.app}
          </h3>
          <p className="text-slate-500 mt-2 font-medium italic opacity-70">
            &ldquo;{currentActivity.content}&rdquo;
          </p>
        </div>

        <div className="flex flex-col items-center md:items-end gap-2 pr-4">
           <div className="text-center md:text-right">
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">已持续时长</p>
             <p className="text-4xl font-black text-indigo-600 tabular-nums tracking-tighter">{elapsedText}</p>
           </div>
        </div>
        
        <div className="hidden lg:block border-l border-slate-100 pl-8 h-16">
           <Activity className="w-10 h-10 text-indigo-100 animate-pulse" />
        </div>
      </div>
    </div>
  );
};

export default ActiveTracker;
