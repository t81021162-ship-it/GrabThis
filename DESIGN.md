# Claude OS — Design & Architecture

> An OS built on the principle: **Transparency first, complexity never hidden**

## Vision

Claude OS is a minimal, developer-focused operating system that makes every action visible. No black boxes. No mystery processes. Just you, the code, and clear feedback about what's happening.

The core philosophy: **What would Claude build?**
- Default to transparency over silence
- Show the "why," not just the "what"
- Make power available without obfuscation
- Keep the human in the loop

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│            User Applications / CLI               │
├─────────────────────────────────────────────────┤
│  Shell  │  Dashboard  │  Journal  │  Tools       │
├─────────────────────────────────────────────────┤
│              Kernel (VGA, Scheduling)            │
├─────────────────────────────────────────────────┤
│         Bootloader (UEFI/BIOS)                   │
└─────────────────────────────────────────────────┘
```

### Components

#### **Kernel** (`kernel/`)
- **Purpose:** Low-level hardware abstraction, scheduling, VFS
- **Language:** Rust
- **Features:**
  - Minimal bootloader (UEFI)
  - Process scheduler
  - VGA buffer for output
  - Serial logging for debugging
  - Virtual filesystem abstraction

#### **Shell** (`shell/`)
- **Purpose:** Interactive command interpreter with transparency
- **Language:** Rust
- **Features:**
  - Shows `[EXEC]` prefix for all commands (you know what's running)
  - Built-in commands: `help`, `cd`, `pwd`, `echo`, `status`, `exit`
  - External command execution with process feedback
  - Command history (100 entries)
  - Color-coded output (success/error/info)

#### **Dashboard** (`dashboard/`)
- **Purpose:** Real-time system monitoring and metrics
- **Language:** Rust
- **Features:**
  - CPU, memory, process info at a glance
  - Queryable process list
  - System status snapshot
  - Extensible metrics framework

#### **Journal** (`journal/`)
- **Purpose:** Persistent task/thought tracking (the "why" of your work)
- **Language:** Rust
- **Features:**
  - JSON-based entry storage
  - Timestamped entries with UUIDs
  - Tag support for organization
  - CLI: `journal add "task text"` | `journal list [limit]`
  - Auto-persists to `.claude_journal.json`

---

## Development Phases

### ✅ Phase 1: Foundation (Current)
- [x] Kernel skeleton with VGA output
- [x] Shell with basic built-ins
- [x] Dashboard info display
- [x] Journal CLI for task tracking

### 🔄 Phase 2: Core Systems (Next)
- [ ] Real process scheduler (multiprocessing)
- [ ] Filesystem driver (simple ext2 or FAT32)
- [ ] Interrupt handling + exception system
- [ ] Memory management (paging, heap allocator)
- [ ] Enhanced shell with pipes/redirection

### 📌 Phase 3: Experience (Future)
- [ ] Lightweight window manager (Wayland/X11 compat)
- [ ] Unified search system (files + processes + config)
- [ ] Documentation system (inline help everywhere)
- [ ] Package manager (declarative dependency system)
- [ ] Network stack (TCP/IP basics)

---

## Design Principles

### 1. **Transparency**
Every action should show what's happening. 
- Processes display `[EXEC]` tags
- Config changes are logged
- Errors include context, not just codes

### 2. **Composability**
Small, focused tools that work together.
- Shell talks to kernel
- Dashboard reads from kernel metrics
- Journal is independent but integrable

### 3. **Minimal Bloat**
No "magic" processes running silently.
- Only run what the user asks for
- Show resource usage clearly
- Kill processes on user request

### 4. **Developer First**
Built for people who want to understand their tools.
- Source is readable Rust
- CLI is the primary interface
- Everything has a man page equivalent

### 5. **Visible Defaults**
No hidden configuration.
- Config files are human-readable (JSON, TOML)
- Settings show their rationale in comments
- Defaults are explicit, not implicit

---

## Key Files

```
GrabThis/
├── Cargo.toml              # Workspace manifest
├── kernel/
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs         # Kernel entry (_start)
│       ├── vga_buffer.rs   # Screen output
│       └── serial.rs       # Debug logging
├── shell/
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs         # Shell REPL
│       ├── builtins.rs     # Built-in commands
│       ├── command.rs      # Command parsing
│       └── history.rs      # Command history
├── dashboard/
│   ├── Cargo.toml
│   └── src/main.rs         # System monitor
├── journal/
│   ├── Cargo.toml
│   └── src/main.rs         # Task journal
└── DESIGN.md               # This file
```

---

## Building & Running

### Build the shell (userland tool)
```bash
cargo build --release -p claude-os-shell
```

### Run the shell
```bash
cargo run -p claude-os-shell
```

### Build the kernel (will require x86_64 target)
```bash
cargo build --release -p claude-os-kernel --target x86_64-unknown-none
```

### Check dashboard
```bash
cargo run -p claude-os-dashboard
```

### Use journal
```bash
cargo run -p claude-os-journal -- add "Working on phase 1"
cargo run -p claude-os-journal -- list 10
```

---

## Design Decisions

### Why Rust?
- Memory safety without GC (critical for kernels)
- Zero-cost abstractions (fast, minimal overhead)
- Excellent embedded tooling
- Type system prevents whole classes of bugs

### Why JSON for journal?
- Human-readable persistence
- Easy to query from scripts
- No binary format overhead
- Simple to back up / sync

### Why minimal bootloader?
- Keep surface area small
- Reduce attack vectors
- Easier to understand for learning

### Why show `[EXEC]` tags?
- Users should know what's running
- Makes timing issues visible
- Helps debug unexpected behavior

---

## What's Next?

1. **Testing the shell** — Can we run real commands?
2. **Building the kernel** — Cross-compile to x86_64, test bootability
3. **Filesystem** — Mount a simple filesystem, persist journal
4. **Scheduling** — Real multiprocess support
5. **Integration** — Shell talks to kernel for real info (not mocked)

---

## Contributing

When adding features:
- Keep code transparent (comments explain "why", not "what")
- Show what you're doing (logging, status messages)
- Minimize hidden behavior
- Make things testable and inspectable

---

**Built with ❤️ by Claude, for people who want clarity.**
