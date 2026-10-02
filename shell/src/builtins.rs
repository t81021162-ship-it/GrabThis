use crate::command::Command;
use std::env;
use std::path::Path;

pub struct Builtins;

impl Builtins {
    pub fn new() -> Self {
        Builtins
    }

    pub fn is_builtin(&self, name: &str) -> bool {
        matches!(
            name,
            "help" | "cd" | "pwd" | "echo" | "clear" | "exit" | "status"
        )
    }

    pub fn execute(&self, cmd: &Command) {
        match cmd.name.as_str() {
            "help" => self.help(),
            "pwd" => self.pwd(),
            "echo" => self.echo(&cmd.args),
            "cd" => self.cd(&cmd.args),
            "clear" => self.clear(),
            "exit" => std::process::exit(0),
            "status" => self.status(),
            _ => println!("[WARN] Unknown builtin: {}", cmd.name),
        }
    }

    fn help(&self) {
        println!(
            r#"
╭─ Claude OS Shell Commands ─────────────────────────────────────╮
│                                                                 │
│  help              Show this message                           │
│  pwd               Print working directory                     │
│  cd <path>         Change directory                            │
│  echo <args>       Print arguments                             │
│  clear             Clear screen                                │
│  status            Show system status                          │
│  exit              Exit shell                                  │
│                                                                 │
│  All other commands execute as external processes              │
│  [EXEC] shows what's running                                   │
│                                                                 │
╰─────────────────────────────────────────────────────────────────╯
"#
        );
    }

    fn pwd(&self) {
        match env::current_dir() {
            Ok(path) => println!("[PATH] {}", path.display()),
            Err(e) => eprintln!("[ERROR] {}", e),
        }
    }

    fn cd(&self, args: &[String]) {
        if args.is_empty() {
            eprintln!("[ERROR] cd requires a path argument");
            return;
        }

        let path = &args[0];
        println!("[CD] Changing to: {}", path);

        match env::set_current_dir(path) {
            Ok(_) => println!("[OK] Directory changed"),
            Err(e) => eprintln!("[ERROR] {}", e),
        }
    }

    fn echo(&self, args: &[String]) {
        println!("{}", args.join(" "));
    }

    fn clear(&self) {
        print!("\x1B[2J\x1B[1;1H");
    }

    fn status(&self) {
        println!("\n╭─ System Status ──────────────────╮");
        println!("│ Shell: Claude OS v0.1.0           │");
        println!("│ PID: {}                    │", std::process::id());
        if let Ok(cwd) = env::current_dir() {
            println!("│ CWD: {}      │", cwd.display());
        }
        println!("│ Mode: Interactive                 │");
        println!("╰───────────────────────────────────╯\n");
    }
}
