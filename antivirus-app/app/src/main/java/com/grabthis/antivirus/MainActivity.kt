package com.grabthis.antivirus

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.widget.Button
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import java.io.File

class MainActivity : AppCompatActivity() {

    private lateinit var threatDetector: ThreatDetector
    private lateinit var resultTextView: TextView
    private val PERMISSION_REQUEST_CODE = 42

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        threatDetector = ThreatDetector()
        resultTextView = findViewById(R.id.resultTextView)

        val scanButton: Button = findViewById(R.id.scanButton)
        scanButton.setOnClickListener {
            if (hasStoragePermission()) {
                performSystemScan()
            } else {
                requestStoragePermission()
            }
        }

        val quickScanButton: Button = findViewById(R.id.quickScanButton)
        quickScanButton.setOnClickListener {
            performQuickDemoScan()
        }
    }

    private fun hasStoragePermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Environment.isExternalStorageManager()
        } else {
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.READ_EXTERNAL_STORAGE
            ) == PackageManager.PERMISSION_GRANTED
        }
    }

    private fun requestStoragePermission() {
        ActivityCompat.requestPermissions(
            this,
            arrayOf(Manifest.permission.READ_EXTERNAL_STORAGE),
            PERMISSION_REQUEST_CODE
        )
    }

    private fun performSystemScan() {
        val scanResults = StringBuilder("🔍 SYSTEM SCAN RESULTS\n")
        scanResults.append("========================\n\n")

        val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
        val documentsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS)
        val appsDir = File("/data/app")

        scanResults.append("📁 Scanning Downloads...\n")
        scanResults.append(scanDirectory(downloadsDir))

        scanResults.append("\n📁 Scanning Documents...\n")
        scanResults.append(scanDirectory(documentsDir))

        if (appsDir.canRead()) {
            scanResults.append("\n📁 Scanning Installed Apps...\n")
            scanResults.append(scanDirectory(appsDir))
        }

        scanResults.append("\n✅ Scan Complete!")
        resultTextView.text = scanResults.toString()
    }

    private fun scanDirectory(dir: File): String {
        val results = StringBuilder()
        var threatsFound = 0

        try {
            val files = dir.listFiles() ?: return "❌ Cannot access directory\n"

            for (file in files.take(50)) { // Limit to 50 files for demo
                if (file.isFile) {
                    val result = threatDetector.scanFilename(file.name)
                    if (result.isThreat) {
                        threatsFound++
                        results.append("⚠️  ${file.name}\n")
                        results.append("   Type: ${result.threatType}\n")
                        results.append("   Severity: ${result.severity}\n")
                        results.append("   ${result.description}\n\n")
                    }
                }
            }
        } catch (e: Exception) {
            results.append("❌ Error: ${e.message}\n")
        }

        if (threatsFound == 0) {
            results.append("✅ No threats detected in this directory\n")
        } else {
            results.append("⚠️  Found $threatsFound potential threat(s)\n")
        }

        return results.toString()
    }

    private fun performQuickDemoScan() {
        val demoResults = StringBuilder("🔍 QUICK DEMO SCAN\n")
        demoResults.append("========================\n\n")

        // Test cases
        val testCases = listOf(
            "document.txt" to "Safe file",
            "virus_remover.apk" to "Malicious filename detected",
            "hack_tool.exe" to "Suspicious keyword 'hack'",
            "chrome_extension.crx" to "Clean file",
            "xmrig_miner.exe" to "Cryptominer pattern detected",
            "normal_app.apk" to "Clean application",
            "trojan.zip" to "Trojan detected"
        )

        var totalThreats = 0

        for ((filename, expectedNote) in testCases) {
            val result = threatDetector.scanFilename(filename)
            demoResults.append("📄 $filename\n")
            demoResults.append("   Status: ${if (result.isThreat) "🚨 THREAT" else "✅ SAFE"}\n")
            if (result.isThreat) {
                demoResults.append("   Type: ${result.threatType}\n")
                demoResults.append("   Severity: ${result.severity}\n")
                demoResults.append("   ${result.description}\n")
                totalThreats++
            }
            demoResults.append("\n")
        }

        demoResults.append("========================\n")
        demoResults.append("📊 Summary: Found $totalThreats potential threat(s)\n")
        resultTextView.text = demoResults.toString()
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQUEST_CODE) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                performSystemScan()
            } else {
                resultTextView.text = "❌ Storage permission denied. Cannot perform scan."
            }
        }
    }
}
