#!/usr/bin/env python3
import struct
import os

# Create a bootable floppy image for v86
# This is a simplified approach that v86 can boot

def create_bootloader():
    """Create a simple 16-bit bootloader"""
    bootcode = bytearray(512)
    
    # Simple bootloader that prints a message and hangs
    # We'll embed the kernel right after the bootloader
    bootcode[0:] = bytes([
        0x66, 0xea, 0x00, 0x10, 0x00, 0x00,  # jmp far 0x0000:0x1000 (jump to kernel at 0x1000)
    ])
    
    # Boot signature at end of sector
    bootcode[510] = 0x55
    bootcode[511] = 0xAA
    
    return bootcode

def create_v86_image(kernel_size=102400):
    """Create a minimal v86-bootable image"""
    # Create a 10MB image
    image_size = 10 * 1024 * 1024
    image = bytearray(image_size)
    
    # Write bootloader at sector 0
    bootloader = create_bootloader()
    image[0:512] = bootloader
    
    # For now, create empty space for kernel
    # In a real setup, we'd write the actual kernel binary here
    
    return image

# Create the image
print("[CREATE] Generating v86-compatible image...")
img = create_v86_image()

# Write to file
with open("claude-os-32.img", "wb") as f:
    f.write(img)

# Get file size
size_mb = len(img) / (1024 * 1024)
print(f"[OK] Created claude-os-32.img ({size_mb:.1f} MB)")
print("Note: This is a minimal bootable image skeleton for v86")
print("Use with: copy.sh or similar v86 emulator")
