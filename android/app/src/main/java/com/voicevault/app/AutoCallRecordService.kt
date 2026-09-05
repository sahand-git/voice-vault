package com.voicevault.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.MediaRecorder
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class AutoCallRecordService : Service() {

    private var mediaRecorder: MediaRecorder? = null
    private var currentFilePath: String? = null
    private var recordingStartTime: Long = 0

    companion object {
        private const val TAG = "AutoCallRecordService"
        private const val NOTIFICATION_CHANNEL_ID = "voicevault_call_channel"
        private const val NOTIFICATION_ID = 2001

        const val ACTION_START = "com.voicevault.app.ACTION_START"
        const val ACTION_STOP = "com.voicevault.app.ACTION_STOP"
        const val EXTRA_CALLER = "extra_caller"

        var isRecording = false
            private set

        fun start(context: Context, caller: String = "WhatsApp Call") {
            if (isRecording) return
            val intent = Intent(context, AutoCallRecordService::class.java).apply {
                action = ACTION_START
                putExtra(EXTRA_CALLER, caller)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            if (!isRecording) return
            val intent = Intent(context, AutoCallRecordService::class.java).apply {
                action = ACTION_STOP
            }
            context.startService(intent)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        val caller = intent?.getStringExtra(EXTRA_CALLER) ?: "WhatsApp Call"

        when (action) {
            ACTION_START -> {
                try {
                    val notif = buildNotification("Recording $caller...")
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        startForeground(
                            NOTIFICATION_ID,
                            notif,
                            android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
                        )
                    } else {
                        startForeground(NOTIFICATION_ID, notif)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Foreground start failed: ${e.message}")
                }
                startAudioRecording(caller)
            }
            ACTION_STOP -> {
                stopAudioRecording()
                stopForeground(true)
                stopSelf()
            }
        }
        return START_NOT_STICKY
    }

    private fun startAudioRecording(caller: String) {
        if (isRecording) return

        val hasMic = androidx.core.content.ContextCompat.checkSelfPermission(
            this,
            android.Manifest.permission.RECORD_AUDIO
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED

        if (!hasMic) {
            Log.w(TAG, "Microphone permission not granted, cannot record call.")
            stopSelf()
            return
        }

        try {
            val targetDir = File(filesDir, "voicevault_recordings")
            if (!targetDir.exists()) {
                targetDir.mkdirs()
            }

            val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
            val cleanCaller = caller.replace("[^a-zA-Z0-9_]".toRegex(), "_")
            val audioFile = File(targetDir, "Call_${cleanCaller}_$timestamp.m4a")
            currentFilePath = audioFile.absolutePath

            mediaRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(this)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }.apply {
                try {
                    setAudioSource(MediaRecorder.AudioSource.VOICE_COMMUNICATION)
                } catch (e: Exception) {
                    Log.w(TAG, "VOICE_COMMUNICATION source failed, falling back to MIC", e)
                    setAudioSource(MediaRecorder.AudioSource.MIC)
                }
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioSamplingRate(44100)
                setAudioEncodingBitRate(128000)
                setOutputFile(currentFilePath)
                prepare()
                start()
            }

            isRecording = true
            recordingStartTime = System.currentTimeMillis()
            Log.i(TAG, "Started call recording to: $currentFilePath")

            // Broadcast status to app
            broadcastRecordingState(true, currentFilePath)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start call recording", e)
            isRecording = false
            stopSelf()
        }
    }

    private fun stopAudioRecording() {
        if (!isRecording) return
        try {
            mediaRecorder?.apply {
                stop()
                reset()
                release()
            }
            mediaRecorder = null
            isRecording = false
            Log.i(TAG, "Stopped call recording: $currentFilePath")

            // Broadcast saved file
            broadcastRecordingState(false, currentFilePath)
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping recorder", e)
        } finally {
            mediaRecorder = null
            isRecording = false
        }
    }

    private fun broadcastRecordingState(active: Boolean, path: String?) {
        val intent = Intent("com.voicevault.app.CALL_RECORDING_EVENT").apply {
            putExtra("active", active)
            putExtra("filePath", path)
            putExtra("timestamp", System.currentTimeMillis())
        }
        sendBroadcast(intent)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "VoiceVault Call Recording",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows sticky notification while recording WhatsApp calls"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(text: String): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle("VoiceVault Call Recorder")
            .setContentText(text)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    override fun onDestroy() {
        stopAudioRecording()
        super.onDestroy()
    }
}
