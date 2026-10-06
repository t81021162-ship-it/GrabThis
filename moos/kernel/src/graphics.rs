// MOoOS Graphics Module - VBE/Framebuffer Support
// Simple graphics driver for 32-bit color mode

pub struct Framebuffer {
    pub width: u32,
    pub height: u32,
    pub pitch: u32,
    pub bpp: u32,
    pub address: *mut u32,
}

#[repr(C, packed)]
pub struct Color {
    pub r: u8,
    pub g: u8,
    pub b: u8,
    pub a: u8,
}

impl Color {
    pub fn new(r: u8, g: u8, b: u8) -> Self {
        Color { r, g, b, a: 255 }
    }

    pub fn to_u32(&self) -> u32 {
        ((self.r as u32) << 16) | ((self.g as u32) << 8) | (self.b as u32)
    }
}

pub struct Rect {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

pub struct Point {
    pub x: i32,
    pub y: i32,
}

// Farm theme colors
pub mod theme {
    use super::Color;

    pub const GRASS_GREEN: Color = Color { r: 34, g: 139, b: 34, a: 255 };
    pub const SKY_BLUE: Color = Color { r: 135, g: 206, b: 235, a: 255 };
    pub const BARN_RED: Color = Color { r: 178, g: 34, b: 34, a: 255 };
    pub const CREAM: Color = Color { r: 240, g: 240, b: 240, a: 255 };
    pub const DARK_GRAY: Color = Color { r: 64, g: 64, b: 64, a: 255 };
    pub const WHITE: Color = Color { r: 255, g: 255, b: 255, a: 255 };
    pub const COW_BROWN: Color = Color { r: 139, g: 90, b: 43, a: 255 };
}

pub struct Graphics {
    framebuffer: Framebuffer,
}

impl Graphics {
    pub fn new(fb: Framebuffer) -> Self {
        Graphics {
            framebuffer: fb,
        }
    }

    pub fn clear(&self, color: Color) {
        unsafe {
            let pixel_color = color.to_u32();
            let total_pixels = self.framebuffer.width * self.framebuffer.height;
            for i in 0..total_pixels {
                *self.framebuffer.address.add(i as usize) = pixel_color;
            }
        }
    }

    pub fn draw_pixel(&self, x: u32, y: u32, color: Color) {
        if x < self.framebuffer.width && y < self.framebuffer.height {
            unsafe {
                let offset = (y * self.framebuffer.width) + x;
                *self.framebuffer.address.add(offset as usize) = color.to_u32();
            }
        }
    }

    pub fn draw_rect(&self, rect: &Rect, color: Color) {
        for y in rect.y..(rect.y + rect.height) {
            for x in rect.x..(rect.x + rect.width) {
                self.draw_pixel(x, y, color);
            }
        }
    }

    pub fn draw_rect_outline(&self, rect: &Rect, color: Color, thickness: u32) {
        // Top
        self.draw_rect(
            &Rect {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: thickness,
            },
            color,
        );
        // Bottom
        self.draw_rect(
            &Rect {
                x: rect.x,
                y: rect.y + rect.height - thickness,
                width: rect.width,
                height: thickness,
            },
            color,
        );
        // Left
        self.draw_rect(
            &Rect {
                x: rect.x,
                y: rect.y,
                width: thickness,
                height: rect.height,
            },
            color,
        );
        // Right
        self.draw_rect(
            &Rect {
                x: rect.x + rect.width - thickness,
                y: rect.y,
                width: thickness,
                height: rect.height,
            },
            color,
        );
    }

    pub fn draw_line(&self, x1: u32, y1: u32, x2: u32, y2: u32, color: Color) {
        // Simple line drawing (Bresenham-like)
        let dx = (x2 as i32 - x1 as i32).abs();
        let dy = (y2 as i32 - y1 as i32).abs();
        let sx = if x1 < x2 { 1 } else { -1 };
        let sy = if y1 < y2 { 1 } else { -1 };
        let mut err = dx - dy;

        let mut x = x1 as i32;
        let mut y = y1 as i32;

        loop {
            self.draw_pixel(x as u32, y as u32, color);

            if x == x2 as i32 && y == y2 as i32 {
                break;
            }

            let e2 = 2 * err;
            if e2 > -dy {
                err -= dy;
                x += sx;
            }
            if e2 < dx {
                err += dx;
                y += sy;
            }
        }
    }

    pub fn draw_circle(&self, cx: u32, cy: u32, radius: u32, color: Color) {
        let mut x = radius as i32;
        let mut y = 0i32;
        let mut d = 3 - 2 * radius as i32;

        while x >= y {
            self.draw_pixel((cx as i32 + x) as u32, (cy as i32 + y) as u32, color);
            self.draw_pixel((cx as i32 - x) as u32, (cy as i32 + y) as u32, color);
            self.draw_pixel((cx as i32 + x) as u32, (cy as i32 - y) as u32, color);
            self.draw_pixel((cx as i32 - x) as u32, (cy as i32 - y) as u32, color);
            self.draw_pixel((cx as i32 + y) as u32, (cy as i32 + x) as u32, color);
            self.draw_pixel((cx as i32 - y) as u32, (cy as i32 + x) as u32, color);
            self.draw_pixel((cx as i32 + y) as u32, (cy as i32 - x) as u32, color);
            self.draw_pixel((cx as i32 - y) as u32, (cy as i32 - x) as u32, color);

            if d < 0 {
                d = d + 4 * y + 6;
            } else {
                d = d + 4 * (y - x) + 10;
                x -= 1;
            }
            y += 1;
        }
    }
}
