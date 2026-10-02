use std::fs;
use std::io::{self, Write};
use std::path::Path;

struct Notepad {
    filename: String,
    content: String,
    modified: bool,
}

impl Notepad {
    fn new(filename: String) -> Self {
        let content = fs::read_to_string(&filename).unwrap_or_default();
        Notepad {
            filename,
            content,
            modified: false,
        }
    }

    fn display(&self) {
        println!("\n╔════════════════════════════════════════╗");
        println!("║  📝 {} ", self.filename);
        if self.modified {
            println!("║     (modified)");
        }
        println!("╚════════════════════════════════════════╝\n");

        if self.content.is_empty() {
            println!("[empty file]\n");
        } else {
            for (idx, line) in self.content.lines().enumerate() {
                println!("{:3} | {}", idx + 1, line);
            }
            println!();
        }
    }

    fn add_line(&mut self, text: String) {
        if !self.content.is_empty() {
            self.content.push('\n');
        }
        self.content.push_str(&text);
        self.modified = true;
    }

    fn save(&mut self) -> Result<(), std::io::Error> {
        fs::write(&self.filename, &self.content)?;
        self.modified = false;
        println!("[OK] Saved to {}", self.filename);
        Ok(())
    }

    fn clear(&mut self) {
        self.content.clear();
        self.modified = true;
        println!("[OK] Content cleared");
    }

    fn show_help(&self) {
        println!("\n╭─ Notepad Commands ────────────────────╮");
        println!("│                                       │");
        println!("│  add [text]      Add a line           │");
        println!("│  view            Show all content     │");
        println!("│  clear           Clear all content    │");
        println!("│  save            Save to file         │");
        println!("│  status          Show file info       │");
        println!("│  help            Show this menu       │");
        println!("│  quit / exit     Close notepad        │");
        println!("│                                       │");
        println!("╰───────────────────────────────────────╯\n");
    }

    fn show_status(&self) {
        println!("\n╭─ File Status ──────────────────────────╮");
        println!("│ File: {}", self.filename);
        println!("│ Lines: {}", self.content.lines().count());
        println!("│ Bytes: {}", self.content.len());
        if self.modified {
            println!("│ Status: Modified (unsaved)");
        } else {
            println!("│ Status: Saved");
        }
        println!("╰────────────────────────────────────────╯\n");
    }
}

fn main() {
    println!("\n╔════════════════════════════════════════╗");
    println!("║  📝 Claude OS Notepad v1.0             ║");
    println!("║     Simple. Beautiful. Minimal.        ║");
    println!("╚════════════════════════════════════════╝\n");

    // Get filename from args or use default
    let filename = std::env::args()
        .nth(1)
        .unwrap_or_else(|| "notes.txt".to_string());

    let mut notepad = Notepad::new(filename.clone());

    if Path::new(&filename).exists() {
        println!("[OK] Opened existing file: {}\n", filename);
    } else {
        println!("[NEW] Creating new file: {}\n", filename);
    }

    notepad.show_help();

    loop {
        print!("notepad> ");
        io::stdout().flush().unwrap();

        let mut input = String::new();
        io::stdin().read_line(&mut input).unwrap();
        let trimmed = input.trim();

        if trimmed.is_empty() {
            continue;
        }

        match trimmed {
            "quit" | "exit" => {
                if notepad.modified {
                    println!("\n⚠️  You have unsaved changes!");
                    print!("Save before exiting? (y/n): ");
                    io::stdout().flush().unwrap();

                    let mut response = String::new();
                    io::stdin().read_line(&mut response).unwrap();
                    if response.trim().eq_ignore_ascii_case("y") {
                        let _ = notepad.save();
                    }
                }
                println!("\n[OK] Goodbye! 👋\n");
                break;
            }
            "view" => {
                notepad.display();
            }
            "clear" => {
                notepad.clear();
            }
            "save" => {
                if let Err(e) = notepad.save() {
                    eprintln!("[ERROR] Failed to save: {}", e);
                }
            }
            "status" => {
                notepad.show_status();
            }
            "help" => {
                notepad.show_help();
            }
            cmd if cmd.starts_with("add ") => {
                let text = &cmd[4..];
                notepad.add_line(text.to_string());
                println!("[OK] Line added");
            }
            cmd if cmd.starts_with("add") && cmd.len() == 3 => {
                // "add" without text - read from stdin
                print!("Enter text: ");
                io::stdout().flush().unwrap();
                let mut text = String::new();
                io::stdin().read_line(&mut text).unwrap();
                notepad.add_line(text.trim().to_string());
                println!("[OK] Line added");
            }
            _ => {
                println!("[ERROR] Unknown command. Type 'help' for options.");
            }
        }
        println!();
    }
}
