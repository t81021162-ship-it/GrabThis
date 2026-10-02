use std::collections::HashMap;

pub struct Knowledge {
    responses: HashMap<String, String>,
}

impl Knowledge {
    pub fn new() -> Self {
        let mut responses = HashMap::new();

        // Cortex's built-in knowledge base
        responses.insert("hello".to_string(),
            "👋 Cortex here! I'm Claude OS's AI assistant. Ask me anything!".to_string());

        responses.insert("who are you".to_string(),
            "I'm Cortex, the transparent AI assistant built into Claude OS. I know basic stuff, and I can get smarter using OpenRouter when you need complex answers.".to_string());

        responses.insert("help".to_string(),
            "You can ask me:\n  - What you want to know\n  - 'ask smartly [question]' to use OpenRouter\n  - 'status' to see my current state\n  - 'quit' to exit".to_string());

        responses.insert("what is claude os".to_string(),
            "Claude OS is a minimal, developer-focused operating system built on transparency. It runs a beautiful shell, system dashboard, persistent journal, and now me (Cortex) as your AI copilot!".to_string());

        responses.insert("what can you do".to_string(),
            "I can:\n  ✓ Answer basic questions (built-in knowledge)\n  ✓ Explain concepts\n  ✓ Help with Claude OS\n  ✓ Call OpenRouter for deep thinking\n  ✓ Show my limitations transparently".to_string());

        responses.insert("what's openrouter".to_string(),
            "OpenRouter is an API gateway to multiple AI models. When you ask me something hard, I can route it there for a smarter answer. You'll need an OpenRouter API key though!".to_string());

        responses.insert("rust".to_string(),
            "Rust is a systems programming language that's memory-safe without garbage collection. Claude OS is built with Rust because it's fast, reliable, and perfect for OS development.".to_string());

        responses.insert("x86_64".to_string(),
            "x86_64 is a 64-bit processor architecture (Intel/AMD). Claude OS kernel targets x86_64, making it bootable on most modern computers via QEMU or real hardware.".to_string());

        responses.insert("status".to_string(),
            "Cortex v0.1.0 Online ✓\n  Mode: Local Knowledge\n  OpenRouter: Ready (if API key set)\n  Personality: Curious & Transparent\n  Goal: Help you build awesome things".to_string());

        responses.insert("how do i use you".to_string(),
            "Just ask me questions! Type 'ask [question]' and I'll use my built-in knowledge. For harder stuff, use 'ask smartly [question]' to tap into OpenRouter's smarter models.".to_string());

        responses.insert("transparent".to_string(),
            "That's Claude OS's core philosophy! I'll always tell you:\n  - What I know vs don't know\n  - When I'm using OpenRouter\n  - My limitations\n  - Why I'm saying something".to_string());

        Knowledge { responses }
    }

    pub fn answer(&self, question: &str) -> Option<String> {
        let normalized = question.to_lowercase().trim().to_string();

        // Exact match
        if let Some(answer) = self.responses.get(&normalized) {
            return Some(answer.clone());
        }

        // Keyword matching
        for (key, answer) in &self.responses {
            if normalized.contains(key) || key.contains(&normalized) {
                return Some(answer.clone());
            }
        }

        None
    }

    pub fn has_answer(&self, question: &str) -> bool {
        self.answer(question).is_some()
    }
}
