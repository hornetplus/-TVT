/* =========================================================
   Crypto TV Terminal — слой отрисовки (UI)
   Подписывается на события реальных данных из api.js (шина FEED)
   и обновляет DOM: часы, watchlist+ротация, hero-карточки, новости,
   лента крупных сделок, индикаторы, шапка. Анимации (вспышки цены,
   въезд карточек, подсветка новостей) запускаются на РЕАЛЬНЫХ
   изменениях, а не по таймеру со случайными числами.
   До прихода данных показываются «—» / «Загрузка…», без выдумок.
   ========================================================= */
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- масштабирование сцены (1920×1080 → экран) ----------
   transform-origin: 0 0 (см. CSS). Сцена точно вписывается в любой
   экран/плотность: масштаб = min(W/1920, H/1080), затем центрируем
   пиксельным сдвигом. Это и есть фикс «верстка не подстраивается». */
function fitStage() {
  const vw = document.documentElement.clientWidth  || window.innerWidth;
  const vh = document.documentElement.clientHeight || window.innerHeight;
  const s = Math.min(vw / 1920, vh / 1080);
  const st = $('#stage');
  if (!st) return;
  const x = (vw - 1920 * s) / 2;
  const y = (vh - 1080 * s) / 2;
  st.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
}
window.addEventListener('resize', fitStage);
window.addEventListener('orientationchange', fitStage);
window.addEventListener('load', fitStage);
document.addEventListener('visibilitychange', () => { if (!document.hidden) fitStage(); });
fitStage();
// телевизоры иногда сообщают итоговый размер вьюпорта с задержкой — повторим
[80, 250, 600, 1500, 3000].forEach((t) => setTimeout(fitStage, t));

/* ---------- форматтеры ---------- */
function fmtPrice(v) {
  if (!v && v !== 0) return '—';
  if (v >= 1000) return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (v >= 1)    return '$' + v.toFixed(2);
  if (v > 0)     return '$' + v.toFixed(4);
  return '—';
}
function fmtPct(v) { if (v == null || isNaN(v)) return '—'; return (v >= 0 ? '+' : '') + v.toFixed(2) + '%'; }
function fmtVol(v) {
  if (v == null || isNaN(v) || !v) return '—';
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
  return '$' + Math.round(v).toLocaleString('en-US');
}
function fmtLevel(v) { return v ? '$' + Math.round(v).toLocaleString('en-US') : '—'; }
const dirClass = (v) => (v == null ? '' : v >= 0 ? 'up' : 'down');

function coinIcon(state, cls = '') {
  return `<span class="coin-ic ${cls}" style="background:var(--c-${state.color})">${state.glyph}</span>`;
}

/* ---------- спарклайн ---------- */
function sparkGeo(vals, w, h, pad = 3) {
  if (!vals || vals.length < 2) vals = [0, 0];
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const stepX = (w - pad * 2) / (vals.length - 1);
  const pts = vals.map((v, i) => [pad + i * stepX, pad + (h - pad * 2) * (1 - (v - min) / span)]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = line + ` L${(w - pad).toFixed(1)} ${h} L${pad} ${h} Z`;
  return { line, area, last: pts[pts.length - 1] };
}
function miniSpark(vals, up) {
  const w = 92, h = 40;
  const g = sparkGeo(vals, w, h);
  const col = up ? 'var(--up)' : 'var(--down)';
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <path d="${g.line}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;
}

/* =========================================================
   1. ЧАСЫ — реальное системное время устройства (§6.2, §3.3)
   ========================================================= */
const MONTHS = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const DOW = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];
function tickClock() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const hms = $('#clock-hms'); if (hms) hms.textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  const dt = $('#clock-date'); if (dt) dt.innerHTML = `<b>${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}</b> · ${DOW[d.getDay()]}`;
}
tickClock();
setInterval(tickClock, 1000);

