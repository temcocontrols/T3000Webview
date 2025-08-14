@echo off
REM Create symbolic link to T3000 C++ source code
REM This enables direct access to T3000_Building_Automation_System source

echo Creating symbolic link to T3000 C++ source...

REM Remove existing link if it exists
if exist "%~dp0..\T3000_Building_Automation_System_Source" (
    echo Removing existing link...
    rmdir "%~dp0..\T3000_Building_Automation_System_Source" /Q
)

REM Create symbolic link
echo Creating link: T3000_Building_Automation_System_Source -^> E:\1025\github\temcocontrols\T3000_Building_Automation_System
mklink /D "%~dp0..\T3000_Building_Automation_System_Source" "E:\1025\github\temcocontrols\T3000_Building_Automation_System"

if %errorlevel% == 0 (
    echo ✅ Successfully created symbolic link
    echo T3000 C++ source is now accessible at: T3000_Building_Automation_System_Source\
) else (
    echo ❌ Failed to create symbolic link
    echo Make sure to run this script as Administrator
)

pause
