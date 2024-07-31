@echo off
:loop  
timeout -t 1 >nul
if EXIST playersData.js (
  move /y "%UserProfile%\Downloads\playersData.js" "%UserProfile%\Desktop\xlam\wr-stardust\data" || pause
  time /t
)
goto :loop