/* =========================================================
   2. WATCHLIST + РОТАЦИЯ (§10) — данные из FEED 'markets'
   ========================================================= */
const prevPrice = {};
let rotIndex = 0;
let wlMode = 'usd';
function currentWindow() {
  const pool = WATCHLIST_CFG.rotatingPool;
  const n = WATCHLIST_CFG.windowSize;
  const out = [];
  for (let i = 0; i < n; i++) out.push(pool[(rotIndex * n + i) % pool.length]);
  return out;
}
function rowPriceBlock(a) {
  const up = a.change24hPct >= 0;
  if (wlMode === 'vol') {
    return `<div class="wl-price">
      <div class="p num">${fmtVol(a.volumeUsd)}</div>
      <div class="chg num ${dirClass(a.change24hPct)}">${fmtPct(a.change24hPct)}</div>
    </div>`;
  }
  if (wlMode === 'pct') {
    return `<div class="wl-price">
      <div class="p num ${dirClass(a.change24hPct)}">${fmtPct(a.change24hPct)}</div>
      <div class="chg num" style="color:var(--ink-3)">${fmtPrice(a.priceUsd)}</div>
    </div>`;
  }
  return `<div class="wl-price">
    <div class="p num">${fmtPrice(a.priceUsd)}</div>
    <div class="chg num ${dirClass(a.change24hPct)}">${fmtPct(a.change24hPct)}</div>
  </div>`;
}
function rowHtml(sym) {
  const a = ASSET_STATE[sym];
  const up = a.change24hPct >= 0;
  const spark = miniSpark(a.sparkline.length ? a.sparkline : [0, 0], up);
  return `<div class="wl-row" data-sym="${sym}">
    ${coinIcon(a)}
    <div class="wl-name"><div class="tk">${sym}</div><div class="nm">${a.name}</div></div>
    ${rowPriceBlock(a)}
    ${spark}
  </div>`;
}
function renderWatchlist() {
  const rows = $('#wl-rows'); if (!rows) return;
  const syms = [...WATCHLIST_CFG.fixedAssets, ...currentWindow()];
  rows.innerHTML = syms.map(rowHtml).join('');
}
function rotateWatchlist() {
  const total = Math.ceil(WATCHLIST_CFG.rotatingPool.length / WATCHLIST_CFG.windowSize);
  rotIndex = (rotIndex + 1) % total;
  const rows = $$('#wl-rows .wl-row');
  rows.slice(WATCHLIST_CFG.fixedAssets.length).forEach((r) => {
    r.style.transition = 'opacity .35s var(--ease)';
    r.style.opacity = '0';
  });
  setTimeout(renderWatchlist, 360);
}
function updateVisibleRows(bySym) {
  $$('#wl-rows .wl-row').forEach((row) => {
    const sym = row.dataset.sym;
    if (!bySym[sym]) return;
    const a = ASSET_STATE[sym];
    const up = a.change24hPct >= 0;
    const priceWrap = row.querySelector('.wl-price');
    if (priceWrap) priceWrap.outerHTML = rowPriceBlock(a);
    const sp = row.querySelector('.spark');
    const sparkVals = a.sparkline.length ? a.sparkline : [a.priceUsd || 0];
    if (!sp) row.insertAdjacentHTML('beforeend', miniSpark(sparkVals, up));
    else sp.outerHTML = miniSpark(sparkVals, up);
    const prev = prevPrice[sym];
    if (prev != null && a.priceUsd && a.priceUsd !== prev) {
      const dir = a.priceUsd > prev ? 'up' : 'down';
      row.classList.remove('flash-up', 'flash-down'); void row.offsetWidth;
      row.classList.add(dir === 'up' ? 'flash-up' : 'flash-down');
      setTimeout(() => row.classList.remove('flash-up', 'flash-down'), 800);
    }
    prevPrice[sym] = a.priceUsd;
  });
}
renderWatchlist();
setInterval(rotateWatchlist, WATCHLIST_CFG.rotationIntervalSec * 1000);

