package com.grabthis.antivirus

import java.io.File

data class ThreatResult(
    val isThreat: Boolean,
    val threatType: String,
    val severity: String,
    val description: String,
    val filePath: String = "",
    val fileSize: Long = 0L
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
        val lowerFilename = filename.toLowerCase()

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
        val lowerContent = content.toLowerCase()

        // Check for cryptominer patterns
        for (pattern in cryptominerPatterns) {
            if (lowerContent.contains(pattern.toLowerCase())) {
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

    fun scanFile(file: File): ThreatResult {
        // First check filename
        val filenameResult = scanFilename(file.name)
        if (filenameResult.isThreat) {
            return filenameResult.copy(filePath = file.absolutePath, fileSize = file.length())
        }

        // Try to read and scan content for text files
        if (file.isFile && file.canRead()) {
            try {
                val fileSize = file.length()
                // Only scan readable files up to 1MB to avoid performance issues
                if (fileSize < 1024 * 1024) {
                    val content = file.readText(Charsets.UTF_8)
                    val contentResult = scanContent(content)
                    if (contentResult.isThreat) {
                        return contentResult.copy(filePath = file.absolutePath, fileSize = fileSize)
                    }
                }
            } catch (e: Exception) {
                // File might be binary or unreadable, skip content scan
            }
        }

        return ThreatResult(
            isThreat = false,
            threatType = "CLEAN",
            severity = "NONE",
            description = "File appears safe",
            filePath = file.absolutePath,
            fileSize = file.length()
        )
    }
}
