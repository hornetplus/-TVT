package com.cryptotv.terminal



import android.annotation.SuppressLint

import android.os.Build
import androidx.activity.ComponentActivity

import android.os.Bundle

import android.os.Handler

import android.os.Looper

import android.os.Process

import android.view.KeyEvent

import android.view.View

import android.view.WindowManager

import android.webkit.JavascriptInterface

import android.webkit.WebView

import android.webkit.WebResourceRequest
import android.webkit.WebViewClient
import android.webkit.WebResourceError

import android.widget.FrameLayout

import android.widget.Toast

import androidx.activity.OnBackPressedCallback



/**

 * Crypto TV Terminal — полноэкранный «киоск» для Android TV.

 * OTA в фоне; долгое «Назад» на пульте полностью завершает приложение.

 */

class MainActivity : ComponentActivity() {



    private lateinit var webView: WebView

    private lateinit var root: FrameLayout



    private val backHandler = Handler(Looper.getMainLooper())

    private val backExitMs = 1000L

    private var backPressedAt = 0L

    private var backTapCount = 0

    private var exitHintShown = false



    private val backExitRunnable = Runnable { exitApplication() }

    private val backTapResetRunnable = Runnable { backTapCount = 0 }



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

            webViewClient = object : WebViewClient() {
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



        setContentView(root)

        enterImmersiveMode()

        webView.requestFocus()



        registerBackInterceptors()



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



    /** WebView забирает BACK раньше Activity.onKeyDown — перехват до super.dispatchKeyEvent. */

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {

        if (isExitKey(event.keyCode)) {

            when (event.action) {

                KeyEvent.ACTION_DOWN -> onBackKeyDown(event)

                KeyEvent.ACTION_UP -> onBackKeyUp()

            }

            return true

        }

        return super.dispatchKeyEvent(event)

    }



    private fun registerBackInterceptors() {

        onBackPressedDispatcher.addCallback(

            this,

            object : OnBackPressedCallback(true) {

                override fun handleOnBackPressed() {

                    onBackKeyDown(

                        KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_BACK),

                    )

                }

            },

        )

    }



    private fun isExitKey(keyCode: Int): Boolean =

        keyCode == KeyEvent.KEYCODE_BACK ||

            keyCode == KeyEvent.KEYCODE_BUTTON_B ||

            keyCode == KeyEvent.KEYCODE_ESCAPE



    private fun onBackKeyDown(event: KeyEvent) {

        if (event.repeatCount == 0) {

            backPressedAt = System.currentTimeMillis()

            backHandler.removeCallbacks(backExitRunnable)

            backHandler.postDelayed(backExitRunnable, backExitMs)

            if (!exitHintShown) {

                exitHintShown = true

                Toast.makeText(

                    this,

                    "Удерживайте «Назад» 1 сек для выхода",

                    Toast.LENGTH_SHORT,

                ).show()

            }

        } else if (System.currentTimeMillis() - backPressedAt >= backExitMs) {

            exitApplication()

        }

    }



    private fun onBackKeyUp() {

        val held = if (backPressedAt > 0L) {

            System.currentTimeMillis() - backPressedAt

        } else {

            0L

        }

        backHandler.removeCallbacks(backExitRunnable)

        if (held >= backExitMs) {

            exitApplication()

            return

        }

        backPressedAt = 0L

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

              var ov=document.getElementById('ctv-overlay');

              if(ov&&!ov.classList.contains('hidden')&&typeof closeOverlay==='function'){

                closeOverlay();return;

              }

            })();

            """.trimIndent(),

            null,

        )

    }



    private fun exitApplication() {

        backHandler.removeCallbacks(backExitRunnable)

        backHandler.removeCallbacks(backTapResetRunnable)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {

            finishAndRemoveTask()

        }

        finishAffinity()

        Process.killProcess(Process.myPid())

        System.exit(0)

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

    }

}


