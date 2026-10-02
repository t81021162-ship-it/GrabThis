#!/bin/bash
set -e

echo "Building Claude OS 32-bit for v86..."

cd kernel

# Build the kernel binary
echo "[BUILD] Compiling 32-bit kernel..."
cargo +nightly build --target i686-unknown-uefi --release -Zbuild-std=core,alloc 2>&1 | grep -E "Compiling|Finished|error" || true

# Check if build succeeded by looking for the EFI binary
if [ -f "target/i686-unknown-uefi/release/claude-os-kernel.efi" ]; then
    echo "[OK] Kernel built successfully"
    
    # Create a raw bootable image
    echo "[BUILD] Creating bootable image..."
    
    # Create a 10MB floppy image
    dd if=/dev/zero of=claude-os-32.img bs=1M count=10 2>/dev/null
    
    # Create a simple boot sector
    ndisasm -b 16 << 'BOOT' > boot.bin
    [BITS 16]
    [ORG 0x7C00]
    mov ax, 0
    mov ds, ax
    mov es, ax
    mov ss, ax
    mov sp, 0x7C00
    
    mov al, 'B'
    mov ah, 0x0E
    mov bx, 0
    int 0x10
    
    jmp $
    times 510 - ($ - $$) db 0
    dw 0xAA55
BOOT
    
    # Write boot sector to image
    dd if=boot.bin of=claude-os-32.img bs=512 count=1 conv=notrunc 2>/dev/null
    
    # Write kernel to image (after bootloader)
    dd if=target/i686-unknown-uefi/release/claude-os-kernel.efi of=claude-os-32.img bs=512 seek=1 conv=notrunc 2>/dev/null
    
    echo "[OK] Image created: claude-os-32.img (10 MB)"
    ls -lh claude-os-32.img
else
    echo "[ERROR] Kernel build failed"
    exit 1
fi

cd ..
