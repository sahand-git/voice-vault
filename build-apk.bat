@echo off
title Build VoiceVault Android APK
cd /d "%~dp0"
echo =====================================================
echo           VoiceVault - Android APK Builder
echo =====================================================
echo.
echo This command will compile an installable standalone (.apk)
echo file using Expo's cloud build servers (no Android Studio needed).
echo.
echo You will be asked to log in or create a free Expo account.
echo Once built, EAS will provide a direct download link and QR code
echo to download and install the APK directly on your phone!
echo.
pause
npx eas-cli build -p android --profile preview
pause
