@echo off
SET REPO=C:\Users\SAMPC\repos\zerobudgeting.com
SET COMMIT=1a3b159
SET TEMPDIR=%TEMP%\zb-restore
IF NOT EXIST "%TEMPDIR%" MKDIR "%TEMPDIR%"
git -C "%REPO%" ls-tree -r --name-only %COMMIT% > "%TEMPDIR%\files.txt"
for /f "delims=" %%f in ('type "%TEMPDIR%\files.txt"') do (
    set "FILE=%%f"
    setlocal enabledelayedexpansion
    if /i "!FILE:~-5!"==".html" (
        git -C "%REPO%" show %COMMIT%:"%%f" > "%TEMPDIR%\restore.tmp"
        if !ERRORLEVEL! EQU 0 (
            copy /y "%TEMPDIR%\restore.tmp" "%REPO%\%%f" >nul
        )
    )
    endlocal
)
echo ZB Restore complete
