
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
  qrCode?: string; 
  lastUpdated?: string;
}

export enum ViewMode {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export interface CloudStatus {
  connected: boolean;
  syncing: boolean;
  error?: string;
}
