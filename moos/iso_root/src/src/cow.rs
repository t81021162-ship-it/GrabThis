use crate::vga;

pub fn print_banner() {
    vga::print_line("╔══════════════════════════════════════╗");
    vga::print_line("║                                      ║");
    vga::print_line("║     🐄 MOoOS Kernel Boot 🐄          ║");
    vga::print_line("║                                      ║");
    vga::print_line("║   Transparent • Minimal • Farm-Based ║");
    vga::print_line("║                                      ║");
    vga::print_line("╚══════════════════════════════════════╝");
}

pub fn moo() {
    vga::print_line("🐄 MOOOOOOO!");
}

pub fn print_cow_ascii() {
    vga::print_line("");
    vga::print_line("          ____");
    vga::print_line("         /    \\");
    vga::print_line("        | MOO! |");
    vga::print_line("         \\    /");
    vga::print_line("          ----");
    vga::print_line("            |");
    vga::print_line("       ^__^ /|");
    vga::print_line("       (oo)\\_|");
    vga::print_line("       (__)\\ |");
    vga::print_line("           |_|");
    vga::print_line("");
}
