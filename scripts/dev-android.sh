#!/usr/bin/env bash
# Full dev workflow: start emulator + Metro in parallel
set -e

cd /home/beyonder/dev/manage-employees

# Kill any existing emulator
adb devices | grep emulator | awk '{print $1}' | xargs -r adb -s "$1" emu kill 2>/dev/null || true

# Start emulator in background
echo "=== Starting emulator ==="
bash scripts/start-emulator.sh

# Start Metro bundler in parallel
echo "=== Starting Metro ==="
npx expo start --localhost &
METRO_PID=$!

# Wait for emulator
echo "=== Waiting for emulator ==="
/opt/android-sdk/platform-tools/adb wait-for-device shell 'while [[ -z $(getprop sys.boot_completed) ]]; do sleep 1; done'
echo "Emulator ready!"

# Build and install
echo "=== Building and installing ==="
npm run android 2>&1 | tail -20

# Tail logcat
echo "=== Running app ==="
npm run android:logcat

# Cleanup on exit
kill $METRO_PID 2>/dev/null || true