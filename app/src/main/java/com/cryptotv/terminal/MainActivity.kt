package com.cryptotv.terminal

import android.annotation.SuppressLint
import android.os.Build
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.WebView
import android.webkit.WebViewClient
import android.app.Activity
import android.widget.FrameLayout
import android.os.Process

/**
 * Crypto TV Terminal — полноэкранный «киоск» для Android TV.
 * При старте проверяет OTA (web-bundle / APK) на jjkkll.top, затем грузит табло.
 */
class MainActivity : Activity() {

    private lateinit var webView: WebView
    private lateinit var root: FrameLayout
    /** Долгое нажатие «Назад» (~1,2 с) — полное завершение процесса (не сворачивание). */
    private val backExitMs = 1200L
    private var backPressedAt = 0L
    private val backHandler = android.os.Handler(android.os.Looper.getMainLooper())
    private val backExitRunnable = Runnable { exitApplication() }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        root = FrameLayout(this).apply {
            setBackgroundColor(0xFF04060B.toInt())
        }

        webView = WebView(this).apply {
            with(settings) {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                useWideViewPort = false
                loadWithOverviewMode = false
                builtInZoomControls = false
                displayZoomControls = false
                setSupportZoom(false)
                cacheMode = android.webkit.WebSettings.LOAD_DEFAULT
                mediaPlaybackRequiresUserGesture = false
                allowFileAccess = true
                allowContentAccess = true
                @Suppress("DEPRECATION") allowFileAccessFromFileURLs = true
                @Suppress("DEPRECATION") allowUniversalAccessFromFileURLs = true
                mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            }
            webViewClient = WebViewClient()
            setBackgroundColor(0xFF04060B.toInt())
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
        }
        root.addView(
            webView,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT,
            ),
        )

        setContentView(root)
        enterImmersiveMode()

        webView.loadUrl(UpdateManager.resolveWebUrl(applicationContext))

        Thread {
            val result = UpdateManager.checkAndApply(applicationContext)
            runOnUiThread {
                if (result.webUpdated) {
                    webView.loadUrl(result.webUrl)
                }
                if (result.apkFile != null) {
                    UpdateManager.promptInstallApk(
                        this,
                        result.apkFile,
                        result.apkVersionName,
                    )
                }
            }
        }.start()
    }

    private fun exitApplication() {
        backHandler.removeCallbacks(backExitRunnable)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            finishAndRemoveTask()
        }
        finishAffinity()
        Process.killProcess(Process.myPid())
    }

    @Suppress("DEPRECATION")
    private fun enterImmersiveMode() {
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.attributes = window.attributes.apply {
                layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            }
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) enterImmersiveMode()
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK && event != null) {
            if (event.repeatCount == 0) {
                backPressedAt = System.currentTimeMillis()
                backHandler.removeCallbacks(backExitRunnable)
                backHandler.postDelayed(backExitRunnable, backExitMs)
            } else if (System.currentTimeMillis() - backPressedAt >= backExitMs) {
                exitApplication()
            }
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onKeyUp(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            val held = System.currentTimeMillis() - backPressedAt
            backHandler.removeCallbacks(backExitRunnable)
            if (held >= backExitMs) exitApplication()
            return true
        }
        return super.onKeyUp(keyCode, event)
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
        webView.resumeTimers()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
