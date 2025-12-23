
import React, { useState } from 'react';
import { CampaignConfig, ClaimRecord } from '../types';

interface UserPortalProps {
  config: CampaignConfig;
  onClaim: (userId: string) => string | null;
  claims: ClaimRecord[];
}

const UserPortal: React.FC<UserPortalProps> = ({ config, onClaim, claims }) => {
  const [userIdInput, setUserIdInput] = useState('');
  const [claimedCode, setClaimedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleClaimRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setClaimedCode(null);

    const trimmedId = userIdInput.trim();
    if (!trimmedId) {
      setError("请输入有效的用户 ID 或邮箱。");
      return;
    }

    setIsLoading(true);
    
    setTimeout(() => {
      const code = onClaim(trimmedId);
      if (code) {
        setClaimedCode(code);
      } else {
        setError("抱歉，当前暂无可用码，或该账号已领取过。");
      }
      setIsLoading(false);
    }, 600);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("兑换码已复制！");
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-2xl font-black mb-2">{config.name}</h1>
          <p className="text-indigo-100 text-sm leading-relaxed opacity-90">
            {config.description}
          </p>
        </div>
        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse"></div>
      </div>

      <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
        {!claimedCode ? (
          <form onSubmit={handleClaimRequest} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                账号验证
              </label>
              <input 
                type="text"
                placeholder="请输入手机号/邮箱/ID"
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
                className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all text-gray-700 font-medium"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-500 rounded-xl text-xs font-bold border border-red-100 animate-shake">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-[0.97] flex items-center justify-center disabled:opacity-50"
            >
              {isLoading ? '核销中...' : '立即领取权益'}
            </button>
          </form>
        ) : (
          <div className="text-center py-4 animate-in zoom-in duration-300 space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-600 rounded-full mb-2">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900">领取成功！</h3>
              <p className="text-gray-400 text-sm">您的专属兑换码已生成</p>
            </div>
            
            <div className="bg-indigo-50 border-2 border-dashed border-indigo-200 p-6 rounded-3xl group relative">
              <span className="block font-mono text-3xl font-black text-indigo-600 tracking-tighter select-all">
                {claimedCode}
              </span>
              <button 
                onClick={() => copyToClipboard(claimedCode)}
                className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-full text-xs font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-100"
              >
                复制兑换码
              </button>
            </div>

            <button 
              onClick={() => { setClaimedCode(null); setUserIdInput(''); }}
              className="text-gray-300 text-xs font-bold hover:text-gray-500 transition-colors"
            >
              返回重新领取
            </button>
          </div>
        )}
      </div>

      <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
        <h2 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">
          <span className="text-yellow-500">💡</span> 使用流程
        </h2>
        <div className="space-y-6">
          <div className="text-gray-500 text-sm whitespace-pre-line leading-relaxed font-medium">
            {config.instructions}
          </div>
          <div className="flex flex-col items-center pt-6 border-t border-gray-50">
            <div className="p-2 bg-white rounded-3xl shadow-xl border-4 border-gray-50 overflow-hidden">
              <img 
                src={config.qrCode || "https://placehold.co/400?text=未设置二维码"} 
                alt="二维码"
                className="w-48 h-48 md:w-64 md:h-64 object-contain bg-white"
                loading="lazy"
              />
            </div>
            <p className="mt-4 text-[10px] text-gray-300 font-black uppercase tracking-widest">长按识别二维码或保存图片</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPortal;
