// Simple port I/O wrapper for 32-bit x86

use core::arch::asm;
use core::marker::PhantomData;

pub struct Port<T> {
    port: u16,
    _phantom: PhantomData<T>,
}

impl<T> Port<T> {
    pub const fn new(port: u16) -> Self {
        Port {
            port,
            _phantom: PhantomData,
        }
    }
}

impl Port<u8> {
    pub unsafe fn read(&mut self) -> u8 {
        let result: u8;
        asm!("in al, dx", out("al") result, in("dx") self.port);
        result
    }

    pub unsafe fn write(&mut self, value: u8) {
        asm!("out dx, al", in("al") value, in("dx") self.port);
    }
}

impl Port<u16> {
    pub unsafe fn read(&mut self) -> u16 {
        let result: u16;
        asm!("in ax, dx", out("ax") result, in("dx") self.port);
        result
    }

    pub unsafe fn write(&mut self, value: u16) {
        asm!("out dx, ax", in("ax") value, in("dx") self.port);
    }
}

impl Port<u32> {
    pub unsafe fn read(&mut self) -> u32 {
        let result: u32;
        asm!("in eax, dx", out("eax") result, in("dx") self.port);
        result
    }

    pub unsafe fn write(&mut self, value: u32) {
        asm!("out dx, eax", in("eax") value, in("dx") self.port);
    }
}
