# 🐄 MOoOS - The Cow-Themed Operating System

> Where transparency meets the farm. **MOoOS** - An OS built by cows, for cows, and anyone who wants to know what their system is *really* doing.

## Features 🌾

- 🐄 **Cow-Themed Everything** — ASCII art, farm aesthetics, moo sounds
- 🔒 **MOO THE VIRUS** — Real-time antivirus with threat detection & ratings
- 👀 **Transparent Design** — Every process is visible, every decision explained
- 💾 **Lightweight 32-bit Kernel** — Fast, minimal, focused
- 🌾 **Farm Ecosystem** — Shell, Dashboard, & System Tools
- ⚡ **Developer Friendly** — Built for people who understand code

## Quick Start 🚀

### Prerequisites
```bash
# For kernel development
cargo install bootimage
rustup component add llvm-tools-embedded

# For antivirus & tools
cargo, rustc
```

### Build Everything
```bash
cd moos
make build
```

### Run MOoOS in QEMU
```bash
make run
```

This launches the 32-bit MOoOS kernel in QEMU. You'll see:
```
╔════════════════════════════════════════╗
║     🐄 MOoOS Kernel v0.1.0             ║
╚════════════════════════════════════════╝

[BOOT] Bootloader: BIOS/UEFI
[BOOT] Architecture: i386 (32-bit)
[BOOT] Initializing core systems...

✓ VGA initialized
✓ Memory mapped
✓ MOO THE VIRUS antivirus ready

[STATUS] Kernel ready. Waiting for shell...
```

### Try the Antivirus Scanner
```bash
# Build & run MOO THE VIRUS
cargo run -p moo-the-virus

# Example: Scan for dangerous patterns
# > 1
# Filename: script.sh
# Code: rm -rf /
# Result: 🔴 CRITICAL (Score: 100/100)
```

### Launch the Shell
```bash
cargo run -p moos-shell
# moos> help
# moos> moo
# moos> status
```

### View Dashboard
```bash
cargo run -p moos-dashboard
```

## Project Structure

```
moos/
├── kernel/           → 32-bit x86 bootable kernel
│   └── src/
│       ├── main.rs   → Boot sequence
│       ├── vga.rs    → Text output driver
│       └── cow.rs    → Farm theming
├── antivirus/        → MOO THE VIRUS antivirus engine
│   └── src/
│       ├── lib.rs    → Threat detection, pattern matching
│       └── main.rs   → CLI scanner
├── shell/            → Interactive shell
├── dashboard/        → System monitoring
└── Makefile          → Build orchestration
```

## MOO THE VIRUS - Antivirus System 🐄

Real-time threat detection with:

### Threat Levels
- 🟢 **SAFE** (0-24) — No threats detected
- 🟡 **SUSPICIOUS** (25-49) — Unusual patterns
- 🟠 **WARNING** (50-74) — Potentially dangerous code
- 🔴 **DANGEROUS** (75-99) — High-risk threats detected
- 💀 **CRITICAL** (100) — Immediate action required

### Detection Capabilities
- ✅ Dangerous code patterns (rm -rf /, format strings, buffer overflows, SQL injection, etc.)
- ✅ Harmful filenames (malware, virus, backdoor, trojan, ransomware, etc.)
- ✅ Compound threat analysis (multiple patterns = higher threat)
- ✅ Real-time scoring & reporting

### Example Scans
```
Safe Code:
  File: hello.rs
  Code: fn main() { println!("Hello"); }
  Result: 🟢 SAFE (Score: 0/100)

Dangerous Code:
  File: script.sh
  Code: rm -rf /
  Result: 💀 CRITICAL (Score: 100/100)
  Finding: "Dangerous pattern found: 'rm -rf /'"

Suspicious Filename:
  File: malware.exe
  Code: cout << "hello";
  Result: 🟠 WARNING (Score: 30/100)
  Finding: "Dangerous name detected: 'malware'"
```

## Build Targets

```bash
make help          # Show all available targets
make build-kernel  # Build 32-bit kernel only
make build-tools   # Build shell, dashboard, antivirus
make build         # Build everything
make run           # Build kernel + run in QEMU
make clean         # Clean build artifacts
make test          # Run antivirus tests
```

## Architecture

```
┌──────────────────────────────┐
│  Shell | Dashboard | Antivirus │
├──────────────────────────────┤
│    MOoOS Kernel (VGA, GDT)    │
├──────────────────────────────┤
│   Bootloader (x86 32-bit)     │
└──────────────────────────────┘
```

## Philosophy 🌾

1. **Transparency** — Know what's running, know what's safe
2. **Simplicity** — No hidden processes, no mysterious behavior
3. **Farm Values** — Community-first, open, honest
4. **Cow Power** — Because cows are awesome 🐄

## Roadmap

- ✅ Phase 1: Kernel boot & VGA output
- ✅ Phase 2: MOO THE VIRUS antivirus engine
- 📌 Phase 3: Shell & dashboard tools
- 🔜 Phase 4: Filesystem & storage
- 🔜 Phase 5: Networking & IPC
- 🔜 Phase 6: Graphics & UI

## Contributing

Found a bug? Have a moo idea? Open an issue!

### Test the Antivirus
```bash
cd moos/antivirus
cargo test
```

## Built With ❤️

- **Rust** — Safe, fast, minimal
- **x86 (32-bit)** — Target architecture
- **Bootimage** — BIOS/UEFI bootloader
- **🐄 Cow Power** — The real engine behind it all

---

**Made with 🐄 by the MOoOS Farm**

*Your OS shouldn't be a black box. It should be a barn. An open barn. With cows. 🌾*
