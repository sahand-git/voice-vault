import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppSettings, GoogleDriveUser } from '../types';
import { getSettings, saveSettings, setGoogleUser } from '../services/storageService';
import { fetchGoogleProfile } from '../services/driveService';

interface Props {
  onSettingsChanged?: () => void;
}

export const SettingsScreen: React.FC<Props> = ({ onSettingsChanged }) => {
  const [settings, setLocalSettings] = useState<AppSettings | null>(null);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [inputToken, setInputToken] = useState('');
  const [folderName, setFolderName] = useState('VoiceVault Recordings');

  useEffect(() => {
    loadCurrentSettings();
  }, []);

  const loadCurrentSettings = async () => {
    const s = await getSettings();
    setLocalSettings(s);
    setFolderName(s.driveFolderName || 'VoiceVault Recordings');
  };

  const handleToggleAutoBackup = async (val: boolean) => {
    const updated = await saveSettings({ autoBackup: val });
    setLocalSettings(updated);
    if (onSettingsChanged) onSettingsChanged();
  };

  const handleSaveFolderName = async () => {
    if (!folderName.trim()) return;
    const updated = await saveSettings({ driveFolderName: folderName.trim() });
    setLocalSettings(updated);
    Alert.alert('Updated', 'Drive backup folder name saved.');
  };

  const handleConnectWithToken = async () => {
    if (!inputToken.trim()) {
      Alert.alert('Error', 'Please paste a valid Google OAuth access token.');
      return;
    }

    try {
      const profile = await fetchGoogleProfile(inputToken.trim());
      const user: GoogleDriveUser = {
        email: profile.email || 'user@gmail.com',
        name: profile.name || 'Google User',
        picture: profile.picture,
        accessToken: inputToken.trim(),
        expiresAt: Date.now() + 3600 * 1000,
      };

      await setGoogleUser(user);
      await loadCurrentSettings();
      setShowTokenInput(false);
      setInputToken('');
      Alert.alert('Connected!', `Successfully connected Google Drive for ${user.email}`);
    } catch (e: any) {
      Alert.alert('Connection Failed', e.message || 'Could not verify token with Google.');
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Google Account',
      'Are you sure you want to disconnect Google Drive? Local recordings on your phone will remain safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await setGoogleUser(null);
            await loadCurrentSettings();
          },
        },
      ]
    );
  };

  if (!settings) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Cloud Account Section */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="logo-google" size={20} color="#EA4335" />
          <Text style={styles.sectionTitle}>Google Drive Cloud Backup</Text>
        </View>

        {settings.googleUser ? (
          <View style={styles.connectedCard}>
            <View style={styles.userRow}>
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={24} color="#10B981" />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{settings.googleUser.name}</Text>
                <Text style={styles.userEmail}>{settings.googleUser.email}</Text>
                <View style={styles.connectedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.connectedBadgeText}>Drive Connected & Ready</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
              <Ionicons name="log-out-outline" size={16} color="#EF4444" />
              <Text style={styles.disconnectText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.notConnectedCard}>
            <Text style={styles.notConnectedTitle}>Direct Cloud Backup</Text>
            <Text style={styles.notConnectedDesc}>
              VoiceVault saves high-fidelity audio notes locally on your phone and can upload them directly into your Google Drive.
            </Text>

            <TouchableOpacity
              style={styles.connectButton}
              onPress={() => setShowTokenInput(!showTokenInput)}
            >
              <Ionicons name="key-outline" size={18} color="#FFFFFF" />
              <Text style={styles.connectBtnText}>
                {showTokenInput ? 'Hide Connection Form' : 'Connect via Google Access Token'}
              </Text>
            </TouchableOpacity>

            {showTokenInput && (
              <View style={styles.tokenBox}>
                <Text style={styles.tokenHint}>
                  Paste an OAuth 2.0 access token with `drive.file` scope:
                </Text>
                <TextInput
                  style={styles.tokenInput}
                  placeholder="ya29.a0AfH..."
                  placeholderTextColor="#64748B"
                  value={inputToken}
                  onChangeText={setInputToken}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.verifyTokenBtn}
                  onPress={handleConnectWithToken}
                >
                  <Text style={styles.verifyTokenText}>Verify & Connect Account</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Instant Native Share Card */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="share-social-outline" size={20} color="#38BDF8" />
          <Text style={styles.sectionTitle}>1-Tap Android Backup</Text>
        </View>
        <Text style={styles.helpText}>
          Even without an API token, you can back up any recording anytime! Simply tap the <Text style={styles.highlight}>Share button</Text> on any recording card in the Library to instantly upload it via Android's native <Text style={styles.highlight}>Save to Drive</Text> or send it to your <Text style={styles.highlight}>Gmail</Text>.
        </Text>
      </View>

      {/* Sync Preferences */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="settings-outline" size={20} color="#94A3B8" />
          <Text style={styles.sectionTitle}>Backup Preferences</Text>
        </View>

        <View style={styles.prefRow}>
          <View style={styles.prefTextCol}>
            <Text style={styles.prefTitle}>Auto-Backup on Save</Text>
            <Text style={styles.prefSub}>
              Automatically upload to Google Drive right after recording finishes
            </Text>
          </View>
          <Switch
            value={settings.autoBackup}
            onValueChange={handleToggleAutoBackup}
            trackColor={{ false: '#334155', true: '#10B981' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.prefTitle}>Google Drive Folder</Text>
          <View style={styles.folderInputRow}>
            <TextInput
              style={styles.folderInput}
              value={folderName}
              onChangeText={setFolderName}
              placeholder="VoiceVault Recordings"
              placeholderTextColor="#64748B"
            />
            <TouchableOpacity style={styles.saveFolderBtn} onPress={handleSaveFolderName}>
              <Text style={styles.saveFolderText}>Update</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Audio Specifications */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="hardware-chip-outline" size={20} color="#94A3B8" />
          <Text style={styles.sectionTitle}>Audio Engine Specifications</Text>
        </View>

        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Audio Codec</Text>
          <Text style={styles.specVal}>AAC High-Quality (.m4a)</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Sampling Rate</Text>
          <Text style={styles.specVal}>44,100 Hz</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Bitrate</Text>
          <Text style={styles.specVal}>128 kbps (High Fidelity)</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Storage Location</Text>
          <Text style={styles.specVal}>Internal App Storage</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  sectionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  connectedCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  userEmail: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 4,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  connectedBadgeText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  disconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  disconnectText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  notConnectedCard: {
    paddingVertical: 4,
  },
  notConnectedTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  notConnectedDesc: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
  },
  connectBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  tokenBox: {
    marginTop: 14,
    padding: 12,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tokenHint: {
    color: '#CBD5E1',
    fontSize: 12,
    marginBottom: 8,
  },
  tokenInput: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 10,
    color: '#F8FAFC',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  verifyTokenBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  verifyTokenText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  helpText: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 20,
  },
  highlight: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  prefTextCol: {
    flex: 1,
    marginRight: 16,
  },
  prefTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  prefSub: {
    color: '#64748B',
    fontSize: 12,
  },
  inputGroup: {
    marginTop: 4,
  },
  folderInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  folderInput: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  saveFolderBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  saveFolderText: {
    color: '#F8FAFC',
    fontWeight: '600',
    fontSize: 13,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  specLabel: {
    color: '#94A3B8',
    fontSize: 13,
  },
  specVal: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
});
