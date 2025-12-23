
import React, { useState, useRef } from 'react';
import { MembershipCode, ClaimRecord, CampaignConfig } from '../types';

interface AdminDashboardProps {
  codes: MembershipCode[];
  claims: ClaimRecord[];
  config: CampaignConfig;
  setConfig: (config: CampaignConfig) => void;
  onAddCodes: (codes: string[]) => void;
  onReset: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ codes, claims, config, setConfig, onAddCodes, onReset }) => {
  const [rawInput, setRawInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleQRUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const SIZE = 300; // 降低分辨率，扫码足够清晰且体积极小
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, SIZE, SIZE);
          // 等比居中缩放
          const ratio = Math.min(SIZE / img.width, SIZE / img.height);
          const nw = img.width * ratio;
          const nh = img.height * ratio;
          ctx.drawImage(img, (SIZE - nw) / 2, (SIZE - nh) / 2, nw, nh);
          
          // 极致体积优化：JPEG 0.7 质量
          const base64 = canvas.toDataURL('image/jpeg', 0.7);
          setConfig({ ...config, qrCode: base64 });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center">
        <h1 className="text-xl font-black text-gray-800 tracking-tight">管理中心 <span className="text-xs font-normal text-gray-400 ml-2">v2.0 存储增强版</span></h1>
        <button onClick={() => window.location.hash = '#/'} className="px-4 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">预览门户</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h2 className="font-bold text-gray-700 mb-4">核心配置</h2>
            <div className="space-y-4">
              <input 
                className="w-full p-3 bg-gray-50 rounded-xl text-sm border-2 border-transparent focus:border-indigo-500 outline-none"
                placeholder="活动标题"
                value={config.name}
                onChange={e => setConfig({...config, name: e.target.value})}
              />
              <textarea 
                className="w-full p-3 bg-gray-50 rounded-xl text-sm border-2 border-transparent focus:border-indigo-500 outline-none h-32"
                placeholder="兑换说明..."
                value={config.instructions}
                onChange={e => setConfig({...config, instructions: e.target.value})}
              />
              <div className="p-4 border-2 border-dashed border-gray-200 rounded-2xl flex items-center gap-4">
                {config.qrCode ? (
                   <img src={config.qrCode} className="w-16 h-16 rounded-lg shadow-sm border" alt="QR" />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-[10px] text-gray-400">无图片</div>
                )}
                <label className="flex-grow text-center py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold cursor-pointer hover:bg-indigo-100 transition-all">
                  更新二维码
                  <input type="file" accept="image/*" onChange={handleQRUpload} className="hidden" />
                </label>
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center">
             <div className="text-3xl font-black text-gray-800">{codes.length}</div>
             <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">总库存量</div>
             <button onClick={onReset} className="mt-6 text-xs text-red-400 hover:text-red-600 font-bold transition-all">危险：重置所有系统数据</button>
          </section>
        </div>

        <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <h2 className="font-bold text-gray-700 mb-4">导入会员码</h2>
          <textarea 
            className="flex-grow w-full p-4 bg-gray-50 rounded-2xl text-xs font-mono border-2 border-transparent focus:border-indigo-500 outline-none mb-4"
            placeholder="每行一个码..."
            value={rawInput}
            onChange={e => setRawInput(e.target.value)}
          />
          <button 
            onClick={() => {
              const lines = rawInput.split('\n').filter(l => l.trim());
              onAddCodes(lines);
              setRawInput('');
            }}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg shadow-gray-200"
          >
            确认追加导入
          </button>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
