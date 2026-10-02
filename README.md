# Claude OS

> An operating system built on transparency. What you see is what you get.

🔷 **Claude OS** is a minimal, developer-focused OS designed around one principle: **No hidden processes, no mystery behavior, just clear visibility into what your system is doing.**

## Features

- 🚀 **Fast & Lightweight** — Rust-based kernel and tools
- 👀 **Transparent** — Every command shows what it's doing
- 💾 **Persistent Journal** — Track tasks and thoughts
- 📊 **Live Dashboard** — See system metrics in real-time
- 🛠️ **Developer First** — Built by someone who understands what matters

## Quick Start

### Build
```bash
# Build the shell (userland, runs on any Unix-like system)
cargo build --release -p claude-os-shell

# Build the dashboard
cargo build --release -p claude-os-dashboard

# Build the journal
cargo build --release -p claude-os-journal
```

### Run the Shell
```bash
cargo run -p claude-os-shell
```

```
╔════════════════════════════════════════╗
║     Claude OS Shell v0.1.0             ║
║  Type 'help' for commands              ║
╚════════════════════════════════════════╝

claude> help
claude> pwd
claude> echo "Hello from Claude OS"
claude> status
```

### Check System Dashboard
```bash
cargo run -p claude-os-dashboard
```

### Use the Journal
```bash
# Add a task
cargo run -p claude-os-journal -- add "Phase 1 complete"

# List recent entries
cargo run -p claude-os-journal -- list 10
```

## Architecture

```
┌─────────────────────────────────┐
│  Shell | Dashboard | Journal     │
├─────────────────────────────────┤
│      Kernel (VGA, Scheduler)     │
├─────────────────────────────────┤
│    Bootloader (x86_64)           │
└─────────────────────────────────┘
```

See [DESIGN.md](DESIGN.md) for the full architecture and philosophy.

## Project Structure

```
kernel/      → Low-level kernel code (bootloader, VGA, scheduling)
shell/       → Interactive shell with built-in commands
dashboard/   → System monitoring and metrics
journal/     → Persistent task tracking
DESIGN.md    → Architecture and design philosophy
```

## Philosophy

Why Claude OS?

1. **Transparency** — You should always know what's running
2. **Composability** — Small focused tools that work together  
3. **Minimal Bloat** — Only what you ask for, nothing else
4. **Developer First** — Built for people who want to understand their system
5. **Visible Defaults** — No hidden magic, everything is explicit

## Roadmap

- ✅ Phase 1: Foundation (shell, dashboard, journal)
- 🔄 Phase 2: Core Systems (scheduler, filesystem, memory mgmt)
- 📌 Phase 3: Experience (window manager, unified search, package manager)

## Built With

- **Rust** — Safe, fast, minimal
- **x86_64** — Target architecture  
- **UEFI/BIOS** — Bootloader standards
- **JSON** — Human-readable configuration

---

**Made with ❤️ by Claude**

See something you'd like to improve? Check [DESIGN.md](DESIGN.md) for contribution guidelines.
