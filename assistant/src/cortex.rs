use crate::knowledge::Knowledge;
use crate::openrouter::OpenRouterClient;

pub struct Cortex {
    knowledge: Knowledge,
    openrouter: Option<OpenRouterClient>,
    conversation_history: Vec<(String, String)>,
}

impl Cortex {
    pub fn new(api_key: Option<String>) -> Self {
        let openrouter = api_key.map(OpenRouterClient::new);

        Cortex {
            knowledge: Knowledge::new(),
            openrouter,
            conversation_history: Vec::new(),
        }
    }

    pub fn greet(&self) -> String {
        format!(
            "╔═══════════════════════════════════════╗\n\
             ║  🧠 Cortex - Claude OS AI Assistant   ║\n\
             ║      Transparent. Helpful. Curious.    ║\n\
             ╚═══════════════════════════════════════╝\n\n\
             Type 'help' for commands or just ask me anything!\n"
        )
    }

    pub fn answer(&mut self, question: &str) -> String {
        // Check local knowledge first
        if let Some(answer) = self.knowledge.answer(question) {
            self.conversation_history.push((question.to_string(), answer.clone()));
            return answer;
        }

        // Not in local knowledge
        format!(
            "[CORTEX] I don't have this in my built-in knowledge.\n\
             Use 'ask smartly [your question]' to get a smarter answer via OpenRouter.\n\
             Or set OPENROUTER_API_KEY environment variable first!"
        )
    }

    pub async fn ask_smart(&mut self, question: &str) -> String {
        match &self.openrouter {
            Some(client) => {
                match client.ask(question).await {
                    Ok(answer) => {
                        self.conversation_history.push((question.to_string(), answer.clone()));
                        format!("[CORTEX via OpenRouter]\n{}", answer)
                    }
                    Err(e) => format!("[ERROR] OpenRouter failed: {}", e),
                }
            }
            None => {
                "[CORTEX] OpenRouter not configured.\n\
                 Set OPENROUTER_API_KEY environment variable to enable smart mode.".to_string()
            }
        }
    }

    pub fn show_history(&self) -> String {
        if self.conversation_history.is_empty() {
            return "[CORTEX] No conversation history yet.".to_string();
        }

        let mut output = format!("[CORTEX] Conversation History ({} messages)\n", self.conversation_history.len());
        for (q, a) in &self.conversation_history {
            output.push_str(&format!("\nQ: {}\nA: {}\n", q, a));
        }
        output
    }
}
