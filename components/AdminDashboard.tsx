
import React, { useState, useEffect } from 'react';
import { CampaignConfig } from '../types.ts';
import { ApiService } from '../services/apiService.ts';
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
    refreshStats();
  }, []);

  const refreshStats = async () => {
    const newStats = await ApiService.fetchStats();
    setStats(newStats);
  };

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
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        const codes = rows
          .map(r => String(r[0] || '').trim())
          .filter(val => val && val !== 'undefined' && val !== 'null' && val.length > 1);
        
        if (codes.length === 0) throw new Error("未识别到有效的会员码");

        const success = await ApiService.uploadCodes(codes);
        if (success) {
          alert(`成功同步 ${codes.length} 条会员码到云端`);
          await refreshStats();
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : "文件解析失败");
      } finally {
        setIsUploading(false);
        if (e.target) e.target.value = ''; 
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleManualAdd = async () => {
    const lines = rawInput.split('\n').map(l => l.trim()).filter(l => l.length > 1);
    if (lines.length === 0) return;
    
    setIsUploading(true);
    const success = await ApiService.uploadCodes(lines);
    if (success) {
      alert(`已手动追加 ${lines.length} 条码`);
      setRawInput('');
      await refreshStats();
    }
    setIsUploading(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-gray-800">云端控制台</h1>
          <p className="text-[9px] text-blue-500 font-bold uppercase tracking-wider">Cloud Engine v3.2</p>
        </div>
        <button onClick={() => window.location.hash = '#/'} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors">返回门户</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-6 text-gray-700 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
              活动配置
            </h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">活动名称</label>
                <input className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={config.name} onChange={e => setConfig({...config, name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">兑换说明</label>
                <textarea className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 outline-none h-40 text-sm leading-relaxed" value={config.instructions} onChange={e => setConfig({...config, instructions: e.target.value})} />
              </div>
              <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-[1.5rem] border border-gray-100">
                <div className="w-24 h-24 bg-white rounded-2xl shadow-sm flex items-center justify-center overflow-hidden border border-white">
                  {config.qrCode ? <img src={config.qrCode} className="w-full h-full object-contain" /> : <span className="text-[10px] text-gray-300">无图</span>}
                </div>
                <div className="flex-grow">
                  <label className="inline-block px-5 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-black">
                    上传二维码
                    <input type="file" accept="image/*" onChange={handleQRUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-gradient-to-br from-blue-700 to-indigo-900 p-8 rounded-[2rem] text-white shadow-xl">
            <div className="text-4xl font-black tabular-nums">{stats.total.toLocaleString()}</div>
            <div className="text-[10px] font-black text-blue-200 uppercase tracking-widest mt-1">云端总库存</div>
            <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-end">
              <div>
                <div className="text-xl font-bold text-green-300 tabular-nums">{stats.claimed}</div>
                <div className="text-[9px] font-bold text-blue-300 uppercase tracking-wider">已领数量</div>
              </div>
              <button onClick={onReset} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[9px] font-black text-white uppercase transition-all">重置</button>
            </div>
          </section>

          <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-700 mb-4 text-sm">批量导入会员码</h3>
            <label className={`w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-blue-50 transition-all ${isUploading ? 'opacity-50' : ''}`}>
              <span className="text-xs font-bold text-gray-600">{isUploading ? '同步中...' : '点击上传 Excel'}</span>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" disabled={isUploading} />
            </label>
            <div className="mt-6">
              <textarea 
                className="w-full p-4 bg-gray-50 rounded-2xl text-[10px] font-mono border-none focus:ring-1 focus:ring-blue-400 h-24 mb-3 outline-none"
                placeholder="或手动粘贴"
                value={rawInput}
                onChange={e => setRawInput(e.target.value)}
              />
              <button 
                disabled={isUploading || !rawInput.trim()}
                onClick={handleManualAdd}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl text-xs font-bold disabled:bg-gray-100"
              >
                追加码
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
