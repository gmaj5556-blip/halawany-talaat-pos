@echo off
title Halawany Talaat POS - System Starter
echo ==========================================
echo    Halawany Talaat - POS System
echo ==========================================
echo Starting the local server...
echo This window must remain open for the system to work.
echo ==========================================

:: Start the Next.js server in the background
start /b npm run start

:: Wait a few seconds for the server to initialize
timeout /t 5 /nobreak > nul

:: Open the system in the default browser
start http://localhost:3000

echo System started! You can now use it in your browser.
pause
