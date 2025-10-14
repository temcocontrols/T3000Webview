@echo off
echo ========================================
echo T3000 FFI Service Test
echo ========================================
echo.
echo This will test if your FFI service is working
echo Make sure T3000.exe is running first!
echo.
pause

cd /d "%~dp0"
if exist "target\debug\ffi_test.exe" (
    echo Running FFI test...
    echo.
    target\debug\ffi_test.exe
) else (
    echo Building FFI test first...
    cargo build --bin ffi_test
    if errorlevel 1 (
        echo Build failed!
        pause
        exit /b 1
    )
    echo.
    echo Running FFI test...
    echo.
    target\debug\ffi_test.exe
)

echo.
echo ========================================
echo Test completed.
echo ========================================
pause
