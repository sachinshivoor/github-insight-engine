@echo off
title GitInsight Server
echo ========================================
echo    GitInsight - Starting Server...
echo ========================================
echo.
cd /d "C:\Users\skshi\github insight\backend"
echo Server starting at http://localhost:8000
echo.
echo DO NOT CLOSE THIS WINDOW - it keeps the server alive.
echo Press CTRL+C to stop the server.
echo.
python main.py
pause
