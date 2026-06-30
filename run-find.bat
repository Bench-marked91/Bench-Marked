@echo off
REM ====================================================================
REM  Double-click this file to run the paper finder (Phase 1: FIND).
REM  It opens a window, searches arXiv, and shows the new papers found.
REM  The window stays open at the end so you can read the results.
REM ====================================================================
echo Running the mental-health AI paper finder...
echo.
"%LOCALAPPDATA%\Programs\Python\Python312-arm64\python.exe" "%~dp0scripts\find_papers.py"
echo.
echo ====================================================================
echo  Done. You can close this window.
echo ====================================================================
pause
