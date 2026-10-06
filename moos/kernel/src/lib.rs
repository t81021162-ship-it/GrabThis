#![no_std]

pub mod vga;
pub mod cow;

pub fn kernel_info() -> &'static str {
    "MOoOS Kernel v0.1.0 - 32-bit"
}
