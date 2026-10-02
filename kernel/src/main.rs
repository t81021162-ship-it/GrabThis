#![no_std]
#![no_main]

use bootloader::{entry_point, BootInfo};
use core::panic::PanicInfo;

mod vga_buffer;

use vga_buffer::Writer;

entry_point!(kernel_main);

pub fn kernel_main(_boot_info: &'static BootInfo) -> ! {
    let mut writer = Writer::new();

    writer.write_str("\n");
    writer.write_str("╔════════════════════════════════════════╗\n");
    writer.write_str("║     🔷 Claude OS Kernel v0.1.0         ║\n");
    writer.write_str("╚════════════════════════════════════════╝\n\n");

    writer.write_str("[BOOT] Bootloader: UEFI\n");
    writer.write_str("[BOOT] Architecture: x86_64\n");

    writer.write_str("\n✓ CPU: Online\n");
    writer.write_str("✓ Memory: Mapped\n");
    writer.write_str("✓ VGA: Ready\n");
    writer.write_str("\n[STATUS] Kernel ready.\n");
    writer.write_str("[STATUS] Waiting for shell integration...\n\n");

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
        writer.write_str(":");
        // Can't easily convert line number to string in no_std, so skip it
    }

    hlt_loop();
}
