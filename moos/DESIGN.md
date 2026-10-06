# MOoOS Design & Architecture

## Philosophy 🌾

**MOoOS** is built on five core principles:

1. **Transparency** — Every process visible, every threat detected
2. **Simplicity** — Minimal bloat, focused functionality
3. **Farm Ethics** — Community-first, open-source, honest
4. **Security by Default** — MOO THE VIRUS always watching
5. **Developer Joy** — Code you can understand and trust

## System Architecture

```
┌─────────────────────────────────────────┐
│        Applications Layer               │
│  ┌─────────────┬───────────┬──────────┐ │
│  │   Shell     │ Dashboard │ Antivirus│ │
│  └─────────────┴───────────┴──────────┘ │
├─────────────────────────────────────────┤
│        Kernel Layer (32-bit)            │
│  ┌──────────┬─────────┬──────────────┐  │
│  │   VGA    │  Memory │ Interrupts   │  │
│  └──────────┴─────────┴──────────────┘  │
├─────────────────────────────────────────┤
│     Bootloader (x86 32-bit / i386)      │
├─────────────────────────────────────────┤
│         Hardware (QEMU Emulation)       │
└─────────────────────────────────────────┘
```

## Core Components

### 1. Kernel (`kernel/`)
- **VGA Driver** — Text-mode console output
- **Boot Sequence** — BIOS/UEFI initialization
- **Cow Theming** — ASCII art & farm branding
- **Architecture** — i386 (32-bit x86)

**Key Files:**
- `src/main.rs` — Boot entry point
- `src/vga.rs` — Text display driver
- `src/cow.rs` — Farm theming & ASCII art

### 2. MOO THE VIRUS (`antivirus/`)
The heart of MOoOS security.

**Threat Detection:**
- Pattern Matching — Known malware signatures
- Filename Analysis — Suspicious file names
- Code Analysis — Dangerous code patterns
- Threat Scoring — 0-100 risk rating

**Threat Patterns Detected:**
```
Code Injection:
  • system(), exec(), eval()
  • SQL injection, XSS payloads
  • Format string attacks
  • Buffer overflows
  
Memory Safety:
  • Use-after-free
  • Race conditions
  • Unsigned integer overflow
  
System Attacks:
  • rm -rf /
  • fork bombs
  • Cryptolocker
  • Backdoors
```

**Threat Levels:**
- 🟢 SAFE (0-24) — No threats
- 🟡 SUSPICIOUS (25-49) — Investigate
- 🟠 WARNING (50-74) — Action recommended
- 🔴 DANGEROUS (75-99) — Stop, investigate
- 💀 CRITICAL (100) — Immediate quarantine

### 3. Shell (`shell/`)
Interactive command-line interface with farm theme.

**Built-in Commands:**
- `help` — Show available commands
- `moo` — Hear the cow speak 🐄
- `whoami` — Identity check
- `status` — System status
- `echo TEXT` — Print output
- `clear` — Clear screen
- `exit` — Exit shell

### 4. Dashboard (`dashboard/`)
Real-time system monitoring with metrics.

**Displays:**
- CPU/Memory/Disk usage
- Antivirus status & threat count
- Farm health & cow count
- System uptime

## Development Phases

### ✅ Phase 1: Foundation (Complete)
- [x] 32-bit kernel boot
- [x] VGA text output
- [x] Basic initialization
- [x] Farm theming

### ✅ Phase 2: Security (Complete)
- [x] MOO THE VIRUS antivirus engine
- [x] Threat pattern detection
- [x] Risk rating system
- [x] CLI scanner tool

### 📌 Phase 3: Userland (In Progress)
- [x] Interactive shell
- [x] System dashboard
- [ ] File management
- [ ] Process viewer

### 🔜 Phase 4: Storage
- [ ] Filesystem driver
- [ ] Persistent storage
- [ ] File I/O operations

### 🔜 Phase 5: Networking
- [ ] Network stack
- [ ] TCP/IP
- [ ] Socket API

### 🔜 Phase 6: Advanced
- [ ] Graphics & GUI
- [ ] Window manager
- [ ] Multi-monitor support

## Build System

Using Cargo workspaces for modular development.

```
moos/
├── Cargo.toml          → Workspace definition
├── kernel/             → Main kernel package
├── antivirus/          → Antivirus engine
├── shell/              → Shell application
├── dashboard/          → Dashboard application
└── Makefile            → Build orchestration
```

### Building

```bash
# Build everything
make build

# Build specific components
make build-kernel
make build-antivirus
make build-shell

# Run in QEMU
make run

# Test antivirus
make test
```

## 32-bit (i386) Architecture Choice

**Why 32-bit?**
- ✅ Simpler memory model for learning
- ✅ Lower resource requirements
- ✅ Compatible with QEMU i386 emulation
- ✅ Perfect for embedded & IoT
- ✅ Historical significance (teaches fundamentals)

**Advantages:**
- Address space: 0 - 4GB
- Registers: EAX, EBX, ECX, EDX, ESI, EDI, ESP, EBP
- Simpler segmentation & paging

## Security Philosophy

MOoOS security is **transparent and proactive**:

1. **Real-time Scanning** — All code checked automatically
2. **Pattern Recognition** — Known threats detected instantly
3. **Risk Ratings** — Clear threat levels & scores
4. **User Control** — You decide what to do with threats
5. **No Hidden Behavior** — All security decisions visible

## Testing

### Unit Tests
```bash
cargo test -p moo-the-virus
```

### Integration Testing
```bash
make run  # Boot in QEMU
cargo run -p moos-shell  # Test shell
cargo run -p moo-the-virus  # Test antivirus
```

## Future Enhancements

- [ ] Kernel debugger (kdb)
- [ ] Better error handling
- [ ] Memory paging support
- [ ] Process isolation
- [ ] File permissions
- [ ] User accounts
- [ ] Network stack
- [ ] Graphics driver

## Contributing

1. Keep code transparent & readable
2. Write tests for new features
3. Follow Rust idioms
4. Update documentation
5. Test on both QEMU and real hardware (if possible)

---

**Made with 🐄 by the MOoOS Farm Team**

*An OS built on transparency, powered by cows, designed for people.*
