
import React, { useState, useEffect } from 'react';
import { ViewMode, CampaignConfig, CloudStatus } from './types';
import { ApiService } from './services/apiService';
import AdminDashboard from './components/AdminDashboard';
import UserPortal from './components/UserPortal';

const ADMIN_TOKEN = 'admin4624199';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.USER);
  const [config, setConfig] = useState<CampaignConfig>({
    name: '云端权益领取',
    description: '正在同步活动信息...',
    instructions: '1. 请确保您的网络已连接。\n2. 输入正确标识后领取。',
    qrCode: '' 
  });
  
  // 默认状态设置为 connected: true, syncing: true，体现“默认在线”
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>({ connected: true, syncing: true });

  const syncFromCloud = async () => {
    setCloudStatus(prev => ({ ...prev, syncing: true }));
    const remoteConfig = await ApiService.fetchConfig();
    if (remoteConfig) {
      setConfig(remoteConfig);
      setCloudStatus({ connected: true, syncing: false });
    } else {
      // 只有在明确失败后才标记为未连接
      setCloudStatus({ connected: false, syncing: false, error: "云端连接不稳定，已切换至本地缓存" });
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
    if (confirm("警告：此操作将清空本地所有缓存及配置，确认吗？")) {
      localStorage.clear();
      location.hash = '#/';
      location.reload();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f2f5]">
      {/* 优化的云端指示条：更专业、更隐蔽 */}
      <div className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-center transition-all duration-700 ${
        cloudStatus.syncing 
          ? 'bg-blue-600 text-white' 
          : cloudStatus.connected 
            ? 'bg-gray-900 text-gray-400' 
            : 'bg-orange-500 text-white'
      }`}>
        <div className="flex items-center justify-center gap-2">
          {cloudStatus.syncing && <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>}
          {cloudStatus.syncing 
            ? 'Synchronizing with Cloud Engine...' 
            : cloudStatus.connected 
              ? 'Cloud Infrastructure Connected' 
              : 'Connection Error: Local Fallback Active'}
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
          Secure Distribution Protocol v3.1
        </div>
      </footer>
    </div>
  );
};

export default App;
