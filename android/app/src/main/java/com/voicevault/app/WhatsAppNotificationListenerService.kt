package com.voicevault.app

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

class WhatsAppNotificationListenerService : NotificationListenerService() {

    companion object {
        private const val TAG = "WhatsAppNotifListener"
        var isListenerConnected = false
            private set
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        isListenerConnected = true
        Log.i(TAG, "WhatsApp Notification Listener connected")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val packageName = sbn.packageName ?: return

        if (packageName == "com.whatsapp" || packageName == "com.whatsapp.w4b") {
            val notification = sbn.notification ?: return
            val extras = notification.extras ?: return

            val title = extras.getString(Notification.EXTRA_TITLE) ?: ""
            val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
            val category = notification.category ?: ""

            val isCallNotification = category == Notification.CATEGORY_CALL ||
                    title.contains("WhatsApp call", ignoreCase = true) ||
                    title.contains("Incoming voice call", ignoreCase = true) ||
                    title.contains("Incoming video call", ignoreCase = true) ||
                    text.contains("Incoming", ignoreCase = true) ||
                    text.contains("Ongoing call", ignoreCase = true)

            if (isCallNotification) {
                Log.i(TAG, "Incoming WhatsApp Call Notification from: $title")
                AutoCallRecordService.start(applicationContext, "WhatsApp Call: $title")
            }
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val packageName = sbn.packageName ?: return

        if (packageName == "com.whatsapp" || packageName == "com.whatsapp.w4b") {
            val category = sbn.notification?.category ?: ""
            if (category == Notification.CATEGORY_CALL) {
                Log.i(TAG, "WhatsApp Call Notification removed, stopping recorder")
                AutoCallRecordService.stop(applicationContext)
            }
        }
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        isListenerConnected = false
    }
}
