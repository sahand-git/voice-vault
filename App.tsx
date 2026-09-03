import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { RecordScreen } from './src/screens/RecordScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { AudioPlayerBottomBar } from './src/components/AudioPlayerBottomBar';
import {
  getRecordings,
  getSettings,
  ensureDirectoryExists,
} from './src/services/storageService';
import {
  configureAudioSession,
  playSound,
  pauseSound,
  resumeSound,
  stopSound,
} from './src/services/audioService';
import { RecordingItem, AppSettings } from './src/types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'record' | 'library' | 'settings'>('record');
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Audio Playback State
  const [currentPlayingItem, setCurrentPlayingItem] = useState<RecordingItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);

  useEffect(() => {
    initApp();
    return () => {
      stopSound();
    };
  }, []);

  const initApp = async () => {
    try {
      await ensureDirectoryExists();
      await configureAudioSession();
      await refreshData();
    } catch (e) {
      console.warn('App initialization error:', e);
    }
  };

  const refreshData = async () => {
    const list = await getRecordings();
    setRecordings(list);
    const s = await getSettings();
    setSettings(s);
  };

  // Playback handlers
  const handlePlayRecording = async (item: RecordingItem) => {
    try {
      setCurrentPlayingItem(item);
      setIsPlaying(true);
      setPlaybackPosition(0);
      setPlaybackDuration(item.durationMs);

      await playSound(item.uri, (status: any) => {
        if (status.isLoaded) {
          setPlaybackPosition(status.positionMillis);
          setPlaybackDuration(status.durationMillis || item.durationMs);
          setIsPlaying(status.isPlaying);
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

const styles = StyleSheet.create({
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
