
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
    description: '欢迎使用自助领取系统，正在同步最新的活动配置...',
    instructions: '1. 请确保您的网络连接正常。\n2. 输入正确的用户标识。\n3. 点击领取并复制兑换码。',
    qrCode: '' 
  });
  
  // 默认假设是在线状态，提升用户首屏感知
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>({ connected: true, syncing: true });

  const syncFromCloud = async () => {
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
      setCloudStatus({ 
        connected: !!stats, 
        syncing: false, 
        error: !isCloud ? "Running in Offline Mode (Redis not detected)" : undefined 
      });
    } catch (err) {
      setCloudStatus({ connected: false, syncing: false, error: "Cloud sync failed. Service may be unstable." });
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
    if (confirm("警告：此操作将清空云端所有数据。确认吗？")) {
      const success = await ApiService.resetCloud();
      if (success) {
        alert("云端已重置");
        location.hash = '#/';
        location.reload();
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f2f5] selection:bg-blue-100">
      {/* 顶部状态条：在线/离线反馈 */}
      <div className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-center transition-all duration-1000 ${
        cloudStatus.syncing 
          ? 'bg-blue-600 text-white' 
          : cloudStatus.error 
            ? 'bg-amber-500 text-white shadow-inner'
            : 'bg-emerald-600 text-white shadow-lg'
      }`}>
        <div className="flex items-center justify-center gap-2">
          {cloudStatus.syncing ? (
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </span>
          ) : !cloudStatus.error ? (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          ) : null}
          {cloudStatus.syncing 
            ? 'Establishing Secure Connection...' 
            : cloudStatus.error 
              ? cloudStatus.error
              : 'Global Distribution Protocol Active'}
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
        <div className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-40 hover:opacity-100 transition-opacity">
          &copy; 2024 Membership Engine • Cloud Native Distribution
        </div>
      </footer>
    </div>
  );
};

export default App;
