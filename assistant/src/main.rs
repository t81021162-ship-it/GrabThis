mod cortex;
mod knowledge;
mod openrouter;

use cortex::Cortex;
use std::io::{self, Write};

#[tokio::main]
async fn main() {
    let api_key = std::env::var("OPENROUTER_API_KEY").ok();
    let mut cortex = Cortex::new(api_key);

    println!("{}", cortex.greet());

    loop {
        print!("cortex> ");
        io::stdout().flush().unwrap();

        let mut input = String::new();
        io::stdin().read_line(&mut input).unwrap();
        let trimmed = input.trim();

        if trimmed.is_empty() {
            continue;
        }

        match trimmed {
            "quit" | "exit" => {
                println!("[CORTEX] Goodbye! 👋");
                break;
            }
            "history" => {
                println!("{}", cortex.show_history());
            }
            cmd if cmd.starts_with("ask smartly ") => {
                let question = &cmd[12..];
                println!("{}", cortex.ask_smart(question).await);
            }
            cmd if cmd.starts_with("ask ") => {
                let question = &cmd[4..];
                println!("[CORTEX] {}", cortex.answer(question));
            }
            _ => {
                println!("[CORTEX] {}", cortex.answer(trimmed));
            }
        }
        println!();
    }
}
