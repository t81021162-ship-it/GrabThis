# Claude OS

> An operating system built on transparency. What you see is what you get.

🔷 **Claude OS** is a minimal, developer-focused OS designed around one principle: **No hidden processes, no mystery behavior, just clear visibility into what your system is doing.**

## Features

- 🚀 **Fast & Lightweight** — Rust-based kernel and tools
- 👀 **Transparent** — Every command shows what it's doing
- 💾 **Persistent Journal** — Track tasks and thoughts
- 📊 **Live Dashboard** — See system metrics in real-time
- 🧠 **Cortex AI** — Transparent AI assistant (local + OpenRouter smart mode)
- 🛠️ **Developer First** — Built by someone who understands what matters

## Quick Start

### Build & Run Bootable Kernel (QEMU)

**Requirements:** `qemu-system-x86_64`, `bootimage` tool

```bash
# Install bootimage tool (one-time)
cargo install bootimage

# Build and run in QEMU
make run
```

This builds the x86_64 kernel, creates a bootable disk image, and launches it in QEMU. You'll see:
```
╔════════════════════════════════════════╗
║     🔷 Claude OS Kernel v0.1.0         ║
╚════════════════════════════════════════╝

[BOOT] Bootloader: UEFI
[BOOT] Memory: 2048 MB total
[BOOT] Physical memory offset: 0xffffffff80000000
[INIT] Interrupt descriptor table loaded

✓ CPU: Online
✓ Memory: Mapped
✓ IDT: Ready

[STATUS] Kernel ready. Waiting for shell...
```

To exit QEMU: `Ctrl+A` then `X`

### Build Userland Tools

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

### Chat with Cortex (AI Assistant)
```bash
# Run Cortex with built-in knowledge
cargo run -p cortex-os-assistant

# Or with OpenRouter smart mode (for harder questions)
OPENROUTER_API_KEY=your_key cargo run -p cortex-os-assistant
```

**Cortex's modes:**
- **Local Mode:** Fast answers from built-in knowledge
  ```
  cortex> hello
  cortex> who are you
  cortex> what can you do
  cortex> status
  ```

- **Smart Mode:** Use OpenRouter for complex questions (requires API key)
  ```
  cortex> ask smartly explain quantum computing
  cortex> ask smartly how do I optimize Rust code
  ```

Cortex is transparent about its knowledge limits and shows you when it's using OpenRouter!

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
kernel/      → Low-level kernel code (bootloader, VGA, GDT, interrupts, keyboard)
shell/       → Interactive shell with built-in commands
dashboard/   → System monitoring and metrics
journal/     → Persistent task tracking
assistant/   → Cortex AI (local knowledge + OpenRouter integration)
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
- ✅ Phase 2: Core Systems (GDT, interrupts, scheduler, keyboard)
- ✅ Phase 3: AI Assistant (Cortex with local + OpenRouter modes)
- 📌 Phase 4: Advanced (window manager, filesystem, memory paging, networking)

## Built With

- **Rust** — Safe, fast, minimal
- **x86_64** — Target architecture  
- **UEFI/BIOS** — Bootloader standards
- **JSON** — Human-readable configuration

---

**Made with ❤️ by Claude**

See something you'd like to improve? Check [DESIGN.md](DESIGN.md) for contribution guidelines.
