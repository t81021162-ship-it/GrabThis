use moo_antivirus::{MooTheVirus, ThreatLevel};
use std::io::{self, Read};

fn main() {
    println!("╔════════════════════════════════════╗");
    println!("║   🐄 MOO THE VIRUS - Antivirus 🐄  ║");
    println!("║   Real-time Code Threat Scanner    ║");
    println!("╚════════════════════════════════════╝");
    println!();

    let scanner = MooTheVirus::new();

    loop {
        println!("\n[MOO] Scanner ready");
        println!("  1. Scan code input");
        println!("  2. Check filename");
        println!("  3. Exit");
        print!("\nChoice: ");
        io::Write::flush(&mut io::stdout()).ok();

        let mut choice = String::new();
        io::stdin().read_line(&mut choice).ok();

        match choice.trim() {
            "1" => scan_code_input(&scanner),
            "2" => check_filename(&scanner),
            "3" => {
                println!("\n🐄 MOO! (Goodbye!)");
                break;
            }
            _ => println!("Invalid choice"),
        }
    }
}

fn scan_code_input(scanner: &MooTheVirus) {
    print!("Enter filename: ");
    io::Write::flush(&mut io::stdout()).ok();
    let mut filename = String::new();
    io::stdin().read_line(&mut filename).ok();

    print!("Enter code to scan (end with Ctrl+D):\n");
    let mut code = String::new();
    io::stdin().read_to_string(&mut code).ok();

    let result = scanner.scan_code(filename.trim(), &code);
    print_scan_result(&result);
}

fn check_filename(scanner: &MooTheVirus) {
    print!("Enter filename to check: ");
    io::Write::flush(&mut io::stdout()).ok();
    let mut filename = String::new();
    io::stdin().read_line(&mut filename).ok();

    let result = scanner.scan_file(filename.trim());
    print_scan_result(&result);
}

fn print_scan_result(result: &moo_antivirus::ScanResult) {
    println!("\n╔════════════════════════════════════╗");
    println!("║      🐄 SCAN COMPLETE 🐄          ║");
    println!("╚════════════════════════════════════╝");
    println!("\nFile: {}", result.filename);
    println!(
        "Threat Level: {} {} (Score: {}/100)",
        result.threat_level.emoji(),
        result.threat_level.name(),
        result.score
    );

    if !result.findings.is_empty() {
        println!("\nFindings:");
        for finding in &result.findings {
            println!("  • {}", finding);
        }
    } else {
        println!("\n✓ No threats detected!");
    }

    println!();
}
