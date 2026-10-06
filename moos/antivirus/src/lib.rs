use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ThreatLevel {
    Safe,         // 🟢
    Suspicious,   // 🟡
    Warning,      // 🟠
    Dangerous,    // 🔴
    Critical,     // 💀
}

impl ThreatLevel {
    pub fn rating(&self) -> i32 {
        match self {
            ThreatLevel::Safe => 0,
            ThreatLevel::Suspicious => 25,
            ThreatLevel::Warning => 50,
            ThreatLevel::Dangerous => 75,
            ThreatLevel::Critical => 100,
        }
    }

    pub fn emoji(&self) -> &'static str {
        match self {
            ThreatLevel::Safe => "🟢",
            ThreatLevel::Suspicious => "🟡",
            ThreatLevel::Warning => "🟠",
            ThreatLevel::Dangerous => "🔴",
            ThreatLevel::Critical => "💀",
        }
    }

    pub fn name(&self) -> &'static str {
        match self {
            ThreatLevel::Safe => "SAFE",
            ThreatLevel::Suspicious => "SUSPICIOUS",
            ThreatLevel::Warning => "WARNING",
            ThreatLevel::Dangerous => "DANGEROUS",
            ThreatLevel::Critical => "CRITICAL",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub filename: String,
    pub threat_level: ThreatLevel,
    pub findings: Vec<String>,
    pub score: i32,
}

pub struct MooTheVirus {
    dangerous_patterns: Vec<String>,
    dangerous_names: Vec<String>,
}

impl MooTheVirus {
    pub fn new() -> Self {
        MooTheVirus {
            dangerous_patterns: vec![
                // Code patterns
                "rm -rf /".to_string(),
                "system()".to_string(),
                "exec()".to_string(),
                "eval()".to_string(),
                "format_string".to_string(),
                "buffer_overflow".to_string(),
                "sql_injection".to_string(),
                "xss_payload".to_string(),
                ":(){:|:&};:".to_string(), // fork bomb
                "drop table".to_string(),
                "truncate".to_string(),
                "unsigned integer overflow".to_string(),
                "use_after_free".to_string(),
                "race_condition".to_string(),
            ],
            dangerous_names: vec![
                "malware".to_string(),
                "virus".to_string(),
                "backdoor".to_string(),
                "trojan".to_string(),
                "ransomware".to_string(),
                "cryptolocker".to_string(),
                "exploit".to_string(),
                "payload".to_string(),
                "shellcode".to_string(),
            ],
        }
    }

    pub fn scan_code(&self, filename: &str, code: &str) -> ScanResult {
        let mut findings = Vec::new();
        let mut threat_level = ThreatLevel::Safe;
        let mut score = 0;

        // Check filename for dangerous patterns
        let lower_filename = filename.to_lowercase();
        for name in &self.dangerous_names {
            if lower_filename.contains(name) {
                findings.push(format!("🚨 Dangerous name detected: '{}'", name));
                score += 30;
                threat_level = ThreatLevel::Warning;
            }
        }

        // Check code content
        let lower_code = code.to_lowercase();
        for pattern in &self.dangerous_patterns {
            let pattern_lower = pattern.to_lowercase();
            if lower_code.contains(&pattern_lower) {
                findings.push(format!("🐄 MOO ALERT: Dangerous pattern found: '{}'", pattern));
                score += 20;
                if score >= 75 {
                    threat_level = ThreatLevel::Critical;
                } else if score >= 50 {
                    threat_level = ThreatLevel::Dangerous;
                } else if score >= 25 {
                    threat_level = ThreatLevel::Warning;
                } else {
                    threat_level = ThreatLevel::Suspicious;
                }
            }
        }

        // Check for multiple dangerous patterns (compound threats)
        let pattern_count = self.dangerous_patterns.iter()
            .filter(|p| lower_code.contains(&p.to_lowercase()))
            .count();

        if pattern_count >= 3 {
            findings.push(format!("⚠️ Multiple dangerous patterns detected ({})", pattern_count));
            score += 25;
            threat_level = ThreatLevel::Critical;
        }

        ScanResult {
            filename: filename.to_string(),
            threat_level,
            findings,
            score: score.min(100),
        }
    }

    pub fn scan_file(&self, filename: &str) -> ScanResult {
        // Placeholder - in real implementation would read file
        self.scan_code(filename, "")
    }
}

impl Default for MooTheVirus {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_safe_code() {
        let scanner = MooTheVirus::new();
        let result = scanner.scan_code("hello.rs", "fn main() { println!(\"Hello\"); }");
        assert_eq!(result.threat_level, ThreatLevel::Safe);
    }

    #[test]
    fn test_dangerous_pattern() {
        let scanner = MooTheVirus::new();
        let result = scanner.scan_code("script.sh", "rm -rf /");
        assert!(result.threat_level != ThreatLevel::Safe);
    }

    #[test]
    fn test_dangerous_name() {
        let scanner = MooTheVirus::new();
        let result = scanner.scan_code("malware.exe", "harmless code");
        assert!(result.threat_level != ThreatLevel::Safe);
    }
}
