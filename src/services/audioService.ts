import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { ensureDirectoryExists } from './storageService';
import { RecordingItem } from '../types';

let currentRecording: Audio.Recording | null = null;
let currentSound: Audio.Sound | null = null;

// Configure audio mode for high performance recording & playback
export async function configureAudioSession(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch (error) {
    console.warn('Could not set audio mode:', error);
  }
}

// Request microphone permission
export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const response = await Audio.requestPermissionsAsync();
    return response.granted;
  } catch (error) {
    console.error('Permission request failed:', error);
    return false;
  }
}

// Start audio recording
export async function startRecording(
  onStatusUpdate?: (status: Audio.RecordingStatus) => void
): Promise<Audio.Recording> {
  const hasPermission = await requestMicrophonePermission();
  if (!hasPermission) {
    throw new Error('Microphone permission is required to record audio.');
  }

  await configureAudioSession();

  // If previous recording is dangling, unload it
  if (currentRecording) {
    try {
      await currentRecording.stopAndUnloadAsync();
    } catch {}
    currentRecording = null;
  }

  const recording = new Audio.Recording();
  if (onStatusUpdate) {
    recording.setOnRecordingStatusUpdate(onStatusUpdate);
    recording.setProgressUpdateInterval(100);
  }

  await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  await recording.startAsync();
  currentRecording = recording;
  return recording;
}

// Pause current recording
export async function pauseRecording(): Promise<void> {
  if (currentRecording) {
    await currentRecording.pauseAsync();
  }
}

// Resume paused recording
export async function resumeRecording(): Promise<void> {
  if (currentRecording) {
    await currentRecording.startAsync();
  }
}

// Stop recording and save to permanent app storage
export async function stopRecording(customTitle?: string): Promise<RecordingItem> {
  if (!currentRecording) {
    throw new Error('No active recording found.');
  }

  const status = await currentRecording.getStatusAsync();
  const durationMs = status.durationMillis || 0;

  await currentRecording.stopAndUnloadAsync();
  const tempUri = currentRecording.getURI();
  currentRecording = null;

  if (!tempUri) {
    throw new Error('Failed to retrieve recording URI.');
  }

  const targetDir = await ensureDirectoryExists();
  const timestamp = Date.now();
  const dateStr = new Date(timestamp)
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19);
  const fileName = `Voice_${dateStr}.m4a`;
  const permanentUri = `${targetDir}${fileName}`;

  // Move audio file to permanent directory
  await FileSystem.moveAsync({
    from: tempUri,
    to: permanentUri,
  });

  const fileInfo = await FileSystem.getInfoAsync(permanentUri);
  const sizeBytes = fileInfo.exists && !fileInfo.isDirectory ? fileInfo.size || 0 : 0;

  const title = customTitle && customTitle.trim().length > 0
    ? customTitle.trim()
    : `Voice Note ${new Date(timestamp).toLocaleDateString()} ${new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  const item: RecordingItem = {
    id: `rec_${timestamp}_${Math.random().toString(36).substring(2, 7)}`,
    title,
    uri: permanentUri,
    durationMs,
    sizeBytes,
    createdAt: timestamp,
    isSynced: false,
  };

  return item;
}

// Audio Playback
export async function playSound(
  uri: string,
  onPlaybackStatusUpdate?: (status: any) => void
): Promise<Audio.Sound> {
  await stopSound();
  await configureAudioSession();

  const { sound } = await Audio.Sound.createAsync(
    { uri },
    { shouldPlay: true, progressUpdateIntervalMillis: 100 },
    onPlaybackStatusUpdate
  );

  currentSound = sound;
  return sound;
}

export async function pauseSound(): Promise<void> {
  if (currentSound) {
    await currentSound.pauseAsync();
  }
}

export async function resumeSound(): Promise<void> {
  if (currentSound) {
    await currentSound.playAsync();
  }
}

export async function seekSound(positionMillis: number): Promise<void> {
  if (currentSound) {
    await currentSound.setPositionAsync(positionMillis);
  }
}

export async function stopSound(): Promise<void> {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch {}
    currentSound = null;
  }
}
