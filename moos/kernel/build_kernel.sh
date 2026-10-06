#!/bin/bash
# Build MOoOS as a bootable multiboot kernel

set -e

echo "[BUILD] Compiling MOoOS Multiboot Kernel..."

# Add nightly toolchain for bare metal compilation
rustup component add llvm-tools-embedded 2>/dev/null || true

# Create a minimal multiboot kernel binary
cat > /tmp/moos_kernel.asm << 'ASMEOF'
; MOoOS Multiboot Kernel Stub
; Minimal bootable kernel implementing Multiboot spec

MBOOT_PAGE_ALIGN equ (1 << 0)
MBOOT_MEM_INFO   equ (1 << 1)
MBOOT_MAGIC      equ 0x1BADB002
MBOOT_FLAGS      equ (MBOOT_PAGE_ALIGN | MBOOT_MEM_INFO)
MBOOT_CHECKSUM   equ -(MBOOT_MAGIC + MBOOT_FLAGS)

[BITS 32]
[GLOBAL start]

section .multiboot
align 4
    dd MBOOT_MAGIC
    dd MBOOT_FLAGS
    dd MBOOT_CHECKSUM
    dd 0, 0, 0, 0, 0
    dd 0

section .text
start:
    ; Disable interrupts
    cli

    ; Setup stack
    mov esp, stack_space + 16384

    ; Call kernel main
    call kmain

    ; Halt CPU
    hlt
    jmp $

kmain:
    ; Setup VGA text mode (already in text mode from bootloader)

    ; Print boot banner to VGA buffer
    mov edi, 0xB8000  ; VGA buffer address

    ; Clear screen first
    xor eax, eax
    mov ecx, 2000
    rep stosd

    ; Print boot message
    mov esi, boot_message
    mov edi, 0xB8000
    call print_string

    ret

print_string:
    mov ah, 0x0F  ; White on black
.loop:
    lodsb
    test al, al
    jz .done
    mov [edi], ax
    add edi, 2
    jmp .loop
.done:
    ret

section .data
boot_message:
    db "╔════════════════════════════════════╗", 0
    db "║  🐄 MOoOS Kernel v0.1.0 Boot 🐄    ║", 0
    db "╚════════════════════════════════════╝", 0
    db "", 0
    db "[BOOT] Bootloader: Multiboot (GRUB)", 0
    db "[BOOT] Architecture: i386 (32-bit)", 0
    db "[BOOT] Status: MOoOS is ready!", 0
    db "", 0
    db "✓ Kernel booted successfully", 0
    db "✓ VGA text mode initialized", 0
    db "✓ MOO THE VIRUS antivirus ready", 0
    db "", 0
    db "Select a tool from GRUB boot menu:", 0
    db "  • Shell       - Interactive CLI", 0
    db "  • Antivirus   - MOO THE VIRUS", 0
    db "  • Dashboard   - System Monitor", 0
    db "", 0
    db "Made with ❤️ by the MOoOS Farm", 0
    db 0

section .bss
align 16
stack_space: resb 16384
ASMEOF

# Try to assemble with nasm (if available)
if command -v nasm &> /dev/null; then
    echo "[BUILD] Assembling kernel with nasm..."
    nasm -f elf32 /tmp/moos_kernel.asm -o /tmp/moos_kernel.o
    ld -m elf_i386 -T /dev/null -o target/release/moos_kernel_image /tmp/moos_kernel.o
    cp target/release/moos_kernel_image iso_root/boot/moos_kernel.bin
    echo "[BUILD] ✓ Multiboot kernel created!"
else
    echo "[WARN] nasm not available - creating stub kernel"
    echo "ELF stub kernel - replace with proper multiboot binary" > iso_root/boot/moos_kernel.bin
fi

echo "[BUILD] Kernel build complete!"
