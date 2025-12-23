
import React, { useState, useEffect } from 'react';
import { ViewMode, CampaignConfig, CloudStatus } from './types.ts';
import { ApiService } from './services/apiService.ts';
import AdminDashboard from './components/AdminDashboard.tsx';
import UserPortal from './components/UserPortal.tsx';

const ADMIN_TOKEN = 'admin4624199';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.USER);
  const [config, setConfig] = useState<CampaignConfig>({
    name: '会员权益分发中心',
    description: '欢迎使用自助领取系统，正在同步云端数据...',
    instructions: '1. 请确保您的网络连接正常。\n2. 输入正确的用户标识。\n3. 点击领取并复制兑换码。',
    qrCode: '' 
  });
  
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>({ connected: false, syncing: true });

  const syncFromCloud = async (retryCount = 0) => {
    try {
      setCloudStatus(prev => ({ ...prev, syncing: true }));
      const [remoteConfig, stats] = await Promise.all([
        ApiService.fetchConfig(),
        ApiService.fetchStats()
      ]);
      
      if (remoteConfig) {
        setConfig(remoteConfig);
      }
      
      const isCloud = stats && stats.cloud;
      
      // 如果后端还在尝试连接 Redis (isCloud 为 false 但 stats 存在)，过 2 秒重试一次
      if (!isCloud && retryCount < 2) {
        setTimeout(() => syncFromCloud(retryCount + 1), 2000);
        return;
      }

      setCloudStatus({ 
        connected: !!stats, 
        syncing: false, 
        error: !isCloud ? "Offline Mode (Redis Not Connected)" : undefined 
      });
    } catch (err) {
      setCloudStatus({ connected: false, syncing: false, error: "Sync connection lost" });
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
    if (confirm("警告：此操作将永久清空云端所有配置和会员码！确认重置吗？")) {
      const success = await ApiService.resetCloud();
      if (success) {
        alert("云端已成功重置");
        location.hash = '#/';
        location.reload();
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f2f5] selection:bg-blue-100">
      {/* 顶部状态条：更加敏感的在线反馈 */}
      <div className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-center transition-all duration-700 ${
        cloudStatus.syncing 
          ? 'bg-blue-500 text-white' 
          : cloudStatus.error 
            ? 'bg-amber-500 text-white'
            : 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/10'
      }`}>
        <div className="flex items-center justify-center gap-2">
          {cloudStatus.syncing ? (
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse [animation-delay:0.2s]"></span>
            </span>
          ) : !cloudStatus.error ? (
            <div className="w-2 h-2 bg-emerald-200 rounded-full animate-ping absolute ml-[-20px]"></div>
          ) : null}
          {cloudStatus.syncing 
            ? 'Synchronizing with Cloud Edge...' 
            : cloudStatus.error 
              ? cloudStatus.error
              : 'Global Distribution Protocol: ONLINE'}
        </div>
      </div>

      <main className="flex-grow container mx-auto px-4 py-8 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
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
      
      <footer className="py-12 text-center text-gray-400">
        <div className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-40">
          &copy; 2024 Membership Engine • Cloud Verified
        </div>
      </footer>
    </div>
  );
};

export default App;
