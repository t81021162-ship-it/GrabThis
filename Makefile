.PHONY: help build-kernel build-shell run run-qemu clean

KERNEL_TARGET := x86_64-unknown-none
KERNEL_DIR := kernel
CARGO := cargo

help:
	@echo "Claude OS Build System"
	@echo "======================"
	@echo ""
	@echo "Targets:"
	@echo "  make build-kernel    - Build bootable kernel"
	@echo "  make build-shell     - Build shell"
	@echo "  make build           - Build kernel + shell"
	@echo "  make run             - Run in QEMU"
	@echo "  make run-qemu        - Same as 'make run'"
	@echo "  make clean           - Clean build artifacts"
	@echo ""

build-kernel:
	@echo "[BUILD] Compiling Claude OS Kernel..."
	cd $(KERNEL_DIR) && $(CARGO) +nightly build --target $(KERNEL_TARGET) --release

build-shell:
	@echo "[BUILD] Compiling Claude OS Shell..."
	$(CARGO) build --release -p claude-os-shell

build: build-kernel build-shell
	@echo "[BUILD] ✓ All components built successfully"

run: build-kernel
	@echo "[QEMU] Starting Claude OS in QEMU..."
	cd $(KERNEL_DIR) && $(CARGO) +nightly bootimage --release
	qemu-system-x86_64 -drive format=raw,file=kernel/target/x86_64-unknown-none/release/boot-image.bin

run-qemu: run

clean:
	@echo "[CLEAN] Removing build artifacts..."
	$(CARGO) clean
	rm -rf kernel/target

.PHONY: help build-kernel build-shell build run run-qemu clean
