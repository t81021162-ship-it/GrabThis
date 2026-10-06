use core::fmt;
use volatile::Volatile;

const VGA_BUFFER_ADDRESS: usize = 0xb8000;
const VGA_WIDTH: usize = 80;
const VGA_HEIGHT: usize = 25;

#[repr(u8)]
pub enum Color {
    Black = 0,
    Blue = 1,
    Green = 2,
    Cyan = 3,
    Red = 4,
    Magenta = 5,
    Brown = 6,
    LightGray = 7,
    DarkGray = 8,
    LightBlue = 9,
    LightGreen = 10,
    LightCyan = 11,
    LightRed = 12,
    LightMagenta = 13,
    Yellow = 14,
    White = 15,
}

#[repr(transparent)]
struct VgaChar(Volatile<u16>);

pub struct VgaBuffer {
    chars: [[VgaChar; VGA_WIDTH]; VGA_HEIGHT],
}

static mut VGA: *mut VgaBuffer = VGA_BUFFER_ADDRESS as *mut VgaBuffer;
static mut ROW: usize = 0;
static mut COL: usize = 0;

pub fn init() {
    unsafe {
        ROW = 0;
        COL = 0;
    }
}

pub fn clear_screen() {
    unsafe {
        for row in 0..VGA_HEIGHT {
            for col in 0..VGA_WIDTH {
                write_char(' ', Color::LightGray, Color::Black, row, col);
            }
        }
        ROW = 0;
        COL = 0;
    }
}

fn write_char(ch: char, fg: Color, bg: Color, row: usize, col: usize) {
    unsafe {
        let color = (bg as u8) << 4 | (fg as u8);
        let value = ((color as u16) << 8) | (ch as u16);
        (*VGA).chars[row][col].0.write(value);
    }
}

pub fn print_line(s: &str) {
    unsafe {
        for ch in s.chars() {
            if ROW >= VGA_HEIGHT {
                scroll_up();
            }
            if ch == '\n' {
                ROW += 1;
                COL = 0;
            } else {
                write_char(ch, Color::White, Color::Black, ROW, COL);
                COL += 1;
                if COL >= VGA_WIDTH {
                    ROW += 1;
                    COL = 0;
                }
            }
        }
        ROW += 1;
        COL = 0;
    }
}

fn scroll_up() {
    unsafe {
        for row in 0..VGA_HEIGHT - 1 {
            for col in 0..VGA_WIDTH {
                let value = (*VGA).chars[row + 1][col].0.read();
                (*VGA).chars[row][col].0.write(value);
            }
        }
        for col in 0..VGA_WIDTH {
            write_char(' ', Color::White, Color::Black, VGA_HEIGHT - 1, col);
        }
        ROW = VGA_HEIGHT - 1;
    }
}
