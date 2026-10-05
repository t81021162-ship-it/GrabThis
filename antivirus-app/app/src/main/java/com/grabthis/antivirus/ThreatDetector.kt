package com.grabthis.antivirus

data class ThreatResult(
    val isThreat: Boolean,
    val threatType: String,
    val severity: String,
    val description: String
)

class ThreatDetector {

    private val suspiciousFilenames = listOf(
        "hack", "virus", "trojan", "malware", "ransomware",
        "worm", "spyware", "rootkit", "botnet", "exploit",
        "payload", "shellcode", "backdoor", "keylogger"
    )

    private val cryptominerPatterns = listOf(
        "monero", "xmrig", "cpuminer", "minergate", "nanopool",
        "stratum", "getwork", "hashrate", "difficulty",
        "proof.of.work", "mining_pool", "pool_url"
    )

    private val maliciousCodePatterns = listOf(
        "exec\\(", "system\\(", "Runtime.exec", "ProcessBuilder",
        "reflection.*Method", "invoke\\(", "getDeclaredMethod",
        "setAccessible.*true", "forName\\(",
        "pm.install", "install.*apk", "chmod.*777"
    )

    private val smsInterceptionPatterns = listOf(
        "onReceive.*SMS", "intercept.*sms", "SMS.*received",
        "extractAddress", "extractText", "SmsManager",
        "sendTextMessage", "interceptSmsMessages"
    )

    private val networkCommunicationPatterns = listOf(
        "c2", "command.and.control", "callback", "beacon",
        "exfiltrate", "exfil", "stolen.*data", "raw.*socket"
    )

    fun scanFilename(filename: String): ThreatResult {
        val lowerFilename = filename.lowercase()

        for (suspicious in suspiciousFilenames) {
            if (lowerFilename.contains(suspicious)) {
                return ThreatResult(
                    isThreat = true,
                    threatType = "SUSPICIOUS_FILENAME",
                    severity = "HIGH",
                    description = "File contains suspicious keyword: $suspicious"
                )
            }
        }

        return ThreatResult(
            isThreat = false,
            threatType = "CLEAN",
            severity = "NONE",
            description = "Filename appears safe"
        )
    }

    fun scanContent(content: String): ThreatResult {
        val lowerContent = content.lowercase()

        // Check for cryptominer patterns
        for (pattern in cryptominerPatterns) {
            if (lowerContent.contains(pattern.lowercase())) {
                return ThreatResult(
                    isThreat = true,
                    threatType = "CRYPTOMINER",
                    severity = "HIGH",
                    description = "Potential cryptominer detected: $pattern"
                )
            }
        }

        // Check for malicious code patterns
        for (pattern in maliciousCodePatterns) {
            if (Regex(pattern, RegexOption.IGNORE_CASE).containsMatchIn(content)) {
                return ThreatResult(
                    isThreat = true,
                    threatType = "MALICIOUS_CODE",
                    severity = "CRITICAL",
                    description = "Dangerous code pattern found: $pattern"
                )
            }
        }

        // Check for SMS interception
        for (pattern in smsInterceptionPatterns) {
            if (Regex(pattern, RegexOption.IGNORE_CASE).containsMatchIn(content)) {
                return ThreatResult(
                    isThreat = true,
                    threatType = "SMS_INTERCEPTION",
                    severity = "CRITICAL",
                    description = "SMS interception code detected: $pattern"
                )
            }
        }

        // Check for C2 communication
        for (pattern in networkCommunicationPatterns) {
            if (Regex(pattern, RegexOption.IGNORE_CASE).containsMatchIn(content)) {
                return ThreatResult(
                    isThreat = true,
                    threatType = "C2_COMMUNICATION",
                    severity = "CRITICAL",
                    description = "Command & Control communication detected: $pattern"
                )
            }
        }

        return ThreatResult(
            isThreat = false,
            threatType = "CLEAN",
            severity = "NONE",
            description = "No threats detected in content"
        )
    }

    fun scanApk(apkPath: String, apkContent: String): ThreatResult {
        // First check filename
        val filenameResult = scanFilename(apkPath)
        if (filenameResult.isThreat) return filenameResult

        // Then check content (decompiled code)
        return scanContent(apkContent)
    }
}
