#!/usr/bin/env bash
# Start Android emulator in background
set -e

AVD_NAME=${1:-test-device}

echo "Starting emulator: $AVD_NAME"

nohup /opt/android-sdk/emulator/emulator \
  -avd "$AVD_NAME" \
  -no-audio \
  -no-boot-anim \
  -gpu host \
  -memory 8192 \
  -no-snapshot-save \
  > /tmp/emulator.log 2>&1 &

echo "Emulator PID: $!"

# Wait until emulator is booted
echo "Waiting for emulator to boot..."
/opt/android-sdk/platform-tools/adb wait-for-device shell 'while [[ -z $(getprop sys.boot_completed) ]]; do sleep 1; done'
echo "Emulator booted!"