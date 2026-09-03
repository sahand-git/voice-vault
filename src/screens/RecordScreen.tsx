import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  startRecording,
  pauseRecording,
  resumeRecording,
  stopRecording,
} from '../services/audioService';
import { saveRecording, getSettings } from '../services/storageService';
import { uploadRecordingToDrive, shareRecording } from '../services/driveService';
import { AudioWaveform } from '../components/AudioWaveform';
import { formatDuration } from '../utils/formatters';
import { RecordingItem } from '../types';

interface Props {
  onRecordingSaved: () => void;
  onNavigateToLibrary: () => void;
}

export const RecordScreen: React.FC<Props> = ({
  onRecordingSaved,
  onNavigateToLibrary,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [metering, setMetering] = useState(-50);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [syncOnSave, setSyncOnSave] = useState(true);

  // Status callback from expo-av
  const handleStatusUpdate = (status: any) => {
    if (status.isRecording) {
      setDurationMs(status.durationMillis || 0);
      if (typeof status.metering === 'number') {
        setMetering(status.metering);
      }
    }
  };

  const handleToggleRecord = async () => {
    try {
      if (!isRecording) {
        setDurationMs(0);
        await startRecording(handleStatusUpdate);
        setIsRecording(true);
        setIsPaused(false);
      } else {
        // Prepare to stop & save
        setShowSaveModal(true);
      }
    } catch (e: any) {
      Alert.alert('Microphone Error', e.message || 'Failed to access microphone.');
    }
  };

  const handlePauseResume = async () => {
    try {
      if (isPaused) {
        await resumeRecording();
        setIsPaused(false);
      } else {
        await pauseRecording();
        setIsPaused(true);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to toggle pause state.');
    }
  };

  const handleCancelRecording = async () => {
    Alert.alert(
      'Discard Recording?',
      'Are you sure you want to discard this audio recording?',
      [
        { text: 'Keep Recording', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            try {
              await stopRecording();
            } catch {}
            setIsRecording(false);
            setIsPaused(false);
            setDurationMs(0);
          },
        },
      ]
    );
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);
    try {
      const item: RecordingItem = await stopRecording(customTitle);
      await saveRecording(item);

      // Check if user wants Google Drive sync
      const settings = await getSettings();
      if (syncOnSave && settings.googleUser?.accessToken) {
        try {
          await uploadRecordingToDrive(item, settings.googleUser.accessToken);
        } catch (syncErr: any) {
          console.warn('Auto-sync failed, saved locally:', syncErr.message);
        }
      }

      setShowSaveModal(false);
      setIsRecording(false);
      setIsPaused(false);
      setDurationMs(0);
      setCustomTitle('');
      onRecordingSaved();
      Alert.alert('Recording Saved', `"${item.title}" saved successfully to your phone!`, [
        { text: 'View in Library', onPress: onNavigateToLibrary },
        { text: 'OK' },
      ]);
    } catch (e: any) {
      Alert.alert('Save Failed', e.message || 'Could not save recording.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Status Header */}
      <View style={styles.statusHeader}>
        <View
          style={[
            styles.statusPill,
            isRecording
              ? isPaused
                ? styles.pillPaused
                : styles.pillRecording
              : styles.pillReady,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              isRecording
                ? isPaused
                  ? styles.dotPaused
                  : styles.dotRecording
                : styles.dotReady,
            ]}
          />
          <Text style={styles.statusText}>
            {isRecording
              ? isPaused
                ? 'RECORDING PAUSED'
                : 'RECORDING LIVE'
              : 'READY TO RECORD'}
          </Text>
        </View>
      </View>

      {/* Center Timer & Visualizer */}
      <View style={styles.centerSection}>
        <Text style={styles.timerText}>{formatDuration(durationMs)}</Text>
        <Text style={styles.subTimerText}>
          {isRecording
            ? isPaused
              ? 'Press Resume to continue'
              : 'Capturing high-fidelity voice audio'
            : 'Tap the button below to start'}
        </Text>

        <AudioWaveform
          isRecording={isRecording}
          isPaused={isPaused}
          metering={metering}
        />
      </View>

      {/* Bottom Controls */}
      <View style={styles.controlsSection}>
        {isRecording ? (
          <View style={styles.activeControlsRow}>
            {/* Discard Button */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleCancelRecording}
              disabled={isSaving}
            >
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
              <Text style={styles.secondaryBtnText}>Discard</Text>
            </TouchableOpacity>

            {/* Stop & Save Button */}
            <TouchableOpacity
              style={styles.stopButton}
              onPress={handleToggleRecord}
              disabled={isSaving}
            >
              <View style={styles.stopIconSquare} />
            </TouchableOpacity>

            {/* Pause / Resume Button */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handlePauseResume}
              disabled={isSaving}
            >
              <Ionicons
                name={isPaused ? 'play' : 'pause'}
                size={24}
                color="#F8FAFC"
              />
              <Text style={styles.secondaryBtnText}>
                {isPaused ? 'Resume' : 'Pause'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.idleControlsRow}>
            <TouchableOpacity
              style={styles.micMainButton}
              onPress={handleToggleRecord}
              activeOpacity={0.8}
            >
              <View style={styles.micInnerGlow}>
                <Ionicons name="mic" size={44} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Save Recording Modal */}
      <Modal
        visible={showSaveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSaveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="bookmark-outline" size={24} color="#10B981" />
              <Text style={styles.modalTitle}>Save Voice Recording</Text>
            </View>

            <Text style={styles.modalSubtitle}>
              Duration: {formatDuration(durationMs)}
            </Text>

            <Text style={styles.inputLabel}>Recording Title</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. WhatsApp Meeting Note"
              placeholderTextColor="#64748B"
              value={customTitle}
              onChangeText={setCustomTitle}
              autoFocus
            />

            <TouchableOpacity
              style={styles.syncCheckboxRow}
              onPress={() => setSyncOnSave(!syncOnSave)}
            >
              <Ionicons
                name={syncOnSave ? 'checkbox' : 'square-outline'}
                size={20}
                color={syncOnSave ? '#10B981' : '#64748B'}
              />
              <Text style={styles.syncCheckboxText}>
                Automatically upload to Google Drive
              </Text>
            </TouchableOpacity>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setShowSaveModal(false)}
                disabled={isSaving}
              >
                <Text style={styles.cancelModalBtnText}>Continue Recording</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveModalBtn}
                onPress={handleConfirmSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.saveModalBtnText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  statusHeader: {
    alignItems: 'center',
    paddingTop: 16,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  pillReady: {
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
  },
  pillRecording: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  pillPaused: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotReady: {
    backgroundColor: '#64748B',
  },
  dotRecording: {
    backgroundColor: '#EF4444',
  },
  dotPaused: {
    backgroundColor: '#F59E0B',
  },
  statusText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  timerText: {
    fontSize: 54,
    fontWeight: '800',
    color: '#F8FAFC',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
    marginBottom: 4,
  },
  subTimerText: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 16,
  },
  controlsSection: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  idleControlsRow: {
    alignItems: 'center',
  },
  micMainButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  micInnerGlow: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  activeControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
  },
  stopButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  stopIconSquare: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  secondaryBtnText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 3,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 14,
    color: '#F8FAFC',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  syncCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  syncCheckboxText: {
    color: '#CBD5E1',
    fontSize: 13,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelModalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  cancelModalBtnText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 14,
  },
  saveModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
  },
  saveModalBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
