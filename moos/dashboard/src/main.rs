fn main() {
    println!("╔════════════════════════════════════╗");
    println!("║   🐄 MOoOS Dashboard v0.1.0 🐄     ║");
    println!("║   Live System Monitor              ║");
    println!("╚════════════════════════════════════╝");
    println!();

    println!("📊 System Metrics:");
    println!("├─ CPU Usage:        15%");
    println!("├─ Memory Usage:     42%");
    println!("├─ Disk Usage:       28%");
    println!("└─ Uptime:           12h 34m");
    println!();

    println!("🐄 Antivirus Status:");
    println!("├─ Engine:          MOO THE VIRUS v0.1.0");
    println!("├─ Last Scan:       2 hours ago");
    println!("├─ Threats Found:   0");
    println!("└─ Status:          ✓ Active & Protected");
    println!();

    println!("🌾 Farm Status:");
    println!("├─ Cows:            🐄 🐄 🐄 🐄 🐄");
    println!("├─ Barns:           3");
    println!("├─ Fields:          5");
    println!("└─ Overall Health:  Excellent 🟢");
    println!();

    println!("Press Ctrl+C to exit dashboard");

    // Simple live update loop
    loop {
        std::thread::sleep(std::time::Duration::from_secs(5));
        println!("🐄 Dashboard running... (Farm is peaceful)");
    }
}
