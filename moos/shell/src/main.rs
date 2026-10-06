use std::io::{self, Write};

fn main() {
    println!("╔════════════════════════════════════╗");
    println!("║    🐄 MOoOS Shell v0.1.0 🐄        ║");
    println!("║    Type 'help' for commands        ║");
    println!("╚════════════════════════════════════╝");
    println!();

    let mut input = String::new();

    loop {
        print!("moos> ");
        io::stdout().flush().ok();

        input.clear();
        io::stdin().read_line(&mut input).ok();

        match input.trim() {
            "help" => print_help(),
            "moo" => println!("🐄 MOOOOOOO!"),
            "whoami" => println!("🐄 You are a farmer on MOoOS"),
            "status" => print_status(),
            "clear" => {
                print!("\x1B[2J\x1B[1;1H");
            }
            "exit" | "quit" => {
                println!("🐄 MOO! (Goodbye!)");
                break;
            }
            "" => {}
            cmd => {
                if cmd.starts_with("echo ") {
                    println!("{}", &cmd[5..]);
                } else {
                    println!("🐄 Unknown command: '{}'. Type 'help' for available commands.", cmd);
                }
            }
        }
    }
}

fn print_help() {
    println!();
    println!("Available commands:");
    println!("  help       - Show this help message");
    println!("  moo        - Hear the cow speak");
    println!("  whoami     - Who are you?");
    println!("  status     - Show system status");
    println!("  echo TEXT  - Print text");
    println!("  clear      - Clear screen");
    println!("  exit/quit  - Exit shell");
    println!();
}

fn print_status() {
    println!();
    println!("╔════════════════════════════════════╗");
    println!("║      MOoOS System Status 🐄        ║");
    println!("╠════════════════════════════════════╣");
    println!("║ Kernel: MOoOS v0.1.0 (32-bit)     ║");
    println!("║ Architecture: i386                 ║");
    println!("║ Antivirus: MOO THE VIRUS Ready    ║");
    println!("║ Status: All systems operational ✓ ║");
    println!("╚════════════════════════════════════╝");
    println!();
}
