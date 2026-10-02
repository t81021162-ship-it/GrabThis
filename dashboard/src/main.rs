use sysinfo::System;

fn main() {
    let mut sys = System::new_all();
    sys.refresh_all();

    println!("╔═══════════════════════════════════════════════╗");
    println!("║       Claude OS System Dashboard v0.1.0       ║");
    println!("╚═══════════════════════════════════════════════╝\n");

    println!("Memory Usage:");
    println!("  Total: {} MB", sys.total_memory() / 1024);
    println!("  Used:  {} MB", sys.used_memory() / 1024);
    println!("  Free:  {} MB\n", (sys.total_memory() - sys.used_memory()) / 1024);

    println!("CPU Info:");
    println!("  Cores: {}", sys.cpus().len());
    for (idx, cpu) in sys.cpus().iter().enumerate() {
        println!("  CPU {}: {} MHz", idx, cpu.frequency());
    }

    println!("\nProcesses:");
    let mut process_count = 0;
    for (pid, proc) in sys.processes() {
        if process_count < 5 {
            println!("  [{}] {} - {} MB", pid, proc.name(), proc.memory() / 1024);
            process_count += 1;
        }
    }
    println!("  ... and {} more", sys.processes().len().saturating_sub(5));
}
