
import React, { useState, useEffect } from 'react';
import { ViewMode, MembershipCode, ClaimRecord, CampaignConfig } from './types';
import AdminDashboard from './components/AdminDashboard';
import UserPortal from './components/UserPortal';

const STORAGE_KEY_CODES = 'membercode_codes';
const STORAGE_KEY_CLAIMS = 'membercode_claims';
const STORAGE_KEY_CONFIG = 'membercode_config';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.USER);
  const [codes, setCodes] = useState<MembershipCode[]>([]);
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [config, setConfig] = useState<CampaignConfig>({
    name: '家小医会员兑换活动',
    description: '领取您的专属兑换码，即刻开启家小医会员权益。',
    instructions: '1.输入您的唯一标识（邮箱或手机号）。\n2.点击领取并复制兑换码。\n3.搜索「家小医会员版」微信小程序或长按识别下图进入小程序，输入兑换码即可激活权益。',
    qrCode: '' 
  });

  // 处理路由 (基于 Hash)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#/admin4624199') {
        setView(ViewMode.ADMIN);
      } else {
        setView(ViewMode.USER);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); 
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 持久化逻辑 - 增加错误捕获
  useEffect(() => {
    try {
      const savedCodes = localStorage.getItem(STORAGE_KEY_CODES);
      const savedClaims = localStorage.getItem(STORAGE_KEY_CLAIMS);
      const savedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);

      if (savedCodes) setCodes(JSON.parse(savedCodes));
      if (savedClaims) setClaims(JSON.parse(savedClaims));
      if (savedConfig) setConfig(JSON.parse(savedConfig));
    } catch (e) {
      console.error("Failed to load state from localStorage:", e);
      // 如果解析失败，清除损坏的数据
      localStorage.clear();
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CODES, JSON.stringify(codes));
      localStorage.setItem(STORAGE_KEY_CLAIMS, JSON.stringify(claims));
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    } catch (e) {
      console.warn("Storage quota exceeded or failed to save.");
    }
  }, [codes, claims, config]);

  const addCodes = (rawCodes: string[]) => {
    const limit = 15000;
    if (codes.length + rawCodes.length > limit) {
      alert(`超出限制！系统最多支持存储 ${limit} 个会员码。`);
      return;
    }

    const newCodes: MembershipCode[] = rawCodes.map(c => ({
      id: Math.random().toString(36).substr(2, 9),
      code: c.trim(),
      isClaimed: false
    })).filter(c => c.code.length > 0);
    
    setCodes(prev => [...prev, ...newCodes]);
    alert(`成功导入 ${newCodes.length} 个新会员码。`);
  };

  const handleClaim = (userId: string): string | null => {
    const existingClaim = claims.find(c => c.userId === userId);
    if (existingClaim) return existingClaim.code;

    const availableIndex = codes.findIndex(c => !c.isClaimed);
    if (availableIndex === -1) return null;

    const codeToClaim = codes[availableIndex];
    const newClaim: ClaimRecord = {
      userId,
      codeId: codeToClaim.id,
      code: codeToClaim.code,
      timestamp: new Date().toISOString()
    };

    const updatedCodes = [...codes];
    updatedCodes[availableIndex] = { 
      ...codeToClaim, 
      isClaimed: true, 
      claimedBy: userId, 
      claimedAt: newClaim.timestamp 
    };

    setCodes(updatedCodes);
    setClaims(prev => [...prev, newClaim]);
    return codeToClaim.code;
  };

  const resetAll = () => {
    if (window.confirm("确定要彻底重置吗？这将删除所有会员码和领取记录且无法恢复。")) {
      setCodes([]);
      setClaims([]);
      localStorage.removeItem(STORAGE_KEY_CODES);
      localStorage.removeItem(STORAGE_KEY_CLAIMS);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f9fafb]">
      <main className="flex-grow container mx-auto px-4 py-8">
        {view === ViewMode.ADMIN ? (
          <AdminDashboard 
            codes={codes} 
            claims={claims} 
            config={config}
            setConfig={setConfig}
            onAddCodes={addCodes}
            onReset={resetAll}
          />
        ) : (
          <UserPortal 
            config={config}
            onClaim={handleClaim}
            claims={claims}
          />
        )}
      </main>
      <footer className="py-6 text-center text-gray-400 text-xs">
        &copy; {new Date().getFullYear()} 会员码管理系统 | {view === ViewMode.ADMIN ? '管理中心' : '领取中心'}
      </footer>
    </div>
  );
};

export default App;
