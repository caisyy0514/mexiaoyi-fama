
export interface MembershipCode {
  id: string;
  code: string;
  isClaimed: boolean;
  claimedAt?: string;
  claimedBy?: string;
}

export interface ClaimRecord {
  userId: string;
  codeId: string;
  code: string;
  timestamp: string;
}

export interface CampaignConfig {
  name: string;
  description: string;
  instructions: string;
  qrCode?: string; // Base64 字符串
}

export enum ViewMode {
  USER = 'USER',
  ADMIN = 'ADMIN'
}
