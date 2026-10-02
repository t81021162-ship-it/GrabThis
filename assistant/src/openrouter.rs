use serde::{Deserialize, Serialize};

#[derive(Serialize)]
pub struct OpenRouterRequest {
    pub model: String,
    pub messages: Vec<Message>,
}

#[derive(Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
}

#[derive(Deserialize)]
pub struct OpenRouterResponse {
    pub choices: Vec<Choice>,
}

#[derive(Deserialize)]
pub struct Choice {
    pub message: Message,
}

pub struct OpenRouterClient {
    api_key: String,
    endpoint: String,
}

impl OpenRouterClient {
    pub fn new(api_key: String) -> Self {
        OpenRouterClient {
            api_key,
            endpoint: "https://openrouter.io/api/v1/chat/completions".to_string(),
        }
    }

    pub async fn ask(&self, question: &str) -> Result<String, String> {
        let client = reqwest::Client::new();

        let request = OpenRouterRequest {
            model: "openrouter/auto".to_string(), // Auto-select best model
            messages: vec![
                Message {
                    role: "user".to_string(),
                    content: format!(
                        "You are Cortex, Claude OS's transparent AI assistant. Answer this concisely:\n\n{}",
                        question
                    ),
                },
            ],
        };

        let response = client
            .post(&self.endpoint)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let data: OpenRouterResponse = response
            .json()
            .await
            .map_err(|e| format!("Parse error: {}", e))?;

        Ok(data
            .choices
            .first()
            .map(|c| c.message.content.clone())
            .unwrap_or_else(|| "No response received".to_string()))
    }
}
