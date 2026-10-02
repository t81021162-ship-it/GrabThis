; 32-bit kernel entry for v86
[BITS 32]
[ORG 0x1000]

kernel_start:
    mov dword [0xb8000], 0x074f0e42  ; Print "B" at VGA text mode
    jmp $  ; Hang

times 256 db 0  ; Padding
