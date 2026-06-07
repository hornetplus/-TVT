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
    private const val CHECK_COOLDOWN_MS = 0L // проверять обновления при КАЖДОМ старте
    private const val WEB_DIR = "ctvt-web"
    const val BUNDLED_WEB_VERSION = 60

    private val REQUIRED_WEB_FILES = arrayOf("index.html", "api.js", "terminal.js", "config.js")

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

    /** OTA-папка целая? Иначе откат на assets из APK. */
    fun isWebBundleValid(ctx: Context): Boolean {
        val root = webRoot(ctx)
        for (name in REQUIRED_WEB_FILES) {
            val f = File(root, name)
            if (!f.isFile || f.length() < 32L) return false
        }
        return true
    }

    fun clearWebBundle(ctx: Context) {
        val root = webRoot(ctx)
        if (root.exists()) deleteRecursive(root)
        prefs(ctx).edit()
            .remove(KEY_WEB_VERSION)
            .remove(KEY_WEB_SHA256)
            .apply()
        Log.w(TAG, "Cleared broken OTA web bundle")
    }

    fun resolveWebUrl(ctx: Context): String {
        if (isWebBundleValid(ctx)) {
            return "file://${File(webRoot(ctx), "index.html").absolutePath}"
        }
        if (webRoot(ctx).exists()) clearWebBundle(ctx)
        return "file:///android_asset/web/index.html"
    }

    fun checkAndApply(ctx: Context): Result {
        var webUrl = resolveWebUrl(ctx)
        var webUpdated = false
        var apkFile: File? = null
        var apkName: String? = null

        try {
            if (!isWebBundleValid(ctx)) {
                Log.i(TAG, "Using bundled web (OTA invalid or missing)")
            }

            val now = System.currentTimeMillis()
            val p = prefs(ctx)
            val lastCheck = p.getLong(KEY_LAST_CHECK_MS, 0L)
            val lastRemote = p.getInt(KEY_LAST_REMOTE_WEB, 0)
            val localWeb = localWebVersion(ctx)
            val indexOk = isWebBundleValid(ctx)
            val storedSha = p.getString(KEY_WEB_SHA256, "")?.lowercase() ?: ""

            val manifest = fetchJson(VERSION_URL)
            if (manifest == null) {
                Log.w(TAG, "version.json unavailable")
                return Result(webUrl, false)
            }

            val remoteWeb = manifest.optInt("webVersion", 0)
            val expectedSha = manifest.optString("webBundleSha256", "").lowercase()
            val shaOk = expectedSha.isBlank() || expectedSha == storedSha
            val needsUpdate =
                remoteWeb > localWeb ||
                    !indexOk ||
                    (expectedSha.isNotBlank() && !shaOk)

            val onCooldown =
                !needsUpdate &&
                    now - lastCheck < CHECK_COOLDOWN_MS &&
                    indexOk &&
                    localWeb >= remoteWeb &&
                    remoteWeb > 0

            if (onCooldown) {
                Log.d(TAG, "Skip download (cooldown, web v$localWeb)")
                p.edit().putLong(KEY_LAST_CHECK_MS, now).apply()
                return Result(webUrl, false)
            }

            if (needsUpdate && remoteWeb > 0) {
                val bundleUrl = manifest.optString("webBundleUrl", "")
                if (bundleUrl.isNotBlank()) {
                    val ok = downloadWebBundle(ctx, bundleUrl, expectedSha, remoteWeb)
                    if (ok) {
                        webUpdated = true
                        webUrl = resolveWebUrl(ctx)
                        Log.i(TAG, "Web bundle updated to v$remoteWeb")
                    } else {
                        Log.w(TAG, "Web bundle download failed, keeping current web")
                        webUrl = resolveWebUrl(ctx)
                    }
                }
            }

            p.edit()
                .putLong(KEY_LAST_CHECK_MS, now)
                .putInt(KEY_LAST_REMOTE_WEB, remoteWeb)
                .apply()

            val remoteApkCode = manifest.optInt("apkVersionCode", 0)
            val apkUrl = manifest.optString("apkUrl", "")
            val apkSha = manifest.optString("apkSha256", "").trim()
            if (
                BuildConfig.SELF_UPDATE_APK &&   // во флаворе rustore = false → APK обновляется через RuStore
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
            webUrl = resolveWebUrl(ctx)
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
                .trimStart('\uFEFF')
                .trim()
            return JSONObject(text)
        } catch (e: Exception) {
            Log.w(TAG, "JSON parse failed: ${e.message}")
            return null
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
        if (!isWebBundleValidIn(tmp)) {
            Log.w(TAG, "Unpacked bundle incomplete")
            deleteRecursive(tmp)
            cache.delete()
            return false
        }
        val backup = File(ctx.filesDir, "$WEB_DIR.bak")
        if (backup.exists()) deleteRecursive(backup)
        if (dest.exists()) {
            if (!dest.renameTo(backup)) {
                deleteRecursive(backup)
                copyRecursive(dest, backup)
                deleteRecursive(dest)
            }
        }
        val installed = if (tmp.renameTo(dest)) {
            true
        } else {
            copyRecursive(tmp, dest)
            isWebBundleValid(ctx)
        }
        deleteRecursive(tmp)
        cache.delete()
        if (!installed || !isWebBundleValid(ctx)) {
            Log.w(TAG, "Install failed, restoring backup if any")
            deleteRecursive(dest)
            if (backup.exists()) backup.renameTo(dest)
            deleteRecursive(backup)
            return false
        }
        deleteRecursive(backup)
        prefs(ctx).edit()
            .putInt(KEY_WEB_VERSION, newVersion)
            .putString(KEY_WEB_SHA256, expectedSha256)
            .apply()
        return true
    }

    private fun isWebBundleValidIn(dir: File): Boolean {
        for (name in REQUIRED_WEB_FILES) {
            val f = File(dir, name)
            if (!f.isFile || f.length() < 32L) return false
        }
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

