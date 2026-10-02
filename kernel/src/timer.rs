use crate::port::Port;

static mut TICK_COUNT: u64 = 0;

pub fn init() {
    // Set PIT (Programmable Interval Timer) to 100 Hz
    // Frequency = 1193182 Hz / divisor
    // For 100 Hz: divisor = 11931

    let divisor: u16 = 11931;

    unsafe {
        let mut cmd_port: Port<u8> = Port::new(0x43);
        let mut data_port: Port<u8> = Port::new(0x40);

        // Mode 3 (square wave), binary
        cmd_port.write(0x36);

        // Set divisor
        data_port.write((divisor & 0xFF) as u8);
        data_port.write((divisor >> 8) as u8);
    }
}

pub fn tick() {
    unsafe {
        TICK_COUNT += 1;
    }
}

pub fn get_ticks() -> u64 {
    unsafe { TICK_COUNT }
}

pub fn get_seconds() -> u64 {
    unsafe { TICK_COUNT / 100 }
}
