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
count = text.count(BLOCK.strip())
if count >= 2:
    print("ctvt location already present in both blocks")
else:
    n = text.count(MARKER)
    if n < 1:
        raise SystemExit(f"marker found {n} times")
    text = text.replace(
        MARKER,
        MARKER.replace("    location / {", BLOCK + "    location / {"),
        n,
    )
    path.write_text(text, encoding="utf-8")
    print(f"patched ctvt nginx ({n} block(s))")
