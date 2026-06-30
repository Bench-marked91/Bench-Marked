@echo off
REM ====================================================================
REM  Double-click to run the WHOLE Phase 1 pipeline:
REM    1) FIND   new papers on arXiv
REM    2) FILTER them for relevance with Claude
REM  Results are saved in the data\ folder.
REM ====================================================================
set PY=%LOCALAPPDATA%\Programs\Python\Python312-arm64\python.exe

echo ============================================================
echo  STEP 1 of 2:  Finding new papers...
echo ============================================================
"%PY%" "%~dp0scripts\find_papers.py"

echo.
echo ============================================================
echo  STEP 2 of 2:  Filtering for relevance...
echo ============================================================
"%PY%" "%~dp0scripts\filter_papers.py"

echo.
echo ============================================================
echo  All done. Results are in the data\ folder:
echo    - latest_findings.json   (new papers found)
echo    - filtered_papers.json   (with relevance labels)
echo ============================================================
pause
