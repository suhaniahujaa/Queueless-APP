@echo off
cd /d "%~dp0"
title QueueLess Updated
where java >nul 2>nul
if errorlevel 1 (
  echo Java was not found. Install JDK 17 or newer, then run this file again.
  pause
  exit /b 1
)
echo Starting QueueLess Updated...
echo Open http://localhost:8090 after the ready message below.
echo Staff login uses the access key printed below.
java --add-modules jdk.httpserver src\com\queueless\Main.java
pause
