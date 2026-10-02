#!/bin/bash
# Claude OS Setup Script
# Installs required tools for building Claude OS

set -e

echo "╔════════════════════════════════════════╗"
echo "║   Claude OS Build Environment Setup    ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Check for Rust
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust/Cargo not found"
    echo "Install from: https://rustup.rs/"
    exit 1
fi

echo "✓ Rust installed: $(rustc --version)"

# Install nightly
echo ""
echo "[SETUP] Installing Rust nightly..."
rustup toolchain install nightly
rustup component add --toolchain nightly rust-src llvm-tools

# Install bootimage tool
echo ""
echo "[SETUP] Installing bootimage tool..."
cargo install bootimage --force

# Check for QEMU
if ! command -v qemu-system-x86_64 &> /dev/null; then
    echo ""
    echo "⚠️  QEMU not found"
    echo "Install QEMU to run the kernel:"
    echo "  Ubuntu/Debian: sudo apt install qemu-system-x86"
    echo "  macOS: brew install qemu"
else
    echo "✓ QEMU installed: $(qemu-system-x86_64 --version | head -1)"
fi

echo ""
echo "╔════════════════════════════════════════╗"
echo "║         Setup Complete! ✓              ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. make run           → Build & run kernel in QEMU"
echo "  2. cargo run -p claude-os-shell  → Run the shell"
echo ""