/* =========================================================
   3. HERO BTC/ETH (§11) — данные из FEED 'markets'
   ========================================================= */
const heroPrev = {};
let lastHeroFlash = 0;
function computeLevels(h) {
  const p = h.priceUsd; if (!p) { h.support = [0, 0]; h.resistance = [0, 0]; return; }
  const spark = (h.sparkline && h.sparkline.length) ? h.sparkline : [p];
  const sMin = Math.min(...spark), sMax = Math.max(...spark);
  const lo = h.low24h || sMin, hi = h.high24h || sMax;
  const s1 = Math.min(lo, p * 0.995), s2 = Math.min(sMin, s1 * 0.985);
  const r1 = Math.max(hi, p * 1.005), r2 = Math.max(sMax, r1 * 1.015);
  h.support = [s1, s2];
  h.resistance = [r1, r2];
}
function heroChart(h) {
  const up = h.change24hPct >= 0;
  const g = sparkGeo((h.sparkline && h.sparkline.length) ? h.sparkline : [0, 0], 600, 200, 6);
  const col = up ? 'var(--up)' : 'var(--down)';
  const gid = 'g_' + h.symbol;
  return `<svg viewBox="0 0 600 200" preserveAspectRatio="none">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${col}" stop-opacity=".34"/>
      <stop offset="1" stop-color="${col}" stop-opacity="0"/>
    </linearGradient></defs>
    <path d="${g.area}" fill="url(#${gid})"/>
    <path d="${g.line}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${g.last[0].toFixed(1)}" cy="${g.last[1].toFixed(1)}" r="4.5" fill="${col}"/>
  </svg>`;
}
function heroHtml(sym) {
  const h = HERO_STATE[sym];
  return `<section class="panel hero" data-sym="${sym}">
    <div class="hero-top">
      ${coinIcon(h)}
      <div class="hero-id"><div class="tk">${sym}</div><div class="nm">${h.name}</div></div>
      <span class="hero-star"><svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.4 21.7l1.8-7.3L1.5 9.5 9 8.9 12 2Z"/></svg></span>
    </div>
    <div class="hero-price num">${fmtPrice(h.priceUsd)}</div>
    <div class="hero-chg">
      <div class="grp"><span class="v num ${dirClass(h.change24hPct)}">${fmtPct(h.change24hPct)}</span><span class="t">24Ч</span></div>
      <div class="grp"><span class="v num ${dirClass(h.change7dPct)}">${fmtPct(h.change7dPct)}</span><span class="t">7Д</span></div>
    </div>
    <div class="hero-chart">${heroChart(h)}</div>
    <div class="hero-levels">
      <div><div class="lvl-label">Поддержка</div><div class="lvl-vals up num"><span>${fmtLevel(h.support[0])}</span><span>${fmtLevel(h.support[1])}</span></div></div>
      <div><div class="lvl-label">Сопротивление</div><div class="lvl-vals down num"><span>${fmtLevel(h.resistance[0])}</span><span>${fmtLevel(h.resistance[1])}</span></div></div>
    </div>
  </section>`;
}
function renderHeroes() { const r = $('#hero-row'); if (r) r.innerHTML = heroHtml('BTC') + heroHtml('ETH'); }
function refreshHeroes(bySym) {
  renderHeroes();
  ['BTC', 'ETH'].forEach((sym) => {
    if (!bySym[sym]) return;
    const cur = HERO_STATE[sym].priceUsd;
    const prev = heroPrev[sym];
    if (prev != null && cur && cur !== prev && Date.now() - lastHeroFlash > 1000) {
      lastHeroFlash = Date.now();
      const card = $(`.hero[data-sym="${sym}"]`);
      if (card) {
        card.classList.remove('flash-up', 'flash-down'); void card.offsetWidth;
        card.classList.add(cur > prev ? 'flash-up' : 'flash-down');
        setTimeout(() => card.classList.remove('flash-up', 'flash-down'), 900);
      }
    }
    heroPrev[sym] = cur;
  });
}
renderHeroes();

