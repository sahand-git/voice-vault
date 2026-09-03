export interface RecordingItem {
  id: string;
  title: string;
  uri: string;
  durationMs: number;
  sizeBytes: number;
  createdAt: number; // timestamp
  isSynced: boolean;
  driveFileId?: string;
  syncedAt?: number;
}

export interface GoogleDriveUser {
  email: string;
  name: string;
  picture?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export interface AppSettings {
  autoBackup: boolean;
  audioQuality: 'high' | 'medium' | 'low';
  driveFolderName: string;
  googleUser: GoogleDriveUser | null;
}
