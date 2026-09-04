package com.voicevault.app

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class WhatsAppCallAccessibilityService : AccessibilityService() {

    private var wasCallActive = false

    companion object {
        private const val TAG = "WhatsAppCallDetector"
        var isServiceRunning = false
            private set
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        isServiceRunning = true
        Log.i(TAG, "VoiceVault WhatsApp Accessibility Service Connected")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        val packageName = event.packageName?.toString() ?: return

        // Filter for WhatsApp, WhatsApp Business, or Telegram
        if (packageName != "com.whatsapp" && packageName != "com.whatsapp.w4b" && packageName != "org.telegram.messenger") {
            return
        }

        val rootNode = rootInActiveWindow ?: return
        val isCallScreen = detectCallUi(rootNode, event)

        if (isCallScreen && !wasCallActive) {
            wasCallActive = true
            Log.i(TAG, "WhatsApp Call DETECTED! Starting VoiceVault Auto-Record...")
            AutoCallRecordService.start(applicationContext, "WhatsApp Call")

            // Automatically open VoiceVault to the front if configured
            bringAppToFront()
        } else if (!isCallScreen && wasCallActive) {
            wasCallActive = false
            Log.i(TAG, "WhatsApp Call ENDED. Stopping recording...")
            AutoCallRecordService.stop(applicationContext)
        }
    }

    private fun detectCallUi(node: AccessibilityNodeInfo, event: AccessibilityEvent): Boolean {
        val className = event.className?.toString() ?: ""
        if (className.contains("VoipActivity", ignoreCase = true) ||
            className.contains("CallActivity", ignoreCase = true) ||
            className.contains("InCallActivity", ignoreCase = true)) {
            return true
        }

        // Deep text inspection for call keywords
        return containsCallKeywords(node)
    }

    private fun containsCallKeywords(node: AccessibilityNodeInfo?): Boolean {
        if (node == null) return false

        val text = node.text?.toString()?.lowercase() ?: ""
        val contentDesc = node.contentDescription?.toString()?.lowercase() ?: ""

        if (text.contains("whatsapp call") ||
            text.contains("incoming call") ||
            text.contains("ongoing call") ||
            text.contains("calling...") ||
            text.contains("ringing...") ||
            text.contains("call in progress") ||
            contentDesc.contains("end call") ||
            contentDesc.contains("mute call")) {
            return true
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            if (containsCallKeywords(child)) {
                return true
            }
        }
        return false
    }

    private fun bringAppToFront() {
        try {
            val intent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("auto_opened_for_call", true)
            }
            if (intent != null) {
                startActivity(intent)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch VoiceVault to front", e)
        }
    }

    override fun onInterrupt() {
        Log.w(TAG, "Accessibility Service Interrupted")
        wasCallActive = false
    }

    override fun onDestroy() {
        isServiceRunning = false
        wasCallActive = false
        super.onDestroy()
    }
}
