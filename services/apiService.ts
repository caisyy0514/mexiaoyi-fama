
import { CampaignConfig, ClaimRecord, MembershipCode } from '../types';

// 在实际云端部署时，请确保后端提供以下接口
const API_BASE = '/api'; 

export const ApiService = {
  // 获取云端活动配置
  async fetchConfig(): Promise<CampaignConfig | null> {
    try {
      const res = await fetch(`${API_BASE}/config`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Cloud API not found, falling back to cached data.");
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

  // 云端领取逻辑 (核心：不拉取全部码，只请求一个)
  async claimCode(userId: string): Promise<{ code: string } | { error: string }> {
    try {
      const res = await fetch(`${API_BASE}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      return await res.json();
    } catch (e) {
      // Mock 逻辑用于本地演示，实际部署应删除
      return this.mockLocalClaim(userId);
    }
  },

  // 批量上传到云端
  async uploadCodes(codes: string[]): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/codes/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes })
      });
      return res.ok;
    } catch (e) {
      // 本地备份
      const existing = JSON.parse(localStorage.getItem('m_codes_backup') || '[]');
      localStorage.setItem('m_codes_backup', JSON.stringify([...existing, ...codes]));
      return true;
    }
  },

  // 获取统计信息
  async fetchStats(): Promise<{ total: number; claimed: number }> {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      return await res.json();
    } catch (e) {
      const codes = JSON.parse(localStorage.getItem('m_codes_backup') || '[]');
      return { total: codes.length, claimed: 0 };
    }
  },

  // 模拟本地领取逻辑（仅当 API 不存在时调用）
  mockLocalClaim(userId: string) {
    const codes = JSON.parse(localStorage.getItem('m_codes_backup') || '[]');
    const claims = JSON.parse(localStorage.getItem('m_claims_backup') || '[]');
    
    const existing = claims.find((c: any) => c.userId === userId);
    if (existing) return { code: existing.code };

    const availableIdx = codes.findIndex((c: any) => !claims.some((cl: any) => cl.code === c));
    if (availableIdx === -1) return { error: "无可用会员码" };

    const code = codes[availableIdx];
    claims.push({ userId, code, timestamp: new Date().toISOString() });
    localStorage.setItem('m_claims_backup', JSON.stringify(claims));
    return { code };
  }
};
