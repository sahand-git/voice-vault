# VoiceVault 🎙️☁️

A modern voice recorder app for Android that records voice notes, WhatsApp voice clips played over speaker, and conversations, storing them safely on internal phone storage with seamless backup to **Google Drive** and **Gmail**.

---

## ✨ Features

- **High-Fidelity Audio Recording**: AAC `.m4a` format recorded at 44.1 kHz, 128 kbps stereo/mono.
- **Live Waveform & Timer**: Real-time audio level visualizer that pulses to your voice.
- **Local Phone Storage**: All voice recordings are preserved in your device's internal storage (`voicevault_recordings/`), safe from cache cleaners.
- **Built-in Audio Player**: Play, pause, seek, and monitor duration with an integrated bottom mini-player.
- **Google Drive Backup**:
  - **Direct Google Cloud Sync**: Uploads recordings directly into a dedicated `VoiceVault Recordings` folder in your Google Drive.
  - **1-Tap Android Share**: Native share sheet to immediately send files to **Google Drive**, **Gmail**, **WhatsApp**, or **Telegram**.
  - **Batch Sync**: Tap "Backup Pending" to upload all unsynced notes in one click with live progress.
  - **Auto-Sync**: Automatically back up to Google Drive the moment you stop recording.

---

## 🚀 How to Run on Your Android Phone

You do **not** need Android Studio or complex software installed on your computer.

### Step 1: Install Expo Go on Your Phone
1. Open the **Google Play Store** on your Android phone.
2. Search for and install **Expo Go** (by Expo).

### Step 2: Start the App on Your Computer
Open PowerShell / Command Prompt inside the project directory and run:

```bash
cd "c:\Users\SAIF SERVICE CENTER\Desktop\voice-vault"
npm start
```

### Step 3: Scan the QR Code
1. A large QR code will appear in your terminal.
2. Open the **Expo Go** app on your phone.
3. Tap **"Scan QR code"** and point your phone at the computer screen.
4. The app will bundle and open on your phone in a few seconds!

---

## 📱 How to Use VoiceVault

### 1. Recording Voice Notes
1. Tap the big green **Microphone** button to start recording.
2. The live timer and audio waveform will show active audio capture.
3. Press **Pause** if you need a break, or tap **Stop (Red Square)** when finished.
4. Give your recording a name (e.g. *"WhatsApp Voice Note"*) and tap **Save**.

### 2. Playing Back & Managing
- Switch to the **Library** tab at the bottom.
- Tap **Play** on any card to listen immediately.
- Use the **Search Bar** to find notes quickly.
- Filter between **All**, **In Drive**, or **Phone Only**.

### 3. Backing Up to Google Drive / Gmail
- **Instant Native Share**: Tap the blue **Share icon** on any recording card. Android will open its native sharing sheet where you can select **Save to Drive** or **Gmail** with 1 tap.
- **Direct Cloud Sync**: In the **Backup** tab, link your Google account to enable automatic and batch uploads directly to `My Drive > VoiceVault Recordings`.

---

## 📦 Building a Standalone Android APK

To generate an installable `.apk` file that you can install directly on any Android phone without Expo Go:

```bash
# Install EAS CLI
npm install -g eas-cli

# Log in to your Expo account
eas login

# Configure and build APK
eas build -p android --profile preview
```
