
import { CampaignConfig, ClaimRecord, MembershipCode } from '../types';

// 在实际云端部署时，请确保后端提供以下接口
const API_BASE = '/api'; 

export const ApiService = {
  // 获取云端活动配置
  async fetchConfig(): Promise<CampaignConfig | null> {
    try {
      // 默认尝试在线获取
      const res = await fetch(`${API_BASE}/config`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('m_cfg_cloud_backup', JSON.stringify(data));
        return data;
      }
    } catch (e) {
      console.warn("Cloud API not reachable, using synced local backup.");
    }
    const local = localStorage.getItem('m_cfg_cloud_backup');
    return local ? JSON.parse(local) : null;
  },

  // 保存配置到云端
  async saveConfig(config: CampaignConfig): Promise<boolean> {
    localStorage.setItem('m_cfg_cloud_backup', JSON.stringify(config));
    try {
      const res = await fetch(`${API_BASE}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  },

  // 云端领取逻辑
  async claimCode(userId: string): Promise<{ code: string } | { error: string }> {
    try {
      const res = await fetch(`${API_BASE}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (res.ok) return await res.json();
      throw new Error("Server error");
    } catch (e) {
      return this.mockLocalClaim(userId);
    }
  },

  // 批量上传到云端：增加严苛的去重与异常捕获
  async uploadCodes(codes: string[]): Promise<boolean> {
    if (!codes || codes.length === 0) return false;
    
    try {
      const res = await fetch(`${API_BASE}/codes/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes })
      });
      if (res.ok) return true;
    } catch (e) {
      // 本地存储兜底：确保 15000 条上限内去重
      const existing = JSON.parse(localStorage.getItem('m_codes_backup') || '[]');
      const combinedSet = new Set([...existing, ...codes]);
      const combinedArray = Array.from(combinedSet);
      
      // 限制本地最大存储防止溢出
      if (combinedArray.length > 20000) {
        alert("本地备份已达上限，请确保云端 API 已部署以支持更大量级。");
      }
      
      localStorage.setItem('m_codes_backup', JSON.stringify(combinedArray.slice(0, 20000)));
      return true;
    }
    return false;
  },

  // 获取统计信息
  async fetchStats(): Promise<{ total: number; claimed: number }> {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      if (res.ok) return await res.json();
    } catch (e) {}
    
    const codes = JSON.parse(localStorage.getItem('m_codes_backup') || '[]');
    const claims = JSON.parse(localStorage.getItem('m_claims_backup') || '[]');
    return { 
      total: codes.length, 
      claimed: claims.length 
    };
  },

  // 模拟本地领取逻辑
  mockLocalClaim(userId: string) {
    const codes = JSON.parse(localStorage.getItem('m_codes_backup') || '[]');
    const claims = JSON.parse(localStorage.getItem('m_claims_backup') || '[]');
    
    const existing = claims.find((c: any) => c.userId === userId);
    if (existing) return { code: existing.code };

    // 找到一个未被领取的码
    const claimedSet = new Set(claims.map((c: any) => c.code));
    const availableCode = codes.find((c: string) => !claimedSet.has(c));
    
    if (!availableCode) return { error: "当前库存已领完" };

    const newClaim = { userId, code: availableCode, timestamp: new Date().toISOString() };
    claims.push(newClaim);
    localStorage.setItem('m_claims_backup', JSON.stringify(claims));
    return { code: availableCode };
  }
};
