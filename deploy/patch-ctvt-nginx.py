#!/usr/bin/env python3
from pathlib import Path

BLOCK = """
    location /ctvt/ {
        alias /var/www/ctvt/;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Access-Control-Allow-Origin "*";
    }

"""

MARKER = (
    "    location = /CTVT.apk {\n"
    "        alias /opt/lampac-voice-notify/public/CTVT.apk;\n"
    "        default_type application/vnd.android.package-archive;\n"
    "        add_header Content-Disposition 'attachment; filename=\"CTVT.apk\"';\n"
    "        add_header Cache-Control \"public, max-age=86400\";\n"
    "    }\n\n"
    "    location / {"
)

path = Path("/etc/nginx/conf.d/voice-notify.conf")
text = path.read_text(encoding="utf-8")
if "/ctvt/" in text:
    print("ctvt location already present")
else:
    count = text.count(MARKER)
    if count < 1:
        raise SystemExit(f"marker found {count} times in HTTPS block")
    text = text.replace(MARKER, MARKER.replace("    location / {", BLOCK + "    location / {"), 1)
    path.write_text(text, encoding="utf-8")
    print("patched ctvt nginx")
