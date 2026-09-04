import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  StatusBar as RNStatusBar,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { RecordScreen } from './src/screens/RecordScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { AudioPlayerBottomBar } from './src/components/AudioPlayerBottomBar';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import {
  getRecordings,
  getSettings,
  ensureDirectoryExists,
  saveRecording,
} from './src/services/storageService';
import { uploadRecordingToDrive } from './src/services/driveService';
import * as FileSystem from 'expo-file-system';
import { subscribeToCallRecordings, CallRecordingEvent } from './src/services/callDetectionService';
import {
  configureAudioSession,
  playSound,
  pauseSound,
  resumeSound,
  stopSound,
} from './src/services/audioService';
import { RecordingItem, AppSettings } from './src/types';

function MainApp() {
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'record' | 'library' | 'settings'>('record');
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Audio Playback State
  const [currentPlayingItem, setCurrentPlayingItem] = useState<RecordingItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function prepare() {
      try {
        // Load vector icon fonts safely
        try {
          await Font.loadAsync(Ionicons.font);
        } catch (fontErr) {
          console.warn('Non-fatal font load warning:', fontErr);
        }

        // Initialize directories safely
        try {
          await ensureDirectoryExists();
        } catch (dirErr) {
          console.warn('Directory check error:', dirErr);
        }

        // Configure audio
        try {
          await configureAudioSession();
        } catch (audioErr) {
          console.warn('Audio session error:', audioErr);
        }

        // Load saved state
        try {
          const list = await getRecordings();
          if (isMounted) setRecordings(list);
          const s = await getSettings();
          if (isMounted) setSettings(s);
        } catch (dataErr) {
          console.warn('Data load error:', dataErr);
        }
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    }

    prepare();

    const unsubscribeCalls = subscribeToCallRecordings(async (event: CallRecordingEvent) => {
      if (!event.active && event.filePath) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(event.filePath);
          if (fileInfo.exists) {
            const timestamp = event.timestamp || Date.now();
            const newItem: RecordingItem = {
              id: `call_${timestamp}_${Math.random().toString(36).substring(2, 6)}`,
              title: `WhatsApp Call ${new Date(timestamp).toLocaleDateString()} ${new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
              uri: event.filePath,
              durationMs: 0,
              sizeBytes: fileInfo.size || 0,
              createdAt: timestamp,
              isSynced: false,
            };
            await saveRecording(newItem);
            await refreshData();

            // Auto-backup to Google Drive if configured
            const s = await getSettings();
            if (s.autoBackup && s.googleUser?.accessToken) {
              uploadRecordingToDrive(newItem, s.googleUser.accessToken).catch(() => {});
            }
          }
        } catch (callErr) {
          console.warn('Call recording processing error:', callErr);
        }
      }
    });

    return () => {
      isMounted = false;
      stopSound().catch(() => {});
      unsubscribeCalls();
    };
  }, []);

  const refreshData = async () => {
    try {
      const list = await getRecordings();
      setRecordings(list);
      const s = await getSettings();
      setSettings(s);
    } catch (e) {
      console.warn('Error refreshing data:', e);
    }
  };

  // Playback handlers
  const handlePlayRecording = async (item: RecordingItem) => {
    try {
      setCurrentPlayingItem(item);
      setIsPlaying(true);
      setPlaybackPosition(0);
      setPlaybackDuration(item.durationMs);

      await playSound(item.uri, (status: any) => {
        if (status && status.isLoaded) {
          setPlaybackPosition(status.positionMillis || 0);
          setPlaybackDuration(status.durationMillis || item.durationMs);
          setIsPlaying(Boolean(status.isPlaying));
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPlaybackPosition(0);
          }
        }
      });
    } catch (e) {
      console.error('Playback error:', e);
      setIsPlaying(false);
    }
  };

  const handlePausePlayback = async () => {
    await pauseSound();
    setIsPlaying(false);
  };

  const handleResumePlayback = async () => {
    await resumeSound();
    setIsPlaying(true);
  };

  const handleClosePlayer = async () => {
    await stopSound();
    setCurrentPlayingItem(null);
    setIsPlaying(false);
  };

  if (!isReady) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.splashText}>Starting VoiceVault...</Text>
      </View>
    );
  }

  const unsyncedCount = recordings.filter((r) => !r.isSynced).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.branding}>
          <View style={styles.logoIcon}>
            <Ionicons name="mic-circle" size={28} color="#10B981" />
          </View>
          <View>
            <Text style={styles.headerTitle}>VoiceVault</Text>
            <Text style={styles.headerSubtitle}>
              {recordings.length} note{recordings.length === 1 ? '' : 's'} •{' '}
              {settings?.googleUser ? 'Drive Synced' : 'Phone Storage'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.headerRightBadge}
          onPress={() => setActiveTab('settings')}
        >
          <Ionicons
            name={settings?.googleUser ? 'cloud-done' : 'cloud-offline-outline'}
            size={20}
            color={settings?.googleUser ? '#10B981' : '#F59E0B'}
          />
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>
        {activeTab === 'record' && (
          <RecordScreen
            onRecordingSaved={refreshData}
            onNavigateToLibrary={() => setActiveTab('library')}
          />
        )}

        {activeTab === 'library' && (
          <LibraryScreen
            recordings={recordings}
            currentPlayingId={currentPlayingItem?.id || null}
            isPlaying={isPlaying}
            onPlayRecording={handlePlayRecording}
            onPauseRecording={handlePausePlayback}
            onRefreshList={refreshData}
            onNavigateToSettings={() => setActiveTab('settings')}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen onSettingsChanged={refreshData} />
        )}
      </View>

      {/* Floating Audio Player if Audio is Loaded */}
      {currentPlayingItem && (
        <AudioPlayerBottomBar
          recording={currentPlayingItem}
          isPlaying={isPlaying}
          positionMs={playbackPosition}
          durationMs={playbackDuration}
          onPlayPause={() => {
            if (isPlaying) {
              handlePausePlayback();
            } else {
              handleResumePlayback();
            }
          }}
          onClose={handleClosePlayer}
        />
      )}

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        {/* Record Tab */}
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'record' && styles.activeNavItem]}
          onPress={() => setActiveTab('record')}
        >
          <Ionicons
            name={activeTab === 'record' ? 'mic' : 'mic-outline'}
            size={24}
            color={activeTab === 'record' ? '#10B981' : '#64748B'}
          />
          <Text
            style={[styles.navLabel, activeTab === 'record' && styles.activeNavLabel]}
          >
            Record
          </Text>
        </TouchableOpacity>

        {/* Library Tab */}
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'library' && styles.activeNavItem]}
          onPress={() => setActiveTab('library')}
        >
          <View>
            <Ionicons
              name={activeTab === 'library' ? 'folder' : 'folder-outline'}
              size={24}
              color={activeTab === 'library' ? '#10B981' : '#64748B'}
            />
            {recordings.length > 0 && (
              <View style={styles.badgeCount}>
                <Text style={styles.badgeCountText}>
                  {recordings.length > 99 ? '99+' : recordings.length}
                </Text>
              </View>
            )}
          </View>
          <Text
            style={[styles.navLabel, activeTab === 'library' && styles.activeNavLabel]}
          >
            Library
          </Text>
        </TouchableOpacity>

        {/* Cloud / Settings Tab */}
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'settings' && styles.activeNavItem]}
          onPress={() => setActiveTab('settings')}
        >
          <View>
            <Ionicons
              name={activeTab === 'settings' ? 'cloud' : 'cloud-outline'}
              size={24}
              color={activeTab === 'settings' ? '#10B981' : '#64748B'}
            />
            {unsyncedCount > 0 && (
              <View style={[styles.badgeCount, styles.badgeWarning]}>
                <Text style={styles.badgeCountText}>{unsyncedCount}</Text>
              </View>
            )}
          </View>
          <Text
            style={[styles.navLabel, activeTab === 'settings' && styles.activeNavLabel]}
          >
            Backup
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  splashText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  branding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  headerRightBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  content: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  activeNavItem: {},
  navLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
    fontWeight: '600',
  },
  activeNavLabel: {
    color: '#10B981',
    fontWeight: '700',
  },
  badgeCount: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#3B82F6',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeWarning: {
    backgroundColor: '#F59E0B',
  },
  badgeCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
