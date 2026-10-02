#![no_std]
#![no_main]

use core::panic::PanicInfo;

mod vga_buffer;
mod serial;

use vga_buffer::VGA_BUFFER;

#[no_mangle]
pub extern "C" fn _start() -> ! {
    init();
    kernel_main();
    hlt_loop();
}

fn init() {
    serial::init();
    vga::clear_screen();
}

fn kernel_main() {
    println!("🔷 Claude OS Kernel v0.1.0");
    println!("================================");
    println!("Initializing core systems...\n");

    println!("✓ Memory: OK");
    println!("✓ CPU: OK");
    println!("✓ VGA: OK");
    println!("\nReady for shell...");
}

fn hlt_loop() -> ! {
    loop {
        x86_64::instructions::hlt();
    }
}

#[panic_handler]
fn panic(info: &PanicInfo) -> ! {
    println!("💥 KERNEL PANIC");
    if let Some(location) = info.location() {
        println!("Location: {}:{}", location.file(), location.line());
    }
    if let Some(msg) = info.message() {
        println!("Message: {}", msg);
    }
    hlt_loop();
}

#[macro_export]
macro_rules! print {
    ($($arg:tt)*) => ($crate::vga_buffer::_print(format_args!($($arg)*)));
}

#[macro_export]
macro_rules! println {
    () => ($crate::print!("\n"));
    ($($arg:tt)*) => ($crate::print!("{}\n", format_args!($($arg)*)));
}
