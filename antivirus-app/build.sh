#!/bin/bash

# GrabThis AntiVirus Build Script

echo "🔨 Building GrabThis AntiVirus APK..."
echo ""

# Check if gradle exists
if ! command -v gradle &> /dev/null && ! [ -f "gradlew" ]; then
    echo "❌ Gradle not found. Installing..."
    chmod +x gradlew
fi

# Clean previous build
echo "🧹 Cleaning previous builds..."
./gradlew clean

# Build release APK
echo "🏗️  Building release APK..."
./gradlew assembleRelease

# Check if build was successful
if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
    echo ""
    echo "✅ Build successful!"
    echo "📦 APK Location: app/build/outputs/apk/release/app-release.apk"
    echo ""
    echo "📱 To install on device:"
    echo "   adb install app/build/outputs/apk/release/app-release.apk"
else
    echo ""
    echo "❌ Build failed. Check the error messages above."
    exit 1
fi
