// VGA Graphics Mode - Phase 6
// 640x480 16-color graphics mode

use core::ptr;

pub const VGA_WIDTH: usize = 640;
pub const VGA_HEIGHT: usize = 480;
pub const BYTES_PER_PIXEL: usize = 1;
pub const VGA_BUFFER: usize = 0xA0000;

#[derive(Debug, Clone, Copy)]
pub struct Color {
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

impl Color {
    pub const BLACK: Color = Color { r: 0, g: 0, b: 0 };
    pub const WHITE: Color = Color { r: 255, g: 255, b: 255 };
    pub const RED: Color = Color { r: 255, g: 0, b: 0 };
    pub const GREEN: Color = Color { r: 0, g: 255, b: 0 };
    pub const BLUE: Color = Color { r: 0, g: 0, b: 255 };
    pub const CYAN: Color = Color { r: 0, g: 255, b: 255 };
    pub const MAGENTA: Color = Color { r: 255, g: 0, b: 255 };
    pub const YELLOW: Color = Color { r: 255, g: 255, b: 0 };
}

pub struct GraphicsBuffer {
    buffer: &'static mut [u8],
}

impl GraphicsBuffer {
    pub unsafe fn new() -> Self {
        GraphicsBuffer {
            buffer: core::slice::from_raw_parts_mut(
                VGA_BUFFER as *mut u8,
                VGA_WIDTH * VGA_HEIGHT * BYTES_PER_PIXEL,
            ),
        }
    }

    pub fn clear(&mut self, color: Color) {
        let palette_index = self.color_to_palette(color);
        for pixel in self.buffer.iter_mut() {
            *pixel = palette_index;
        }
    }

    pub fn draw_pixel(&mut self, x: usize, y: usize, color: Color) {
        if x < VGA_WIDTH && y < VGA_HEIGHT {
            let offset = y * VGA_WIDTH + x;
            if offset < self.buffer.len() {
                self.buffer[offset] = self.color_to_palette(color);
            }
        }
    }

    pub fn draw_rectangle(&mut self, x: usize, y: usize, width: usize, height: usize, color: Color) {
        for dy in 0..height {
            for dx in 0..width {
                self.draw_pixel(x + dx, y + dy, color);
            }
        }
    }

    pub fn draw_line(&mut self, x0: usize, y0: usize, x1: usize, y1: usize, color: Color) {
        let dx = (x1 as isize - x0 as isize).abs();
        let dy = (y1 as isize - y0 as isize).abs();
        let sx = if x0 < x1 { 1 } else { -1 };
        let sy = if y0 < y1 { 1 } else { -1 };
        let mut err = (dx - dy) / 2;

        let mut x = x0 as isize;
        let mut y = y0 as isize;

        loop {
            self.draw_pixel(x as usize, y as usize, color);

            if x == x1 as isize && y == y1 as isize {
                break;
            }

            let e2 = err;
            if e2 > -dx {
                err -= dy;
                x += sx;
            }
            if e2 < dy {
                err += dx;
                y += sy;
            }
        }
    }

    fn color_to_palette(&self, color: Color) -> u8 {
        // Simple palette mapping
        if color.r > 128 && color.g > 128 && color.b > 128 {
            0x0F // White
        } else if color.r > 128 {
            0x04 // Red
        } else if color.g > 128 {
            0x02 // Green
        } else if color.b > 128 {
            0x01 // Blue
        } else {
            0x00 // Black
        }
    }
}
