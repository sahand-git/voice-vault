package com.voicevault.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.text.TextUtils
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class CallRecorderModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "CallRecorderModule"

    private val recordingReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == "com.voicevault.app.CALL_RECORDING_EVENT") {
                val active = intent.getBooleanExtra("active", false)
                val filePath = intent.getStringExtra("filePath") ?: ""
                val timestamp = intent.getLongExtra("timestamp", System.currentTimeMillis())

                val params = Arguments.createMap().apply {
                    putBoolean("active", active)
                    putString("filePath", filePath)
                    putDouble("timestamp", timestamp.toDouble())
                }

                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("onCallRecordingStateChanged", params)
            }
        }
    }

    init {
        val filter = IntentFilter("com.voicevault.app.CALL_RECORDING_EVENT")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactContext.registerReceiver(recordingReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            reactContext.registerReceiver(recordingReceiver, filter)
        }
    }

    @ReactMethod
    fun isAccessibilityPermissionGranted(promise: Promise) {
        try {
            var accessibilityEnabled = 0
            val service = "${reactContext.packageName}/${WhatsAppCallAccessibilityService::class.java.canonicalName}"
            try {
                accessibilityEnabled = Settings.Secure.getInt(
                    reactContext.contentResolver,
                    Settings.Secure.ACCESSIBILITY_ENABLED
                )
            } catch (e: Exception) {
                // Ignore
            }

            val colonSplitter = TextUtils.SimpleStringSplitter(':')
            if (accessibilityEnabled == 1) {
                val settingValue = Settings.Secure.getString(
                    reactContext.contentResolver,
                    Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
                )
                if (settingValue != null) {
                    colonSplitter.setString(settingValue)
                    while (colonSplitter.hasNext()) {
                        val accessibilityService = colonSplitter.next()
                        if (accessibilityService.equals(service, ignoreCase = true)) {
                            promise.resolve(true)
                            return
                        }
                    }
                }
            }
            promise.resolve(WhatsAppCallAccessibilityService.isServiceRunning)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun openAccessibilitySettings() {
        try {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(intent)
        } catch (e: Exception) {
            // Fallback to general settings
            val intent = Intent(Settings.ACTION_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(intent)
        }
    }

    @ReactMethod
    fun isNotificationListenerGranted(promise: Promise) {
        try {
            val packages = NotificationManagerCompat.getEnabledListenerPackages(reactContext)
            val isEnabled = packages.contains(reactContext.packageName)
            promise.resolve(isEnabled)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun openNotificationSettings() {
        try {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(intent)
        } catch (e: Exception) {
            val intent = Intent(Settings.ACTION_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(intent)
        }
    }

    @ReactMethod
    fun isBatteryOptimizationIgnored(promise: Promise) {
        try {
            val powerManager = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
            val isIgnored = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                powerManager.isIgnoringBatteryOptimizations(reactContext.packageName)
            } else {
                true
            }
            promise.resolve(isIgnored)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun requestIgnoreBatteryOptimization() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:${reactContext.packageName}")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(intent)
            }
        } catch (e: Exception) {
            // Ignore
        }
    }

    @ReactMethod
    fun isRecordingActive(promise: Promise) {
        promise.resolve(AutoCallRecordService.isRecording)
    }

    @ReactMethod
    fun startCallRecord(callerName: String, promise: Promise) {
        try {
            AutoCallRecordService.start(reactContext, callerName)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("START_ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopCallRecord(promise: Promise) {
        try {
            AutoCallRecordService.stop(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message)
        }
    }
}
