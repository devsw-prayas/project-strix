@echo off
setlocal enabledelayedexpansion

REM List of DAG project folders
set DAGS=auth-dag local-dag global-dag

for %%D in (%DAGS%) do (
    echo ======================================
    echo   Building and starting %%D ...
    echo ======================================

    cd %%D

    docker compose build --no-cache
    if errorlevel 1 (
        echo Failed to build %%D
        exit /b 1
    )

    docker compose up -d
    if errorlevel 1 (
        echo Failed to start %%D
        exit /b 1
    )

    cd ..
)

echo ======================================
echo   All DAGs started successfully 
echo ======================================
endlocal