/* =========================================================
   4. ИНДИКАТОРЫ: фандинг, газ, ликвидации (§14)
   ========================================================= */
function renderFunding() {
  const list = $('#fund-list'); if (!list) return;
  list.innerHTML = INDICATORS.funding.map((f) => {
    const a = ASSET_STATE[f.sym] || { color: 'usdc', glyph: '$' };
    const cls = dirClass(f.val);
    const val = (f.val == null || isNaN(f.val)) ? '—' : (f.val >= 0 ? '+' : '') + f.val.toFixed(4) + '%';
    return `<div class="fund-row">
      ${coinIcon(a, 'small')}
      <span class="fk">${f.sym}</span>
      <span class="fv num ${cls}">${val}</span>
    </div>`;
  }).join('');
}
function fmtGasVal(v) {
  return Number.isFinite(v) ? String(v) : '—';
}
function renderGas() {
  const g = INDICATORS.gas;
  const main = $('#gas-val'); if (main) main.textContent = fmtGasVal(g.avg);
  const usd = $('.gas-usd'); if (usd) usd.textContent = g.usd || '';
  const gv = $$('.gas-tier .gv');
  if (gv.length === 3) {
    gv[0].textContent = fmtGasVal(g.low);
    gv[1].textContent = fmtGasVal(g.avg);
    gv[2].textContent = fmtGasVal(g.high);
  }
}
function renderLiquidations() {
  const liq = INDICATORS.liquidations;
  const assetLbl = $('#liq-asset-label');
  if (assetLbl) assetLbl.textContent = liq.asset || '—';
  const total = $('.liq-total'); if (total) total.textContent = liq.total;
  const legs = $$('.liq-leg .num');
  if (legs[0]) legs[0].textContent = liq.longUsd;
  if (legs[1]) legs[1].textContent = liq.shortUsd;
  const lbl = $('.liq-ring .lbl'); if (lbl) lbl.textContent = liq.longPct != null ? liq.longPct + '%' : 'н/д';
  const arc = $('.liq-ring circle:last-of-type');
  const C = 238.8;
  if (arc) {
    if (liq.longPct == null) arc.setAttribute('stroke-dashoffset', String(C));
    else arc.setAttribute('stroke-dashoffset', (C * (1 - Math.max(0, Math.min(100, liq.longPct)) / 100)).toFixed(1));
  }
}
function onLiquidations(d) {
  if (!d || !d.totalUsd || !d.asset) return;
  INDICATORS.liquidations = {
    asset: d.asset,
    total: fmtVol(d.totalUsd),
    longUsd: fmtVol(d.longUsd),
    shortUsd: fmtVol(d.shortUsd),
    longPct: d.longPct,
  };
  renderLiquidations();
}
renderFunding();
renderGas();
renderLiquidations();

/* =========================================================
   5. ШАПКА: F&G, доминация, капитализация, альтсезон (§7.2)
   ========================================================= */
