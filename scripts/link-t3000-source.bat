@echo off
REM Create symbolic link to T3000 C++ source code for easy access

set "T3000_CPP_SOURCE=D:\1025\github\temcocontrols\T3000_Building_Automation_System"
set "WEBVIEW_PROJECT=%~dp0.."
set "LINK_TARGET=%WEBVIEW_PROJECT%\T3000_CPP_Source"

echo === Creating T3000 C++ Source Link ===
echo T3000 C++ Source: %T3000_CPP_SOURCE%
echo WebView Project: %WEBVIEW_PROJECT%
echo Link Target: %LINK_TARGET%

REM Check if T3000 source exists
if not exist "%T3000_CPP_SOURCE%" (
    echo ERROR: T3000 C++ source directory not found at %T3000_CPP_SOURCE%
    echo Please verify the path and try again.
    pause
    exit /b 1
)

REM Remove existing link if it exists
if exist "%LINK_TARGET%" (
    echo Removing existing link...
    rmdir "%LINK_TARGET%" 2>NUL
)

REM Create symbolic link (requires admin privileges)
echo Creating symbolic link...
mklink /D "%LINK_TARGET%" "%T3000_CPP_SOURCE%"

if %ERRORLEVEL% == 0 (
    echo SUCCESS: Symbolic link created successfully!
    echo You can now access T3000 C++ source at: %LINK_TARGET%
    echo.
    echo The link will appear in your WebView project as: T3000_CPP_Source\
) else (
    echo ERROR: Failed to create symbolic link.
    echo This usually means you need to run as Administrator.
    echo.
    echo Alternative: Creating junction instead...
    mklink /J "%LINK_TARGET%" "%T3000_CPP_SOURCE%"

    if !ERRORLEVEL! == 0 (
        echo SUCCESS: Junction created successfully!
        echo You can now access T3000 C++ source at: %LINK_TARGET%
    ) else (
        echo ERROR: Failed to create junction as well.
        echo Please run this script as Administrator.
    )
)

echo.
echo Press any key to continue...
pause >nul
