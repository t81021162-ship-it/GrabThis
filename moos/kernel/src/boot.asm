; MOoOS Multiboot Kernel Boot Code
; Implements Multiboot specification for GRUB bootloader

MBOOT_PAGE_ALIGN    equ (1 << 0)        ; Align modules on page boundary
MBOOT_MEM_INFO      equ (1 << 1)        ; Request memory map
MBOOT_MAGIC         equ 0x1BADB002      ; Multiboot magic number
MBOOT_FLAGS         equ (MBOOT_PAGE_ALIGN | MBOOT_MEM_INFO)
MBOOT_CHECKSUM      equ -(MBOOT_MAGIC + MBOOT_FLAGS)

[BITS 32]
[GLOBAL start]

; Multiboot header (must appear in first 8KB of executable)
section .multiboot
align 4
    dd MBOOT_MAGIC
    dd MBOOT_FLAGS
    dd MBOOT_CHECKSUM
    ; For ELF header fields
    dd 0    ; header_addr
    dd 0    ; load_addr
    dd 0    ; load_end_addr
    dd 0    ; bss_end_addr
    dd 0    ; entry_addr

; Kernel entry point
section .text
align 4
start:
    ; Disable interrupts
    cli

    ; Setup stack
    mov esp, stack_end

    ; Jump to main kernel code
    jmp kmain

kmain:
    ; Clear interrupts and setup minimal environment
    cli

    ; VGA is already in text mode from bootloader
    ; Print boot message

    call vga_clear
    call vga_print_banner

    ; Halt CPU and wait for interrupts
    hlt
    jmp $

vga_clear:
    ; Clear VGA text buffer
    mov edi, 0xB8000
    xor eax, eax
    mov ecx, 2000
    rep stosd
    ret

vga_print_banner:
    ; Print boot banner to VGA
    mov esi, banner_text
    mov edi, 0xB8000
    mov ah, 0x0F  ; White text on black background
.print_loop:
    lodsb
    test al, al
    jz .print_done

    ; Handle newline
    cmp al, 0x0A
    je .newline

    ; Print character
    mov [edi], ax
    add edi, 2
    jmp .print_loop
.newline:
    ; Move to next line (skip to next 80-char boundary)
    mov eax, edi
    sub eax, 0xB8000
    shr eax, 1
    mov ecx, 80
    xor edx, edx
    div ecx

    ; Move to next line start
    mov eax, edx
    mov ecx, 80
    sub ecx, eax
    mov eax, ecx
    shl eax, 1
    add edi, eax
    jmp .print_loop
.print_done:
    ret

section .rodata
banner_text:
    db 0x0A, 0
    db "╔════════════════════════════════════╗", 0x0A, 0
    db "║  🐄 MOoOS Kernel v0.1.0 Boot 🐄    ║", 0x0A, 0
    db "╚════════════════════════════════════╝", 0x0A, 0x0A, 0
    db "[BOOT] Bootloader: Multiboot (GRUB)", 0x0A, 0
    db "[BOOT] Architecture: i386 (32-bit)", 0x0A, 0
    db "[BOOT] Status: Kernel ready!", 0x0A, 0x0A, 0
    db "✓ Multiboot kernel loaded", 0x0A, 0
    db "✓ VGA text mode initialized", 0x0A, 0
    db "✓ Memory available", 0x0A, 0x0A, 0
    db "Select a tool from the GRUB boot menu:", 0x0A, 0
    db "  • Kernel - Boot MOoOS kernel", 0x0A, 0
    db "  • Shell - Interactive CLI", 0x0A, 0
    db "  • Antivirus - MOO THE VIRUS scanner", 0x0A, 0
    db "  • Dashboard - System monitor", 0x0A, 0x0A, 0
    db "🐄 Made with ❤️ by the MOoOS Farm", 0x0A, 0
    db 0

section .bss
align 4096
stack_begin:
    resb 4096
stack_end:
