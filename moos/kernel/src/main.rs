#![no_std]
#![no_main]

mod vga;
mod cow;
mod multiboot;

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
    vga::init();
    vga::clear_screen();

    cow::print_banner();

    vga::print_line("");
    vga::print_line("🐄 MOoOS Kernel v0.1.0");
    vga::print_line("");
    vga::print_line("[BOOT] Bootloader: Multiboot (GRUB)");
    vga::print_line("[BOOT] Architecture: i386 (32-bit)");
    vga::print_line("[BOOT] Initializing core systems...");
    vga::print_line("");
    vga::print_line("✓ VGA initialized");
    vga::print_line("✓ Memory mapped");
    vga::print_line("✓ MOO THE VIRUS antivirus ready");
    vga::print_line("");
    vga::print_line("[STATUS] Kernel ready. Waiting for shell...");
    vga::print_line("");
    vga::print_line("Type 'help' for commands or 'moo' to hear the cow speak!");

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
