#!/usr/bin/env python3
"""Собирает news.json для CTVT — парсинг RSS напрямую (без rss2json, лимит 429)."""
from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html import unescape
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
OUT_PATH = SCRIPT_DIR / "news.json"

SOURCES = [
    {"name": "ForkLog", "url": "https://forklog.com/feed/", "glyph": "F", "color": "#2BE3F0"},
    {"name": "Cointelegraph", "url": "https://cointelegraph.com/rss", "glyph": "C", "color": "#F0B23B"},
    {"name": "CoinDesk", "url": "https://www.coindesk.com/arc/outboundfeeds/rss/", "glyph": "C", "color": "#F7931A"},
    {"name": "Decrypt", "url": "https://decrypt.co/feed", "glyph": "D", "color": "#1FD98A"},
    {"name": "The Block", "url": "https://www.theblock.co/rss.xml", "glyph": "B", "color": "#6F7CE0"},
    {"name": "U.Today", "url": "https://u.today/rss", "glyph": "U", "color": "#2775CA"},
    {"name": "CryptoSlate", "url": "https://cryptoslate.com/feed/", "glyph": "C", "color": "#2BE3F0"},
    {"name": "Cointelegraph RU", "url": "https://ru.cointelegraph.com/rss", "glyph": "C", "color": "#F0B23B"},
    {"name": "Incrypted", "url": "https://incrypted.com/feed/", "glyph": "I", "color": "#1FD98A"},
    {"name": "Bitcoinist", "url": "https://bitcoinist.com/feed/", "glyph": "B", "color": "#F7931A"},
    {"name": "NewsBTC", "url": "https://www.newsbtc.com/feed/", "glyph": "N", "color": "#1FD98A"},
    {"name": "CryptoPotato", "url": "https://cryptopotato.com/feed/", "glyph": "C", "color": "#F0B23B"},
]

UA = "Mozilla/5.0 (compatible; CTVT-NewsBuilder/2.0; +https://jjkkll.top/ctvt)"
ATOM_NS = {"a": "http://www.w3.org/2005/Atom"}


def strip_html(s: str) -> str:
    s = unescape(s or "")
    s = re.sub(r"<!\[CDATA\[|\]\]>", "", s)
    s = re.sub(r"<[^>]+>", "", s)
    return s.strip()


def parse_date(raw: str) -> str:
    raw = (raw or "").strip()
    if not raw:
        return ""
    try:
        dt = parsedate_to_datetime(raw)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        pass
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})", raw)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)} {m.group(4)}:{m.group(5)}:00"
    return raw


def child_text(node: ET.Element, names: tuple[str, ...]) -> str:
    for name in names:
        el = node.find(name)
        if el is not None and (el.text or "").strip():
            return strip_html(el.text or "")
        el = node.find(f"a:{name}", ATOM_NS)
        if el is not None and (el.text or "").strip():
            return strip_html(el.text or "")
    return ""


def parse_feed_xml(xml_bytes: bytes) -> list[dict]:
    root = ET.fromstring(xml_bytes)
    nodes = root.findall(".//item")
    if not nodes:
        nodes = root.findall(".//a:entry", ATOM_NS)
        if not nodes:
            nodes = [e for e in root.iter() if e.tag.endswith("entry")]
    out: list[dict] = []
    for node in nodes:
        title = child_text(node, ("title",))
        if not title:
            continue
        link = child_text(node, ("link",))
        if not link:
            link_el = node.find("link")
            if link_el is not None:
                link = link_el.get("href") or ""
            if not link:
                link_el = node.find("a:link", ATOM_NS)
                if link_el is not None:
                    link = link_el.get("href") or ""
        date = parse_date(
            child_text(node, ("pubDate", "published", "updated", "dc:date"))
            or (node.find("pubDate") or node.find("published") or {}).get("text", "")
        )
        if not date:
            for el in node:
                tag = el.tag.split("}")[-1] if "}" in el.tag else el.tag
                if tag in ("pubDate", "published", "updated") and (el.text or "").strip():
                    date = parse_date(el.text or "")
                    break
        guid = child_text(node, ("guid", "id")) or link or title
        out.append({"title": title, "link": link, "date": date, "guid": guid})
    return out


def fetch_rss(url: str, timeout: int = 18) -> list[dict]:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/rss+xml, application/xml, text/xml, */*"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return parse_feed_xml(resp.read())


def fetch_rss2json(feed_url: str) -> list[dict]:
    api = "https://api.rss2json.com/v1/api.json?rss_url=" + urllib.parse.quote(feed_url, safe="")
    req = urllib.request.Request(api, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read().decode("utf-8", errors="replace"))
    if data.get("status") != "ok":
        return []
    items = []
    for it in data.get("items") or []:
        title = strip_html(it.get("title") or "")
        if not title:
            continue
        items.append(
            {
                "title": title,
                "link": it.get("link") or "",
                "date": parse_date(it.get("pubDate") or ""),
                "guid": it.get("guid") or it.get("link") or title,
            }
        )
    return items


def load_previous() -> list[dict]:
    if not OUT_PATH.is_file():
        return []
    try:
        data = json.loads(OUT_PATH.read_text(encoding="utf-8"))
        return list(data.get("items") or [])
    except Exception:
        return []


def main() -> None:
    seen: set[str] = set()
    items: list[dict] = []

    for src in SOURCES:
        raw: list[dict] = []
        try:
            raw = fetch_rss(src["url"])
        except Exception:
            time.sleep(0.4)
            try:
                raw = fetch_rss2json(src["url"])
            except Exception:
                raw = []
        for it in raw[:12]:
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
                    "date": it.get("date") or "",
                    "link": it.get("link") or "",
                }
            )
        time.sleep(0.35)

    if len(items) < 8:
        for prev in load_previous():
            uid = prev.get("id") or ""
            if uid and uid not in seen:
                seen.add(uid)
                items.append(prev)

    items.sort(key=lambda x: x.get("date") or "", reverse=True)
    out = {
        "updated": datetime.now(timezone.utc).isoformat(),
        "items": items[:60],
    }

    if len(out["items"]) < 3:
        print(f"ERROR: only {len(out['items'])} items — keeping previous file")
        raise SystemExit(1)

    OUT_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(out['items'])} items -> {OUT_PATH}")


if __name__ == "__main__":
    main()
