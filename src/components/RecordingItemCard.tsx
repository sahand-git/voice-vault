import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecordingItem } from '../types';
import { formatDate, formatDuration, formatFileSize } from '../utils/formatters';

interface Props {
  recording: RecordingItem;
  isPlaying: boolean;
  isSyncing?: boolean;
  onPlayPause: () => void;
  onShare: () => void;
  onUploadToDrive: () => void;
  onDelete: () => void;
}

export const RecordingItemCard: React.FC<Props> = ({
  recording,
  isPlaying,
  isSyncing,
  onPlayPause,
  onShare,
  onUploadToDrive,
  onDelete,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {recording.title}
          </Text>
          <Text style={styles.dateText}>{formatDate(recording.createdAt)}</Text>
        </View>

        {/* Sync Status Badge */}
        {recording.isSynced ? (
          <View style={[styles.badge, styles.syncedBadge]}>
            <Ionicons name="cloud-done" size={13} color="#10B981" />
            <Text style={styles.syncedText}>In Drive</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.badge, styles.unsyncedBadge]}
            onPress={onUploadToDrive}
            disabled={isSyncing}
          >
            <Ionicons
              name={isSyncing ? 'cloud-upload-outline' : 'cloud-upload'}
              size={13}
              color="#F59E0B"
            />
            <Text style={styles.unsyncedText}>{isSyncing ? 'Syncing...' : 'Sync to Drive'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.infoRow}>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={14} color="#94A3B8" />
          <Text style={styles.metaText}>{formatDuration(recording.durationMs)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="folder-outline" size={14} color="#94A3B8" />
          <Text style={styles.metaText}>{formatFileSize(recording.sizeBytes)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="phone-portrait-outline" size={14} color="#94A3B8" />
          <Text style={styles.metaText}>Local</Text>
        </View>
      </View>

      {/* Control Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.playButton, isPlaying && styles.playingButton]}
          onPress={onPlayPause}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={18}
            color={isPlaying ? '#FFFFFF' : '#10B981'}
          />
          <Text style={[styles.playText, isPlaying && styles.playingText]}>
            {isPlaying ? 'Pause' : 'Play'}
          </Text>
        </TouchableOpacity>

        <View style={styles.rightActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onShare}
            accessibilityLabel="Share or export recording"
          >
            <Ionicons name="share-social-outline" size={19} color="#38BDF8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={onDelete}
            accessibilityLabel="Delete recording"
          >
            <Ionicons name="trash-outline" size={19} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  syncedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  syncedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  unsyncedBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  unsyncedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  playingButton: {
    backgroundColor: '#10B981',
  },
  playText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  playingText: {
    color: '#FFFFFF',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
});
