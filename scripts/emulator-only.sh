#!/usr/bin/env bash
# Just start the emulator (if not running) and open Metro
set -e

cd /home/beyonder/dev/manage-employees

# Check if emulator is already running
if adb devices | grep -q emulator; then
  echo "Emulator already running"
else
  echo "=== Starting emulator ==="
  bash scripts/start-emulator.sh
  echo "Emulator ready!"
fi

# Start Metro
echo "=== Starting Metro ==="
npx expo start --localhost