#!/usr/bin/env bash
# Builds build/RobotStrike.apk with Godot 4.3 (needs the Android export templates
# and an Android SDK path set in Godot's editor settings).
set -euo pipefail
cd "$(dirname "$0")"
GODOT="${GODOT:-godot}"

# Sideloading key only. Make your own private key before publishing to a store.
export GODOT_ANDROID_KEYSTORE_RELEASE_PATH="$PWD/keystore/robot-strike.keystore"
export GODOT_ANDROID_KEYSTORE_RELEASE_USER="robotstrike"
export GODOT_ANDROID_KEYSTORE_RELEASE_PASSWORD="robotstrike"

mkdir -p build
"$GODOT" --headless --import
"$GODOT" --headless --export-release "Android" build/RobotStrike.apk
ls -lh build/RobotStrike.apk
