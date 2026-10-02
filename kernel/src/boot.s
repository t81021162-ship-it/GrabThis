; 32-bit bootloader for Claude OS
; Minimal BIOS bootloader that loads the kernel

[BITS 16]
[ORG 0x7C00]

boot:
    ; Clear registers
    xor ax, ax
    xor bx, bx
    xor cx, cx
    xor dx, dx
    xor si, si
    xor di, di
    
    ; Set stack
    mov ss, ax
    mov sp, 0x7C00
    
    ; Switch to 32-bit protected mode
    cli
    lgdt [gdt_descriptor]
    
    ; Set protected mode bit
    mov eax, cr0
    or eax, 1
    mov cr0, eax
    
    ; Jump to 32-bit code
    jmp dword 0x08:start32

[BITS 32]

start32:
    ; Set up data segment
    mov ax, 0x10
    mov ds, ax
    mov es, ax
    mov fs, ax
    mov gs, ax
    mov ss, ax
    
    ; Set stack
    mov esp, 0x20000
    
    ; Jump to kernel
    jmp 0x1000

; GDT for protected mode
gdt:
    dq 0x0000000000000000  ; Null descriptor
    dq 0x00cf9a000000ffff  ; Code segment
    dq 0x00cf92000000ffff  ; Data segment

gdt_descriptor:
    dw $ - gdt - 1
    dd gdt

; Padding and boot signature
times 510 - ($ - $$) db 0
dw 0xAA55
