
import React, { useState, useRef } from 'react';
import { MembershipCode, ClaimRecord, CampaignConfig } from '../types';
import * as XLSX from 'xlsx';

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
  const [showSync, setShowSync] = useState(false);
  const [syncText, setSyncText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_TOTAL_CODES = 15000;

  const handleQRUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const SIZE = 250; 
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, SIZE, SIZE);
          const ratio = Math.min(SIZE / img.width, SIZE / img.height);
          const nw = img.width * ratio;
          const nh = img.height * ratio;
          ctx.drawImage(img, (SIZE - nw) / 2, (SIZE - nh) / 2, nw, nh);
          const base64 = canvas.toDataURL('image/jpeg', 0.6); 
          setConfig({ ...config, qrCode: base64 });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        
        // 提取第一列非空数据作为会员码
        const extractedCodes = data
          .map(row => row[0])
          .filter(val => val !== undefined && val !== null && String(val).trim() !== "")
          .map(val => String(val).trim());

        if (codes.length + extractedCodes.length > MAX_TOTAL_CODES) {
          alert(`导入失败：系统上限为 ${MAX_TOTAL_CODES} 条，当前已有 ${codes.length} 条，本次尝试导入 ${extractedCodes.length} 条，超额。`);
        } else {
          onAddCodes(extractedCodes);
          alert(`成功从文件导入 ${extractedCodes.length} 条会员码`);
        }
      } catch (err) {
        console.error(err);
        alert("文件解析失败，请确保格式正确（xlsx, xls 或 csv）");
      } finally {
        setIsParsing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = () => {
    try {
      const data = JSON.parse(syncText);
      if (data.config) {
        setConfig(data.config);
        alert("配置已加载，请刷新页面生效。");
      }
      setShowSync(false);
    } catch (e) {
      alert("配置格式错误，请确保复制了完整的 JSON 文本。");
    }
  };

  const handleManualAdd = () => {
    const lines = rawInput.split('\n').filter(l => l.trim());
    if (codes.length + lines.length > MAX_TOTAL_CODES) {
      alert(`导入失败：超限，目前最多还可导入 ${MAX_TOTAL_CODES - codes.length} 条。`);
      return;
    }
    onAddCodes(lines);
    setRawInput('');
    alert(`已手动导入 ${lines.length} 条`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 顶部标题栏 */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-wrap gap-4 justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-gray-800 tracking-tight">管理中心</h1>
          <p className="text-[10px] text-orange-500 font-bold uppercase tracking-tighter">提示：本地存储限 15000 条，跨设备需点击同步按钮</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSync(!showSync)} className="px-3 py-2 text-xs font-bold bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all">同步配置</button>
          <button onClick={() => window.location.hash = '#/'} className="px-4 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">预览门户</button>
        </div>
      </div>

      {/* 同步面板 */}
      {showSync && (
        <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 animate-in slide-in-from-top-4">
          <h3 className="font-bold text-indigo-900 mb-2">跨设备数据同步</h3>
          <p className="text-xs text-indigo-700 mb-4">
            在 PC 配置好后，点击“生成配置”，复制文本发到手机，在此处粘贴并点击“导入”。
          </p>
          <textarea 
            className="w-full h-32 p-3 text-[10px] font-mono border border-indigo-200 rounded-xl mb-3 focus:ring-2 focus:ring-indigo-300 outline-none"
            value={syncText}
            onChange={e => setSyncText(e.target.value)}
            placeholder="粘贴配置 JSON 文本..."
          />
          <div className="flex gap-2">
            <button onClick={() => setSyncText(JSON.stringify({ config }))} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-200">生成配置文本</button>
            <button onClick={handleImport} className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold shadow-md shadow-green-200">立即导入</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* 活动配置 */}
          <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-indigo-500 rounded-full"></span>
              核心配置
            </h2>
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
              <div className="p-4 border-2 border-dashed border-gray-200 rounded-2xl flex items-center gap-4 bg-gray-50/30">
                {config.qrCode ? (
                   <img src={config.qrCode} className="w-16 h-16 rounded-lg shadow-sm border bg-white object-contain" alt="QR" />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-[10px] text-gray-400">无图片</div>
                )}
                <div className="flex-grow">
                  <label className="w-full inline-block text-center py-2 bg-white border border-indigo-200 text-indigo-600 rounded-xl text-xs font-bold cursor-pointer hover:shadow-sm transition-all">
                    更新二维码
                    <input type="file" accept="image/*" onChange={handleQRUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* 数据统计 */}
          <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center py-10 relative overflow-hidden">
             <div className="relative z-10">
               <div className="text-5xl font-black text-gray-800 tracking-tighter">{codes.length.toLocaleString()}</div>
               <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">当前库存量 (上限 15,000)</div>
               <div className="mt-4 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-500" 
                    style={{ width: `${(codes.length / MAX_TOTAL_CODES) * 100}%` }}
                  ></div>
               </div>
               <button onClick={onReset} className="mt-8 text-[10px] text-red-300 hover:text-red-500 font-bold uppercase tracking-widest transition-all">清空本地所有数据</button>
             </div>
             <div className="absolute -right-8 -bottom-8 text-gray-50 font-black text-8xl select-none">DATA</div>
          </section>
        </div>

        {/* 导入区域 */}
        <section className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-green-500 rounded-full"></span>
            导入会员码
          </h2>
          
          {/* 文件上传按钮 */}
          <div className="mb-4">
            <label className={`w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-50 transition-all ${isParsing ? 'opacity-50 pointer-events-none' : ''}`}>
               <svg className="w-8 h-8 text-indigo-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
               </svg>
               <span className="text-xs font-bold text-gray-600">{isParsing ? '正在解析中...' : '上传 Excel / CSV 文件'}</span>
               <span className="text-[10px] text-gray-400 mt-1">仅解析第一列数据</span>
               <input type="file" ref={fileInputRef} accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <div className="relative flex items-center mb-4">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="px-3 text-[10px] font-bold text-gray-300 uppercase tracking-widest">或手动粘贴</span>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>

          <textarea 
            className="flex-grow w-full p-4 bg-gray-50 rounded-2xl text-xs font-mono border-2 border-transparent focus:border-indigo-500 outline-none mb-4 min-h-[150px]"
            placeholder="每行一个码，例如：&#10;VIP666&#10;VIP888&#10;..."
            value={rawInput}
            onChange={e => setRawInput(e.target.value)}
          />
          <button 
            onClick={handleManualAdd}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            确认追加导入
          </button>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
