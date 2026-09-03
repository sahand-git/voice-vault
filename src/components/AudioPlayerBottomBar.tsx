import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecordingItem } from '../types';
import { formatDuration } from '../utils/formatters';

interface Props {
  recording: RecordingItem;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  onPlayPause: () => void;
  onClose: () => void;
}

export const AudioPlayerBottomBar: React.FC<Props> = ({
  recording,
  isPlaying,
  positionMs,
  durationMs,
  onPlayPause,
  onClose,
}) => {
  const progressPercent = durationMs > 0 ? Math.min(100, (positionMs / durationMs) * 100) : 0;

  return (
    <View style={styles.container}>
      {/* Mini Progress Line */}
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.playBtn}
          onPress={onPlayPause}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={22}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {recording.title}
          </Text>
          <Text style={styles.timeText}>
            {formatDuration(positionMs)} / {formatDuration(durationMs || recording.durationMs)}
          </Text>
        </View>

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingBottom: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  progressBarBackground: {
    height: 3,
    backgroundColor: '#334155',
    width: '100%',
  },
  progressBarFill: {
    height: 3,
    backgroundColor: '#10B981',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  playBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  timeText: {
    color: '#94A3B8',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  closeBtn: {
    padding: 8,
  },
});
