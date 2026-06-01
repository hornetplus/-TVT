/* =========================================================
   Crypto TV Terminal — слой реальных данных
   Тянет данные с публичных API, приводит к форме DTO (ТЗ §7),
   кэширует последнее валидное значение и рассылает события.
   UI (terminal.js) подписывается на FEED и только перерисовывает.
   Все запросы — с таймаутом и запасными источниками; при сбое
   данные не фабрикуются (показывается «—» или последнее валидное).
   ========================================================= */
'use strict';

/* ---------- простая шина событий ---------- */
const FEED = (() => {
  const subs = {};
  return {
    on(ch, cb) { (subs[ch] = subs[ch] || []).push(cb); },
    emit(ch, data) { (subs[ch] || []).forEach((cb) => { try { cb(data); } catch (e) { console.error(e); } }); },
  };
})();

/* ---------- сетевые помощники с таймаутом ---------- */
async function fetchText(url, timeout = 12000, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.text();
  } finally { clearTimeout(t); }
}
async function fetchJSON(url, opts = {}, timeout = 12000) {
  return JSON.parse(await fetchText(url, timeout, opts));
}
function cgHeaders() {
  return CONFIG.keys.coingeckoDemo ? { 'x-cg-demo-api-key': CONFIG.keys.coingeckoDemo } : {};
}

/* ---------- утилиты ---------- */
let lastMarkets = {};
function cleanText(s) {
  if (!s) return '';
  return s.replace(/<!\[CDATA\[|\]\]>/g, '')
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
          .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
          .trim();
}
function relTime(date) {
  const sec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (sec < 60) return 'сейчас';
  const min = Math.floor(sec / 60);
  if (min < 60) return min + ' мин';
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + ' ч';
  return Math.floor(hr / 24) + ' дн';
}
function fmtQty(n) {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return Math.round(n).toLocaleString('en-US');
  if (n >= 1)   return n.toFixed(0);
  return n.toFixed(2);
}
function fmtUsdShort(n) {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}
function whaleTradeOk(trade) {
  return trade && Number.isFinite(trade.sz) && trade.sz > 0
    && Number.isFinite(trade.usd) && trade.usd > 0;
}
function categorize(title) {
  const t = (title || '').toLowerCase();
  if (/\bnft\b|нфт/.test(t)) return 'nft';
  if (/binance|coinbase|kraken|okx|exchange|listing|бирж/.test(t)) return 'exchange';
  if (/defi|tvl|stak|staking|yield|rollup|\bl2\b|liquidity|стейк|дефи/.test(t)) return 'defi';
  if (/bitcoin|btc|биткоин|биткойн/.test(t)) return 'btc';
  return 'market';
}

