
import React, { useState } from 'react';
import { CampaignConfig } from '../types';
import { ApiService } from '../services/apiService';

interface UserPortalProps {
  config: CampaignConfig;
}

const UserPortal: React.FC<UserPortalProps> = ({ config }) => {
  const [userId, setUserId] = useState('');
  const [claimedCode, setClaimedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) return setError("请先输入标识");
    
    setLoading(true);
    setError(null);
    
    // 向云端请求领取
    const result = await ApiService.claimCode(userId.trim());
    
    if ('code' in result) {
      setClaimedCode(result.code);
    } else {
      setError(result.error || "领取失败，请检查网络");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto space-y-8 animate-in slide-in-from-bottom-8 duration-700">
      <div className="bg-white rounded-[3rem] p-10 shadow-2xl shadow-gray-200/50 border border-gray-50 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
        
        <h1 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">{config.name}</h1>
        <p className="text-gray-400 text-sm mb-10 font-medium px-4">{config.description}</p>

        {!claimedCode ? (
          <form onSubmit={handleClaim} className="space-y-4">
            <div className="relative">
              <input 
                className="w-full p-6 bg-gray-50 rounded-[1.5rem] border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all text-center font-bold text-lg placeholder:font-normal placeholder:text-gray-300"
                placeholder="手机号 / 邮箱 / ID"
                value={userId}
                onChange={e => {setUserId(e.target.value); setError(null);}}
              />
            </div>
            {error && <p className="text-red-500 text-xs font-bold animate-bounce">{error}</p>}
            <button 
              disabled={loading}
              className={`w-full py-6 rounded-[1.5rem] font-black text-xl shadow-xl transition-all active:scale-95 ${loading ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'}`}
            >
              {loading ? '云端核销中...' : '立即领取权益'}
            </button>
            <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest mt-4">系统已开启云端限领：每人仅限一次</p>
          </form>
        ) : (
          <div className="space-y-8 animate-in zoom-in duration-300">
             <div className="py-10 bg-blue-50/50 rounded-[2.5rem] border-2 border-dashed border-blue-200 group relative">
                <div className="text-[10px] text-blue-400 font-black uppercase mb-3 tracking-widest">您的专属兑换码</div>
                <div className="text-4xl font-black text-blue-600 tracking-tighter select-all">{claimedCode}</div>
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] px-3 py-1 rounded-full font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">长按可全选复制</div>
             </div>
             <button 
               onClick={() => {navigator.clipboard.writeText(claimedCode); alert('复制成功');}} 
               className="w-full py-5 bg-gray-900 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-gray-200"
             >
               复制兑换码
             </button>
             <button onClick={() => setClaimedCode(null)} className="text-[10px] text-gray-400 font-black uppercase tracking-widest hover:text-gray-600 transition-colors">完成并返回</button>
          </div>
        )}
      </div>

      <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-10 shadow-xl shadow-gray-100/50 border border-white">
        <h2 className="font-black text-gray-900 mb-6 flex items-center gap-3">
          <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm">?</span>
          如何兑换
        </h2>
        <div className="text-sm text-gray-600 whitespace-pre-line leading-loose font-medium mb-10">
          {config.instructions}
        </div>
        
        <div className="flex flex-col items-center gap-6">
          <div className="p-3 bg-white rounded-[2rem] shadow-2xl border-4 border-gray-50/50">
            {config.qrCode ? (
              <img 
                src={config.qrCode} 
                className="w-56 h-56 object-contain rounded-2xl"
                alt="Cloud QR"
                loading="eager"
              />
            ) : (
              <div className="w-56 h-56 bg-gray-50 rounded-2xl flex flex-col items-center justify-center text-center p-6">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">正在加载云端二维码...</p>
              </div>
            )}
          </div>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
            长按上方二维码立即激活
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserPortal;
