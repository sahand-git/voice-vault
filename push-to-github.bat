@echo off
title Push VoiceVault to GitHub
cd /d "%~dp0"
echo =====================================================
echo           Pushing VoiceVault to GitHub
echo =====================================================
echo.
echo Target Repository: https://github.com/sahand-git/voice-vault
echo Account: sahandabas2@gmail.com (sahand-git)
echo.
echo Note: If you haven't created the repository yet, create
echo an empty repo named "voice-vault" at:
echo   https://github.com/new
echo.
echo Ready to push? Press any key to start...
pause > nul
echo.
echo Pushing code to GitHub...
git push -u origin main
echo.
echo =====================================================
echo Process finished!
echo If successful, check your repository at:
echo   https://github.com/sahand-git/voice-vault
echo Under the "Actions" tab, GitHub will automatically 
echo compile your installable Android APK!
echo =====================================================
pause
