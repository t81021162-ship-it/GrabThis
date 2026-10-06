; MOoOS Bootable Kernel - Pure Assembly

MBOOT_PAGE_ALIGN    equ (1 << 0)
MBOOT_MEM_INFO      equ (1 << 1)
MBOOT_MAGIC         equ 0x1BADB002
MBOOT_FLAGS         equ (MBOOT_PAGE_ALIGN | MBOOT_MEM_INFO)
MBOOT_CHECKSUM      equ -(MBOOT_MAGIC + MBOOT_FLAGS)

[BITS 32]
[GLOBAL start]

section .multiboot
align 4
    dd MBOOT_MAGIC
    dd MBOOT_FLAGS
    dd MBOOT_CHECKSUM
    dd 0, 0, 0, 0, 0

section .text
align 4
start:
    cli
    mov esp, 0x90000

    ; Serial output
    mov dx, 0x3F8

    ; Output "MOoOS"
    mov al, 'M'
    out dx, al
    mov al, 'O'
    out dx, al
    mov al, 'o'
    out dx, al
    mov al, 'O'
    out dx, al
    mov al, 'S'
    out dx, al
    mov al, 10
    out dx, al

    ; Clear VGA
    mov eax, 0x20202020
    mov ecx, 1000
    mov edi, 0xB8000
    rep stosd

    ; Print to VGA
    mov edi, 0xB8000
    mov al, 'M'
    mov ah, 0x0F
    mov [edi], ax
    add edi, 2
    mov al, 'O'
    mov [edi], ax
    add edi, 2
    mov al, 'o'
    mov [edi], ax
    add edi, 2
    mov al, 'O'
    mov [edi], ax
    add edi, 2
    mov al, 'S'
    mov [edi], ax

    mov dx, 0x3F8
    mov al, ' '
    out dx, al
    mov al, 'B'
    out dx, al
    mov al, 'o'
    out dx, al
    mov al, 'o'
    out dx, al
    mov al, 't'
    out dx, al
    mov al, ' '
    out dx, al
    mov al, 'O'
    out dx, al
    mov al, 'K'
    out dx, al
    mov al, 10
    out dx, al

    hlt
    jmp $
