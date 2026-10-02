use crate::port::Port;

pub const PIC1_OFFSET: u8 = 32;
pub const PIC2_OFFSET: u8 = 40;

pub struct Pic {
    offset: u8,
    command: Port<u8>,
    data: Port<u8>,
}

impl Pic {
    pub const unsafe fn new(offset: u8, command: u16, data: u16) -> Pic {
        Pic {
            offset,
            command: Port::new(command),
            data: Port::new(data),
        }
    }
}

pub struct ChainedPics {
    pics: [Pic; 2],
}

impl ChainedPics {
    pub const unsafe fn new() -> ChainedPics {
        ChainedPics {
            pics: [
                Pic::new(PIC1_OFFSET, 0x20, 0x21),
                Pic::new(PIC2_OFFSET, 0xa0, 0xa1),
            ],
        }
    }

    pub unsafe fn initialize(&mut self) {
        let mut wait_port: Port<u8> = Port::new(0x80);
        let mut wait = || wait_port.write(0);

        // Save masks
        let mask1 = self.pics[0].data.read();
        let mask2 = self.pics[1].data.read();

        // ICW1
        self.pics[0].command.write(0x11);
        wait();
        self.pics[1].command.write(0x11);
        wait();

        // ICW2
        self.pics[0].data.write(self.pics[0].offset);
        wait();
        self.pics[1].data.write(self.pics[1].offset);
        wait();

        // ICW3
        self.pics[0].data.write(4);
        wait();
        self.pics[1].data.write(2);
        wait();

        // ICW4
        self.pics[0].data.write(0x01);
        wait();
        self.pics[1].data.write(0x01);
        wait();

        // Restore masks
        self.pics[0].data.write(mask1);
        self.pics[1].data.write(mask2);
    }

    pub unsafe fn notify_end_of_interrupt(&mut self, interrupt_id: u8) {
        if interrupt_id >= self.pics[1].offset {
            self.pics[1].command.write(0x20);
        }
        self.pics[0].command.write(0x20);
    }
}
