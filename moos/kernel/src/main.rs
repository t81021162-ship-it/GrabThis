#![no_std]
#![no_main]

mod vga;
mod serial;

use core::panic::PanicInfo;

#[no_mangle]
pub extern "C" fn kmain() -> ! {
    // First thing: serial output
    serial::serial_init();
    serial::serial_write_string("KERNEL STARTING\n");

    serial::serial_write_string("Initializing VGA...\n");
    vga::init();
    serial::serial_write_string("VGA OK\n");

    serial::serial_write_string("Clearing screen...\n");
    vga::clear_screen();
    serial::serial_write_string("Clear OK\n");

    vga::print_line("MOoOS Kernel Running!");
    serial::serial_write_string("Print OK\n");

    vga::print_line("Press Ctrl+Alt+Del to reboot");
    serial::serial_write_string("Ready\n");

    halt_loop()
}

fn halt_loop() -> ! {
    loop {
        unsafe { core::arch::asm!("hlt") }
    }
}

#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    serial::serial_write_string("PANIC\n");
    halt_loop()
}
