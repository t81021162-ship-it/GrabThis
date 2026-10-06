// Multiboot header structure for GRUB bootloader
// Reference: Multiboot Specification v0.6.96

#[repr(C)]
pub struct MultibootHeader {
    pub magic: u32,           // Must be 0x1BADB002
    pub flags: u32,           // Feature flags
    pub checksum: u32,        // Checksum: -(magic + flags)
    pub header_addr: u32,     // Header address (for a.out)
    pub load_addr: u32,       // Load address (for a.out)
    pub load_end_addr: u32,   // Load end address (for a.out)
    pub bss_end_addr: u32,    // BSS end address (for a.out)
    pub entry_addr: u32,      // Entry point (for a.out)
}

impl MultibootHeader {
    pub const MAGIC: u32 = 0x1BADB002;
    pub const ALIGN: u32 = 4;
    pub const HEADER_TAG_END: u32 = 0;
}
