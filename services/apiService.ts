
import { CampaignConfig } from '../types.ts';

const API_BASE = '/api'; 

export const ApiService = {
  // 获取云端活动配置
  async fetchConfig(): Promise<CampaignConfig | null> {
    try {
      const res = await fetch(`${API_BASE}/config`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error("Config fetch error:", e);
    }
    return null;
  },

  // 保存配置
  async saveConfig(config: CampaignConfig): Promise<boolean> {
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

  // 领取逻辑
  async claimCode(userId: string): Promise<{ code: string } | { error: string }> {
    try {
      const res = await fetch(`${API_BASE}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (res.ok) return data;
      return { error: data.error || "领取请求被拒绝" };
    } catch (e) {
      return { error: "无法连接核销服务器" };
    }
  },

  // 批量上传
  async uploadCodes(codes: string[]): Promise<boolean> {
    if (!codes || codes.length === 0) return false;
    try {
      const res = await fetch(`${API_BASE}/codes/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes })
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  },

  // 获取统计信息（包含 cloud 标志）
  async fetchStats(): Promise<{ total: number; claimed: number; cloud: boolean } | null> {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  // 重置
  async resetCloud(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/reset`, { method: 'POST' });
      return res.ok;
    } catch (e) {
      return false;
    }
  }
};
