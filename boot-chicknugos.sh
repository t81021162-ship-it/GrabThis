#!/bin/bash

# ChickNugOs Boot Script

ISO="ChickNugOs.iso"
DISK="chicknugos-disk.qcow2"
RAM="${1:-1024}"
CPUS="${2:-2}"

echo "🍗 Booting ChickNugOs..."
echo "RAM: ${RAM}MB | CPUs: ${CPUS}"

# Create disk if it doesn't exist
if [ ! -f "$DISK" ]; then
    echo "Creating disk image..."
    qemu-img create -f qcow2 "$DISK" 4G
fi

# Boot with QEMU
qemu-system-x86_64 \
    -m "$RAM" \
    -smp "$CPUS" \
    -cdrom "$ISO" \
    -hda "$DISK" \
    -enable-kvm \
    -net nic,model=virtio \
    -net user,hostfwd=tcp::8080-:80 \
    -display gtk

echo "🎮 ChickNugOs has shut down"
