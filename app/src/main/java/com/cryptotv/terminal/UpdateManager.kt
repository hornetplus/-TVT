package com.cryptotv.terminal

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.BufferedInputStream
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.zip.ZipInputStream

/**
 * OTA: при старте проверяет https://jjkkll.top/ctvt/version.json
 * — web-bundle (HTML/JS/CSS) без переустановки APK;
 * — опционально новый APK, если versionCode на сервере выше.
 */
object UpdateManager {

    private const val TAG = "CTVTUpdate"
    const val VERSION_URL = "https://jjkkll.top/ctvt/version.json"
    private const val PREFS = "ctvt_updates"
    private const val KEY_WEB_VERSION = "web_version"
    private const val KEY_WEB_SHA256 = "web_bundle_sha256"
    private const val KEY_LAST_CHECK_MS = "last_check_ms"
    private const val KEY_LAST_REMOTE_WEB = "last_remote_web"
    private const val CHECK_COOLDOWN_MS = 6 * 60 * 60 * 1000L // без новой версии на сервере — не дергаем сеть
    private const val WEB_DIR = "ctvt-web"
    /** Версия web, вшитая в APK (assets/web). */
    const val BUNDLED_WEB_VERSION = 7

    data class Result(
        val webUrl: String,
        val webUpdated: Boolean,
        val apkFile: File? = null,
        val apkVersionName: String? = null,
    )

    private fun prefs(ctx: Context): SharedPreferences =
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun localWebVersion(ctx: Context): Int =
        prefs(ctx).getInt(KEY_WEB_VERSION, BUNDLED_WEB_VERSION)

    fun webRoot(ctx: Context): File = File(ctx.filesDir, WEB_DIR)

    fun resolveWebUrl(ctx: Context): String {
        val index = File(webRoot(ctx), "index.html")
        return if (index.isFile) {
            "file://${index.absolutePath}"
        } else {
            "file:///android_asset/web/index.html"
        }
    }

    fun checkAndApply(ctx: Context): Result {
        var webUrl = resolveWebUrl(ctx)
        var webUpdated = false
        var apkFile: File? = null
        var apkName: String? = null

        try {
            val now = System.currentTimeMillis()
            val p = prefs(ctx)
            val lastCheck = p.getLong(KEY_LAST_CHECK_MS, 0L)
            val lastRemote = p.getInt(KEY_LAST_REMOTE_WEB, 0)
            val localWeb = localWebVersion(ctx)
            val indexOk = File(webRoot(ctx), "index.html").isFile

            if (
                now - lastCheck < CHECK_COOLDOWN_MS &&
                indexOk &&
                localWeb >= lastRemote &&
                lastRemote > 0
            ) {
                Log.d(TAG, "Skip update check (cooldown, web v$localWeb)")
                return Result(webUrl, false)
            }

            val manifest = fetchJson(VERSION_URL) ?: return Result(webUrl, false)

            val remoteWeb = manifest.optInt("webVersion", 0)
            val expectedSha = manifest.optString("webBundleSha256", "").lowercase()
            val storedSha = p.getString(KEY_WEB_SHA256, "")?.lowercase() ?: ""
            val alreadyHaveBundle =
                remoteWeb <= localWeb &&
                    expectedSha.isNotBlank() &&
                    expectedSha == storedSha &&
                    indexOk

            if (!alreadyHaveBundle && remoteWeb > localWeb) {
                val bundleUrl = manifest.optString("webBundleUrl", "")
                if (bundleUrl.isNotBlank()) {
                    val ok = downloadWebBundle(ctx, bundleUrl, expectedSha, remoteWeb)
                    if (ok) {
                        webUpdated = true
                        webUrl = resolveWebUrl(ctx)
                        Log.i(TAG, "Web bundle updated to v$remoteWeb")
                    }
                }
            } else if (alreadyHaveBundle) {
                Log.d(TAG, "Web bundle up to date (v$localWeb)")
            }

            p.edit()
                .putLong(KEY_LAST_CHECK_MS, now)
                .putInt(KEY_LAST_REMOTE_WEB, remoteWeb)
                .apply()

            val remoteApkCode = manifest.optInt("apkVersionCode", 0)
            val apkUrl = manifest.optString("apkUrl", "")
            val apkSha = manifest.optString("apkSha256", "").trim()
            if (
                remoteApkCode > BuildConfig.VERSION_CODE &&
                apkUrl.isNotBlank() &&
                apkSha.isNotBlank()
            ) {
                val f = downloadApk(ctx, apkUrl, apkSha)
                if (f != null) {
                    apkFile = f
                    apkName = manifest.optString("apkVersionName", "")
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Update check failed: ${e.message}")
        }

        return Result(webUrl, webUpdated, apkFile, apkName)
    }

    private fun fetchJson(url: String): JSONObject? {
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = 12_000
            readTimeout = 20_000
            requestMethod = "GET"
            setRequestProperty("Cache-Control", "no-cache")
        }
        try {
            if (conn.responseCode !in 200..299) return null
            val text = conn.inputStream.bufferedReader().readText()
            return JSONObject(text)
        } finally {
            conn.disconnect()
        }
    }

    private fun downloadWebBundle(
        ctx: Context,
        url: String,
        expectedSha256: String,
        newVersion: Int,
    ): Boolean {
        val cache = File(ctx.cacheDir, "web-bundle.zip")
        if (!downloadFile(url, cache)) return false
        if (expectedSha256.isNotBlank() && sha256(cache) != expectedSha256) {
            Log.w(TAG, "Web bundle SHA256 mismatch")
            cache.delete()
            return false
        }
        val dest = webRoot(ctx)
        val tmp = File(ctx.filesDir, "$WEB_DIR.new")
        if (tmp.exists()) deleteRecursive(tmp)
        if (!unzip(cache, tmp)) {
            deleteRecursive(tmp)
            cache.delete()
            return false
        }
        val index = File(tmp, "index.html")
        if (!index.isFile) {
            deleteRecursive(tmp)
            cache.delete()
            return false
        }
        if (dest.exists()) deleteRecursive(dest)
        if (!tmp.renameTo(dest)) {
            copyRecursive(tmp, dest)
            deleteRecursive(tmp)
        }
        cache.delete()
        prefs(ctx).edit()
            .putInt(KEY_WEB_VERSION, newVersion)
            .putString(KEY_WEB_SHA256, expectedSha256)
            .apply()
        return true
    }

    private fun downloadApk(ctx: Context, url: String, expectedSha256: String): File? {
        val out = File(ctx.cacheDir, "update.apk")
        if (!downloadFile(url, out)) return null
        if (expectedSha256.isNotBlank() && sha256(out) != expectedSha256.lowercase()) {
            out.delete()
            return null
        }
        return out
    }

    private fun downloadFile(url: String, dest: File): Boolean {
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = 15_000
            readTimeout = 120_000
            requestMethod = "GET"
        }
        try {
            if (conn.responseCode !in 200..299) return false
            dest.parentFile?.mkdirs()
            conn.inputStream.use { input ->
                FileOutputStream(dest).use { output ->
                    val buf = ByteArray(8192)
                    var n: Int
                    while (input.read(buf).also { n = it } > 0) output.write(buf, 0, n)
                }
            }
            return dest.length() > 0
        } catch (e: Exception) {
            Log.w(TAG, "Download failed: ${e.message}")
            dest.delete()
            return false
        } finally {
            conn.disconnect()
        }
    }

