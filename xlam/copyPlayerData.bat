@echo off
echo %CD%
:loop  
timeout -t 1 >nul
if EXIST "%UserProfile%\Downloads\playersData.js" (
  move /y "%UserProfile%\Downloads\playersData.js" "..\data" || pause
  time /t
)
goto :loop