/* ---------- 1. РЫНОК: цены/24ч/7д/объём/спарклайн (CoinGecko) ---------- */
async function pollMarkets() {
  const ids = Object.values(CONFIG.coingeckoIds).join(',');
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}` +
              `&order=market_cap_desc&per_page=250&page=1&sparkline=true&price_change_percentage=24h,7d`;
  const data = await fetchJSON(url, { headers: cgHeaders() }, 15000);
  if (!Array.isArray(data)) throw new Error('markets: bad shape');
  const idToSym = {};
  Object.entries(CONFIG.coingeckoIds).forEach(([s, i]) => { idToSym[i] = s; });
  const bySym = {};
  data.forEach((c) => {
    const sym = idToSym[c.id];
    if (!sym) return;
    bySym[sym] = {
      symbol: sym,
      priceUsd: c.current_price,
      change24hPct: c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h ?? 0,
      change7dPct: c.price_change_percentage_7d_in_currency ?? 0,
      volumeUsd: c.total_volume,
      high24h: c.high_24h,
      low24h: c.low_24h,
      sparkline: (c.sparkline_in_7d && c.sparkline_in_7d.price) ? c.sparkline_in_7d.price : [],
    };
  });
  lastMarkets = bySym;
  FEED.emit('markets', bySym);
}

/* ---------- 2. ГЛОБАЛ: капитализация + доминация BTC ---------- */
async function pollGlobal() {
  const d = await fetchJSON('https://api.coingecko.com/api/v3/global', { headers: cgHeaders() }, 15000);
  const g = d && d.data;
  if (!g) throw new Error('global: bad shape');
  FEED.emit('global', {
    capUsd: g.total_market_cap.usd,
    capChangePct: g.market_cap_change_percentage_24h_usd,
    btcDominance: g.market_cap_percentage.btc,
  });
}

/* ---------- 3. Индекс страха и жадности (alternative.me) ---------- */
async function pollFng() {
  const d = await fetchJSON('https://api.alternative.me/fng/?limit=1', {}, 12000);
  const v = d && d.data && d.data[0];
  if (!v) throw new Error('fng: bad shape');
  FEED.emit('fng', { value: +v.value, label: v.value_classification });
}

/* ---------- 4. ГАЗ Ethereum (публичный JSON-RPC) ---------- */
async function rpc(method, params) {
  for (const url of CONFIG.ethRpc) {
    try {
      const d = await fetchJSON(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      }, 12000);
      if (d && d.result !== undefined) return d.result;
    } catch (e) { /* следующий RPC */ }
  }
  throw new Error('eth rpc: all failed');
}
function gasGweiDisplay(n) {
  if (!Number.isFinite(n) || n <= 0) return null;
  return n < 10 ? Math.round(n * 10) / 10 : Math.round(n);
}

function emitGas(low, avg, high) {
  if (!Number.isFinite(avg) || avg <= 0) return;
  const ethPrice = (lastMarkets.ETH && lastMarkets.ETH.priceUsd) || 0;
  const usd = ethPrice ? (21000 * avg * 1e-9 * ethPrice) : null;
  FEED.emit('gas', {
    low: gasGweiDisplay(low),
    avg: gasGweiDisplay(avg),
    high: gasGweiDisplay(high),
    usd: usd != null ? '$' + usd.toFixed(2) : null,
  });
}

async function pollGasOwlracle() {
  const url = (CONFIG.gasApiUrl) || 'https://api.owlracle.info/v2/eth/gas';
  const d = await fetchJSON(url, {}, 10000);
  const sp = d && d.speeds;
  if (!Array.isArray(sp) || sp.length < 3) throw new Error('owlracle: bad shape');
  const pick = (i) => parseFloat(sp[i] && sp[i].gasPrice);
  const low = pick(0);
  const avg = pick(1);
  const high = pick(Math.min(2, sp.length - 1));
  emitGas(low, avg, high);
}

async function pollGasRpc() {
  let low, avg, high;
  try {
    const r = await rpc('eth_feeHistory', ['0x5', 'latest', [10, 50, 90]]);
    const baseArr = r && r.baseFeePerGas;
    const rew = r && r.reward;
    if (!Array.isArray(baseArr) || !baseArr.length || !Array.isArray(rew) || !rew.length) {
      throw new Error('feeHistory empty');
    }
    const base = parseInt(baseArr[baseArr.length - 1], 16);
    const n = rew.length;
    const avgP = (i) => {
      let sum = 0;
      let cnt = 0;
      rew.forEach((row) => {
        if (row && row[i] != null) {
          sum += parseInt(row[i], 16);
          cnt++;
        }
      });
      return cnt ? sum / cnt : 0;
    };
    low = (base + avgP(0)) / 1e9;
    avg = (base + avgP(1)) / 1e9;
    high = (base + avgP(2)) / 1e9;
  } catch (e) {
    const gp = parseInt(await rpc('eth_gasPrice', []), 16) / 1e9;
    if (!Number.isFinite(gp) || gp <= 0) throw e;
    low = gp * 0.85;
    avg = gp;
    high = gp * 1.25;
  }
  emitGas(low, avg, high);
}

async function pollGas() {
  try {
    await pollGasOwlracle();
    return;
  } catch (e) { /* RPC */ }
  try {
    await pollGasRpc();
  } catch (e) {
    FEED.emit('status', { channel: 'gas', ok: false, err: String(e.message || e) });
  }
}

/* ---------- 5. ФАНДИНГ (OKX → Bybit) ---------- */
async function pollFunding() {
  const out = [];
  for (const sym of CONFIG.funding.symbols) {
    let rate = null;
    try {
      const d = await fetchJSON(`https://www.okx.com/api/v5/public/funding-rate?instId=${CONFIG.funding.okxInst(sym)}`, {}, 10000);
      const r = d && d.data && d.data[0] && d.data[0].fundingRate;
      if (r != null && r !== '') rate = parseFloat(r) * 100;
    } catch (e) { /* пробуем bybit */ }
    if (rate === null) {
      try {
        const d = await fetchJSON(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${CONFIG.funding.bybitSym(sym)}`, {}, 10000);
        const r = d && d.result && d.result.list && d.result.list[0] && d.result.list[0].fundingRate;
        if (r != null && r !== '') rate = parseFloat(r) * 100;
      } catch (e) { /* оставляем null */ }
    }
    out.push({ sym, val: rate });
  }
  FEED.emit('funding', out);
}

/* ---------- 6. НОВОСТИ (CryptoPanic / RSS через прокси) ---------- */
let newsSeen = new Set();
let newsBootstrapped = false;
let newsIdx = 0;

function parseRss(xml) {
  const out = [];
  try {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    let nodes = [...doc.querySelectorAll('item')];
    if (!nodes.length) nodes = [...doc.querySelectorAll('entry')]; // Atom
    nodes.forEach((it) => {
      const title = (it.querySelector('title') || {}).textContent || '';
      let link = (it.querySelector('link') || {}).textContent || '';
      if (!link) { const l = it.querySelector('link'); if (l) link = l.getAttribute('href') || ''; }
      const dt = (it.querySelector('pubDate') || it.querySelector('published') || it.querySelector('updated') || {}).textContent || '';
      out.push({ title, link, date: dt });
    });
  } catch (e) { /* ignore */ }
  return out;
}

function newsMaxAgeMs() {
  return (CONFIG.news && CONFIG.news.maxAgeMs) || 5 * 3600000;
}

function parseNewsDate(raw) {
  if (!raw) return new Date();
  if (raw instanceof Date && !isNaN(raw.getTime())) return raw;
  const s = String(raw).trim();
  // rss2json: "2026-06-01 07:09:14" — в WebView на TV Date() часто даёт Invalid Date
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)));
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) {
    const d2 = new Date(s + 'Z');
    if (!isNaN(d2.getTime())) return d2;
  }
  return new Date();
}

function isNewsFresh(date) {
  const d = parseNewsDate(date);
  if (isNaN(d.getTime())) return false;
  return Date.now() - d.getTime() <= newsMaxAgeMs();
}

function ingestNews(items, opts) {
  const relaxed = opts && opts.relaxed;
  const maxMs = relaxed ? 24 * 3600000 : newsMaxAgeMs();
  let added = 0;
  items.forEach((it) => {
    if (!it.title || newsSeen.has(it.id)) return;
    const date = parseNewsDate(it.date);
    if (isNaN(date.getTime())) return;
    if (Date.now() - date.getTime() > maxMs) return;
    newsSeen.add(it.id);
    added++;
    FEED.emit('news:item', {
      id: it.id,
      title: it.title,
      source: it.source,
      glyph: it.glyph || (it.source ? it.source[0].toUpperCase() : '•'),
      color: it.color || '#2BE3F0',
      cat: categorize(it.title),
      date,
      isNew: newsBootstrapped, // первая загрузка — без вспышки; далее — подсветка нового
    });
  });
  if (newsSeen.size > 4000) newsSeen = new Set([...newsSeen].slice(-2000));
  return added;
}

async function fetchFeed(src) {
  for (const proxy of CONFIG.rssProxies) {
    try {
      if (proxy.type === 'rss2json') {
        const d = await fetchJSON(proxy.build(src.url, CONFIG.keys.rss2json), {}, 15000);
        if (d && d.status === 'ok' && Array.isArray(d.items) && d.items.length) {
          const added = ingestNews(d.items.slice(0, 8).map((it) => ({
            id: src.name + ':' + (it.guid || it.link || it.title),
            title: cleanText(it.title), source: src.name, glyph: src.glyph, color: src.color,
            date: parseNewsDate(it.pubDate),
          })));
          if (added) return true;
        }
      } else if (proxy.type === 'allorigins-get') {
        const d = await fetchJSON(proxy.build(src.url), {}, 15000);
        const xml = d && (d.contents || d.content);
        if (xml) {
          const parsed = parseRss(xml).slice(0, 8).map((it) => ({
            id: src.name + ':' + (it.link || it.title),
            title: cleanText(it.title), source: src.name, glyph: src.glyph, color: src.color,
            date: parseNewsDate(it.date),
          }));
          if (parsed.length && ingestNews(parsed)) return true;
        }
      } else {
        const xml = await fetchText(proxy.build(src.url), 15000);
        const parsed = parseRss(xml).slice(0, 8).map((it) => ({
          id: src.name + ':' + (it.link || it.title),
          title: cleanText(it.title), source: src.name, glyph: src.glyph, color: src.color,
          date: parseNewsDate(it.date),
        }));
        if (parsed.length && ingestNews(parsed)) return true;
      }
    } catch (e) { /* следующий прокси */ }
  }
  return false;
}

async function pollNewsBundle() {
  const url = (CONFIG.news && CONFIG.news.bundleUrl) || 'https://jjkkll.top/ctvt/news.json';
  try {
    const d = await fetchJSON(url + (url.includes('?') ? '&' : '?') + '_=' + Date.now(), {}, 15000);
    const items = (d && d.items) || (Array.isArray(d) ? d : []);
    if (!items.length) return false;
    const mapped = items.map((it) => ({
      id: it.id || ('bundle:' + (it.link || it.title)),
      title: cleanText(it.title),
      source: it.source || 'CTVT',
      glyph: it.glyph,
      color: it.color || '#2BE3F0',
      date: it.date || it.pubDate,
    }));
    return ingestNews(mapped, { relaxed: true }) > 0;
  } catch (e) { /* fallback */ }
  return false;
}

async function pollNewsRssBurst() {
  const burst = (CONFIG.news && CONFIG.news.burstSources) || CONFIG.newsSources.slice(0, 6);
  let got = 0;
  await Promise.allSettled(burst.map((src) => fetchFeed(src).then((ok) => { if (ok) got++; })));
  return got > 0;
}

async function pollNews() {
  const fromBundle = await pollNewsBundle();
  if (fromBundle) {
    newsBootstrapped = true;
    FEED.emit('status', { channel: 'news', ok: true, source: 'bundle' });
    return;
  }
  if (await pollNewsRssBurst()) {
    newsBootstrapped = true;
    return;
  }
  if (CONFIG.keys.cryptopanic) {
    try {
      const api = `https://cryptopanic.com/api/v1/posts/?auth_token=${CONFIG.keys.cryptopanic}&public=true&kind=news`;
      const proxied = `https://api.allorigins.win/raw?url=${encodeURIComponent(api)}`;
      const d = await fetchJSON(proxied, {}, 15000);
      if (d && Array.isArray(d.results) && d.results.length) {
        ingestNews(d.results.map((p) => ({
          id: 'cp' + p.id,
          title: cleanText(p.title),
          source: (p.source && (p.source.title || p.source.domain)) || 'CryptoPanic',
          date: p.published_at ? new Date(p.published_at) : new Date(),
        })));
        newsBootstrapped = true;
        return;
      }
    } catch (e) { /* откат к RSS */ }
  }
  const srcs = CONFIG.newsSources;
  const n = (CONFIG.news && CONFIG.news.sourcesPerPoll) || 8;
  await Promise.allSettled(
    Array.from({ length: n }, () => fetchFeed(srcs[(newsIdx++) % srcs.length]))
  );
  newsBootstrapped = true;
}

