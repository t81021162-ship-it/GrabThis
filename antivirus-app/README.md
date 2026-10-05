# GrabThis AntiVirus for Android

A lightweight antivirus application for Android that detects malicious code patterns, suspicious filenames, cryptominers, and other security threats.

## Features

✅ **Signature Detection** - Detects malware signatures and patterns
✅ **Cryptominer Detection** - Identifies crypto-mining code (XMRig, MoneroMiner, etc.)
✅ **Malicious Code Analysis** - Scans for dangerous code patterns like:
   - Runtime execution (exec, Runtime.exec, ProcessBuilder)
   - Reflection abuse (getDeclaredMethod, setAccessible)
   - APK installation exploits
   - SMS interception code
   - Command & Control communication

✅ **Filename Analysis** - Detects suspicious filenames containing:
   - "virus", "malware", "trojan", "hack", "exploit", "backdoor"
   - "ransomware", "worm", "spyware", "rootkit", "botnet"
   - And more...

✅ **User-Friendly UI** - Simple interface with:
   - Full system scan capability
   - Quick demo scan for testing
   - Detailed threat reports
   - Severity levels (INFO, HIGH, CRITICAL)

## Installation

### Prerequisites
- Android SDK (API 24+)
- Gradle 8.4+
- Java 11+

### Build Instructions

```bash
cd antivirus-app
./gradlew clean build
```

### Generate APK

```bash
./gradlew assembleRelease
```

The APK will be generated at: `app/build/outputs/apk/release/app-release.apk`

### Install on Device

```bash
adb install app/build/outputs/apk/release/app-release.apk
```

## How to Use

1. **Open the App** - Launch GrabThis AntiVirus from your apps list
2. **Quick Demo** - Tap "Quick Demo" to see threat detection in action with sample files
3. **Full Scan** - Tap "Full Scan" to scan:
   - Downloads folder
   - Documents folder
   - Installed applications (if accessible)
4. **View Results** - Detailed threat information including:
   - Threat type (Cryptominer, Malware, etc.)
   - Severity level
   - Description

## Threat Types Detected

| Threat Type | Severity | Description |
|-------------|----------|-------------|
| CRYPTOMINER | HIGH | Cryptocurrency mining software |
| MALICIOUS_CODE | CRITICAL | Dangerous code patterns |
| SMS_INTERCEPTION | CRITICAL | SMS message theft code |
| C2_COMMUNICATION | CRITICAL | Command & Control beacons |
| SUSPICIOUS_FILENAME | HIGH | Suspicious file naming |

## Scanning Patterns

### Cryptominer Detection
- Monero miner signatures
- XMRig patterns
- Mining pool connections
- Hash computation code

### Malware Detection
- Reflection-based code execution
- Runtime process execution
- APK installation exploits
- Permission escalation attempts

### Network Threats
- C2 server communication
- Data exfiltration patterns
- Remote command execution

## Permissions

The app requests:
- `READ_EXTERNAL_STORAGE` - To scan files on your device
- `ACCESS_MEDIA_LOCATION` - To access media files

## Project Structure

```
antivirus-app/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── AndroidManifest.xml
│   │   │   ├── java/com/grabthis/antivirus/
│   │   │   │   ├── MainActivity.kt
│   │   │   │   └── ThreatDetector.kt
│   │   │   └── res/
│   │   │       ├── layout/
│   │   │       ├── values/
│   │   │       └── drawable/
│   │   └── test/
│   └── build.gradle
├── build.gradle
├── settings.gradle
└── README.md
```

## Key Components

### ThreatDetector.kt
Core scanning engine with:
- Filename pattern matching
- Code content analysis
- Signature detection
- Pattern recognition with regex

### MainActivity.kt
UI controller providing:
- System scan functionality
- Demo scan mode
- Results display
- Permission handling

## Testing

Run the quick demo scan to test detection:
- `virus_remover.apk` → Detected as malicious
- `hack_tool.exe` → Detected as suspicious
- `xmrig_miner.exe` → Detected as cryptominer
- `normal_app.apk` → Passed as safe

## Security Notes

⚠️ This is an educational antivirus application for learning purposes. For production use, consider:
- More comprehensive signature databases
- Machine learning-based detection
- Real-time file monitoring
- Integration with professional threat feeds
- Regular pattern updates

## License

Educational project - Feel free to modify and distribute for learning purposes.

## Developer

Created by GrabThis Team 🛡️
