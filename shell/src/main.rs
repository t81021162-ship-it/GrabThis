use std::io::{self, Write};
use std::process::{Command, Stdio};
use std::path::Path;

mod builtins;
mod history;
mod command;

use builtins::Builtins;
use history::History;
use command::Command as ShellCommand;

const PROMPT: &str = "claude> ";

fn main() {
    println!("╔════════════════════════════════════════╗");
    println!("║     Claude OS Shell v0.1.0             ║");
    println!("║  Type 'help' for commands              ║");
    println!("╚════════════════════════════════════════╝\n");

    let mut history = History::new();
    let mut builtins = Builtins::new();

    loop {
        print!("{}", PROMPT);
        io::stdout().flush().unwrap();

        let mut input = String::new();
        match io::stdin().read_line(&mut input) {
            Ok(_) => {
                let trimmed = input.trim();
                if trimmed.is_empty() {
                    continue;
                }

                history.add(trimmed.to_string());

                // Show command being executed
                println!("[EXEC] {}", trimmed);

                if let Some(cmd) = ShellCommand::parse(trimmed) {
                    if builtins.is_builtin(&cmd.name) {
                        builtins.execute(&cmd);
                    } else {
                        execute_external(&cmd);
                    }
                } else {
                    eprintln!("✗ Failed to parse command");
                }
            }
            Err(e) => {
                eprintln!("✗ Input error: {}", e);
                break;
            }
        }
    }
}

fn execute_external(cmd: &ShellCommand) {
    println!("[INFO] Executing external: {}", cmd.name);

    let mut child = Command::new(&cmd.name)
        .args(&cmd.args)
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn();

    match child {
        Ok(mut child) => {
            match child.wait() {
                Ok(status) => {
                    if status.success() {
                        println!("[OK] Process exited successfully");
                    } else {
                        println!("[WARN] Process exited with code: {:?}", status.code());
                    }
                }
                Err(e) => eprintln!("[ERROR] Failed to wait for child: {}", e),
            }
        }
        Err(e) => eprintln!("[ERROR] Failed to execute '{}': {}", cmd.name, e),
    }
}
