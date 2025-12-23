
import React, { useState, useEffect } from 'react';
import { ViewMode, CampaignConfig, CloudStatus } from './types';
import { ApiService } from './services/apiService';
import AdminDashboard from './components/AdminDashboard';
import UserPortal from './components/UserPortal';

const ADMIN_TOKEN = 'admin4624199';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.USER);
  const [config, setConfig] = useState<CampaignConfig>({
    name: '正在加载云端活动...',
    description: '请稍候，系统正在从云端同步最新配置。',
    instructions: '1. 请确保网络连接正常。\n2. 输入您的标识即可领取。',
    qrCode: '' 
  });
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>({ connected: false, syncing: true });

  // 自动同步逻辑
  const syncFromCloud = async () => {
    setCloudStatus(prev => ({ ...prev, syncing: true }));
    const remoteConfig = await ApiService.fetchConfig();
    if (remoteConfig) {
      setConfig(remoteConfig);
      setCloudStatus({ connected: true, syncing: false });
    } else {
      setCloudStatus({ connected: false, syncing: false, error: "无法连接到云端，正在使用本地缓存" });
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

  const handleReset = () => {
    if (confirm("确定清除所有数据？云端数据也将同步重置。")) {
      localStorage.clear();
      location.reload();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f2f5]">
      {/* 云端状态条 */}
      <div className={`px-4 py-1 text-[10px] font-bold text-center transition-all ${cloudStatus.syncing ? 'bg-blue-500 text-white' : cloudStatus.connected ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}`}>
        {cloudStatus.syncing ? '正在与云端同步...' : cloudStatus.connected ? '● 云端已连接' : '○ 离线模式 (使用本地缓存)'}
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
      
      <footer className="py-8 text-center text-gray-400">
        <div className="text-[11px] font-black uppercase tracking-[0.3em]">
          Powered by Cloud Engine v3.0
        </div>
      </footer>
    </div>
  );
};

export default App;
