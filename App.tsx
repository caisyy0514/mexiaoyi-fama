
import React, { useState, useEffect } from 'react';
import { ViewMode, MembershipCode, ClaimRecord, CampaignConfig } from './types';
import AdminDashboard from './components/AdminDashboard';
import UserPortal from './components/UserPortal';

const STORAGE_KEY_CODES = 'm_c_v2'; // 使用新 Key 避免旧数据冲突
const STORAGE_KEY_CLAIMS = 'm_cl_v2';
const STORAGE_KEY_CONFIG = 'm_cfg_v2';
const ADMIN_TOKEN = 'admin4624199';

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

  useEffect(() => {
    const checkRoute = () => {
      const hash = window.location.hash;
      const path = window.location.pathname;
      if (hash.includes(ADMIN_TOKEN) || path.endsWith(ADMIN_TOKEN)) {
        setView(ViewMode.ADMIN);
      } else {
        setView(ViewMode.USER);
      }
    };
    window.addEventListener('hashchange', checkRoute);
    checkRoute();
    return () => window.removeEventListener('hashchange', checkRoute);
  }, []);

  // 加载逻辑
  useEffect(() => {
    try {
      const savedCodesRaw = localStorage.getItem(STORAGE_KEY_CODES);
      const savedClaims = localStorage.getItem(STORAGE_KEY_CLAIMS);
      const savedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);

      if (savedCodesRaw) {
        // 极致压缩还原：ID|CODE|CLAIMED|BY|AT
        const parsedCodes: MembershipCode[] = savedCodesRaw.split(';;').map(row => {
          const [id, code, isClaimed, claimedBy, claimedAt] = row.split('|');
          return { id, code, isClaimed: isClaimed === '1', claimedBy, claimedAt };
        });
        setCodes(parsedCodes);
      }
      if (savedClaims) setClaims(JSON.parse(savedClaims));
      if (savedConfig) setConfig(JSON.parse(savedConfig));
    } catch (e) {
      console.error("Load failed", e);
    }
  }, []);

  // 独立保存 Config，确保二维码安全性
  useEffect(() => {
    if (config.name) {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    }
  }, [config]);

  // 分离保存大数据量内容
  useEffect(() => {
    try {
      if (codes.length > 0) {
        const compressed = codes.map(c => 
          `${c.id}|${c.code}|${c.isClaimed ? '1' : '0'}|${c.claimedBy || ''}|${c.claimedAt || ''}`
        ).join(';;');
        localStorage.setItem(STORAGE_KEY_CODES, compressed);
      }
      if (claims.length > 0) {
        localStorage.setItem(STORAGE_KEY_CLAIMS, JSON.stringify(claims));
      }
    } catch (e) {
      console.warn("Storage Quota Exceeded! Some data might not be saved.");
    }
  }, [codes, claims]);

  const addCodes = (rawCodes: string[]) => {
    const newCodes: MembershipCode[] = rawCodes.map(c => ({
      id: Math.random().toString(36).substr(2, 5),
      code: c.trim(),
      isClaimed: false
    })).filter(c => c.code.length > 0);
    setCodes(prev => [...prev, ...newCodes]);
  };

  const handleClaim = (userId: string): string | null => {
    const existing = claims.find(c => c.userId === userId);
    if (existing) return existing.code;

    const idx = codes.findIndex(c => !c.isClaimed);
    if (idx === -1) return null;

    const target = codes[idx];
    const newClaim = { userId, codeId: target.id, code: target.code, timestamp: new Date().toISOString() };
    
    const updated = [...codes];
    updated[idx] = { ...target, isClaimed: true, claimedBy: userId, claimedAt: newClaim.timestamp };
    
    setCodes(updated);
    setClaims(prev => [...prev, newClaim]);
    return target.code;
  };

  const resetAll = () => {
    if (confirm("确定重置？")) {
      localStorage.clear();
      location.reload();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f9fafb]">
      <main className="flex-grow container mx-auto px-4 py-8">
        {view === ViewMode.ADMIN ? (
          <AdminDashboard codes={codes} claims={claims} config={config} setConfig={setConfig} onAddCodes={addCodes} onReset={resetAll} />
        ) : (
          <UserPortal config={config} onClaim={handleClaim} claims={claims} />
        )}
      </main>
      <footer className="py-6 text-center text-gray-400 text-[10px] font-medium uppercase tracking-widest">
        &copy; 2025 会员码管理系统 | 安全存储引擎 v2
      </footer>
    </div>
  );
};

export default App;
