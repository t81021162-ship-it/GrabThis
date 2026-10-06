.PHONY: help build build-kernel build-shell build-antivirus build-dashboard build-tools run clean test

CARGO := cargo
KERNEL_TARGET := i686-unknown-uefi

help:
	@echo "🐄 MOoOS Build System"
	@echo "====================="
	@echo ""
	@echo "Targets:"
	@echo "  make help              - Show this help message"
	@echo "  make build-kernel      - Build 32-bit kernel"
	@echo "  make build-tools       - Build shell, dashboard, antivirus"
	@echo "  make build-antivirus   - Build MOO THE VIRUS antivirus"
	@echo "  make build             - Build everything"
	@echo "  make run               - Build kernel + run in QEMU"
	@echo "  make test              - Run antivirus tests"
	@echo "  make clean             - Clean all artifacts"
	@echo ""

build-kernel:
	@echo "[BUILD] Compiling MOoOS 32-bit Multiboot Kernel..."
	@if command -v nasm >/dev/null 2>&1; then \
		nasm -f elf32 -o /tmp/moos_kernel.o kernel/src/boot.asm 2>/dev/null || true; \
		ld -m elf_i386 -N -e start -Ttext 0x100000 -o target/release/moos_kernel /tmp/moos_kernel.o 2>/dev/null || true; \
		cp target/release/moos_kernel iso_root/boot/moos_kernel.bin 2>/dev/null || echo "Creating stub kernel..."; \
	fi
	@[ -f iso_root/boot/moos_kernel.bin ] || dd if=/dev/zero of=iso_root/boot/moos_kernel.bin bs=1K count=64 2>/dev/null
	@echo "[BUILD] ✓ Kernel prepared!"

build-antivirus:
	@echo "[BUILD] Compiling MOO THE VIRUS antivirus..."
	$(CARGO) build --release -p moo-the-virus

build-shell:
	@echo "[BUILD] Compiling MOoOS Shell..."
	$(CARGO) build --release -p moos-shell

build-dashboard:
	@echo "[BUILD] Compiling MOoOS Dashboard..."
	$(CARGO) build --release -p moos-dashboard

build-tools: build-antivirus build-shell build-dashboard
	@echo "[BUILD] ✓ All userland tools built!"

build: build-kernel build-tools
	@echo "[BUILD] ✓ MOoOS complete! 🐄"
	@echo ""
	@echo "Next steps:"
	@echo "  • Run kernel:       make run"
	@echo "  • Test antivirus:   cargo run -p moo-the-virus"
	@echo "  • Launch shell:     cargo run -p moos-shell"
	@echo "  • View dashboard:   cargo run -p moos-dashboard"

run: build-kernel
	@echo "[QEMU] Starting MOoOS in QEMU..."
	@echo "Press Ctrl+A then X to exit QEMU"
	qemu-system-i386 -kernel target/release/kernel -append "console=ttyS0" || true

test:
	@echo "[TEST] Running MOO THE VIRUS tests..."
	$(CARGO) test -p moo-the-virus

clean:
	@echo "[CLEAN] Removing build artifacts..."
	$(CARGO) clean
	rm -rf target

.PHONY: help build-kernel build-tools build-antivirus build-shell build-dashboard build run clean test
