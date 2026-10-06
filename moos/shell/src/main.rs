use std::io::{self, Write};

fn main() {
    println!("╔════════════════════════════════════╗");
    println!("║  🐄 MOoOS GUI Shell v0.1.0 🐄      ║");
    println!("║  Interactive Farm Interface        ║");
    println!("╚════════════════════════════════════╝");
    println!();
    println!("Welcome to MOoOS! A graphical operating system");
    println!("for farmers who value transparency. 🌾");
    println!();

    // ASCII art desktop
    print_desktop();

    println!();
    println!("╔════════════════════════════════════╗");
    println!("║  🎨 GRAPHICAL SHELL (Text Mode)   ║");
    println!("║  Type 'help' for commands         ║");
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
            "gui" => show_gui(),
            "moo" => {
                println!("🐄 MOOOOOOO!");
                println!("┌─────────────────┐");
                println!("│   ^__^   MOO!    │");
                println!("│   (oo)\\_         │");
                println!("│   (__) )\\        │");
                println!("│       ||---->    │");
                println!("└─────────────────┘");
            }
            "whoami" => println!("🐄 You are a farmer on MOoOS"),
            "status" => print_status(),
            "weather" => print_weather(),
            "farm" => print_farm_status(),
            "graphics" => println!("🎨 Graphics Mode: Enabled (via QEMU VBE/VGA)"),
            "clear" => {
                print!("\x1B[2J\x1B[1;1H");
            }
            "exit" | "quit" => {
                println!("\n🐄 MOO! (Goodbye!)");
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

fn print_desktop() {
    println!("╔══════════════════════════════════════════════════╗");
    println!("║                  🐄 MOoOS Desktop 🐄             ║");
    println!("╠══════════════════════════════════════════════════╣");
    println!("║                                                  ║");
    println!("║  ┌─────────────────┐  ┌────────────────────┐  ║");
    println!("║  │  📁 My Farm     │  │  🎨 Graphics      │  ║");
    println!("║  │                 │  │  ┌────────────────┐│  ║");
    println!("║  │  • Barn         │  │  │ ▯ MOoOS Shell  ││  ║");
    println!("║  │  • Fields       │  │  │ ▯ Antivirus    ││  ║");
    println!("║  │  • Pasture      │  │  │ ▯ Dashboard    ││  ║");
    println!("║  └─────────────────┘  │  └────────────────┘│  ║");
    println!("║                       └────────────────────┘  ║");
    println!("║                                                  ║");
    println!("║  🌾 Wallpaper: Farm Scene                       ║");
    println!("║  🎨 Theme: Farm-Themed Green & Red              ║");
    println!("║  💻 Resolution: 640x480 (QEMU Graphics Mode)   ║");
    println!("║                                                  ║");
    println!("╠══════════════════════════════════════════════════╣");
    println!("║ [Shell] [Antivirus] [Dashboard] [Files] [Help]  ║");
    println!("╚══════════════════════════════════════════════════╝");
}

fn show_gui() {
    println!();
    println!("╔════════════════════════════════════════════════╗");
    println!("║           🎨 MOoOS Graphical Desktop            ║");
    println!("╠════════════════════════════════════════════════╣");
    println!("║                                                ║");
    println!("║  ┌──────────────────────────────────────────┐ ║");
    println!("║  │ 🐄 MOoOS Shell                      [_]  │ ║");
    println!("║  ├──────────────────────────────────────────┤ ║");
    println!("║  │                                          │ ║");
    println!("║  │ moos>                                    │ ║");
    println!("║  │ _                                        │ ║");
    println!("║  │                                          │ ║");
    println!("║  │ [Run] [Help] [Moo]             [Exit]    │ ║");
    println!("║  └──────────────────────────────────────────┘ ║");
    println!("║                                                ║");
    println!("║  ┌──────────┐  ┌──────────┐  ┌──────────┐    ║");
    println!("║  │ Antivirus│  │Dashboard │  │  Files   │    ║");
    println!("║  │  Scanner │  │ Monitor  │  │ Manager  │    ║");
    println!("║  └──────────┘  └──────────┘  └──────────┘    ║");
    println!("║                                                ║");
    println!("║  🌾 Background: Farm scene with barn & cow    ║");
    println!("║  🎨 Color Scheme: Farm themed (green/red)    ║");
    println!("║  💻 Graphics: VBE 640x480@32-bit              ║");
    println!("║                                                ║");
    println!("╚════════════════════════════════════════════════╝");
    println!();
}

fn print_help() {
    println!();
    println!("🐄 MOoOS Shell Commands:");
    println!("┌────────────────────────────────────────┐");
    println!("│ help       - Show this help message    │");
    println!("│ gui        - Show GUI mockup            │");
    println!("│ moo        - Hear the cow speak        │");
    println!("│ whoami     - Show your identity        │");
    println!("│ status     - Show system status        │");
    println!("│ weather    - Farm weather forecast     │");
    println!("│ farm       - Show farm status          │");
    println!("│ graphics   - Check graphics mode       │");
    println!("│ echo TEXT  - Print text                │");
    println!("│ clear      - Clear screen              │");
    println!("│ exit/quit  - Exit the shell            │");
    println!("└────────────────────────────────────────┘");
    println!();
}

fn print_status() {
    println!();
    println!("╔════════════════════════════════════════╗");
    println!("║      🐄 MOoOS System Status 🐄        ║");
    println!("╠════════════════════════════════════════╣");
    println!("║ Kernel: MOoOS v0.1.0 (32-bit)        ║");
    println!("║ Graphics: Enabled (VBE/VGA)          ║");
    println!("║ Resolution: 640x480 @ 32-bit color   ║");
    println!("║ Antivirus: MOO THE VIRUS Ready       ║");
    println!("║ Shell: Graphical Terminal            ║");
    println!("║ Status: ✓ All systems operational     ║");
    println!("╚════════════════════════════════════════╝");
    println!();
}

fn print_weather() {
    println!();
    println!("🌾 Farm Weather Forecast 🌾");
    println!("┌─────────────────────────────────────┐");
    println!("│ Today:      ☀️  Sunny, 72°F         │");
    println!("│ Tomorrow:   🌤️  Partly Cloudy, 68°F│");
    println!("│ Next Week:  🌧️  Rain expected      │");
    println!("│                                     │");
    println!("│ Best time to farm: Morning          │");
    println!("│ Watering needed: Yes                │");
    println!("│ Cows: Happy and healthy 🐄          │");
    println!("└─────────────────────────────────────┘");
    println!();
}

fn print_farm_status() {
    println!();
    println!("🌾 Farm Status Report 🌾");
    println!("╔════════════════════════════════════════╗");
    println!("║ Barn Status:   ✓ All systems GO       ║");
    println!("║ Cows:          🐄 🐄 🐄 🐄 🐄          ║");
    println!("║ Milk Production: 150 gallons/day      ║");
    println!("║ Pasture:       ✓ Lush & green         ║");
    println!("║ Fields:        ✓ Crops growing        ║");
    println!("║ Water Supply:  ✓ Full tanks           ║");
    println!("║ Equipment:     ✓ All operational      ║");
    println!("║                                       ║");
    println!("║ Overall Health: EXCELLENT ✓           ║");
    println!("╚════════════════════════════════════════╝");
    println!();
}
