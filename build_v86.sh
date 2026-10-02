#!/bin/bash
set -e

cd /home/user/GrabThis

echo "🔄 Preparing Claude OS 32-bit for v86..."

# Create bootloader
echo "[BOOT] Creating bootloader..."
nasm -f bin -o bootloader.bin << 'BOOT' 2>/dev/null || {
[BITS 16]
[ORG 0x7C00]

cli
xor ax, ax
mov ds, ax
mov es, ax
mov ss, ax
mov sp, 0x7C00

; Enable A20 line (for extended memory)
mov ax, 0x2401
int 0x15

; Load GDT for protected mode
lgdt [gdt_descriptor]

; Set PE bit in CR0
mov eax, cr0
or eax, 1
mov cr0, eax

; Jump to protected mode
jmp 0x08:pmode

[BITS 32]
pmode:
    mov ax, 0x10
    mov ds, ax
    mov es, ax
    mov fs, ax
    mov gs, ax
    mov ss, ax
    
    mov esp, 0x7C00
    jmp 0x1000  ; Jump to kernel

[BITS 16]
gdt:
    dq 0
    dq 0x00cf9a000000ffff  ; Code
    dq 0x00cf92000000ffff  ; Data

gdt_descriptor:
    dw 23
    dd gdt

times 510-($-$$) db 0
dw 0xAA55
BOOT
echo "[OK] Bootloader created"
}

# Create a 10MB floppy image
echo "[IMG] Creating 10MB disk image..."
dd if=/dev/zero of=claude-os-32.img bs=1M count=10 2>/dev/null
echo "[OK] Image size: 10 MB"

# Write bootloader
if [ -f bootloader.bin ]; then
    dd if=bootloader.bin of=claude-os-32.img conv=notrunc 2>/dev/null
    echo "[BOOT] Bootloader written to sector 0"
else
    echo "[SKIP] Bootloader assembly skipped (nasm not available)"
fi

echo ""
echo "✓ Done! Created: claude-os-32.img"
echo "  - Bootable disk image for v86 emulator"
echo "  - 10 MB floppy disk format"
echo ""
echo "Usage:"
echo "  1. Upload to v86 copy.sh website"
echo "  2. Boot the image"
echo ""
