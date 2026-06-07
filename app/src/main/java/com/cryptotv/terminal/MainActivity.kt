package com.cryptotv.terminal

import android.annotation.SuppressLint
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.Process
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebResourceRequest
import android.webkit.WebViewClient
import android.webkit.WebResourceError
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback

/**
 * Crypto TV Terminal — полноэкранный «киоск» для Android TV.
 *
 * • При каждом старте показывается заставка («Проверяю обновления…») минимум 3 сек,
 *   пока идёт проверка OTA и загрузка интерфейса.
 * • Удержание «Назад» на пульте полностью завершает приложение
 *   (тройное быстрое нажатие — запасной выход).
 */
class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private lateinit var root: FrameLayout
    private var splash: View? = null

    // --- splash gating ---
    private val SPLASH_MIN_MS = 3000L      // минимум показа заставки
    private val SPLASH_CAP_MS = 15000L     // жёсткий предел (плохая сеть)
    private var splashMinElapsed = false
    private var pageLoaded = false
    private var updateChecked = false

    // --- exit-on-hold (Назад) ---
    private val backHandler = Handler(Looper.getMainLooper())
    private val exitHoldMs = 1200L
    private var backDownAt = 0L
    private var backTapCount = 0
    private var exitHintShown = false
    private val exitRunnable = Runnable { exitApplication() }
    private val backTapResetRunnable = Runnable { backTapCount = 0 }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        root = FrameLayout(this).apply { setBackgroundColor(0xFF04060B.toInt()) }

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

            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    pageLoaded = true
                    maybeHideSplash()
                }

                override fun onReceivedError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    error: WebResourceError?,
                ) {
                    if (request == null || !request.isForMainFrame) return
                    val url = request.url?.toString() ?: return
                    if (url.contains("ctvt-web")) {
                        UpdateManager.clearWebBundle(this@MainActivity)
                        view?.loadUrl(UpdateManager.resolveWebUrl(this@MainActivity))
                    }
                }

                @Deprecated("Deprecated in Java")
                override fun onReceivedError(
                    view: WebView?,
                    errorCode: Int,
                    description: String?,
                    failingUrl: String?,
                ) {
                    if (failingUrl != null && failingUrl.contains("ctvt-web")) {
                        UpdateManager.clearWebBundle(this@MainActivity)
                        view?.loadUrl(UpdateManager.resolveWebUrl(this@MainActivity))
                    }
                }
            }

            addJavascriptInterface(AndroidHostBridge(), "AndroidHost")
            setBackgroundColor(0xFF04060B.toInt())
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            isFocusable = true
            isFocusableInTouchMode = true
        }

        root.addView(
            webView,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT,
            ),
        )

        // небольшая версия в углу (поверх WebView, под заставкой)
        root.addView(TextView(this).apply {
            text = "v0." + UpdateManager.localWebVersion(applicationContext)
            setTextColor(0x66BFD3E6.toInt())
            textSize = 11f
            setPadding(dp(6), dp(2), dp(6), dp(2))
        }, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT,
        ).apply { gravity = Gravity.BOTTOM or Gravity.END; rightMargin = dp(10); bottomMargin = dp(8) })

        // заставка поверх WebView
        root.addView(buildSplash(), FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT,
        ))

        setContentView(root)
        enterImmersiveMode()
        webView.requestFocus()

        registerBackInterceptors()

        // таймеры заставки: минимум 3 сек + жёсткий предел
        backHandler.postDelayed({ splashMinElapsed = true; maybeHideSplash() }, SPLASH_MIN_MS)
        backHandler.postDelayed({
            splashMinElapsed = true; pageLoaded = true; updateChecked = true; maybeHideSplash()
        }, SPLASH_CAP_MS)

        webView.loadUrl(UpdateManager.resolveWebUrl(applicationContext))

        // проверка обновлений при КАЖДОМ старте (заставка держится, пока идёт)
        Thread {
            val result = UpdateManager.checkAndApply(applicationContext)
            runOnUiThread {
                if (result.webUpdated) {
                    pageLoaded = false
                    webView.loadUrl(result.webUrl)
                }
                if (result.apkFile != null) {
                    UpdateManager.promptInstallApk(this, result.apkFile, result.apkVersionName)
                }
                updateChecked = true
                maybeHideSplash()
            }
        }.start()
    }

    // ---------- splash ----------
    private fun dp(v: Int): Int = (v * resources.displayMetrics.density).toInt()

    private fun buildSplash(): View {
        val layer = FrameLayout(this).apply { setBackgroundColor(0xFF04060B.toInt()) }
        val img = ImageView(this).apply {
            setImageResource(R.drawable.splash)
            scaleType = ImageView.ScaleType.CENTER_CROP
        }
        layer.addView(img, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT,
        ))
        val caption = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        val spinner = ProgressBar(this).apply {
            isIndeterminate = true
        }
        caption.addView(spinner, LinearLayout.LayoutParams(dp(22), dp(22)).apply { rightMargin = dp(12) })
        caption.addView(TextView(this).apply {
            text = "Проверяю обновления…"
            setTextColor(0xFFBFD3E6.toInt())
            textSize = 16f
        })
        layer.addView(caption, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT,
        ).apply { gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL; bottomMargin = dp(48) })
        // версия под надписью проверки обновлений
        layer.addView(TextView(this).apply {
            text = "v0." + UpdateManager.localWebVersion(this@MainActivity)
            setTextColor(0xFF6E84A0.toInt())
            textSize = 12f
        }, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT,
        ).apply { gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL; bottomMargin = dp(24) })
        splash = layer
        return layer
    }

    private fun maybeHideSplash() {
        if (splashMinElapsed && pageLoaded && updateChecked) hideSplash()
    }

    private fun hideSplash() {
        val s = splash ?: return
        splash = null
        s.animate().alpha(0f).setDuration(350L).withEndAction {
            (s.parent as? FrameLayout)?.removeView(s)
        }.start()
    }

    /** WebView забирает BACK раньше Activity.onKeyDown — перехват до super.dispatchKeyEvent. */
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (isExitKey(event.keyCode)) {
            when (event.action) {
                KeyEvent.ACTION_DOWN -> {
                    if (event.repeatCount == 0) {
                        backDownAt = System.currentTimeMillis()
                        backHandler.removeCallbacks(exitRunnable)
                        // удержание → выход; срабатывает даже если ACTION_UP не придёт
                        backHandler.postDelayed(exitRunnable, exitHoldMs)
                        showExitHintOnce()
                    }
                }
                KeyEvent.ACTION_UP -> {
                    val held = if (backDownAt > 0L) System.currentTimeMillis() - backDownAt else 0L
                    backHandler.removeCallbacks(exitRunnable)
                    backDownAt = 0L
                    if (held >= exitHoldMs) {
                        exitApplication()
                    } else {
                        onBackTap()
                    }
                }
            }
            return true
        }
        return super.dispatchKeyEvent(event)
    }

    private fun registerBackInterceptors() {
        // На TV BACK перехватывается в dispatchKeyEvent. Колбэк — страховка:
        // если событие всё же придёт сюда, просто закрываем оверлей (не выходим).
        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    forwardBackToWeb()
                }
            },
        )
    }

    private fun isExitKey(keyCode: Int): Boolean =
        keyCode == KeyEvent.KEYCODE_BACK ||
            keyCode == KeyEvent.KEYCODE_BUTTON_B ||
            keyCode == KeyEvent.KEYCODE_ESCAPE

    private fun showExitHintOnce() {
        if (exitHintShown) return
        exitHintShown = true
        Toast.makeText(this, "Удерживайте «Назад» для выхода", Toast.LENGTH_SHORT).show()
    }

    /** Короткое нажатие: закрыть оверлей; тройное быстрое нажатие — запасной выход. */
    private fun onBackTap() {
        backTapCount++
        backHandler.removeCallbacks(backTapResetRunnable)
        backHandler.postDelayed(backTapResetRunnable, 1600L)
        if (backTapCount >= 3) {
            backTapCount = 0
            exitApplication()
            return
        }
        forwardBackToWeb()
    }

    private fun forwardBackToWeb() {
        webView.evaluateJavascript(
            """
            (function(){
              var menu=document.getElementById('mode-menu');
              if(menu&&!menu.classList.contains('hidden')&&window.CTV_PRO){ CTV_PRO.closeMenu&&CTV_PRO.closeMenu(); return; }
              var ov=document.getElementById('ctv-overlay');
              if(ov&&!ov.classList.contains('hidden')&&typeof closeOverlay==='function'){ closeOverlay(); return; }
            })();
            """.trimIndent(),
            null,
        )
    }

    private fun exitApplication() {
        backHandler.removeCallbacks(exitRunnable)
        backHandler.removeCallbacks(backTapResetRunnable)
        try { webView.loadUrl("about:blank") } catch (_: Exception) {}
        finishAndRemoveTask()
        finishAffinity()
        Process.killProcess(Process.myPid())
        System.exit(0)
    }

    /** Принудительная проверка обновлений из веб-интерфейса (кнопка OTA). */
    private fun triggerUpdateCheck() {
        Thread {
            val result = UpdateManager.checkAndApply(applicationContext)
            runOnUiThread {
                if (result.webUpdated) {
                    pageLoaded = false
                    webView.loadUrl(result.webUrl)
                }
                if (result.apkFile != null) {
                    UpdateManager.promptInstallApk(this, result.apkFile, result.apkVersionName)
                }
                webView.evaluateJavascript(
                    "(function(){ if(window.CTV&&CTV.onOtaCheck)CTV.onOtaCheck(); })();",
                    null,
                )
            }
        }.start()
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
        if (hasFocus) {
            enterImmersiveMode()
            webView.requestFocus()
        }
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
        webView.resumeTimers()
        webView.requestFocus()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }

    private inner class AndroidHostBridge {
        @JavascriptInterface
        fun exitApp() {
            runOnUiThread { exitApplication() }
        }

        @JavascriptInterface
        fun appVersion(): String = BuildConfig.VERSION_NAME

        @JavascriptInterface
        fun appVersionCode(): Int = BuildConfig.VERSION_CODE

        @JavascriptInterface
        fun checkForUpdates() {
            runOnUiThread { triggerUpdateCheck() }
        }
    }
}
