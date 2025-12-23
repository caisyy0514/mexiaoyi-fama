
import React, { useState, useEffect } from 'react';
import { CampaignConfig } from '../types';
import { ApiService } from '../services/apiService';
import * as XLSX from 'xlsx';

interface AdminDashboardProps {
  config: CampaignConfig;
  setConfig: (config: CampaignConfig) => void;
  onReset: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ config, setConfig, onReset }) => {
  const [stats, setStats] = useState({ total: 0, claimed: 0 });
  const [rawInput, setRawInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    ApiService.fetchStats().then(setStats);
  }, [isUploading]);

  const handleQRUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const SIZE = 400; 
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, SIZE, SIZE);
          const ratio = Math.min(SIZE / img.width, SIZE / img.height);
          ctx.drawImage(img, (SIZE - img.width * ratio) / 2, (SIZE - img.height * ratio) / 2, img.width * ratio, img.height * ratio);
          setConfig({ ...config, qrCode: canvas.toDataURL('image/jpeg', 0.8) });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        const codes = data.map(r => String(r[0] || '').trim()).filter(Boolean);
        
        const success = await ApiService.uploadCodes(codes);
        if (success) alert(`成功将 ${codes.length} 条码上传至云端`);
      } catch (err) {
        alert("解析失败");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center">
        <h1 className="text-xl font-black text-gray-800">云端控制台</h1>
        <button onClick={() => window.location.hash = '#/'} className="text-sm font-bold text-blue-600">返回门户</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 配置区 */}
        <div className="md:col-span-2 space-y-6">
          <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-6 text-gray-700">活动配置 (实时同步)</h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">活动名称</label>
                <input className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={config.name} onChange={e => setConfig({...config, name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">兑换指引</label>
                <textarea className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 outline-none h-40 text-sm leading-relaxed" value={config.instructions} onChange={e => setConfig({...config, instructions: e.target.value})} />
              </div>
              <div className="flex items-center gap-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                <div className="w-20 h-20 bg-white rounded-xl shadow-inner flex items-center justify-center overflow-hidden border">
                  {config.qrCode ? <img src={config.qrCode} className="w-full h-full object-contain" /> : <span className="text-[10px] text-gray-300">无码</span>}
                </div>
                <div>
                  <label className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-blue-700">
                    上传云端二维码
                    <input type="file" accept="image/*" onChange={handleQRUpload} className="hidden" />
                  </label>
                  <p className="text-[10px] text-gray-400 mt-2">推荐尺寸 400x400，自动云端优化</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* 统计与导入 */}
        <div className="space-y-6">
          <section className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-[2rem] text-white shadow-xl">
            <div className="text-4xl font-black">{stats.total.toLocaleString()}</div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">云端总库存</div>
            <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-end">
              <div>
                <div className="text-xl font-bold text-green-400">{stats.claimed}</div>
                <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">已分发</div>
              </div>
              <button onClick={onReset} className="text-[9px] font-black text-red-400 uppercase hover:text-red-300">清空云端</button>
            </div>
          </section>

          <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-700 mb-4">批量导入 (Max 15k)</h3>
            <label className={`w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-blue-400 transition-all ${isUploading ? 'opacity-50' : ''}`}>
              <span className="text-xs font-bold text-gray-600">{isUploading ? '上传云端中...' : '选择 Excel / CSV'}</span>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" disabled={isUploading} />
            </label>
            <div className="mt-4">
              <textarea 
                className="w-full p-3 bg-gray-50 rounded-xl text-[10px] font-mono border-none focus:ring-1 focus:ring-blue-400 h-24 mb-2"
                placeholder="或粘贴会员码，每行一个..."
                value={rawInput}
                onChange={e => setRawInput(e.target.value)}
              />
              <button 
                onClick={async () => {
                  const codes = rawInput.split('\n').filter(l => l.trim());
                  if (await ApiService.uploadCodes(codes)) {
                    alert('已同步到云端');
                    setRawInput('');
                  }
                }}
                className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200"
              >
                追加同步
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