const FG_RU = { 'Extreme Fear': 'Крайний страх', 'Fear': 'Страх', 'Neutral': 'Нейтрально', 'Greed': 'Жадность', 'Extreme Greed': 'Крайняя жадность' };
function fgColor(v) { return v < 25 ? 'var(--down)' : v < 45 ? '#F0B23B' : v < 55 ? '#F0D43B' : 'var(--up)'; }
function setGauge(arcId, numId, value, color) {
  const C = 119.4; // 2π·19
  const arc = document.getElementById(arcId);
  if (arc) { arc.setAttribute('stroke-dashoffset', (C * (1 - Math.max(0, Math.min(100, value)) / 100)).toFixed(1)); if (color) arc.setAttribute('stroke', color); }
  const num = document.getElementById(numId); if (num) num.textContent = Math.round(value);
}
function onFng(d) {
  const col = fgColor(d.value);
  setGauge('fg-arc', 'fg-num', d.value, col);
  const val = $('#fg-val'); if (val) val.textContent = d.value;
  const word = $('#fg-word'); if (word) { word.textContent = FG_RU[d.label] || d.label; word.style.color = col; }
}
function onGlobal(d) {
  const dom = $('#dom-val'); if (dom) dom.innerHTML = d.btcDominance.toFixed(1) + '<small>%</small>';
  const cap = $('#cap-val'); if (cap) cap.textContent = (d.capUsd / 1e12).toFixed(2);
  const chg = $('#cap-chg'); if (chg) { chg.textContent = fmtPct(d.capChangePct); chg.className = dirClass(d.capChangePct); }
  computeAltseason(d.btcDominance);
}
let lastDominance = null;
function computeAltseason(dominance) {
  if (dominance != null) lastDominance = dominance;
  // Прокси «альтсезона»: доля отслеживаемых альтов, обгоняющих BTC за 7д,
  // слегка скорректированная доминацией BTC. 0 = сезон BTC, 100 = альтсезон.
  const btc = ASSET_STATE.BTC; if (!btc || !btc.priceUsd) return;
  const alts = Object.keys(ASSET_STATE).filter((s) => s !== 'BTC' && s !== 'USDC' && ASSET_STATE[s].priceUsd);
  if (!alts.length) return;
  const out = alts.filter((s) => ASSET_STATE[s].change7dPct > btc.change7dPct).length;
  let idx = (out / alts.length) * 100;
  if (lastDominance != null) idx = idx * 0.7 + (100 - lastDominance) * 0.6; // мягкая поправка
  idx = Math.max(0, Math.min(100, idx));
  setGauge('alt-arc', 'alt-num', idx, null);
  const stat = document.getElementById('alt-gauge');
  const label = stat && stat.closest('.stat') && stat.closest('.stat').querySelector('.stat-value');
  if (label) label.textContent = idx >= 75 ? 'Альтсезон' : idx <= 35 ? 'Сезон BTC' : 'Смешанный';
}

/* =========================================================
   6. НОВОСТИ (§12) — данные из FEED 'news:item'
   ========================================================= */
const NEWS_MAX = 5;
const CAT_RU = { market: 'Маркет', defi: 'DeFi', exchange: 'Биржа', nft: 'NFT', btc: 'Биткоин' };
let newsArchive = [];
let newsDomSeq = 0;
const newsIds = new Set();

