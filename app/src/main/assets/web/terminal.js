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
function tickClock() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const M = (window.I18N ? I18N.months() : ['','','','','','','','','','','','']);
  const W = (window.I18N ? I18N.dow() : ['','','','','','','']);
  const hms = $('#clock-hms'); if (hms) hms.textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  const dt = $('#clock-date'); if (dt) dt.innerHTML = `<b>${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}</b> · ${W[d.getDay()]}`;
}
tickClock();
setInterval(tickClock, 1000);

/* =========================================================
   2. WATCHLIST + РОТАЦИЯ (§10) — данные из FEED 'markets'
   ========================================================= */
const prevPrice = {};
let rotIndex = 0;
let wlMode = 'usd';
function watchlistPool() {
  if (!window.SETTINGS) return Object.keys(ASSETS).filter((s) => s !== 'USDC');
  return SETTINGS.trackedAssets.filter((s) => ASSETS[s]);
}
function currentWindow() {
  const pool = watchlistPool();
  const n = WATCHLIST_CFG.windowSize;
  if (!pool.length) return [];
  if (pool.length <= n) return pool.slice();
  const pages = Math.ceil(pool.length / n);
  const page = rotIndex % pages;
  return pool.slice(page * n, page * n + n);
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
  const syms = currentWindow();
  rows.innerHTML = syms.length ? syms.map(rowHtml).join('')
    : `<div class="wl-empty" style="padding:var(--sp-6);color:var(--ink-3);text-align:center">${T('wl_empty')}</div>`;
}
function rotateWatchlist() {
  const pool = watchlistPool();
  if (pool.length <= WATCHLIST_CFG.windowSize) return;
  const pages = Math.ceil(pool.length / WATCHLIST_CFG.windowSize);
  rotIndex = (rotIndex + 1) % pages;
  const rows = $$('#wl-rows .wl-row');
  rows.forEach((r) => {
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

/* применить выбранные пользователем активы (из SETTINGS) к watchlist */
function applyWatchlistSettings() {
  if (!window.SETTINGS) return;
  rotIndex = 0;
  renderWatchlist();
  if (window.CTV.applyHero) renderHeroes();
}

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
function ensureHero(sym) {
  if (!HERO_STATE[sym]) {
    const meta = ASSETS[sym] || { name: sym, color: 'usdc', glyph: '$' };
    HERO_STATE[sym] = { symbol: sym, name: meta.name, color: meta.color, glyph: meta.glyph,
      priceUsd: 0, change24hPct: 0, change7dPct: 0, support: [0, 0], resistance: [0, 0], direction: 'up', sparkline: [] };
  }
  return HERO_STATE[sym];
}
function heroList() {
  const tracked = window.SETTINGS ? new Set(SETTINGS.trackedAssets) : null;
  const arr = (window.SETTINGS ? SETTINGS.heroSymbols : ['BTC', 'ETH'])
    .filter((s) => ASSETS[s] && (!tracked || tracked.has(s)));
  if (arr.length) return arr;
  const fallback = window.SETTINGS && SETTINGS.trackedAssets[0];
  return fallback && ASSETS[fallback] ? [fallback] : ['BTC'];
}
const T = (k, ...a) => (window.I18N ? I18N.t(k, ...a) : k);

function heroAreaSpark(vals, up, w, h) {
  const g = sparkGeo((vals && vals.length) ? vals : [0, 0], w, h, 4);
  const col = up ? 'var(--up)' : 'var(--down)';
  const gid = 'hc_' + Math.random().toString(36).slice(2, 7);
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".3"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
    <path d="${g.area}" fill="url(#${gid})"/>
    <path d="${g.line}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;
}
function heroFullHtml(sym, feature) {
  const h = ensureHero(sym);
  return `<section class="panel hero ${feature ? 'feature' : ''}" data-sym="${sym}">
    <div class="hero-top">
      ${coinIcon(h)}
      <div class="hero-id"><div class="tk">${sym}</div><div class="nm">${h.name}</div></div>
      ${feature ? '<span class="hero-star"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2 3 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.4 21.7l1.8-7.3L1.5 9.5 9 8.9 12 2Z"/></svg></span>' : ''}
    </div>
    <div class="hero-price num">${fmtPrice(h.priceUsd)}</div>
    <div class="hero-chg">
      <div class="grp"><span class="v num ${dirClass(h.change24hPct)}">${fmtPct(h.change24hPct)}</span><span class="t">${T('h24')}</span></div>
      <div class="grp"><span class="v num ${dirClass(h.change7dPct)}">${fmtPct(h.change7dPct)}</span><span class="t">${T('d7')}</span></div>
    </div>
    <div class="hero-chart">${heroChart(h)}</div>
    <div class="hero-levels">
      <div><div class="lvl-label">${T('support')}</div><div class="lvl-vals up num"><span>${fmtLevel(h.support[0])}</span><span>${fmtLevel(h.support[1])}</span></div></div>
      <div><div class="lvl-label">${T('resistance')}</div><div class="lvl-vals down num"><span>${fmtLevel(h.resistance[0])}</span><span>${fmtLevel(h.resistance[1])}</span></div></div>
    </div>
  </section>`;
}
function heroCompactHtml(sym) {
  const h = ensureHero(sym);
  const up = h.change24hPct >= 0;
  return `<section class="panel hero compact" data-sym="${sym}">
    <div class="hc-top">${coinIcon(h)}<div class="hc-id"><div class="tk">${sym}</div><div class="nm">${h.name}</div></div></div>
    <div class="hc-price num">${fmtPrice(h.priceUsd)}</div>
    <div class="hc-chg">
      <span class="v num ${dirClass(h.change24hPct)}">${fmtPct(h.change24hPct)}</span><span class="t">${T('h24')}</span>
      <span class="v num ${dirClass(h.change7dPct)}">${fmtPct(h.change7dPct)}</span><span class="t">${T('d7')}</span>
    </div>
    <div class="hc-spark">${heroAreaSpark(h.sparkline, up, 300, 40)}</div>
  </section>`;
}
function renderHeroes() {
  const r = $('#hero-row'); if (!r) return;
  const list = heroList();
  const n = list.length;
  r.setAttribute('data-count', String(n));
  if (n <= 2) {
    r.classList.remove('has-feature');
    r.innerHTML = list.map((s, i) => heroFullHtml(s, n === 1 || i === 0)).join('');
  } else {
    r.classList.add('has-feature');
    const rest = list.slice(1);
    const cols2 = rest.length > 3 ? 'cols2' : '';
    r.innerHTML = heroFullHtml(list[0], true) +
      `<div class="hero-rest ${cols2}">${rest.map(heroCompactHtml).join('')}</div>`;
  }
}
function refreshHeroes(bySym) {
  renderHeroes();
  heroList().forEach((sym) => {
    if (!bySym[sym]) return;
    const cur = HERO_STATE[sym] && HERO_STATE[sym].priceUsd;
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
  const asset = liq.asset || '—';
  const assetLbl = $('#liq-asset-label');
  if (assetLbl) assetLbl.textContent = asset;
  const title = $('#liq-title');
  if (title) title.innerHTML = `${T('liquidations')} <span class="liq-asset" id="liq-asset-label">${asset}</span> · ${T('h24')}`;
  const total = $('.liq-total'); if (total) total.textContent = liq.total;
  const legs = $$('.liq-leg .num');
  if (legs[0]) legs[0].textContent = liq.longUsd;
  if (legs[1]) legs[1].textContent = liq.shortUsd;
  const lbl = $('.liq-ring .lbl'); if (lbl) lbl.textContent = liq.longPct != null ? liq.longPct + '%' : T('na');
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
let lastFng = null;
let lastGlobal = null;
function fgColor(v) { return v < 25 ? 'var(--down)' : v < 45 ? '#F0B23B' : v < 55 ? '#F0D43B' : 'var(--up)'; }
function setGauge(arcId, numId, value, color) {
  const C = 119.4; // 2π·19
  const arc = document.getElementById(arcId);
  if (arc) { arc.setAttribute('stroke-dashoffset', (C * (1 - Math.max(0, Math.min(100, value)) / 100)).toFixed(1)); if (color) arc.setAttribute('stroke', color); }
  const num = document.getElementById(numId); if (num) num.textContent = Math.round(value);
}
function onFng(d) {
  lastFng = d;
  const col = fgColor(d.value);
  setGauge('fg-arc', 'fg-num', d.value, col);
  const val = $('#fg-val'); if (val) val.textContent = d.value;
  const word = $('#fg-word'); if (word) { word.textContent = T(d.label) || d.label; word.style.color = col; }
}
function onGlobal(d) {
  lastGlobal = d;
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
  const word = document.getElementById('alt-word');
  if (word) word.textContent = idx >= 75 ? T('season_alt') : idx <= 35 ? T('season_btc') : T('season_mix');
}

/* =========================================================
   6. НОВОСТИ (§12) — данные из FEED 'news:item'
   ========================================================= */
const NEWS_MAX = 8;
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
  const fresh = items.filter((n) => newsIsFresh(n) && (!window.SETTINGS || SETTINGS.newsEnabled(n.source))).sort((a, b) => b.date - a.date);
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
function newsHtml(n, opts) {
  const age = (typeof relTime === 'function' && n.date) ? relTime(n.date) : 'сейчас';
  const sel = (opts && opts.selectable) ? ' selector' : '';
  const tab = (opts && opts.selectable) ? ' tabindex="-1"' : '';
  return `<div class="news-item${sel} ${n.isNew ? 'is-new' : ''}" data-id="${n._domId}"${tab}>
    <div class="news-av" style="color:${n.color}">${n.glyph}</div>
    <div class="news-body">
      <div class="news-meta">
        <span class="news-src">${n.source}</span>
        <span class="news-verify"><svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 1 2.4 1.8 3-.2.9 2.8 2.4 1.7-1 2.9 1 2.9-2.4 1.7-.9 2.8-3-.2L12 23l-2.4-1.8-3 .2-.9-2.8L3.3 17l1-2.9-1-2.9 2.4-1.7.9-2.8 3 .2L12 1Z"/><path d="m8.5 12 2.4 2.4 4.6-4.8" fill="none" stroke="#0C111C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
        <span class="news-time">${age}</span>
      </div>
      <div class="news-title">${n.title}</div>
      <span class="news-tag tag-${n.cat}">${window.I18N ? I18N.cat(n.cat) : n.cat}</span>
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
  if (window.SETTINGS && !SETTINGS.newsEnabled(n.source)) return;
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
function updateWhaleCount() {
  const b = document.getElementById('whale-count');
  if (b) b.textContent = String(whaleArchive.length);
}
function renderWhale() {
  const strip = $('#whale-strip'); if (!strip) return;
  updateWhaleCount();
  if (!whaleCards.length) {
    strip.innerHTML = `<div class="whale-empty">${T('loading_tx')}</div>`;
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
  heroList().forEach((sym) => {
    if (!bySym[sym]) return;
    const m = bySym[sym], h = ensureHero(sym);
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
const OVERLAY_NEWS_PAGE = 16;

function openOverlay(title, html, opts) {
  const ov = $('#ctv-overlay');
  const body = $('#ctv-overlay-body');
  const ttl = $('#ctv-overlay-title');
  const nav = $('#ctv-overlay-nav');
  const panel = ov && ov.querySelector('.ctv-overlay__panel');
  if (!ov || !body || !ttl) return;
  ttl.textContent = title;
  body.innerHTML = html;
  if (nav) nav.classList.toggle('hidden', !(opts && opts.paged));
  if (panel) {
    panel.className = 'ctv-overlay__panel panel';
    const mode = (opts && opts.mode) || (opts && opts.settings ? 'cfg' : '');
    if (mode) panel.classList.add('ctv-overlay--' + mode);
  }
  ov.classList.remove('hidden');
  ov.setAttribute('aria-hidden', 'false');
  document.body.classList.add('ctv-overlay-open');
  if (window.TvNav) {
    TvNav.markTabindex && TvNav.markTabindex();
    if (opts && opts.settings) { /* focusFirst в settings */ }
    else if (TvNav.focusOverlayEntry && opts && opts.mode) TvNav.focusOverlayEntry(opts.mode);
    else if (window.tvFocus) {
      const back = $('#ctv-overlay-back');
      if (back) tvFocus(back, { remember: false });
    }
  } else {
    const back = $('#ctv-overlay-back');
    if (back) back.focus();
  }
}

function closeOverlay() {
  const ov = $('#ctv-overlay');
  if (!ov) return;
  ov.classList.add('hidden');
  ov.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('ctv-overlay-open');
  if (window.SettingsUI && SettingsUI.isOpen()) SettingsUI.close();
  if (window.TvNav && TvNav.restoreMainFocus) TvNav.restoreMainFocus();
}
window.closeOverlay = closeOverlay;

/* ---- улучшенное окно «Все транзакции»: сводка + фильтры + таблица ---- */
let txFilter = 'all';
function parseUsd(str) {
  if (!str) return 0;
  const m = String(str).replace(/[, $]/g, '').match(/([\d.]+)\s*([KMB])?/i);
  if (!m) return 0;
  const n = parseFloat(m[1]) || 0;
  const mult = { K: 1e3, M: 1e6, B: 1e9 }[(m[2] || '').toUpperCase()] || 1;
  return n * mult;
}
const TX_IN_ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const TX_OUT_ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>';
function whaleTableHtml() {
  let inU = 0, outU = 0;
  whaleArchive.forEach((t) => { const v = parseUsd(t.usd); if (t.dir === 'in') inU += v; else outU += v; });
  const net = inU - outU;
  const summary = `<div class="txov-summary">
    <div class="txov-sumcard"><div class="l">${T('sum_in')}</div><div class="v up num">${fmtVol(inU)}</div></div>
    <div class="txov-sumcard"><div class="l">${T('sum_out')}</div><div class="v down num">${fmtVol(outU)}</div></div>
    <div class="txov-sumcard"><div class="l">${T('sum_net')}</div><div class="v num ${net >= 0 ? 'up' : 'down'}">${(net >= 0 ? '+' : '-') + fmtVol(Math.abs(net)).replace('$', '$')}</div></div>
  </div>`;
  const filters = `<div class="txov-filters">
    <button class="chip selector ${txFilter === 'all' ? 'active' : ''}" data-txf="all" tabindex="-1">${T('f_all')}</button>
    <button class="chip selector ${txFilter === 'in' ? 'active' : ''}" data-txf="in" tabindex="-1">${TX_IN_ARROW}${T('f_in')}</button>
    <button class="chip selector ${txFilter === 'out' ? 'active' : ''}" data-txf="out" tabindex="-1">${TX_OUT_ARROW}${T('f_out')}</button>
  </div>`;
  if (!whaleArchive.length) return summary + filters + `<div class="ov-tx-row" style="opacity:.5">${T('no_tx')}</div>`;
  const rows = whaleArchive.filter((t) => txFilter === 'all' || t.dir === txFilter);
  const thead = `<div class="txov-thead"><span>${T('tx_time')}</span><span>${T('tx_type')}</span><span>${T('tx_asset')}</span><span>${T('tx_amount')}</span><span>${T('tx_value')}</span><span>${T('tx_route')}</span></div>`;
  const body = rows.map((t) => {
    const a = ASSET_STATE[t.asset] || { color: 'usdc', glyph: '$' };
    const age = (typeof relTime === 'function' && t.ts) ? relTime(new Date(t.ts)) : '';
    return `<div class="txov-row selector" data-dir="${t.dir}" tabindex="-1">
      <span class="txov-time num">${age}</span>
      <span><span class="txov-pill ${t.dir}">${t.dir === 'in' ? TX_IN_ARROW : TX_OUT_ARROW}${t.dir === 'in' ? T('tx_in') : T('tx_out')}</span></span>
      <span class="txov-asset">${coinIcon(a, 'small')}<span class="tk">${t.asset}</span></span>
      <span class="txov-amt num ${t.dir === 'in' ? 'up' : 'down'}">${t.amount}</span>
      <span class="txov-usd num">${t.usd}</span>
      <span class="num" style="color:var(--ink-3);font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.addr || ''}</span>
    </div>`;
  }).join('');
  return `<div class="txov-layout">${summary}${filters}<div class="txov-scroll"><div class="txov-table">${thead}${body}</div></div></div>`;
}
function openWhaleOverlay() {
  txFilter = 'all';
  openOverlay(T('whale'), whaleTableHtml(), { mode: 'tx' });
}

function renderNewsOverlayPage() {
  const items = newsArchive
    .filter((n) => newsIsFresh(n) && (!window.SETTINGS || SETTINGS.newsEnabled(n.source)))
    .sort((a, b) => b.date - a.date)
    .slice(0, 48);
  const html = items.length
    ? `<div class="ov-scroll ov-scroll--news">${items.map((n) => newsHtml(n, { selectable: true })).join('')}</div>`
    : `<div class="ov-scroll ov-scroll--news"><div class="news-item" style="opacity:.5">${T('news_empty')}</div></div>`;
  openOverlay(T('news_overlay'), html, { mode: 'news' });
}

function setWlMode(mode) {
  wlMode = mode;
  $$('#wl-tabs .wl-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.wlMode === mode);
  });
  renderWatchlist();
}

function applyLanguage(lang) {
  if (!window.I18N) return;
  if (window.SETTINGS) SETTINGS.setLang(lang);
  I18N.set(lang);
  $$('#lang-switch .lang-opt').forEach((b) => b.classList.toggle('active', b.dataset.lang === lang));
  tickClock();
  renderWatchlist();
  renderHeroes();
  renderFunding();
  renderGas();
  renderLiquidations();
  renderNews();
  renderWhale();
  if (lastFng) onFng(lastFng);
  if (lastGlobal) onGlobal(lastGlobal); else computeAltseason();
}

function triggerOtaUpdate() {
  const btn = document.getElementById('hdr-ota-btn');
  if (btn) btn.classList.add('loading');
  if (window.AndroidHost && typeof AndroidHost.checkForUpdates === 'function') {
    try { AndroidHost.checkForUpdates(); } catch (_) {
      if (btn) btn.classList.remove('loading');
    }
    return;
  }
  if (btn) btn.classList.remove('loading');
}

function initTerminalUi() {
  $$('#wl-tabs .wl-tab').forEach((tab) => {
    tab.addEventListener('click', () => setWlMode(tab.dataset.wlMode || 'usd'));
  });

  const whaleAll = $('#whale-all-btn');
  if (whaleAll) whaleAll.addEventListener('click', openWhaleOverlay);

  const newsAll = $('#news-all-btn');
  if (newsAll) newsAll.addEventListener('click', () => { overlayNewsPage = 0; renderNewsOverlayPage(); });

  const ovBack = $('#ctv-overlay-back');
  if (ovBack) ovBack.addEventListener('click', closeOverlay);

  const ovPrev = $('#ctv-overlay-prev');
  const ovNext = $('#ctv-overlay-next');
  if (ovPrev) ovPrev.addEventListener('click', () => { overlayNewsPage = Math.max(0, overlayNewsPage - 1); renderNewsOverlayPage(); });
  if (ovNext) ovNext.addEventListener('click', () => { overlayNewsPage += 1; renderNewsOverlayPage(); });

  // фильтры внутри окна крупных сделок (делегирование)
  const ovBody = $('#ctv-overlay-body');
  if (ovBody) ovBody.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-txf]');
    if (!chip) return;
    txFilter = chip.dataset.txf;
    ovBody.innerHTML = whaleTableHtml();
    if (window.TvNav && TvNav.markTabindex) TvNav.markTabindex();
    const row = ovBody.querySelector('.txov-row.selector');
    if (row && window.tvFocus) tvFocus(row, { remember: false });
  });

  const otaBtn = document.getElementById('hdr-ota-btn');
  if (otaBtn) otaBtn.addEventListener('click', triggerOtaUpdate);

  // переключатель языка
  $$('#lang-switch .lang-opt').forEach((b) => {
    b.addEventListener('click', () => applyLanguage(b.dataset.lang));
  });

  document.addEventListener('keydown', (e) => {
    const ov = $('#ctv-overlay');
    if (!ov || ov.classList.contains('hidden')) return;
    if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'Back') closeOverlay();
  });

  // хуки перерисовки для settings.js
  window.CTV.applyHero = () => { renderHeroes(); };
  window.CTV.applyWatchlist = () => { applyWatchlistSettings(); };
  window.CTV.applyNews = () => { renderNews(); };
  window.CTV.onOtaCheck = () => {
    const btn = document.getElementById('hdr-ota-btn');
    if (btn) btn.classList.remove('loading');
  };

  // настройки-попапы (шестерёнки) + D-pad по табло/оверлеям
  if (window.initSettings) initSettings();
  if (window.TvNav && TvNav.init) TvNav.init();

  // стартовое состояние из сохранённых настроек
  if (window.SETTINGS) {
    applyWatchlistSettings();
    applyLanguage(SETTINGS.lang);
  }
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
