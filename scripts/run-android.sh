#!/usr/bin/env bash
# Run Android app on emulator (auto-starts emulator first, builds, installs, runs)
set -e

cd /home/beyonder/dev/manage-employees

# Kill any existing emulator
adb devices | grep emulator | awk '{print $1}' | xargs -r adb -s "$1" emu kill 2>/dev/null || true

# Start emulator
echo "=== Starting emulator ==="
bash scripts/start-emulator.sh

# Build, install and run in one shot
echo "=== Building and running ==="
npx expo run:android 2>&1