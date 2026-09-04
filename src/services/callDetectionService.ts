import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { CallRecorderModule } = NativeModules;
const eventEmitter = CallRecorderModule ? new NativeEventEmitter(CallRecorderModule) : null;

export interface CallRecordingEvent {
  active: boolean;
  filePath: string;
  timestamp: number;
}

export async function isAccessibilityEnabled(): Promise<boolean> {
  if (Platform.OS !== 'android' || !CallRecorderModule) return false;
  try {
    return await CallRecorderModule.isAccessibilityPermissionGranted();
  } catch (e) {
    console.warn('Error checking accessibility permission:', e);
    return false;
  }
}

export function openAccessibilitySettings(): void {
  if (Platform.OS === 'android' && CallRecorderModule) {
    CallRecorderModule.openAccessibilitySettings();
  }
}

export async function isNotificationAccessEnabled(): Promise<boolean> {
  if (Platform.OS !== 'android' || !CallRecorderModule) return false;
  try {
    return await CallRecorderModule.isNotificationListenerGranted();
  } catch (e) {
    console.warn('Error checking notification listener permission:', e);
    return false;
  }
}

export function openNotificationSettings(): void {
  if (Platform.OS === 'android' && CallRecorderModule) {
    CallRecorderModule.openNotificationSettings();
  }
}

export async function isBatteryOptimizationIgnored(): Promise<boolean> {
  if (Platform.OS !== 'android' || !CallRecorderModule) return true;
  try {
    return await CallRecorderModule.isBatteryOptimizationIgnored();
  } catch (e) {
    return true;
  }
}

export function requestIgnoreBatteryOptimization(): void {
  if (Platform.OS === 'android' && CallRecorderModule) {
    CallRecorderModule.requestIgnoreBatteryOptimization();
  }
}

export function subscribeToCallRecordings(
  onEvent: (event: CallRecordingEvent) => void
): () => void {
  if (!eventEmitter) return () => {};

  const subscription = eventEmitter.addListener(
    'onCallRecordingStateChanged',
    (data: CallRecordingEvent) => {
      onEvent(data);
    }
  );

  return () => {
    subscription.remove();
  };
}
