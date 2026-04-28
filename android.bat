@echo off
setlocal enabledelayedexpansion

:: Configuración de colores (opcional, funciona en Windows 10+)
set "green=[32m"
set "red=[31m"
set "yellow=[33m"
set "reset=[0m"

cls
echo ========================================================
echo    GENERADOR AUTOMATICO DE APK - STEM PLAYER & MIXER
echo ========================================================
echo Inicio del proceso: %date% %time%
echo.

:: --- VALIDACIONES INICIALES ---

echo [%yellow%INFO%reset%] Validando requisitos del sistema...

:: Validar Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [%red%ERROR%reset%] Node.js no esta instalado o no esta en el PATH.
    goto :error_exit
)

:: Validar ANDROID_HOME
if "%ANDROID_HOME%"=="" (
    echo [%red%ERROR%reset%] La variable de entorno ANDROID_HOME no esta definida.
    echo          Apunta esta variable a tu carpeta del SDK de Android.
    goto :error_exit
)

:: Validar JAVA_HOME
if "%JAVA_HOME%"=="" (
    echo [%red%ERROR%reset%] La variable de entorno JAVA_HOME no esta definida.
    goto :error_exit
)

echo [%green%OK%reset%] Requisitos validados correctamente.
echo.

:: --- PASO 1: BUILD WEB ---

echo [%yellow%1/4%reset%] Construyendo aplicacion web (Vite)...
echo --------------------------------------------------------
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [%red%ERROR%reset%] Fallo la construccion de la aplicacion web.
    goto :error_exit
)
echo.
echo [%green%OK%reset%] Build web completado.
echo.

:: --- PASO 2: CAPACITOR SYNC ---

echo [%yellow%2/4%reset%] Sincronizando con Capacitor (Android)...
echo --------------------------------------------------------
call npx cap sync android
if %errorlevel% neq 0 (
    echo.
    echo [%red%ERROR%reset%] Fallo la sincronizacion de Capacitor.
    goto :error_exit
)
echo.
echo [%green%OK%reset%] Sincronizacion completada.
echo.

:: --- PASO 3: GRADLE BUILD ---

echo [%yellow%3/4%reset%] Compilando APK mediante Gradle...
echo --------------------------------------------------------
if not exist "android\gradlew.bat" (
    echo [%red%ERROR%reset%] No se encontro el archivo android\gradlew.bat.
    echo          Asegurate de haber ejecutado 'npx cap add android' previamente.
    goto :error_exit
)

cd android
call gradlew.bat assembleDebug
if %errorlevel% neq 0 (
    echo.
    echo [%red%ERROR%reset%] Fallo la compilacion de Gradle. Revisa los logs de arriba.
    cd ..
    goto :error_exit
)
cd ..
echo.
echo [%green%OK%reset%] Compilacion de APK exitosa.
echo.

:: --- PASO 4: FINALIZACION ---

echo [%yellow%4/4%reset%] Finalizando proceso...
echo --------------------------------------------------------
set "APK_PATH=android\app\build\outputs\apk\debug\app-debug.apk"

if exist "%APK_PATH%" (
    echo [%green%EXITO%reset%] APK generado correctamente en:
    echo %CD%\%APK_PATH%
    echo.
    echo Fin del proceso: %date% %time%
) else (
    echo [%red%ERROR%reset%] El proceso termino pero no se encuentra el archivo APK.
)

echo.
echo Presiona cualquier tecla para cerrar esta ventana...
pause >nul
exit /b 0

:error_exit
echo.
echo [%red%FALLO%reset%] El proceso se detuvo debido a un error.
echo Revisa los mensajes anteriores para solucionar el problema.
echo.
echo Presiona cualquier tecla para salir...
pause >nul
exit /b 1