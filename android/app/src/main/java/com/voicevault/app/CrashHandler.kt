package com.voicevault.app

import android.app.Application
import android.content.Context
import android.content.Intent
import android.os.Process
import android.util.Log
import java.io.PrintWriter
import java.io.StringWriter

class CrashHandler(private val context: Context) : Thread.UncaughtExceptionHandler {
    private val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()

    companion object {
        fun install(app: Application) {
            Thread.setDefaultUncaughtExceptionHandler(CrashHandler(app))
        }
    }

    override fun uncaughtException(thread: Thread, throwable: Throwable) {
        val sw = StringWriter()
        throwable.printStackTrace(PrintWriter(sw))
        val stackTrace = sw.toString()
        Log.e("VoiceVaultCrash", "FATAL CRASH DETECTED: $stackTrace")

        try {
            val intent = Intent(context, CrashReportActivity::class.java).apply {
                putExtra("crash_error", stackTrace)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            context.startActivity(intent)
            Process.killProcess(Process.myPid())
            System.exit(1)
        } catch (e: Exception) {
            defaultHandler?.uncaughtException(thread, throwable)
        }
    }
}
