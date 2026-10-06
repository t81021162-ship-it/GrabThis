#![no_std]

pub mod vga;
pub mod cow;
pub mod graphics;
pub mod gui;
pub mod multiboot;

pub fn kernel_info() -> &'static str {
    "MOoOS Kernel v0.1.0 - Graphical Edition (32-bit)"
}

pub fn graphics_info() -> &'static str {
    "Graphics Framework v0.1 - VBE/Framebuffer Support"
}