/* ---------- 7. КРУПНЫЕ СДЕЛКИ (Binance → OKX → Bybit) ---------- */
let whaleSeen = new Set();

function emitWhaleTrade(p, trade) {
  if (!whaleTradeOk(trade)) return;
  const key = trade.source + ':' + trade.id;
  if (whaleSeen.has(key)) return;
  whaleSeen.add(key);
  FEED.emit('whale', {
    asset: p.sym,
    dir: trade.side === 'buy' ? 'in' : 'out',
    amount: (trade.side === 'buy' ? '+' : '-') + fmtQty(trade.sz) + ' ' + p.sym,
    usd: '$' + fmtUsdShort(trade.usd),
    addr: trade.source + ' · спот',
    ts: trade.ts,
  });
}

function emitWhaleHits(p, hits) {
  const ok = hits.filter(whaleTradeOk);
  ok.sort((a, b) => b.usd - a.usd);
  let n = 0;
  ok.slice(0, 4).forEach((h) => {
    emitWhaleTrade(p, h);
    n++;
  });
  return n;
}

async function whaleFromBinance(p) {
  const d = await fetchJSON(
    `https://api.binance.com/api/v3/aggTrades?symbol=${p.binance}&limit=200`,
    {},
    10000
  );
  if (!Array.isArray(d)) return 0;
  const cutoff = Date.now() - 300000;
  const hits = [];
  for (const t of d) {
    const px = parseFloat(t.p);
    const sz = parseFloat(t.q);
    const usd = px * sz;
    const ts = +t.T;
    if (usd < p.minUsd || ts < cutoff) continue;
    hits.push({
      id: 'bn' + t.a,
      side: t.m ? 'sell' : 'buy',
      sz,
      usd,
      ts,
      source: 'Binance',
    });
  }
  return emitWhaleHits(p, hits);
}

