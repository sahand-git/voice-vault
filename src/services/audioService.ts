import {
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  createAudioPlayer,
  AudioModule,
  RecordingPresets,
} from 'expo-audio';
import type { AudioPlayer, AudioRecorder } from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import { ensureDirectoryExists } from './storageService';
import { RecordingItem } from '../types';

let currentRecorder: AudioRecorder | null = null;
let currentPlayer: AudioPlayer | null = null;
let statusInterval: ReturnType<typeof setInterval> | null = null;
let playerSubscription: { remove: () => void } | null = null;
let recordingStartTime = 0;
let recordedDurationMs = 0;

// Configure audio mode for high performance recording & playback
export async function configureAudioSession(): Promise<void> {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      allowsBackgroundRecording: true,
      interruptionMode: 'duckOthers',
      shouldRouteThroughEarpiece: false,
    });
  } catch (error) {
    console.warn('Could not set audio mode:', error);
  }
}

// Request microphone permission
export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const response = await requestRecordingPermissionsAsync();
    return response.granted;
  } catch (error) {
    console.error('Permission request failed:', error);
    return false;
  }
}

// Start audio recording
export async function startRecording(
  onStatusUpdate?: (status: { isRecording: boolean; durationMillis: number; metering?: number }) => void
): Promise<AudioRecorder> {
  const hasPermission = await requestMicrophonePermission();
  if (!hasPermission) {
    throw new Error('Microphone permission is required to record audio.');
  }

  await configureAudioSession();

  // If previous recording is dangling, clean it up
  if (currentRecorder) {
    try {
      if (statusInterval) clearInterval(statusInterval);
      await currentRecorder.stop();
    } catch {}
    currentRecorder = null;
  }

  const recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
  await recorder.prepareToRecordAsync();
  recorder.record();
  currentRecorder = recorder;
  recordingStartTime = Date.now();
  recordedDurationMs = 0;

  if (onStatusUpdate) {
    if (statusInterval) clearInterval(statusInterval);
    statusInterval = setInterval(() => {
      if (currentRecorder && currentRecorder.isRecording) {
        const currentTotal = recordedDurationMs + (Date.now() - recordingStartTime);
        const st = currentRecorder.getStatus();
        onStatusUpdate({
          isRecording: true,
          durationMillis: st?.durationMillis || currentTotal,
          metering: st?.metering,
        });
      }
    }, 100);
  }

  return recorder;
}

// Pause current recording
export async function pauseRecording(): Promise<void> {
  if (currentRecorder && currentRecorder.isRecording) {
    recordedDurationMs += Date.now() - recordingStartTime;
    currentRecorder.pause();
  }
}

// Resume paused recording
export async function resumeRecording(): Promise<void> {
  if (currentRecorder && !currentRecorder.isRecording) {
    recordingStartTime = Date.now();
    currentRecorder.record();
  }
}

// Stop recording and save to permanent app storage
export async function stopRecording(customTitle?: string): Promise<RecordingItem> {
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }

  if (!currentRecorder) {
    throw new Error('No active recording found.');
  }

  const finalDuration = recordedDurationMs + (currentRecorder.isRecording ? (Date.now() - recordingStartTime) : 0);
  const recorder = currentRecorder;
  currentRecorder = null;

  await recorder.stop();
  let tempUri = recorder.uri;
  if (!tempUri) {
    const st = recorder.getStatus();
    tempUri = st?.url || null;
  }

  if (!tempUri) {
    throw new Error('Failed to retrieve recording file URI.');
  }

  // Normalize URI if file:// protocol is missing
  if (!tempUri.startsWith('file://') && !tempUri.startsWith('content://')) {
    tempUri = `file://${tempUri}`;
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
    durationMs: finalDuration > 0 ? finalDuration : 1000,
    sizeBytes,
    createdAt: timestamp,
    isSynced: false,
  };

  return item;
}

// Audio Playback
export async function playSound(
  uri: string,
  onPlaybackStatusUpdate?: (status: {
    isLoaded: boolean;
    isPlaying: boolean;
    positionMillis: number;
    durationMillis: number;
    didJustFinish: boolean;
  }) => void
): Promise<AudioPlayer> {
  await stopSound();
  await configureAudioSession();

  const player = createAudioPlayer(uri, { updateInterval: 100 });
  currentPlayer = player;

  if (onPlaybackStatusUpdate) {
    playerSubscription = player.addListener('playbackStatusUpdate', (status) => {
      onPlaybackStatusUpdate({
        isLoaded: status.isLoaded,
        isPlaying: status.playing,
        positionMillis: Math.round((status.currentTime || 0) * 1000),
        durationMillis: Math.round((status.duration || 0) * 1000),
        didJustFinish: Boolean(status.didJustFinish),
      });
    });
  }

  player.play();
  return player;
}

export async function pauseSound(): Promise<void> {
  if (currentPlayer) {
    currentPlayer.pause();
  }
}

export async function resumeSound(): Promise<void> {
  if (currentPlayer) {
    currentPlayer.play();
  }
}

export async function seekSound(positionMillis: number): Promise<void> {
  if (currentPlayer) {
    await currentPlayer.seekTo(positionMillis / 1000);
  }
}

export async function stopSound(): Promise<void> {
  if (playerSubscription) {
    playerSubscription.remove();
    playerSubscription = null;
  }
  if (currentPlayer) {
    try {
      currentPlayer.pause();
      currentPlayer.remove();
    } catch {}
    currentPlayer = null;
  }
}