function newsMaxAgeMs() {
  return (CONFIG.news && CONFIG.news.maxAgeMs) || 3600000;
}
function newsIsFresh(n) {
  if (!n || !n.date) return false;
  return Date.now() - n.date.getTime() <= newsMaxAgeMs();
}
function pickPanelNews(items) {
  const fresh = items.filter(newsIsFresh).sort((a, b) => b.date - a.date);
  const out = [];
  const usedSrc = new Set();
  for (const n of fresh) {
    if (usedSrc.has(n.source)) continue;
    usedSrc.add(n.source);
    out.push(n);
    if (out.length >= NEWS_MAX) break;
  }
  if (out.length < NEWS_MAX) {
    for (const n of fresh) {
      if (out.some((x) => x.id === n.id)) continue;
      out.push(n);
      if (out.length >= NEWS_MAX) break;
    }
  }
  return out;
}
function newsHtml(n) {
  const age = (typeof relTime === 'function' && n.date) ? relTime(n.date) : 'сейчас';
  return `<div class="news-item ${n.isNew ? 'is-new' : ''}" data-id="${n._domId}">
    <div class="news-av" style="color:${n.color}">${n.glyph}</div>
    <div class="news-body">
      <div class="news-meta">
        <span class="news-src">${n.source}</span>
        <span class="news-verify"><svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 1 2.4 1.8 3-.2.9 2.8 2.4 1.7-1 2.9 1 2.9-2.4 1.7-.9 2.8-3-.2L12 23l-2.4-1.8-3 .2-.9-2.8L3.3 17l1-2.9-1-2.9 2.4-1.7.9-2.8 3 .2L12 1Z"/><path d="m8.5 12 2.4 2.4 4.6-4.8" fill="none" stroke="#0C111C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        <span class="news-time">${age}</span>
      </div>
      <div class="news-title">${n.title}</div>
      <span class="news-tag tag-${n.cat}">${CAT_RU[n.cat] || 'Маркет'}</span>
    </div>
  </div>`;
}
function renderNews() {
  const list = $('#news-list'); if (!list) return;
  const panel = pickPanelNews(newsArchive);
  if (!panel.length) {
    list.innerHTML = '';
    return;
  }
  list.innerHTML = panel.map(newsHtml).join('');
}
function onNews(n) {
  if (!n || !n.title || newsIds.has(n.id)) return;
  if (!(n.date instanceof Date) || isNaN(n.date.getTime())) {
    n.date = typeof parseNewsDate === 'function' ? parseNewsDate(n.date) : new Date();
  }
  if (!newsIsFresh(n)) return;
  newsIds.add(n.id);
  n._domId = ++newsDomSeq;
  newsArchive.unshift(n);
  const cap = (CONFIG.news && CONFIG.news.archiveMax) || 60;
  newsArchive = newsArchive.filter(newsIsFresh).slice(0, cap);
  renderNews();
  if (n.isNew) {
    const el = $(`#news-list .news-item[data-id="${n._domId}"]`);
    if (el) el.style.animation = 'txEnter .5s var(--ease) both';
    setTimeout(() => {
      n.isNew = false;
      const e2 = $(`#news-list .news-item[data-id="${n._domId}"]`);
      if (e2) e2.classList.remove('is-new');
    }, 9000);
  }
  if (newsIds.size > 5000) newsIds.clear();
}
renderNews();
setInterval(() => {
  const before = newsArchive.length;
  newsArchive = newsArchive.filter(newsIsFresh);
  if (newsArchive.length !== before) renderNews();
  else if (newsArchive.length) renderNews();
}, 30000);

/* =========================================================
   7. ЛЕНТА КРУПНЫХ СДЕЛОК (§13) — данные из FEED 'whale'
   ========================================================= */
const WHALE_MAX = 5;
let whaleCards = [];
let whaleArchive = [];
function whaleHtml(t, entering = false) {
  const a = ASSET_STATE[t.asset] || { color: 'usdc', glyph: '$' };
  const age = (typeof relTime === 'function' && t.ts) ? relTime(new Date(t.ts)) : 'сейчас';
  const arrow = t.dir === 'in'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>';
  return `<div class="tx-card ${entering ? 'entering' : ''}">
    <div class="tx-dir ${t.dir}">${arrow}</div>
    <div class="tx-coin">${coinIcon(a, 'small')}<span class="tk">${t.asset}</span></div>
    <div class="tx-body">
      <div class="tx-amt ${t.dir === 'in' ? 'up' : 'down'}">${t.amount}</div>
      <div class="tx-sub"><span class="tx-usd num">${t.usd}</span><span class="tx-addr">${t.addr}</span><span class="tx-time">${age}</span></div>
    </div>
  </div>`;
}
function renderWhale() {
  const strip = $('#whale-strip'); if (!strip) return;
  if (!whaleCards.length) {
    strip.innerHTML = '<div class="whale-empty">Загрузка крупных сделок с бирж…</div>';
    return;
  }
  strip.innerHTML = whaleCards.slice(0, WHALE_MAX).map((t, i) => whaleHtml(t, i === 0 && t._enter)).join('');
}
function onWhale(t) {
  if (!t) return;
  whaleArchive.unshift({ ...t });
  const cap = (CONFIG.whale && CONFIG.whale.archiveMax) || 80;
  whaleArchive = whaleArchive.slice(0, cap);
  whaleCards.unshift({ ...t, _enter: true });
  whaleCards.forEach((c, i) => { if (i > 0) c._enter = false; });
  whaleCards = whaleCards.slice(0, WHALE_MAX);
  renderWhale();
}
renderWhale();
setInterval(() => { if (whaleCards.length) renderWhale(); }, 30000); // освежаем время на карточках

