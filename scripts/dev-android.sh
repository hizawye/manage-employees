#!/usr/bin/env bash
# Full dev workflow: start emulator + build & run on it
set -e

cd /home/beyonder/dev/manage-employees

# Kill any existing emulator
adb devices | grep emulator | awk '{print $1}' | xargs -r adb -s "$1" emu kill 2>/dev/null || true

# Start emulator in background
echo "=== Starting emulator ==="
bash scripts/start-emulator.sh

# Wait for emulator to boot
echo "=== Waiting for emulator ==="
/opt/android-sdk/platform-tools/adb wait-for-device shell 'while [[ -z $(getprop sys.boot_completed) ]]; do sleep 1; done'
echo "Emulator ready!"

# Build and run (auto-starts Metro, builds, installs, launches)
echo "=== Building and running ==="
npx expo start --localhost --android 2>&1