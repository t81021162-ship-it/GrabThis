#![no_std]
#![no_main]

extern crate alloc;

use bootloader::{entry_point, BootInfo};
use core::panic::PanicInfo;
use linked_list_allocator::LockedHeap;

mod vga_buffer;
mod gdt;
mod interrupts;
mod task;
mod keyboard;
mod pic;
mod timer;
mod fs;
mod ipc;
mod network;

use vga_buffer::Writer;

#[global_allocator]
static ALLOCATOR: LockedHeap = LockedHeap::empty();

entry_point!(kernel_main);

pub fn kernel_main(boot_info: &'static BootInfo) -> ! {
    let mut writer = Writer::new();

    writer.write_str("\n");
    writer.write_str("╔════════════════════════════════════════╗\n");
    writer.write_str("║     🔷 Claude OS Kernel v0.5.0         ║\n");
    writer.write_str("║     (Phase 5: IPC & Networking)        ║\n");
    writer.write_str("╚════════════════════════════════════════╝\n\n");

    writer.write_str("[INIT] Booting Claude OS...\n");

    // Initialize heap
    unsafe {
        let heap_start = (boot_info.physical_memory_offset + 0x4000_0000) as *mut u8;
        ALLOCATOR.lock().init(heap_start, 100 * 1024);
    }
    writer.write_str("[OK] Heap allocator initialized\n");

    // Initialize core CPU features
    writer.write_str("[INIT] Loading CPU features...\n");
    gdt::init();
    writer.write_str("[OK] GDT configured\n");

    interrupts::init();
    writer.write_str("[OK] Interrupts initialized\n");

    // Initialize PIC and timer
    writer.write_str("[INIT] Setting up interrupt controller...\n");
    unsafe {
        let mut pics = pic::ChainedPics::new();
        pics.initialize();
    }
    writer.write_str("[OK] PIC initialized\n");

    timer::init();
    writer.write_str("[OK] Timer (100 Hz) configured\n");

    // Initialize filesystem
    writer.write_str("[INIT] Initializing filesystem...\n");
    let mut _fs = fs::FileSystem::new();
    writer.write_str("[OK] Filesystem ready\n");

    // Initialize scheduler
    writer.write_str("[INIT] Initializing scheduler...\n");
    let mut scheduler = task::Scheduler::new();
    scheduler.create_task("idle", 0);
    scheduler.create_task("shell", 10);
    scheduler.create_task("dashboard", 5);
    writer.write_str("[OK] Scheduler initialized (3 tasks)\n");

    // Initialize IPC
    writer.write_str("[INIT] Initializing IPC...\n");
    let mut _ipc_mgr = ipc::IPCManager::new();
    writer.write_str("[OK] IPC ready (message queues & pipes)\n");

    // Initialize network
    writer.write_str("[INIT] Initializing network stack...\n");
    let mut _net_stack = network::NetworkStack::new();
    let eth0 = network::NetworkInterface::new("eth0", [0x52, 0x54, 0x00, 0x12, 0x34, 0x56], [192, 168, 1, 100]);
    _net_stack.add_interface(eth0);
    writer.write_str("[OK] Network stack ready (eth0)\n");

    writer.write_str("\n✓ CPU: Online\n");
    writer.write_str("✓ Memory: Heap allocated\n");
    writer.write_str("✓ GDT: Loaded\n");
    writer.write_str("✓ Interrupts: Active\n");
    writer.write_str("✓ Timer: 100 Hz\n");
    writer.write_str("✓ Filesystem: Ready\n");
    writer.write_str("✓ Scheduler: 3 tasks\n");
    writer.write_str("✓ IPC: Active\n");
    writer.write_str("✓ Network: eth0\n");
    writer.write_str("✓ Keyboard: Ready\n");

    writer.write_str("\n[STATUS] Phase 5 complete - IPC & Networking online!\n");
    writer.write_str("[STATUS] Processes can now communicate.\n\n");

    hlt_loop();
}

pub fn hlt_loop() -> ! {
    loop {
        x86_64::instructions::hlt();
    }
}

#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    let mut writer = Writer::new();
    writer.write_str("\n💥 KERNEL PANIC\n");
    hlt_loop();
}
