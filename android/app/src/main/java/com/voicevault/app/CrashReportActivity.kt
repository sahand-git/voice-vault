package com.voicevault.app

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast

class CrashReportActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val crashError = intent.getStringExtra("crash_error") ?: "Unknown Error occurred on startup."

        val rootLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 64, 48, 48)
            setBackgroundColor(Color.parseColor("#0F172A"))
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        val title = TextView(this).apply {
            text = "VoiceVault Diagnostic Report"
            textSize = 20f
            setTextColor(Color.WHITE)
            setPadding(0, 0, 0, 16)
        }
        rootLayout.addView(title)

        val subtitle = TextView(this).apply {
            text = "The app encountered an error on launch. Please copy this error log so we can fix it:"
            textSize = 13f
            setTextColor(Color.parseColor("#94A3B8"))
            setPadding(0, 0, 0, 24)
        }
        rootLayout.addView(subtitle)

        val buttonsLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, 0, 0, 24)
        }

        val copyBtn = Button(this).apply {
            text = "Copy Error Log"
            setBackgroundColor(Color.parseColor("#10B981"))
            setTextColor(Color.WHITE)
            setOnClickListener {
                val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                val clip = ClipData.newPlainText("VoiceVault Crash", crashError)
                clipboard.setPrimaryClip(clip)
                Toast.makeText(context, "Copied error log to clipboard!", Toast.LENGTH_SHORT).show()
            }
        }
        buttonsLayout.addView(copyBtn)

        val restartBtn = Button(this).apply {
            text = "Restart App"
            setBackgroundColor(Color.parseColor("#334155"))
            setTextColor(Color.WHITE)
            setOnClickListener {
                val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                }
                if (launchIntent != null) {
                    startActivity(launchIntent)
                }
                finish()
            }
        }
        val space = TextView(this).apply { text = "  " }
        buttonsLayout.addView(space)
        buttonsLayout.addView(restartBtn)
        rootLayout.addView(buttonsLayout)

        val scrollView = ScrollView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1.0f
            )
            setBackgroundColor(Color.parseColor("#1E293B"))
            setPadding(24, 24, 24, 24)
        }

        val errorView = TextView(this).apply {
            text = crashError
            textSize = 11f
            setTextColor(Color.parseColor("#FCA5A5"))
            setTextIsSelectable(true)
        }
        scrollView.addView(errorView)
        rootLayout.addView(scrollView)

        setContentView(rootLayout)
    }
}