async function whaleFromOkx(p) {
  const d = await fetchJSON(
    `https://www.okx.com/api/v5/market/trades?instId=${p.okx}&limit=80`,
    {},
    10000
  );
  const arr = d && d.data;
  if (!Array.isArray(arr)) return 0;
  const cutoff = Date.now() - 120000;
  const hits = [];
  for (const t of arr) {
    const px = parseFloat(t.px);
    const sz = parseFloat(t.sz);
    const usd = px * sz;
    const ts = +t.ts;
    if (usd < p.minUsd || ts < cutoff) continue;
    hits.push({
      id: String(t.tradeId),
      side: t.side === 'buy' ? 'buy' : 'sell',
      sz,
      usd,
      ts,
      source: 'OKX',
    });
  }
  return emitWhaleHits(p, hits);
}

async function whaleFromBybit(p) {
  const d = await fetchJSON(
    `https://api.bybit.com/v5/market/recent-trade?category=spot&symbol=${p.bybit}&limit=80`,
    {},
    10000
  );
  const arr = d && d.result && d.result.list;
  if (!Array.isArray(arr)) return 0;
  const cutoff = Date.now() - 120000;
  const hits = [];
  for (const t of arr) {
    const px = parseFloat(t.price ?? t.p);
    const sz = parseFloat(t.size ?? t.v ?? t.q);
    const usd = px * sz;
    const ts = +(t.time ?? t.T ?? 0);
    if (!Number.isFinite(usd) || usd < p.minUsd || ts < cutoff) continue;
    const side = String(t.side ?? t.S ?? '').toLowerCase() === 'buy' ? 'buy' : 'sell';
    hits.push({
      id: String(t.execId ?? t.i ?? t.time + String(px)),
      side,
      sz,
      usd,
      ts,
      source: 'Bybit',
    });
  }
  return emitWhaleHits(p, hits);
}

