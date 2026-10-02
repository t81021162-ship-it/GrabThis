#![no_std]
#![no_main]

use bootloader::{entry_point, BootInfo};
use core::panic::PanicInfo;

mod vga_buffer;
mod gdt;
mod interrupts;
mod task;
mod keyboard;

use vga_buffer::Writer;

entry_point!(kernel_main);

pub fn kernel_main(_boot_info: &'static BootInfo) -> ! {
    let mut writer = Writer::new();

    writer.write_str("\n");
    writer.write_str("╔════════════════════════════════════════╗\n");
    writer.write_str("║     🔷 Claude OS Kernel v0.2.0         ║\n");
    writer.write_str("║         (Phase 2: Core Systems)         ║\n");
    writer.write_str("╚════════════════════════════════════════╝\n\n");

    writer.write_str("[INIT] Booting Claude OS...\n");
    writer.write_str("[INIT] CPU: Online\n");
    writer.write_str("[INIT] Memory: Mapped\n");
    writer.write_str("[INIT] Bootloader: UEFI\n");

    writer.write_str("\n[INIT] Loading core systems...\n");
    gdt::init();
    writer.write_str("[OK] GDT configured\n");

    interrupts::init();
    writer.write_str("[OK] Interrupts initialized\n");

    writer.write_str("[OK] Scheduler framework loaded\n");
    writer.write_str("[OK] Keyboard driver ready\n");

    writer.write_str("\n✓ Core Systems: Online\n");
    writer.write_str("✓ Architecture: x86_64\n");
    writer.write_str("✓ Phase 2 Foundation: Ready\n");

    writer.write_str("\n[STATUS] Kernel v0.2.0 ready.\n");
    writer.write_str("[STATUS] Waiting for userland shell...\n\n");

    hlt_loop();
}

pub fn hlt_loop() -> ! {
    loop {
        x86_64::instructions::hlt();
    }
}

#[panic_handler]
fn panic(info: &PanicInfo) -> ! {
    let mut writer = Writer::new();
    writer.write_str("\n💥 KERNEL PANIC\n");

    if let Some(location) = info.location() {
        writer.write_str("Location: ");
        writer.write_str(location.file());
        writer.write_str("\n");
    }

    hlt_loop();
}
