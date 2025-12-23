
import React, { useState, useEffect } from 'react';
import { ViewMode, CampaignConfig, CloudStatus } from './types.ts';
import { ApiService } from './services/apiService.ts';
import AdminDashboard from './components/AdminDashboard.tsx';
import UserPortal from './components/UserPortal.tsx';

const ADMIN_TOKEN = 'admin4624199';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.USER);
  const [config, setConfig] = useState<CampaignConfig>({
    name: '云端权益领取',
    description: '正在加载最新的活动信息...',
    instructions: '1. 请确保您的网络已连接。\n2. 输入正确标识后领取。',
    qrCode: '' 
  });
  
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>({ connected: true, syncing: true });

  const syncFromCloud = async () => {
    try {
      setCloudStatus(prev => ({ ...prev, syncing: true }));
      const remoteConfig = await ApiService.fetchConfig();
      const stats = await ApiService.fetchStats();
      
      if (remoteConfig) {
        setConfig(remoteConfig);
      }
      
      // 根据后端返回的 stats.cloud 判定连接模式
      setCloudStatus({ 
        connected: !!stats, 
        syncing: false, 
        error: (stats && !stats.cloud) ? "运行于本地内存模式 (Redis 未连接)" : undefined 
      });
    } catch (err) {
      setCloudStatus({ connected: false, syncing: false, error: "无法同步云端数据" });
    }
  };

  useEffect(() => {
    syncFromCloud();
    
    const checkRoute = () => {
      const hash = window.location.hash;
      if (hash.includes(ADMIN_TOKEN)) {
        setView(ViewMode.ADMIN);
      } else {
        setView(ViewMode.USER);
      }
    };
    window.addEventListener('hashchange', checkRoute);
    checkRoute();
    return () => window.removeEventListener('hashchange', checkRoute);
  }, []);

  const handleUpdateConfig = async (newConfig: CampaignConfig) => {
    setConfig(newConfig);
    await ApiService.saveConfig(newConfig);
  };

  const handleReset = async () => {
    if (confirm("警告：此操作将清空【数据库】中所有会员码和领取记录，确认吗？")) {
      const success = await ApiService.resetCloud();
      if (success) {
        alert("系统已重置");
        location.hash = '#/';
        location.reload();
      } else {
        alert("重置失败，请检查后端状态");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f2f5]">
      <div className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-center transition-all duration-700 ${
        cloudStatus.syncing 
          ? 'bg-blue-600 text-white' 
          : cloudStatus.error 
            ? 'bg-amber-500 text-white'
            : 'bg-gray-900 text-gray-400'
      }`}>
        <div className="flex items-center justify-center gap-2">
          {cloudStatus.syncing && <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>}
          {cloudStatus.syncing 
            ? 'Synchronizing with Engine...' 
            : cloudStatus.error 
              ? cloudStatus.error
              : 'Protocol Secure & Data Cloud-Synced'}
        </div>
      </div>

      <main className="flex-grow container mx-auto px-4 py-8 max-w-5xl">
        {view === ViewMode.ADMIN ? (
          <AdminDashboard 
            config={config} 
            setConfig={handleUpdateConfig} 
            onReset={handleReset} 
          />
        ) : (
          <UserPortal 
            config={config} 
          />
        )}
      </main>
      
      <footer className="py-8 text-center text-gray-300">
        <div className="text-[10px] font-black uppercase tracking-[0.4em]">
          Secure Distribution Protocol v3.3.0 (Cloud-Resilient Edition)
        </div>
      </footer>
    </div>
  );
};

export default App;