async function pollWhale() {
  let total = 0;
  for (const p of CONFIG.whale.pairs) {
    let got = 0;
    try { got = await whaleFromBinance(p); } catch (e) { /* next */ }
    if (!got) {
      try { got = await whaleFromOkx(p); } catch (e) { /* next */ }
    }
    if (!got) {
      try { got = await whaleFromBybit(p); } catch (e) { /* next */ }
    }
    total += got;
  }
  if (whaleSeen.size > 3000) whaleSeen = new Set([...whaleSeen].slice(-1500));
  FEED.emit('status', { channel: 'whale', ok: total > 0, count: total });
}

/* ---------- 8. ЛИКВИДАЦИИ (Coinalyze) — BTC, ETH, TON, SOL по очереди ---------- */
const liqByAsset = {};
const liqLastPoll = {};
let liqRot = 0;

function aggregateLiquidations() {
  let longUsd = 0;
  let shortUsd = 0;
  Object.values(liqByAsset).forEach((v) => {
    longUsd += v.longUsd || 0;
    shortUsd += v.shortUsd || 0;
  });
  const total = longUsd + shortUsd;
  if (!total) return null;
  return {
    totalUsd: total,
    longUsd,
    shortUsd,
    longPct: Math.round((longUsd / total) * 100),
    assets: { ...liqByAsset },
  };
}

