
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

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  codes, 
  claims, 
  config, 
  setConfig, 
  onAddCodes, 
  onReset 
}) => {
  const [rawInput, setRawInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = rawInput.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length > 0) {
      onAddCodes(lines);
      setRawInput('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      onAddCodes(lines);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // 压缩并处理图片
  const handleQRUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400; // 统一限制为 400px
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85); // 压缩并转为 JPEG
          setConfig({ ...config, qrCode: compressedBase64 });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const exportClaims = () => {
    if (claims.length === 0) return alert("暂无数据可导出");
    const headers = "用户标识,会员码,领取时间\n";
    const csvContent = claims.map(c => `${c.userId},${c.code},${new Date(c.timestamp).toLocaleString()}`).join("\n");
    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `领取记录_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const unclaimedCount = codes.filter(c => !c.isClaimed).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">管理后台</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => window.location.hash = '#/'}
            className="px-4 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            返回门户
          </button>
          <button 
            onClick={exportClaims}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors shadow-sm"
          >
            导出 CSV 记录
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <section className="bg-white p-6 rounded-2xl border shadow-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="text-indigo-500">📊</span> 实时状态
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-xs text-gray-500 font-medium">总库存</p>
                <p className="text-2xl font-bold">{codes.length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-xl">
                <p className="text-xs text-green-600 font-medium">已发出</p>
                <p className="text-2xl font-bold text-green-700">{claims.length}</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-400">剩余可用：{unclaimedCount}</p>
            <button 
              onClick={onReset}
              className="mt-6 w-full py-2 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
            >
              清空系统所有数据
            </button>
          </section>

          <section className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
            <h2 className="text-lg font-bold mb-2">活动配置</h2>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">活动名称</label>
              <input 
                type="text" 
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                className="w-full p-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">兑换说明 (支持换行)</label>
              <textarea 
                value={config.instructions}
                onChange={(e) => setConfig({ ...config, instructions: e.target.value })}
                rows={5}
                className="w-full p-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">自定义二维码图片</label>
              <div className="flex items-center gap-4 mt-2">
                {config.qrCode && (
                  <img src={config.qrCode} className="w-12 h-12 rounded border p-1 object-contain" alt="Preview" />
                )}
                <label className="flex-grow cursor-pointer bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-2 text-center text-xs text-gray-500 hover:bg-gray-100">
                  <span>点击上传并自动优化体积</span>
                  <input type="file" accept="image/*" onChange={handleQRUpload} className="hidden" />
                </label>
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white p-6 rounded-2xl border shadow-sm">
            <h2 className="text-lg font-bold mb-4">批量导入会员码 (限15,000条)</h2>
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl hover:bg-gray-100 transition-colors flex flex-col items-center justify-center gap-1"
                >
                  <span className="text-gray-600 font-semibold text-sm">选择本地文件 (XLSX/CSV/TXT)</span>
                  <span className="text-gray-400 text-xs">自动按行识别每一个码</span>
                  <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.txt" onChange={handleFileUpload} className="hidden" />
                </button>
              </div>
              
              <div className="relative">
                <textarea 
                  className="w-full h-32 p-4 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 font-mono text-xs"
                  placeholder="手动粘贴：每行一个码..."
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                />
                <button 
                  onClick={handleTextSubmit}
                  className="absolute bottom-4 right-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs hover:bg-indigo-700 shadow-lg"
                >
                  确认导入
                </button>
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl border shadow-sm overflow-hidden">
            <h2 className="text-lg font-bold mb-4">领取历史 (最近100条)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-gray-400">
                    <th className="pb-3 font-semibold uppercase">用户标识</th>
                    <th className="pb-3 font-semibold uppercase">会员码</th>
                    <th className="pb-3 font-semibold uppercase">领取时间</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.length === 0 ? (
                    <tr><td colSpan={3} className="py-10 text-center text-gray-400">暂无任何领取数据</td></tr>
                  ) : (
                    claims.slice(-100).reverse().map((claim, idx) => (
                      <tr key={idx} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="py-3 font-medium text-gray-800">{claim.userId}</td>
                        <td className="py-3 font-mono text-indigo-600 font-semibold">{claim.code}</td>
                        <td className="py-3 text-gray-400">{new Date(claim.timestamp).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