/* =========================================================
   8. ПОДПИСКА НА РЕАЛЬНЫЕ ДАННЫЕ (шина FEED из api.js)
   ========================================================= */
function onMarkets(bySym) {
  Object.keys(bySym).forEach((sym) => {
    if (!ASSET_STATE[sym]) return;
    const m = bySym[sym], a = ASSET_STATE[sym];
    a.priceUsd = m.priceUsd; a.change24hPct = m.change24hPct; a.change7dPct = m.change7dPct;
    a.volumeUsd = m.volumeUsd; a.sparkline = m.sparkline || []; a.high24h = m.high24h; a.low24h = m.low24h;
  });
  ['BTC', 'ETH'].forEach((sym) => {
    if (!bySym[sym]) return;
    const m = bySym[sym], h = HERO_STATE[sym];
    h.priceUsd = m.priceUsd; h.change24hPct = m.change24hPct; h.change7dPct = m.change7dPct;
    h.sparkline = m.sparkline || []; h.high24h = m.high24h; h.low24h = m.low24h;
    computeLevels(h);
  });
  updateVisibleRows(bySym);
  refreshHeroes(bySym);
  computeAltseason();
}

/* =========================================================
   9. ОВЕРЛЕИ: все активы / сделки / новости
   ========================================================= */
let overlayNewsPage = 0;
const OVERLAY_NEWS_PAGE = 6;

function openOverlay(title, html, opts) {
  const ov = $('#ctv-overlay');
  const body = $('#ctv-overlay-body');
  const ttl = $('#ctv-overlay-title');
  const nav = $('#ctv-overlay-nav');
  if (!ov || !body || !ttl) return;
  ttl.textContent = title;
  body.innerHTML = html;
  if (nav) nav.classList.toggle('hidden', !(opts && opts.paged));
  ov.classList.remove('hidden');
  ov.setAttribute('aria-hidden', 'false');
  document.body.classList.add('ctv-overlay-open');
  const back = $('#ctv-overlay-back');
  if (back) back.focus();
}

function closeOverlay() {
  const ov = $('#ctv-overlay');
  if (!ov) return;
  ov.classList.add('hidden');
  ov.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('ctv-overlay-open');
}

function allAssetsHtml() {
  const syms = Object.keys(ASSET_STATE).filter((s) => s !== 'USDC');
  syms.sort((a, b) => (ASSET_STATE[b].volumeUsd || 0) - (ASSET_STATE[a].volumeUsd || 0));
  return syms.map((sym) => {
    const a = ASSET_STATE[sym];
    return `<div class="ov-wl-row">
      ${coinIcon(a, 'small')}
      <div class="wl-name"><div class="tk">${sym}</div><div class="nm">${a.name}</div></div>
      <div class="wl-price"><div class="p num">${fmtPrice(a.priceUsd)}</div><div class="chg num ${dirClass(a.change24hPct)}">${fmtPct(a.change24hPct)}</div></div>
      <div class="num" style="font-size:14px;font-weight:800;color:var(--ink-2)">${fmtVol(a.volumeUsd)}</div>
    </div>`;
  }).join('');
}

