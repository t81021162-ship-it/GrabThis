================================================================================
                    🐄 MOoOS v0.1.0 - Bootable ISO
                   The Cow-Themed Operating System
================================================================================

Welcome to MOoOS - Where transparency meets the farm!

This ISO contains the complete MOoOS project with:
  ✓ 32-bit (i386) bootable kernel
  ✓ MOO THE VIRUS antivirus engine
  ✓ Interactive shell
  ✓ System dashboard
  ✓ Complete source code
  ✓ Build scripts

================================================================================
QUICK START
================================================================================

1. BUILD FROM SOURCE:
   $ cd /moos
   $ make build
   $ make run

2. RUN THE ANTIVIRUS:
   $ cargo run -p moo-the-virus

3. LAUNCH THE SHELL:
   $ cargo run -p moos-shell

4. VIEW THE DASHBOARD:
   $ cargo run -p moos-dashboard

================================================================================
SYSTEM REQUIREMENTS
================================================================================

Build:
  - Rust 1.70+ with nightly toolchain
  - Cargo package manager
  - 2GB free disk space
  - QEMU for emulation (optional)

Runtime:
  - x86/x86_64 processor
  - 512MB RAM minimum
  - 1GB disk space

================================================================================
PROJECT STRUCTURE
================================================================================

kernel/       → 32-bit bootable kernel (i386 architecture)
antivirus/    → MOO THE VIRUS threat detection system
shell/        → Interactive command-line interface
dashboard/    → System monitoring & metrics
Makefile      → Build orchestration
README.md     → Complete documentation
DESIGN.md     → Architecture & design philosophy

================================================================================
FEATURES
================================================================================

🐄 Cow-Themed Everything
   - ASCII art boot screen
   - Farm-inspired commands & UI
   - Moo sounds & cow references

🔒 MOO THE VIRUS Antivirus
   - Real-time code scanning
   - Dangerous pattern detection
   - 5-tier threat rating system (SAFE → CRITICAL)
   - File & code analysis
   - Compound threat detection

👀 Transparent Design
   - Every process visible
   - No hidden behavior
   - Clear threat reporting
   - Open-source codebase

⚡ Developer Friendly
   - Written in Rust
   - Well-documented code
   - Modular architecture
   - Comprehensive tests

================================================================================
BOOT MENU
================================================================================

Option 1: MOoOS Kernel v0.1.0
         Boot the 32-bit MOoOS kernel

Option 2: QEMU with Serial Console
         Boot with serial console for debugging

Option 3: MOoOS Live Environment
         Interactive shell with all tools

================================================================================
BUILD & RUN COMMANDS
================================================================================

# Build everything
make build

# Build just the kernel
make build-kernel

# Build userland tools
make build-tools

# Build MOO THE VIRUS antivirus
make build-antivirus

# Build MOoOS shell
make build-shell

# Build dashboard
make build-dashboard

# Run in QEMU
make run

# Run tests
make test

# Clean build artifacts
make clean

================================================================================
EXAMPLE: RUNNING MOO THE VIRUS
================================================================================

$ cargo run -p moo-the-virus

╔════════════════════════════════════╗
║   🐄 MOO THE VIRUS - Antivirus 🐄  ║
║   Real-time Code Threat Scanner    ║
╚════════════════════════════════════╝

[MOO] Scanner ready
  1. Scan code input
  2. Check filename
  3. Exit

Choice: 1
Enter filename: script.sh
Enter code to scan (end with Ctrl+D):
rm -rf /

╔════════════════════════════════════╗
║      🐄 SCAN COMPLETE 🐄          ║
╚════════════════════════════════════╝

File: script.sh
Threat Level: 💀 CRITICAL (Score: 100/100)

Findings:
  • 🐄 MOO ALERT: Dangerous pattern found: 'rm -rf /'

================================================================================
SHELL COMMANDS
================================================================================

help       - Show available commands
moo        - Hear the cow speak 🐄
whoami     - Who are you?
status     - Show system status
echo TEXT  - Print text
clear      - Clear screen
exit/quit  - Exit shell

================================================================================
THREAT LEVELS
================================================================================

🟢 SAFE (0-24)         - No threats detected
🟡 SUSPICIOUS (25-49)  - Unusual patterns, investigate
🟠 WARNING (50-74)     - Potentially dangerous code
🔴 DANGEROUS (75-99)   - High-risk threats detected
💀 CRITICAL (100)      - Immediate action required

================================================================================
DOCUMENTATION
================================================================================

See README.md for:
  - Quick start guide
  - Architecture overview
  - Feature descriptions
  - Build instructions

See DESIGN.md for:
  - System design
  - Component descriptions
  - Development phases
  - Security philosophy

================================================================================
SUPPORT & CONTRIBUTION
================================================================================

Found an issue? Have ideas?
  - Check DESIGN.md for known limitations
  - Review the source code in your preferred language
  - All code is open-source and transparent

================================================================================
                          Happy Farming! 🌾🐄
                   Made with ❤️ by the MOoOS Farm
================================================================================
