import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { GoogleDriveUser, RecordingItem } from '../types';
import { getSettings, saveSettings, updateRecording } from './storageService';

try {
  WebBrowser.maybeCompleteAuthSession();
} catch (e) {
  // Ignored on standalone launch
}

// Google OAuth configuration
// Scopes: drive.file grants access only to files created or opened by VoiceVault
export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

const DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

// Share file via native Android sharing sheet (which includes Google Drive)
export async function shareRecording(uri: string, title?: string): Promise<boolean> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not supported on this device.');
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'audio/m4a',
    dialogTitle: `Backup ${title || 'Recording'} to Google Drive`,
    UTI: 'public.audio',
  });
  return true;
}

// Fetch user info using Google access token
export async function fetchGoogleProfile(accessToken: string): Promise<Partial<GoogleDriveUser>> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user profile from Google.');
  }

  const data = await response.json();
  return {
    email: data.email,
    name: data.name || data.email,
    picture: data.picture,
  };
}

// Find or create 'VoiceVault Recordings' folder in Google Drive
export async function getOrCreateDriveFolder(accessToken: string, folderName = 'VoiceVault Recordings'): Promise<string> {
  // Check if folder exists
  const query = encodeURIComponent(`name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }
  }

  // Create folder if not found
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Failed to create Google Drive folder: ${err}`);
  }

  const createData = await createRes.json();
  return createData.id;
}

// Upload a single audio recording to Google Drive using Google Resumable Upload
export async function uploadRecordingToDrive(
  recording: RecordingItem,
  accessToken: string,
  folderName = 'VoiceVault Recordings'
): Promise<string> {
  const folderId = await getOrCreateDriveFolder(accessToken, folderName);
  const cleanTitle = recording.title.replace(/[/\\?%*:|"<>]/g, '_');
  const filename = `${cleanTitle}.m4a`;

  // Step 1: Initiate resumable upload session
  const initRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'audio/m4a',
      },
      body: JSON.stringify({
        name: filename,
        parents: [folderId],
        description: `VoiceVault recording created on ${new Date(recording.createdAt).toLocaleString()}`,
      }),
    }
  );

  if (!initRes.ok) {
    const errText = await initRes.text();
    throw new Error(`Failed to initiate Drive upload: ${errText}`);
  }

  const uploadLocationUrl = initRes.headers.get('Location') || initRes.headers.get('location');
  if (!uploadLocationUrl) {
    throw new Error('Google Drive did not return an upload URL.');
  }

  // Step 2: Upload file binary directly using FileSystem
  const uploadResult = await FileSystem.uploadAsync(uploadLocationUrl, recording.uri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      'Content-Type': 'audio/m4a',
    },
  });

  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    throw new Error(`Upload failed with status ${uploadResult.status}: ${uploadResult.body}`);
  }

  const resultData = JSON.parse(uploadResult.body);
  const driveFileId = resultData.id;

  // Mark local recording as synced
  await updateRecording(recording.id, {
    isSynced: true,
    driveFileId,
    syncedAt: Date.now(),
  });

  return driveFileId;
}

// Backup all unsynced recordings
export async function syncAllUnsynced(
  recordings: RecordingItem[],
  accessToken: string,
  onProgress?: (current: number, total: number, name: string) => void
): Promise<{ success: number; failed: number }> {
  const unsynced = recordings.filter((r) => !r.isSynced);
  let success = 0;
  let failed = 0;

  for (let i = 0; i < unsynced.length; i++) {
    const item = unsynced[i];
    if (onProgress) {
      onProgress(i + 1, unsynced.length, item.title);
    }
    try {
      await uploadRecordingToDrive(item, accessToken);
      success++;
    } catch (e) {
      console.error(`Failed to sync ${item.title}:`, e);
      failed++;
    }
  }

  return { success, failed };
}
