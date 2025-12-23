
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { UsageLog, DeviceType, WebDavConfig, SyncState, ActivityCategory } from './types';
import { AppIcons, DeviceIcons, DeviceColors, CategoryIcons, CategoryColors } from './constants';
import Timeline from './components/Timeline';
import Stats from './components/Stats';
import ActiveTracker from './components/ActiveTracker';
import { getUsageInsights, parseMobileUsageText } from './services/geminiService';
import { webDavSync } from './services/webDavService';
import { NativeBridge } from './services/nativeBridge';

const App: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [logs, setLogs] = useState<UsageLog[]>(() => {
    const saved = localStorage.getItem('omnitrack_logs_v5');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState<'timeline' | 'stats' | 'sync' | 'apps'>('timeline');
  const [filter, setFilter] = useState<DeviceType | 'All'>('All');
  const [isAdding, setIsAdding] = useState(false);
  const [isMobileImportOpen, setIsMobileImportOpen] = useState(false);
  const [mobileRawText, setMobileRawText] = useState("");
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [insights, setInsights] = useState<string>("正在扫描足迹并生成洞察...");
  const [isNativeActive, setIsNativeActive] = useState(NativeBridge.isNative());

  const connectedDevices = useMemo(() => {
    const devices = new Map<string, { type: DeviceType, lastSeen: string }>();
    logs.forEach(l => {
      const existing = devices.get(l.deviceName);
      if (!existing || new Date(l.startTime) > new Date(existing.lastSeen)) {
        devices.set(l.deviceName, { type: l.deviceType, lastSeen: l.startTime });
      }
    });
    return Array.from(devices.entries()).map(([name, data]) => ({ name, ...data }));
  }, [logs]);

  const dailyMetrics = useMemo(() => {
    const dayLogs = logs.filter(l => new Date(l.startTime).toDateString() === selectedDate.toDateString());
    const totalMinutes = dayLogs.reduce((acc, l) => acc + (new Date(l.endTime).getTime() - new Date(l.startTime).getTime()) / 60000, 0);
    const workMinutes = dayLogs.filter(l => l.category === ActivityCategory.Work || l.category === ActivityCategory.Study).reduce((acc, l) => acc + (new Date(l.endTime).getTime() - new Date(l.startTime).getTime()) / 60000, 0);
    return { totalMinutes, workMinutes, count: dayLogs.length };
  }, [logs, selectedDate]);

  const [isTracking, setIsTracking] = useState(false);
  const [currentSession, setCurrentSession] = useState<{
    appName: string;
    startTime: Date;
    category: ActivityCategory;
  } | null>(null);

  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    lastSyncTime: localStorage.getItem('omnitrack_last_sync') || null,
    error: null
  });

  const [webDavConfig, setWebDavConfig] = useState<WebDavConfig>(() => {
    const saved = localStorage.getItem('omnitrack_config_v5');
    return saved ? JSON.parse(saved) : {
      url: 'https://dav.jianguoyun.com/dav/',
      username: '',
      token: '',
      remotePath: '/OmniTrack/backup.json'
    };
  });

  useEffect(() => {
    localStorage.setItem('omnitrack_logs_v5', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('omnitrack_config_v5', JSON.stringify(webDavConfig));
  }, [webDavConfig]);

  const handleFetchInsights = useCallback(async () => {
    const dayLogs = logs.filter(l => new Date(l.startTime).toDateString() === selectedDate.toDateString());
    if (dayLogs.length > 2) {
      const text = await getUsageInsights(dayLogs);
      setInsights(text);
    } else {
      setInsights("全端汇总后，AI 将为您解析今日能量分布。");
    }
  }, [logs, selectedDate]);

  useEffect(() => {
    handleFetchInsights();
  }, [handleFetchInsights]);

  const handleSync = async () => {
    if (!webDavConfig.username || !webDavConfig.token) {
      alert("请前往同步中心配置 WebDAV");
      return;
    }
    setSyncState(prev => ({ ...prev, isSyncing: true }));
    try {
      const synced = await webDavSync(webDavConfig, logs);
      setLogs(synced);
      const now = new Date().toLocaleString();
      setSyncState({ isSyncing: false, lastSyncTime: now, error: null });
      localStorage.setItem('omnitrack_last_sync', now);
    } catch (err: any) {
      setSyncState(prev => ({ ...prev, isSyncing: false, error: err.message }));
    }
  };

  const toggleTracking = () => {
    if (!isTracking) {
      const app = prompt("当前正在进行什么活动？", "深度办公") || "未命名活动";
      setCurrentSession({ appName: app, startTime: new Date(), category: ActivityCategory.Work });
      setIsTracking(true);
    } else if (currentSession) {
      const log: UsageLog = {
        id: `auto-${Date.now()}`,
        startTime: currentSession.startTime.toISOString(),
        endTime: new Date().toISOString(),
        deviceType: NativeBridge.getPlatformInfo(),
        deviceName: NativeBridge.isNative() ? 'Native Client' : 'Web Browser',
        appName: currentSession.appName,
        category: currentSession.category,
        activityDescription: '通过网页端记录',
        syncStatus: 'local'
      };
      setLogs(prev => [log, ...prev]);
      setIsTracking(false);
      setCurrentSession(null);
    }
  };

  const handleUpdateLog = (updatedLog: UsageLog) => {
    setLogs(prev => prev.map(l => l.id === updatedLog.id ? updatedLog : l));
  };

  const clearOldData = () => {
    if (confirm("确定要清理本地缓存吗？这不会影响已同步到云端的数据。")) {
      setLogs([]);
      alert("本地足迹已重置");
    }
  };

  const exportPDF = () => {
    window.print();
  };

  const handleAiMobileImport = async () => {
    if (!mobileRawText.trim()) return;
    setIsAiParsing(true);
    try {
      const parsedLogs = await parseMobileUsageText(mobileRawText, selectedDate.toISOString());
      setLogs(prev => {
        const map = new Map<string, UsageLog>();
        prev.forEach(l => map.set(l.id, l));
        parsedLogs.forEach(l => map.set(l.id, l));
        return Array.from(map.values()).sort((a,b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      });
      setIsMobileImportOpen(false);
      setMobileRawText("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsAiParsing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-80 bg-[#0F172A] text-slate-400 p-8 fixed h-full z-50 print:hidden">
        <div className="flex items-center gap-4 mb-14">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-xl">
            <AppIcons.Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter">OmniTrack</h1>
            <p className="text-[9px] font-bold text-slate-500 tracking-[0.3em]">PRO SUITE</p>
          </div>
        </div>

        <nav className="flex-1 space-y-3">
          {[
            { id: 'timeline', label: '足迹流', icon: <AppIcons.List className="w-5 h-5" /> },
            { id: 'stats', label: '效率分析', icon: <AppIcons.BarChart3 className="w-5 h-5" /> },
            { id: 'sync', label: '多端同步', icon: <AppIcons.Cloud className="w-5 h-5" /> },
            { id: 'apps', label: '软件家族', icon: <AppIcons.Download className="w-5 h-5" /> },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-2xl' : 'hover:bg-white/5'}`}
            >
              {item.icon}
              <span className="text-[14px]">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto space-y-4">
           <div className={`flex items-center gap-3 p-4 rounded-xl ${isNativeActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
              <div className={`w-2 h-2 rounded-full ${isNativeActive ? 'bg-emerald-500' : 'bg-slate-600'}`}></div>
              <span className="text-[10px] font-black uppercase tracking-widest">{isNativeActive ? '原生代理就绪' : '网页受限模式'}</span>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-80 p-6 md:p-14 pb-32">
        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-8 mb-12 print:mb-4">
          <div className="space-y-6">
            <h2 className="text-6xl font-black text-slate-900 tracking-tighter print:text-4xl">
               {activeTab === 'apps' ? '全端软件家族' : '数字化全足迹'}
            </h2>
            <div className="flex items-center gap-3 print:hidden">
               <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
                  <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))} className="p-3 hover:bg-slate-50 rounded-xl text-slate-400"><AppIcons.ChevronLeft /></button>
                  <div className="px-8 flex flex-col justify-center border-x border-slate-50 min-w-[140px]">
                     <span className="text-[14px] font-black text-slate-800 text-center">
                        {selectedDate.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                     </span>
                  </div>
                  <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))} className="p-3 hover:bg-slate-50 rounded-xl text-slate-400"><AppIcons.ChevronRight /></button>
               </div>
               <div className="flex gap-2">
                 <button onClick={exportPDF} className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all"><AppIcons.FileSpreadsheet className="w-5 h-5" /></button>
                 <button onClick={handleSync} className={`flex items-center gap-2 px-6 py-4 bg-indigo-600 text-white text-xs font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-xl ${syncState.isSyncing ? 'animate-pulse' : ''}`}>
                    <AppIcons.Cloud className="w-4 h-4" /> 同步云端
                 </button>
               </div>
            </div>
          </div>

          <button 
              onClick={toggleTracking}
              className={`flex items-center gap-4 px-12 py-6 rounded-[2.5rem] font-black text-xl text-white transition-all shadow-2xl active:scale-95 print:hidden ${isTracking ? 'bg-rose-500 shadow-rose-500/30' : 'bg-slate-900 shadow-slate-900/30'}`}
          >
              <div className={`w-4 h-4 rounded-full bg-white ${isTracking ? 'animate-ping' : ''}`}></div>
              {isTracking ? `会话进行中...` : "开启一段记录"}
          </button>
        </header>

        {activeTab === 'timeline' && (
          <div className="space-y-10">
            {isTracking && currentSession && (
              <ActiveTracker 
                isMonitoring={true} 
                currentActivity={{
                  app: currentSession.appName,
                  device: NativeBridge.getPlatformInfo(),
                  startTime: currentSession.startTime,
                  content: "正在手动会话中..."
                }} 
              />
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-4">
              {[
                { label: '活动时长', value: `${Math.round(dailyMetrics.totalMinutes)} Min`, icon: <AppIcons.Clock />, color: 'text-slate-900' },
                { label: '多端足迹', value: `${dailyMetrics.count} 条`, icon: <AppIcons.List />, color: 'text-emerald-600' },
                { label: 'AI 洞察', value: insights.length > 15 ? '已更新' : '计算中', icon: <AppIcons.Zap />, color: 'text-indigo-600' },
                { label: '在线设备', value: `${connectedDevices.length} 台`, icon: <AppIcons.Monitor className="w-5 h-5" />, color: 'text-amber-600' },
              ].map((metric, i) => (
                <div key={i} className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm print:p-4 print:rounded-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400 print:hidden">{metric.icon}</div>
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{metric.label}</span>
                    </div>
                    <div className={`text-2xl font-black ${metric.color}`}>{metric.value}</div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 border-b border-slate-100 pb-8 print:hidden">
               <button onClick={() => setFilter('All')} className={`px-8 py-3 rounded-full text-xs font-black transition-all ${filter === 'All' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-100'}`}>全端视角</button>
               {Object.values(DeviceType).map(t => (
                 <button key={t} onClick={() => setFilter(t)} className={`flex items-center gap-2 px-8 py-3 rounded-full text-xs font-black transition-all ${filter === t ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 border border-slate-100'}`}>
                    {DeviceIcons[t]} {t}
                 </button>
               ))}
            </div>

            <Timeline 
              logs={logs} 
              filterDevice={filter} 
              selectedDate={selectedDate} 
              onDelete={(id) => setLogs(prev => prev.filter(l => l.id !== id))} 
              onUpdate={handleUpdateLog}
            />
          </div>
        )}

        {activeTab === 'stats' && <Stats logs={logs} />}

        {activeTab === 'sync' && (
           <div className="max-w-4xl mx-auto space-y-8">
              <div className="bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-50">
                  <h3 className="text-3xl font-black text-slate-900 mb-8">云端同步设置 (WebDAV)</h3>
                  <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="email" placeholder="坚果云账号" className="w-full p-6 rounded-2xl bg-slate-50 border border-slate-100 font-bold" value={webDavConfig.username} onChange={e => setWebDavConfig({...webDavConfig, username: e.target.value})} />
                        <input type="password" placeholder="应用授权码" className="w-full p-6 rounded-2xl bg-slate-50 border border-slate-100 font-bold" value={webDavConfig.token} onChange={e => setWebDavConfig({...webDavConfig, token: e.target.value})} />
                      </div>
                      <button onClick={handleSync} disabled={syncState.isSyncing} className="w-full py-8 bg-indigo-600 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl hover:bg-indigo-700 disabled:opacity-50">
                        {syncState.isSyncing ? "正在汇聚全端数据..." : "执行双向数据合并"}
                      </button>
                      <p className="text-center text-xs font-bold text-slate-400">
                        {syncState.lastSyncTime ? `上次同步: ${syncState.lastSyncTime}` : '尚未执行同步'}
                      </p>
                  </div>
              </div>

              <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm">
                  <h3 className="text-2xl font-black text-slate-900 mb-6">本地数据管理</h3>
                  <div className="flex flex-col md:flex-row gap-4">
                     <button onClick={exportPDF} className="flex-1 p-6 bg-slate-100 rounded-3xl font-black text-slate-600 flex items-center justify-center gap-3 hover:bg-slate-200">
                        <AppIcons.FileSpreadsheet /> 导出年度报告
                     </button>
                     <button onClick={clearOldData} className="flex-1 p-6 border-2 border-rose-50 rounded-3xl font-black text-rose-500 flex items-center justify-center gap-3 hover:bg-rose-50">
                        <AppIcons.Trash2 /> 清理本地缓存
                     </button>
                  </div>
              </div>
           </div>
        )}

        {activeTab === 'apps' && (
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {[
                { title: 'Desktop Pro', platform: 'Windows / macOS', desc: '支持后台静默监听，自动捕获应用标题和网页内容。', icon: <AppIcons.Monitor className="w-10 h-10" />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { title: 'Mobile Link', platform: 'iOS / Android', desc: '通过 API 申请屏幕时间权限，实现全天候无感同步。', icon: <AppIcons.Smartphone className="w-10 h-10" />, color: 'text-emerald-600', bg: 'bg-emerald-50' }
              ].map((app, i) => (
                <div key={i} className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-xl">
                   <div className={`w-20 h-20 ${app.bg} ${app.color} rounded-3xl flex items-center justify-center mb-8`}>
                      {app.icon}
                   </div>
                   <h3 className="text-3xl font-black mb-2">{app.title}</h3>
                   <p className="text-slate-400 font-bold text-xs uppercase mb-6 tracking-widest">{app.platform}</p>
                   <p className="text-slate-500 font-medium mb-10 leading-relaxed">{app.desc}</p>
                   <button className="w-full py-6 bg-slate-900 text-white rounded-2xl font-black shadow-xl">立即下载安装包</button>
                </div>
              ))}
           </div>
        )}
      </main>

      {/* AI Parsing Modal */}
      {isMobileImportOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="w-full max-w-3xl bg-white rounded-[4rem] overflow-hidden shadow-2xl animate-in zoom-in-95">
             <div className="p-12 md:p-16">
                <div className="flex justify-between items-start mb-8">
                   <h3 className="text-4xl font-black tracking-tighter">AI 足迹识别</h3>
                   <button onClick={() => setIsMobileImportOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors"><AppIcons.Trash2 /></button>
                </div>
                <textarea 
                   rows={6} 
                   placeholder="在此粘贴手机屏幕时间文本或简单描述..." 
                   className="w-full p-8 rounded-[2.5rem] bg-slate-50 border-2 border-slate-100 font-medium text-lg focus:border-indigo-500 outline-none transition-all mb-8"
                   value={mobileRawText}
                   onChange={e => setMobileRawText(e.target.value)}
                />
                <button 
                   disabled={isAiParsing || !mobileRawText}
                   onClick={handleAiMobileImport}
                   className="w-full py-8 bg-indigo-600 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl flex items-center justify-center gap-4"
                >
                   {isAiParsing ? "正在解析全端逻辑..." : "解析并导入"}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-slate-100 p-5 flex justify-around items-center z-50 rounded-t-[2.5rem] shadow-2xl print:hidden">
        <button onClick={() => setActiveTab('timeline')} className={`p-4 rounded-2xl ${activeTab === 'timeline' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}><AppIcons.List /></button>
        <button onClick={() => setActiveTab('stats')} className={`p-4 rounded-2xl ${activeTab === 'stats' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}><AppIcons.BarChart3 /></button>
        <button onClick={() => setIsMobileImportOpen(true)} className="p-4 rounded-2xl bg-indigo-50 text-indigo-600"><AppIcons.Zap className="w-5 h-5" /></button>
        <button onClick={() => setActiveTab('sync')} className={`p-4 rounded-2xl ${activeTab === 'sync' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}><AppIcons.Cloud /></button>
      </nav>

      {/* Styles for Printing PDF */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white; }
          main { margin: 0 !important; padding: 0 !important; }
        }
      `}</style>
    </div>
  );
};

export default App;
