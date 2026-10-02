use serde::{Deserialize, Serialize};
use chrono::Utc;
use uuid::Uuid;
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Debug, Clone)]
struct JournalEntry {
    id: String,
    timestamp: String,
    entry: String,
    tags: Vec<String>,
}

struct Journal {
    path: PathBuf,
    entries: Vec<JournalEntry>,
}

impl Journal {
    fn new(path: PathBuf) -> Self {
        let entries = if path.exists() {
            if let Ok(content) = fs::read_to_string(&path) {
                serde_json::from_str(&content).unwrap_or_default()
            } else {
                Vec::new()
            }
        } else {
            Vec::new()
        };

        Journal { path, entries }
    }

    fn add_entry(&mut self, text: String, tags: Vec<String>) {
        let entry = JournalEntry {
            id: Uuid::new_v4().to_string(),
            timestamp: Utc::now().to_rfc3339(),
            entry: text,
            tags,
        };
        self.entries.push(entry);
        self.save();
    }

    fn list_entries(&self, limit: usize) {
        println!("\n╭─ Journal Entries ──────────────────╮");
        for (idx, entry) in self.entries.iter().rev().take(limit).enumerate() {
            println!("│ [{}] {} ", idx + 1, entry.timestamp);
            println!("│     {}", entry.entry);
            if !entry.tags.is_empty() {
                println!("│     Tags: {}", entry.tags.join(", "));
            }
            println!("│");
        }
        println!("╰────────────────────────────────────╯\n");
    }

    fn save(&self) {
        if let Ok(json) = serde_json::to_string_pretty(&self.entries) {
            let _ = fs::write(&self.path, json);
        }
    }
}

fn main() {
    println!("Claude OS Journal v0.1.0\n");

    let journal_path = PathBuf::from(".claude_journal.json");
    let mut journal = Journal::new(journal_path);

    let args: Vec<String> = std::env::args().collect();
    if args.len() > 1 {
        match args[1].as_str() {
            "add" => {
                if args.len() > 2 {
                    let text = args[2..].join(" ");
                    journal.add_entry(text, vec![]);
                    println!("[OK] Entry added");
                }
            }
            "list" => {
                let limit = args
                    .get(2)
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(10);
                journal.list_entries(limit);
            }
            _ => println!("[ERROR] Unknown command: {}", args[1]),
        }
    } else {
        journal.list_entries(5);
    }
}
