// Serial console output for debugging
// Writes to COM1 (port 0x3F8)

const SERIAL_PORT: u16 = 0x3F8;

pub fn serial_init() {
    unsafe {
        // Initialize COM1
        core::arch::asm!("mov dx, {}", const SERIAL_PORT + 1);
        core::arch::asm!("xor al, al");
        core::arch::asm!("out dx, al");
    }
}

pub fn serial_write_char(c: u8) {
    unsafe {
        // Wait for transmit buffer to be empty
        loop {
            let mut status: u8;
            core::arch::asm!("mov dx, {}", const SERIAL_PORT + 5);
            core::arch::asm!("in al, dx", out("al") status);
            if (status & 0x20) != 0 {
                break;
            }
        }

        // Send byte
        core::arch::asm!("mov dx, {}", const SERIAL_PORT);
        core::arch::asm!("mov al, {}", in("al") c);
        core::arch::asm!("out dx, al");
    }
}

pub fn serial_write_string(s: &str) {
    for byte in s.bytes() {
        if byte == b'\n' {
            serial_write_char(b'\r');
        }
        serial_write_char(byte);
    }
}
