
export enum DeviceType {
  Mobile = 'Mobile',
  Tablet = 'Tablet',
  PC = 'PC'
}

export enum ActivityCategory {
  Work = '工作',
  Study = '学习',
  Entertainment = '娱乐',
  Life = '生活',
  Other = '其他'
}

export interface UsageLog {
  id: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  deviceType: DeviceType;
  deviceName: string;
  appName: string;
  category: ActivityCategory;
  activityDescription: string;
  syncStatus: 'synced' | 'pending' | 'local';
}

export interface WebDavConfig {
  url: string;
  username: string;
  token: string;
  remotePath: string;
}

export interface SyncState {
  isSyncing: boolean;
  lastSyncTime: string | null;
  error: string | null;
}
