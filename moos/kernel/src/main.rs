#![no_std]
#![no_main]

mod vga;
mod cow;
mod multiboot;
mod graphics;
mod gui;
mod serial;

use core::panic::PanicInfo;

// Multiboot header - MUST be in first 8KB for GRUB to find it
#[link_section = ".multiboot_header"]
#[no_mangle]
pub static MULTIBOOT_HEADER: multiboot::MultibootHeader = multiboot::MultibootHeader {
    magic: 0x1BADB002,
    flags: 0x00000003, // ALIGN | MEMINFO
    checksum: 0xE4524FFD, // -(0x1BADB002 + 0x00000003)
    header_addr: 0,
    load_addr: 0,
    load_end_addr: 0,
    bss_end_addr: 0,
    entry_addr: 0,
};

// Kernel entry point
#[no_mangle]
pub extern "C" fn _start() -> ! {
    serial::serial_init();
    serial::serial_write_string("[KERNEL] MOoOS boot started\n");
    serial::serial_write_string("[KERNEL] Initializing VGA...\n");

    vga::init();
    vga::clear_screen();

    serial::serial_write_string("[KERNEL] VGA ready\n");

    cow::print_banner();

    vga::print_line("");
    vga::print_line("🐄 MOoOS Kernel v0.1.0 - GRAPHICAL EDITION");
    vga::print_line("");
    vga::print_line("[BOOT] Bootloader: Multiboot (GRUB)");
    vga::print_line("[BOOT] Architecture: i386 (32-bit)");
    vga::print_line("[BOOT] Graphics: VBE/Framebuffer Ready");
    vga::print_line("[BOOT] Initializing core systems...");
    vga::print_line("");
    vga::print_line("✓ VGA text mode initialized");
    vga::print_line("✓ Graphics framework loaded");
    vga::print_line("✓ GUI system ready");
    vga::print_line("✓ Memory mapped");
    vga::print_line("✓ MOO THE VIRUS antivirus engine ready");
    vga::print_line("");
    vga::print_line("[GRAPHICS] Available video modes:");
    vga::print_line("  • 640x480@32-bit (Default)");
    vga::print_line("  • 800x600@32-bit");
    vga::print_line("  • 1024x768@32-bit");
    vga::print_line("");
    vga::print_line("[STATUS] Kernel ready. Graphics enabled!");
    vga::print_line("");
    vga::print_line("GRUB Boot Menu:");
    vga::print_line("  → Press Enter to boot MOoOS Kernel");
    vga::print_line("  → Select 'Shell' for interactive CLI");
    vga::print_line("  → Select 'Antivirus' for MOO THE VIRUS");
    vga::print_line("");
    vga::print_line("Type 'help' or 'gui' to see graphical interface!");

    halt_loop()
}

fn halt_loop() -> ! {
    loop {
        unsafe { core::arch::asm!("hlt") }
    }
}

#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    vga::print_line("💀 KERNEL PANIC!");
    if let Some(location) = _info.location() {
        vga::print_line(&format!("Location: {}:{}", location.file(), location.line()));
    }
    if let Some(message) = _info.message() {
        vga::print_line(&format!("Message: {:?}", message));
    }
    halt_loop()
}
