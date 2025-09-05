@echo off
setlocal enabledelayedexpansion

REM List of DAG project folders
set DAGS=auth-dag local-dag global-dag

for %%D in (%DAGS%) do (
    echo ======================================
    echo   Stopping %%D ...
    echo ======================================

    cd %%D

    docker compose down
    if errorlevel 1 (
        echo Failed to stop %%D
        exit /b 1
    )

    cd ..
)

echo ======================================
echo   All DAGs stopped successfully
echo ======================================
endlocal
