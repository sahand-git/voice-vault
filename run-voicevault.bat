@echo off
title VoiceVault - Mobile Voice Recorder
cd /d "%~dp0"
echo ===================================================
echo           Starting VoiceVault Dev Server
echo ===================================================
echo.
echo 1. Make sure your phone and PC are on the same Wi-Fi.
echo 2. Open Expo Go on your Android phone.
echo 3. Scan the QR code that appears below.
echo.
npx expo start
pause
