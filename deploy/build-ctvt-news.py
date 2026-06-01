#!/usr/bin/env python3
"""Собирает news.json для CTVT с rss2json (для TV, где RSS-прокси в WebView нестабильны)."""
from __future__ import annotations

import json
import urllib.parse
import urllib.request
from datetime import datetime, timezone

SOURCES = [
    {"name": "Cointelegraph", "url": "https://cointelegraph.com/rss", "glyph": "C", "color": "#F0B23B"},
    {"name": "CoinDesk", "url": "https://www.coindesk.com/arc/outboundfeeds/rss/", "glyph": "C", "color": "#F7931A"},
    {"name": "Decrypt", "url": "https://decrypt.co/feed", "glyph": "D", "color": "#1FD98A"},
    {"name": "The Block", "url": "https://www.theblock.co/rss.xml", "glyph": "B", "color": "#6F7CE0"},
    {"name": "ForkLog", "url": "https://forklog.com/feed/", "glyph": "F", "color": "#2BE3F0"},
    {"name": "Cointelegraph RU", "url": "https://ru.cointelegraph.com/rss", "glyph": "C", "color": "#F0B23B"},
    {"name": "U.Today", "url": "https://u.today/rss", "glyph": "U", "color": "#2775CA"},
    {"name": "CryptoSlate", "url": "https://cryptoslate.com/feed/", "glyph": "C", "color": "#2BE3F0"},
]


def fetch_rss2json(feed_url: str, timeout: int = 20) -> list[dict]:
    api = (
        "https://api.rss2json.com/v1/api.json?rss_url="
        + urllib.parse.quote(feed_url, safe="")
    )
    req = urllib.request.Request(api, headers={"User-Agent": "CTVT-news-builder/1"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = json.loads(resp.read().decode("utf-8", errors="replace"))
    if data.get("status") != "ok" or not isinstance(data.get("items"), list):
        return []
    return data["items"]


def main() -> None:
    seen: set[str] = set()
    items: list[dict] = []
    for src in SOURCES:
        try:
            raw = fetch_rss2json(src["url"])
        except Exception:
            continue
        for it in raw[:10]:
            title = (it.get("title") or "").strip()
            if not title:
                continue
            uid = f"{src['name']}:{it.get('guid') or it.get('link') or title}"
            if uid in seen:
                continue
            seen.add(uid)
            items.append(
                {
                    "id": uid,
                    "title": title,
                    "source": src["name"],
                    "glyph": src["glyph"],
                    "color": src["color"],
                    "date": it.get("pubDate") or "",
                    "link": it.get("link") or "",
                }
            )
    items.sort(key=lambda x: x.get("date") or "", reverse=True)
    out = {
        "updated": datetime.now(timezone.utc).isoformat(),
        "items": items[:60],
    }
    out_path = __file__.replace("build-ctvt-news.py", "news.json")
    # write next to script
    from pathlib import Path

    path = Path(__file__).resolve().parent / "news.json"
    path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(out['items'])} items -> {path}")


if __name__ == "__main__":
    main()