async function pollLiquidations() {
  const cfg = CONFIG.coinalyze;
  if (!cfg || !cfg.apiKey) return;
  const keys = Object.keys(cfg.symbols || {});
  if (!keys.length) return;

  const asset = keys[liqRot % keys.length];
  liqRot += 1;
  const minGap = cfg.minMsPerSymbol || 6000;
  const last = liqLastPoll[asset] || 0;
  if (Date.now() - last < minGap) return;
  liqLastPoll[asset] = Date.now();

  const symbol = cfg.symbols[asset];
  const to = Math.floor(Date.now() / 1000);
  const from = to - 86400;
  const url =
    'https://api.coinalyze.net/v1/liquidation-history' +
    `?symbols=${encodeURIComponent(symbol)}` +
    `&interval=${encodeURIComponent(cfg.interval || '1hour')}` +
    `&from=${from}&to=${to}&convert_to_usd=true` +
    `&api_key=${encodeURIComponent(cfg.apiKey)}`;

  const data = await fetchJSON(url, {}, 15000);
  if (!Array.isArray(data) || !data.length) throw new Error('liquidations: bad shape');

  let longUsd = 0;
  let shortUsd = 0;
  (data[0].history || []).forEach((h) => {
    longUsd += Number(h.l) || 0;
    shortUsd += Number(h.s) || 0;
  });
  liqByAsset[asset] = { longUsd, shortUsd, symbol };
  const agg = aggregateLiquidations();
  if (agg) FEED.emit('liquidations', agg);
}

/* ---------- планировщик ---------- */
function runSafe(fn, label) {
  return Promise.resolve().then(fn).catch((e) => {
    FEED.emit('status', { channel: label, ok: false, err: String(e) });
    console.warn('[' + label + ']', e && e.message);
  });
}
function startPolling() {
  const I = CONFIG.intervals;
  const jobs = [
    ['markets', pollMarkets, I.markets],
    ['global', pollGlobal, I.global],
    ['fng', pollFng, I.fng],
    ['gas', pollGas, I.gas],
    ['funding', pollFunding, I.funding],
    ['news', pollNews, I.news],
    ['whale', pollWhale, I.whale],
    ['liquidations', pollLiquidations, I.liquidations || 6000],
  ];
  jobs.forEach(([label, fn, ms], idx) => {
    setTimeout(() => {
      runSafe(fn, label);
      setInterval(() => runSafe(fn, label), ms);
    }, idx * 500);
  });
  // Новости и киты — дополнительный быстрый старт
  setTimeout(() => runSafe(pollNews, 'news'), 800);
  setTimeout(() => runSafe(pollNews, 'news'), 8000);
  setTimeout(() => runSafe(pollWhale, 'whale'), 1200);
  setTimeout(() => runSafe(pollWhale, 'whale'), 6000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startPolling);
} else {
  startPolling();
}

// экспорт для terminal.js
window.FEED = FEED;
window.relTime = relTime;
