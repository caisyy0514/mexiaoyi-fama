
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
  const [imgError, setImgError] = useState(false);

  const handleClaimRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const tid = userIdInput.trim();
    if (!tid) return setError("请输入标识");
    setIsLoading(true);
    setTimeout(() => {
      const code = onClaim(tid);
      code ? setClaimedCode(code) : setError("暂无可用码或已领取");
      setIsLoading(false);
    }, 500);
  };

  const isDataUriValid = config.qrCode?.startsWith('data:image/');

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-gray-100 border border-gray-50 text-center">
        <h1 className="text-2xl font-black text-gray-900 mb-2">{config.name}</h1>
        <p className="text-gray-400 text-sm mb-8 font-medium">{config.description}</p>

        {!claimedCode ? (
          <form onSubmit={handleClaimRequest} className="space-y-4">
            <input 
              className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all text-center font-bold"
              placeholder="输入您的手机号/邮箱"
              value={userIdInput}
              onChange={e => setUserIdInput(e.target.value)}
            />
            {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
            <button disabled={isLoading} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-indigo-100 active:scale-95 transition-all">
              {isLoading ? '处理中...' : '领取会员权益'}
            </button>
          </form>
        ) : (
          <div className="space-y-6 animate-in zoom-in">
             <div className="p-8 bg-indigo-50 rounded-[2rem] border-2 border-dashed border-indigo-200">
                <div className="text-[10px] text-indigo-400 font-black uppercase mb-2">您的兑换码</div>
                <div className="text-3xl font-black text-indigo-600 tracking-tight select-all">{claimedCode}</div>
             </div>
             <button onClick={() => {navigator.clipboard.writeText(claimedCode); alert('复制成功');}} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold">一键复制</button>
             <button onClick={() => setClaimedCode(null)} className="text-xs text-gray-300 font-bold">返回</button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-gray-100 border border-gray-50">
        <h2 className="font-black text-gray-800 mb-4 flex items-center gap-2">流程指引</h2>
        <div className="text-sm text-gray-500 whitespace-pre-line leading-relaxed mb-8 font-medium">
          {config.instructions}
        </div>
        
        <div className="flex flex-col items-center gap-4">
          <div className="relative group p-2 bg-white rounded-3xl shadow-lg border-2 border-gray-50">
            {isDataUriValid && !imgError ? (
              <img 
                src={config.qrCode} 
                className="w-48 h-48 md:w-56 md:h-56 object-contain rounded-2xl bg-white"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-48 h-48 bg-gray-50 rounded-2xl flex flex-col items-center justify-center p-4 text-center">
                <span className="text-2xl mb-2">⚠️</span>
                <p className="text-[10px] text-gray-400 font-bold leading-tight">图片加载失败<br/>请在管理后台重新上传一次</p>
              </div>
            )}
          </div>
          <p className="text-[9px] text-gray-300 font-black uppercase tracking-[0.2em]">长按上方二维码进入小程序</p>
        </div>
      </div>
    </div>
  );
};

export default UserPortal;