function allWhaleHtml() {
  if (!whaleArchive.length) return '<div class="ov-tx-row" style="opacity:.5">Крупных сделок пока нет</div>';
  return whaleArchive.map((t) => {
    const a = ASSET_STATE[t.asset] || { color: 'usdc', glyph: '$' };
    const age = (typeof relTime === 'function' && t.ts) ? relTime(new Date(t.ts)) : '';
    return `<div class="ov-tx-row">
      <div class="tx-dir ${t.dir}" style="width:40px;height:40px;border-radius:50%">${t.dir === 'in' ? '↓' : '↑'}</div>
      <div class="tx-coin">${coinIcon(a, 'small')}<span class="tk">${t.asset}</span></div>
      <div><div class="tx-amt ${t.dir === 'in' ? 'up' : 'down'}">${t.amount}</div><div class="tx-sub"><span class="tx-usd">${t.usd}</span><span class="tx-addr">${t.addr}</span></div></div>
      <div class="tx-time">${age}</div>
    </div>`;
  }).join('');
}

function renderNewsOverlayPage() {
  const items = newsArchive.filter(newsIsFresh).sort((a, b) => b.date - a.date);
  const pages = Math.max(1, Math.ceil(items.length / OVERLAY_NEWS_PAGE));
  overlayNewsPage = Math.max(0, Math.min(overlayNewsPage, pages - 1));
  const slice = items.slice(overlayNewsPage * OVERLAY_NEWS_PAGE, overlayNewsPage * OVERLAY_NEWS_PAGE + OVERLAY_NEWS_PAGE);
  const html = slice.length
    ? slice.map((n) => newsHtml(n)).join('')
    : '<div class="news-item" style="opacity:.5">Нет новостей за последние 5 часов</div>';
  openOverlay('Новости · последний час', html, { paged: items.length > OVERLAY_NEWS_PAGE });
  const pageEl = $('#ctv-overlay-page');
  if (pageEl) pageEl.textContent = items.length ? `${overlayNewsPage + 1} / ${pages}` : '—';
}

function setWlMode(mode) {
  wlMode = mode;
  $$('#wl-tabs .wl-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.wlMode === mode);
  });
  renderWatchlist();
}

function initTerminalUi() {
  $$('#wl-tabs .wl-tab').forEach((tab) => {
    tab.addEventListener('click', () => setWlMode(tab.dataset.wlMode || 'usd'));
  });

  const wlAll = $('#wl-all-btn');
  if (wlAll) wlAll.addEventListener('click', () => openOverlay('Все активы', allAssetsHtml()));

  const whaleAll = $('#whale-all-btn');
  if (whaleAll) whaleAll.addEventListener('click', () => openOverlay('Крупные сделки', allWhaleHtml()));

  const newsAll = $('#news-all-btn');
  if (newsAll) newsAll.addEventListener('click', () => { overlayNewsPage = 0; renderNewsOverlayPage(); });

  const ovBack = $('#ctv-overlay-back');
  if (ovBack) ovBack.addEventListener('click', closeOverlay);

  const ovPrev = $('#ctv-overlay-prev');
  const ovNext = $('#ctv-overlay-next');
  if (ovPrev) ovPrev.addEventListener('click', () => { overlayNewsPage = Math.max(0, overlayNewsPage - 1); renderNewsOverlayPage(); });
  if (ovNext) ovNext.addEventListener('click', () => { overlayNewsPage += 1; renderNewsOverlayPage(); });

  document.addEventListener('keydown', (e) => {
    const ov = $('#ctv-overlay');
    if (!ov || ov.classList.contains('hidden')) return;
    if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'Back') closeOverlay();
  });
}

initTerminalUi();

if (window.FEED) {
  FEED.on('markets', onMarkets);
  FEED.on('global', onGlobal);
  FEED.on('fng', onFng);
  FEED.on('funding', (arr) => { if (Array.isArray(arr)) { INDICATORS.funding = arr.map((f) => ({ sym: f.sym, val: f.val })); renderFunding(); } });
  FEED.on('gas', (g) => { INDICATORS.gas = { value: g.avg, low: g.low, avg: g.avg, high: g.high, usd: g.usd }; renderGas(); });
  FEED.on('liquidations', onLiquidations);
  FEED.on('news:item', onNews);
  FEED.on('whale', onWhale);
}
