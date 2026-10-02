@echo off
title INSERT COFFEE - Local Web Server
cd /d "%~dp0"
echo ===================================================
echo   ☕ Menjalankan Server INSERT COFFEE...
echo ===================================================
start "" "http://localhost:8080"
python server.py
pause
