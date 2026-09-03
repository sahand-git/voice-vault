import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecordingItem } from '../types';
import { RecordingItemCard } from '../components/RecordingItemCard';
import { deleteRecording, getSettings } from '../services/storageService';
import { uploadRecordingToDrive, shareRecording, syncAllUnsynced } from '../services/driveService';
import { formatFileSize } from '../utils/formatters';

interface Props {
  recordings: RecordingItem[];
  currentPlayingId: string | null;
  isPlaying: boolean;
  onPlayRecording: (item: RecordingItem) => void;
  onPauseRecording: () => void;
  onRefreshList: () => void;
  onNavigateToSettings: () => void;
}

export const LibraryScreen: React.FC<Props> = ({
  recordings,
  currentPlayingId,
  isPlaying,
  onPlayRecording,
  onPauseRecording,
  onRefreshList,
  onNavigateToSettings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'synced' | 'local'>('all');
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [isBatchSyncing, setIsBatchSyncing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshList();
    setIsRefreshing(false);
  };

  // Filtered recordings
  const filtered = recordings.filter((r) => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filterType === 'synced') return r.isSynced;
    if (filterType === 'local') return !r.isSynced;
    return true;
  });

  const totalBytes = recordings.reduce((acc, curr) => acc + (curr.sizeBytes || 0), 0);
  const unsyncedCount = recordings.filter((r) => !r.isSynced).length;

  const handleSingleUpload = async (item: RecordingItem) => {
    try {
      const settings = await getSettings();
      if (!settings.googleUser?.accessToken) {
        Alert.alert(
          'Google Drive Not Connected',
          'Connect your Google account in Settings to enable direct Google Drive sync, or use the Share button to save to Drive via Android.',
          [
            { text: 'Go to Settings', onPress: onNavigateToSettings },
            {
              text: 'Share via Android',
              onPress: () => shareRecording(item.uri, item.title),
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }

      setSyncingId(item.id);
      await uploadRecordingToDrive(item, settings.googleUser.accessToken);
      onRefreshList();
      Alert.alert('Success', `"${item.title}" backed up to Google Drive!`);
    } catch (e: any) {
      Alert.alert('Upload Failed', e.message || 'Could not upload recording.');
    } finally {
      setSyncingId(null);
    }
  };

  const handleBatchSync = async () => {
    try {
      const settings = await getSettings();
      if (!settings.googleUser?.accessToken) {
        Alert.alert(
          'Google Account Required',
          'Please connect your Google Drive account in the Settings tab first.',
          [
            { text: 'Open Settings', onPress: onNavigateToSettings },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }

      setIsBatchSyncing(true);
      setBatchProgress('Starting sync...');

      const result = await syncAllUnsynced(
        recordings,
        settings.googleUser.accessToken,
        (current, total, name) => {
          setBatchProgress(`Uploading ${current}/${total}: ${name}`);
        }
      );

      onRefreshList();
      Alert.alert(
        'Sync Complete',
        `Backed up ${result.success} recordings to Google Drive.${result.failed > 0 ? ` (${result.failed} failed)` : ''}`
      );
    } catch (e: any) {
      Alert.alert('Batch Sync Failed', e.message);
    } finally {
      setIsBatchSyncing(false);
      setBatchProgress(null);
    }
  };

  const handleDeleteItem = (item: RecordingItem) => {
    Alert.alert(
      'Delete Recording',
      `Delete "${item.title}" from your phone?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteRecording(item.id);
            onRefreshList();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color="#64748B" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search voice notes..."
          placeholderTextColor="#64748B"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#64748B" />
          </TouchableOpacity>
        )}
      </View>

      {/* Storage & Stats Header */}
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View>
            <Text style={styles.statsLabel}>Total Storage</Text>
            <Text style={styles.statsValue}>{formatFileSize(totalBytes)}</Text>
          </View>
          <View style={styles.statsDivider} />
          <View>
            <Text style={styles.statsLabel}>Recordings</Text>
            <Text style={styles.statsValue}>{recordings.length}</Text>
          </View>
          <View style={styles.statsDivider} />
          <View>
            <Text style={styles.statsLabel}>Cloud Status</Text>
            <Text
              style={[
                styles.statsValue,
                { color: unsyncedCount === 0 ? '#10B981' : '#F59E0B' },
              ]}
            >
              {unsyncedCount === 0 ? 'All Synced' : `${unsyncedCount} Pending`}
            </Text>
          </View>
        </View>

        {unsyncedCount > 0 && (
          <TouchableOpacity
            style={styles.syncAllButton}
            onPress={handleBatchSync}
            disabled={isBatchSyncing}
          >
            {isBatchSyncing ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.syncAllText}>{batchProgress || 'Syncing...'}</Text>
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload" size={16} color="#FFFFFF" />
                <Text style={styles.syncAllText}>
                  Backup {unsyncedCount} Pending to Google Drive
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <View style={styles.filterChipsRow}>
        <TouchableOpacity
          style={[styles.chip, filterType === 'all' && styles.activeChip]}
          onPress={() => setFilterType('all')}
        >
          <Text style={[styles.chipText, filterType === 'all' && styles.activeChipText]}>
            All ({recordings.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, filterType === 'synced' && styles.activeChip]}
          onPress={() => setFilterType('synced')}
        >
          <Text style={[styles.chipText, filterType === 'synced' && styles.activeChipText]}>
            In Drive ({recordings.filter((r) => r.isSynced).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, filterType === 'local' && styles.activeChip]}
          onPress={() => setFilterType('local')}
        >
          <Text style={[styles.chipText, filterType === 'local' && styles.activeChipText]}>
            Phone Only ({unsyncedCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Recordings List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RecordingItemCard
            recording={item}
            isPlaying={currentPlayingId === item.id && isPlaying}
            isSyncing={syncingId === item.id}
            onPlayPause={() => {
              if (currentPlayingId === item.id && isPlaying) {
                onPauseRecording();
              } else {
                onPlayRecording(item);
              }
            }}
            onShare={() => shareRecording(item.uri, item.title)}
            onUploadToDrive={() => handleSingleUpload(item)}
            onDelete={() => handleDeleteItem(item)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#10B981"
            colors={['#10B981']}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="mic-off-outline" size={48} color="#475569" />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No matching recordings' : 'No voice notes yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Try a different search keyword.'
                : 'Tap the Record tab below to record your first voice note!'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
  },
  statsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statsDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#334155',
  },
  statsLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 2,
    textAlign: 'center',
  },
  statsValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  syncAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  syncAllText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  activeChip: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  chipText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  activeChipText: {
    color: '#10B981',
  },
  listContent: {
    paddingBottom: 80,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
