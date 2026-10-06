#![no_std]
#![no_main]

mod vga;
mod cow;

use core::panic::PanicInfo;

#[no_mangle]
pub extern "C" fn _start() -> ! {
    vga::init();
    vga::clear_screen();

    cow::print_banner();

    vga::print_line("");
    vga::print_line("🐄 MOoOS Kernel v0.1.0");
    vga::print_line("");
    vga::print_line("[BOOT] Bootloader: BIOS/UEFI");
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
        unsafe { asm!("hlt") }
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