    private fun unzip(zip: File, destDir: File): Boolean {
        destDir.mkdirs()
        return try {
            ZipInputStream(BufferedInputStream(zip.inputStream())).use { zis ->
                var entry = zis.nextEntry
                while (entry != null) {
                    val name = entry.name.replace('\\', '/')
                    if (!name.contains("..")) {
                        val out = File(destDir, name)
                        if (entry.isDirectory) {
                            out.mkdirs()
                        } else {
                            out.parentFile?.mkdirs()
                            FileOutputStream(out).use { zis.copyTo(it) }
                        }
                    }
                    zis.closeEntry()
                    entry = zis.nextEntry
                }
            }
            true
        } catch (e: Exception) {
            Log.w(TAG, "Unzip failed: ${e.message}")
            false
        }
    }

    private fun sha256(file: File): String {
        val md = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buf = ByteArray(8192)
            var n: Int
            while (input.read(buf).also { n = it } > 0) md.update(buf, 0, n)
        }
        return md.digest().joinToString("") { "%02x".format(it) }
    }

    private fun deleteRecursive(f: File) {
        if (f.isDirectory) f.listFiles()?.forEach { deleteRecursive(it) }
        f.delete()
    }

    private fun copyRecursive(src: File, dest: File) {
        if (src.isDirectory) {
            dest.mkdirs()
            src.listFiles()?.forEach { copyRecursive(it, File(dest, it.name)) }
        } else {
            dest.parentFile?.mkdirs()
            src.inputStream().use { i ->
                FileOutputStream(dest).use { o -> i.copyTo(o) }
            }
        }
    }

    fun promptInstallApk(activity: Activity, apk: File, versionName: String?) {
        if (!apk.isFile) return
        try {
            val uri: Uri = FileProvider.getUriForFile(
                activity,
                "${activity.packageName}.fileprovider",
                apk,
            )
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            activity.startActivity(intent)
        } catch (e: Exception) {
            Log.w(TAG, "APK install intent failed: ${e.message}")
        }
    }
}
