import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { RecordingItem, AppSettings, GoogleDriveUser } from '../types';

const RECORDINGS_KEY = '@voicevault_recordings_v1';
const SETTINGS_KEY = '@voicevault_settings_v1';
const RECORDINGS_DIR = `${FileSystem.documentDirectory}voicevault_recordings/`;

// Ensure local directory exists
export async function ensureDirectoryExists(): Promise<string> {
  const dirInfo = await FileSystem.getInfoAsync(RECORDINGS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(RECORDINGS_DIR, { intermediates: true });
  }
  return RECORDINGS_DIR;
}

// Get all recordings sorted by newest first
export async function getRecordings(): Promise<RecordingItem[]> {
  try {
    const json = await AsyncStorage.getItem(RECORDINGS_KEY);
    if (!json) return [];
    const items: RecordingItem[] = JSON.parse(json);
    return items.sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) {
    console.error('Error fetching recordings:', e);
    return [];
  }
}

// Save a new recording
export async function saveRecording(recording: RecordingItem): Promise<void> {
  try {
    const list = await getRecordings();
    const updated = [recording, ...list];
    await AsyncStorage.setItem(RECORDINGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving recording:', e);
    throw e;
  }
}

// Update an existing recording (e.g. rename or mark as synced)
export async function updateRecording(
  id: string,
  changes: Partial<RecordingItem>
): Promise<RecordingItem[]> {
  try {
    const list = await getRecordings();
    const updated = list.map((item) =>
      item.id === id ? { ...item, ...changes } : item
    );
    await AsyncStorage.setItem(RECORDINGS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error updating recording:', e);
    throw e;
  }
}

// Delete a recording from storage and local filesystem
export async function deleteRecording(id: string): Promise<RecordingItem[]> {
  try {
    const list = await getRecordings();
    const target = list.find((item) => item.id === id);
    if (target && target.uri) {
      const info = await FileSystem.getInfoAsync(target.uri);
      if (info.exists) {
        await FileSystem.deleteAsync(target.uri, { idempotent: true });
      }
    }
    const updated = list.filter((item) => item.id !== id);
    await AsyncStorage.setItem(RECORDINGS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error deleting recording:', e);
    throw e;
  }
}

// Settings management
const DEFAULT_SETTINGS: AppSettings = {
  autoBackup: true,
  audioQuality: 'high',
  driveFolderName: 'VoiceVault Recordings',
  googleUser: null,
};

export async function getSettings(): Promise<AppSettings> {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!json) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(json) };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  try {
    const current = await getSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error saving settings:', e);
    throw e;
  }
}

export async function setGoogleUser(user: GoogleDriveUser | null): Promise<void> {
  await saveSettings({ googleUser: user });
}
