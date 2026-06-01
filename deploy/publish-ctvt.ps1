# Публикует web-bundle + version.json (+ опционально APK) на jjkkll.top
param(
    [string]$ServerHost = "132.243.115.31",
    [string]$ServerUser = "root",
    [string]$ServerPassword = "Samsung1992",
    [int]$WebVersion = 3,
    [int]$ApkVersionCode = 2,
    [string]$ApkVersionName = "1.1",
    [switch]$SkipApk
)

$ErrorActionPreference = "Stop"
$pscp = "C:\Program Files\PuTTY\pscp.exe"
$plink = "C:\Program Files\PuTTY\plink.exe"
$root = Split-Path $PSScriptRoot -Parent
$webSrc = Join-Path $root "app\src\main\assets\web"
$outDir = Join-Path $env:TEMP "ctvt-publish"
$zipPath = Join-Path $outDir "web-bundle.zip"
$verPath = Join-Path $outDir "version.json"

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Compress-Archive -Path (Join-Path $webSrc "*") -DestinationPath $zipPath -Force
$hash = (Get-FileHash -Path $zipPath -Algorithm SHA256).Hash.ToLower()

$manifest = @{
    webVersion       = $WebVersion
    webBundleUrl     = "https://jjkkll.top/ctvt/web-bundle.zip"
    webBundleSha256  = $hash
    apkVersionCode   = $ApkVersionCode
    apkVersionName   = $ApkVersionName
    apkUrl           = "https://jjkkll.top/CTVT.apk"
    apkSha256        = ""
} | ConvertTo-Json -Depth 4

Set-Content -Path $verPath -Value $manifest -Encoding UTF8

$batch = @("-pw", $ServerPassword, "-batch")
& $plink @("-ssh", "${ServerUser}@${ServerHost}", "-pw", $ServerPassword, "-batch") "mkdir -p /var/www/ctvt"
& $pscp @($batch + $zipPath + "${ServerUser}@${ServerHost}:/var/www/ctvt/web-bundle.zip")
& $pscp @($batch + $verPath + "${ServerUser}@${ServerHost}:/var/www/ctvt/version.json")

if (-not $SkipApk) {
    $apkLocal = Join-Path $root "app\build\outputs\apk\debug\app-debug.apk"
    if (-not (Test-Path $apkLocal)) {
        Write-Host "APK not found at $apkLocal - build first or use -SkipApk"
    } else {
        $apkHash = (Get-FileHash -Path $apkLocal -Algorithm SHA256).Hash.ToLower()
        $manifestObj = Get-Content $verPath -Raw | ConvertFrom-Json
        $manifestObj.apkSha256 = $apkHash
        $manifestObj | ConvertTo-Json -Depth 4 | Set-Content $verPath -Encoding UTF8
        & $pscp @($batch + $apkLocal + "${ServerUser}@${ServerHost}:/opt/lampac-voice-notify/public/CTVT.apk")
        & $pscp @($batch + $verPath + "${ServerUser}@${ServerHost}:/var/www/ctvt/version.json")
    }
}

Write-Host "Published web v$WebVersion"
Write-Host "  https://jjkkll.top/ctvt/version.json"
Write-Host "  https://jjkkll.top/ctvt/web-bundle.zip"
