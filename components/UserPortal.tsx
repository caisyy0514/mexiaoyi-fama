
import React, { useState } from 'react';
import { CampaignConfig } from '../types.ts';
import { ApiService } from '../services/apiService.ts';

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
    
    const result = await ApiService.claimCode(userId.trim());
    
    if ('code' in result) {
      setClaimedCode(result.code);
    } else {
      setError(result.error || "领取失败，请稍后再试");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto space-y-8">
      <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-gray-50 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
        
        <h1 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">{config.name}</h1>
        <p className="text-gray-400 text-sm mb-10 font-medium px-4">{config.description}</p>

        {!claimedCode ? (
          <form onSubmit={handleClaim} className="space-y-4">
            <input 
              className="w-full p-6 bg-gray-50 rounded-[1.5rem] border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all text-center font-bold text-lg"
              placeholder="手机号 / 账号"
              value={userId}
              onChange={e => {setUserId(e.target.value); setError(null);}}
            />
            {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
            <button 
              disabled={loading}
              className={`w-full py-6 rounded-[1.5rem] font-black text-xl shadow-xl transition-all ${loading ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              {loading ? '同步核销中...' : '立即领取权益'}
            </button>
            <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest mt-4">一人仅限领取一次</p>
          </form>
        ) : (
          <div className="space-y-8">
             <div className="py-10 bg-blue-50 rounded-[2.5rem] border-2 border-dashed border-blue-200">
                <div className="text-[10px] text-blue-400 font-black uppercase mb-3 tracking-widest">您的兑换码</div>
                <div className="text-4xl font-black text-blue-600 tracking-tighter">{claimedCode}</div>
             </div>
             <button 
               onClick={() => {navigator.clipboard.writeText(claimedCode); alert('复制成功');}} 
               className="w-full py-5 bg-gray-900 text-white rounded-[1.5rem] font-black text-lg shadow-xl"
             >
               复制兑换码
             </button>
             <button onClick={() => setClaimedCode(null)} className="text-[10px] text-gray-400 font-black uppercase tracking-widest">完成</button>
          </div>
        )}
      </div>

      <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] p-10 shadow-xl border border-white">
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
              <img src={config.qrCode} className="w-56 h-56 object-contain rounded-2xl" alt="QR" />
            ) : (
              <div className="w-56 h-56 bg-gray-50 rounded-2xl flex flex-col items-center justify-center text-center p-6">
                <p className="text-[10px] text-gray-400 font-bold">暂无二维码</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPortal;
