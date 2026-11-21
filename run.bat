@echo off
title Moonflow Starter
echo ===================================================
echo           Starting MOONFLOW Application
echo ===================================================
echo.
echo 1. Starting FastAPI Backend on port 8000...
start "MOONFLOW Backend (Port 8000)" cmd /k "npm run backend"

echo 2. Starting Expo Frontend on port 8081...
start "MOONFLOW Frontend (Expo)" cmd /k "npm start"

echo.
echo Done! Dono servers alag-alag terminal windows me start ho chuke hain.
echo - Web browser ke liye: 'w' press karein ya http://localhost:8081 kholein.
echo - Mobile ke liye: Expo Go app se QR code scan karein.
echo ===================================================
