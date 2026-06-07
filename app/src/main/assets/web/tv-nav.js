/* =========================================================
   TV D-pad: навигация по табло и оверлеям (Android TV: DPAD + Arrow)
   ========================================================= */
'use strict';

let lastMainFocus = null;
let focusVisible = true;
let idleTimer = null;
const FOCUS_IDLE_MS = 5000;

function visible(el) {
  return el && el.offsetParent !== null && !el.disabled && !el.classList.contains('disabled');
}

function isSelector(el) {
  return el && el.classList && el.classList.contains('selector');
}

/* PRO: открыто ли выпадающее меню режимов (тогда стрелки/OK обрабатывает pro.js) */
function proMenuOpen() {
  const m = document.getElementById('mode-menu');
  return !!(m && !m.classList.contains('hidden'));
}
/* PRO: активен ли PRO-экран (основное табло скрыто, показан #pro-stage) */
function proActive() {
  return document.body.classList.contains('pro-active');
}

/** Android TV WebView часто шлёт keyCode 19–22, а не e.key Arrow* */
function keyToDir(e) {
  const byKey = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    Up: 'up', Down: 'down', Left: 'left', Right: 'right',
  };
  if (byKey[e.key]) return byKey[e.key];
  const kc = e.keyCode || e.which || 0;
  if (kc === 38 || kc === 19) return 'up';
  if (kc === 40 || kc === 20) return 'down';
  if (kc === 37 || kc === 21) return 'left';
  if (kc === 39 || kc === 22) return 'right';
  return null;
}

function isActivateKey(e) {
  if (e.key === 'Enter' || e.key === ' ') return true;
  const kc = e.keyCode || e.which || 0;
  return kc === 13 || kc === 23; /* Enter / DPAD_CENTER */
}

function hideFocusRing() {
  focusVisible = false;
  document.querySelectorAll('.selector.focus').forEach((n) => n.classList.remove('focus'));
  document.querySelectorAll('.nav-zone-focus').forEach((n) => n.classList.remove('nav-zone-focus'));
  document.body.classList.add('tv-ui-idle');
}

function wakeFocusRing() {
  focusVisible = true;
  document.body.classList.remove('tv-ui-idle');
}

function resetIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(hideFocusRing, FOCUS_IDLE_MS);
}

function applyZoneHighlight(el) {
  document.querySelectorAll('.nav-zone-focus').forEach((n) => n.classList.remove('nav-zone-focus'));
  if (!el || el.classList.contains('panel-cog')) return;
  const panel = el.closest('#watchlist, #whale, #news, #header');
  if (panel) panel.classList.add('nav-zone-focus');
}

function scrollNestedScroll(el) {
  const sc = el && el.closest('.cfg-scroll, .ov-scroll');
  if (!sc || !el) return;
  const pad = 14;
  const er = el.getBoundingClientRect();
  const sr = sc.getBoundingClientRect();
  if (er.top < sr.top + pad) sc.scrollTop -= (sr.top + pad - er.top);
  else if (er.bottom > sr.bottom - pad) sc.scrollTop += (er.bottom - sr.bottom + pad);
}

function tvFocus(el, opts) {
  if (!el || !visible(el) || !isSelector(el)) return;
  const remember = !opts || opts.remember !== false;
  const scope = (opts && opts.scope) || el.closest('.ctv-overlay') || document.getElementById('stage') || document;
  wakeFocusRing();
  scope.querySelectorAll('.selector.focus').forEach((n) => n.classList.remove('focus'));
  el.classList.add('focus');
  try { el.focus({ preventScroll: false }); } catch (_) { try { el.focus(); } catch (_2) {} }
  applyZoneHighlight(el);
  scrollNestedScroll(el);
  if (el.scrollIntoView) {
    try { el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); }
    catch (_) { el.scrollIntoView(true); }
  }
  scrollNestedScroll(el);
  if (remember && (!scope.id || scope.id === 'stage' || scope.closest('#stage'))) lastMainFocus = el;
  resetIdleTimer();
}

const MAIN_ZONES = [
  { id: 'mode', items: () => [document.getElementById('mode-btn')].filter(Boolean) },
  { id: 'ota', items: () => [document.getElementById('hdr-ota-btn')].filter(Boolean) },
  { id: 'lang', items: () => [...document.querySelectorAll('#lang-switch .lang-opt.selector')] },
  {
    id: 'wl',
    items: () => [
      ...document.querySelectorAll('#wl-tabs .wl-tab.selector'),
      document.getElementById('wl-cfg-btn'),
      document.getElementById('wl-all-btn'),
    ].filter(Boolean),
  },
  { id: 'hero', items: () => [document.getElementById('hero-cfg-btn')].filter(Boolean) },
  {
    id: 'news',
    items: () => [document.getElementById('news-all-btn'), document.getElementById('news-cfg-btn')].filter(Boolean),
  },
  { id: 'whale', items: () => [document.getElementById('whale-all-btn')].filter(Boolean) },
];

const MAIN_DOWN = { mode: 'ota', ota: 'lang', lang: 'wl', wl: 'whale', hero: 'whale', news: 'whale' };
const MAIN_UP = { whale: 'wl', wl: 'lang', lang: 'ota', ota: 'mode', hero: 'wl', news: 'wl' };

function mainZoneList() {
  return MAIN_ZONES.map((z) => ({ id: z.id, items: z.items().filter(visible) })).filter((z) => z.items.length);
}

function findInMain(el) {
  if (!isSelector(el)) return null;
  const zones = mainZoneList();
  for (let zi = 0; zi < zones.length; zi++) {
    const idx = zones[zi].items.indexOf(el);
    if (idx >= 0) return { zones, zi, idx, zone: zones[zi] };
  }
  return null;
}

function pickMain(current, dir) {
  const zones = mainZoneList();
  if (!zones.length) return null;

  let curEl = current;
  let cur = curEl ? findInMain(curEl) : null;
  if (!cur) {
    if (lastMainFocus && visible(lastMainFocus)) curEl = lastMainFocus;
    else curEl = zones[0].items[0];
    cur = findInMain(curEl);
  }
  if (!cur) return zones[0].items[0];

  if (dir === 'right') {
    if (cur.idx < cur.zone.items.length - 1) return cur.zone.items[cur.idx + 1];
    if (cur.zi < zones.length - 1) return zones[cur.zi + 1].items[0];
    return cur.zone.items[cur.idx];
  }
  if (dir === 'left') {
    if (cur.idx > 0) return cur.zone.items[cur.idx - 1];
    if (cur.zi > 0) return zones[cur.zi - 1].items[zones[cur.zi - 1].items.length - 1];
    return cur.zone.items[cur.idx];
  }
  if (dir === 'down') {
    if (cur.idx < cur.zone.items.length - 1) return cur.zone.items[cur.idx + 1];
    const nextId = MAIN_DOWN[cur.zone.id];
    if (nextId) {
      const nz = zones.find((z) => z.id === nextId);
      if (nz) {
        if (cur.zone.id === 'wl') return nz.items[nz.items.length - 1] || nz.items[0];
        return nz.items[0];
      }
    }
    return cur.zone.items[cur.idx];
  }
  if (dir === 'up') {
    if (cur.idx > 0) return cur.zone.items[cur.idx - 1];
    const prevId = MAIN_UP[cur.zone.id];
    if (prevId) {
      const pz = zones.find((z) => z.id === prevId);
      if (pz) {
        if (cur.zone.id === 'whale') return pz.items[pz.items.length - 1] || pz.items[0];
        return pz.items[0];
      }
    }
    if (cur.zi > 0) return zones[cur.zi - 1].items[zones[cur.zi - 1].items.length - 1];
    return cur.zone.items[cur.idx];
  }
  return null;
}

function overlayMode() {
  const panel = document.querySelector('.ctv-overlay__panel');
  if (!panel) return '';
  if (panel.classList.contains('ctv-overlay--tx')) return 'tx';
  if (panel.classList.contains('ctv-overlay--assets')) return 'assets';
  if (panel.classList.contains('ctv-overlay--news')) return 'news';
  if (panel.classList.contains('ctv-overlay--cfg')) return 'cfg';
  if (panel.classList.contains('ctv-overlay--assets')) return 'assets';
  return '';
}

function pickAssetsOverlay(ov, current, dir) {
  const back = document.getElementById('ctv-overlay-back');
  const rows = [...ov.querySelectorAll('.assets-catalog .cfg-row.selector')].filter(visible);
  const chain = [back, ...rows].filter(visible);
  const step = chainStep(chain, current, dir);
  if (step) return step;
  if (dir === 'left' || dir === 'right') return spatialPick(ov, current, dir);
  return null;
}

function chainStep(chain, current, dir) {
  if (!chain.length) return null;
  const idx = current ? chain.indexOf(current) : -1;
  if (dir === 'down') {
    if (idx < 0) return chain[0];
    if (idx < chain.length - 1) return chain[idx + 1];
    return chain[idx];
  }
  if (dir === 'up') {
    if (idx < 0) return chain[0];
    if (idx > 0) return chain[idx - 1];
    return chain[idx];
  }
  return null;
}

function pickScrollOverlay(ov, current, dir) {
  const back = document.getElementById('ctv-overlay-back');
  const list = [...ov.querySelectorAll('.ov-scroll .selector')].filter(visible);
  if (!list.length) return null;
  const chain = [back, ...list].filter(visible);
  const step = chainStep(chain, current, dir);
  if (step && step !== current) return step;
  if (dir === 'left' || dir === 'right') return spatialPick(ov, current, dir);
  return step || null;
}

function pickCfgOverlay(ov, current, dir) {
  const back = document.getElementById('ctv-overlay-back');
  const chips = [...ov.querySelectorAll('.cfg-quick .selector')].filter(visible);
  const rows = [...ov.querySelectorAll('.cfg-row.selector')].filter(visible);
  const stars = [...ov.querySelectorAll('.cfg-star.selector')].filter(visible);
  const acts = [...ov.querySelectorAll('.cfg-actions .selector')].filter(visible);
  const chain = [back, ...chips, ...rows, ...stars, ...acts].filter(visible);
  const step = chainStep(chain, current, dir);
  if (step) return step;
  if (dir === 'left' || dir === 'right') {
    if (current && current.closest('.cfg-quick')) {
      const ci = chips.indexOf(current);
      if (ci >= 0) {
        if (dir === 'right' && ci < chips.length - 1) return chips[ci + 1];
        if (dir === 'left' && ci > 0) return chips[ci - 1];
      }
    }
    if (current && current.classList.contains('cfg-star')) {
      const si = stars.indexOf(current);
      if (si >= 0) {
        if (dir === 'right' && si < stars.length - 1) return stars[si + 1];
        if (dir === 'left' && si > 0) return stars[si - 1];
      }
    }
  }
  return spatialPick(ov, current, dir);
}

function pickTxOverlay(ov, current, dir) {
  const back = document.getElementById('ctv-overlay-back');
  const chips = [...ov.querySelectorAll('.txov-filters .selector')].filter(visible);
  const rows = [...ov.querySelectorAll('.txov-row.selector')].filter(visible);
  const chain = [back, ...chips, ...rows].filter(visible);
  if (!chain.length) return null;
  const idx = current ? chain.indexOf(current) : -1;
  if (dir === 'down') {
    if (idx < 0) return chain[0];
    if (idx < chain.length - 1) return chain[idx + 1];
    return chain[idx];
  }
  if (dir === 'up') {
    if (idx < 0) return chain[0];
    if (idx > 0) return chain[idx - 1];
    return chain[idx];
  }
  if (dir === 'left' || dir === 'right') {
    if (current && current.closest('.txov-filters')) {
      const ci = chips.indexOf(current);
      if (ci >= 0) {
        if (dir === 'right' && ci < chips.length - 1) return chips[ci + 1];
        if (dir === 'left' && ci > 0) return chips[ci - 1];
        return current;
      }
    }
  }
  return spatialPick(ov, current, dir);
}

function pickOverlay(ov, current, dir) {
  const mode = overlayMode();
  if (mode === 'tx') {
    const next = pickTxOverlay(ov, current, dir);
    if (next) return next;
  }
  if (mode === 'news') {
    const next = pickScrollOverlay(ov, current, dir);
    if (next) return next;
  }
  if (mode === 'assets') {
    const next = pickAssetsOverlay(ov, current, dir);
    if (next) return next;
  }
  if (mode === 'cfg') {
    const next = pickCfgOverlay(ov, current, dir);
    if (next) return next;
  }
  return spatialPick(ov, current, dir);
}

function spatialPick(root, current, dir) {
  const items = [...root.querySelectorAll('.selector')].filter(visible);
  if (!items.length) return null;
  let cur = (current && items.includes(current)) ? current : null;
  if (!cur && lastMainFocus && items.includes(lastMainFocus)) cur = lastMainFocus;
  if (!cur) return items[0];

  const cr = cur.getBoundingClientRect();
  const cx = cr.left + cr.width / 2;
  const cy = cr.top + cr.height / 2;
  let best = null;
  let bestScore = Infinity;

  for (const it of items) {
    if (it === cur) continue;
    const r = it.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    const ok = dir === 'right' ? dx > 4 : dir === 'left' ? dx < -4 : dir === 'down' ? dy > 4 : dy < -4;
    if (!ok) continue;
    const along = (dir === 'left' || dir === 'right') ? Math.abs(dx) : Math.abs(dy);
    const cross = (dir === 'left' || dir === 'right') ? Math.abs(dy) : Math.abs(dx);
    const score = along + cross * 3.5;
    if (score < bestScore) {
      bestScore = score;
      best = it;
    }
  }
  return best || cur;
}

function overlayOpen() {
  const ov = document.getElementById('ctv-overlay');
  return ov && !ov.classList.contains('hidden');
}

function getCurrentFocus(root) {
  const marked = root.querySelector('.selector.focus');
  if (marked && visible(marked)) return marked;
  const ae = document.activeElement;
  if (ae && root.contains(ae) && isSelector(ae) && visible(ae)) return ae;
  return null;
}

/** Сброс нативного фокуса WebView (например «в реальном времени») */
function clearStrayFocus() {
  const ae = document.activeElement;
  if (ae && ae !== document.body && ae !== document.documentElement && !isSelector(ae)) {
    try { ae.blur(); } catch (_) {}
  }
}

function onNavKey(e) {
  const dir = keyToDir(e);
  if (!dir) return;
  if (proMenuOpen()) return; // меню режимов обрабатывает стрелки само (pro.js)

  e.preventDefault();
  e.stopPropagation();
  wakeFocusRing();

  if (overlayOpen()) {
    const ov = document.getElementById('ctv-overlay');
    clearStrayFocus();
    let cur = getCurrentFocus(ov);
    if (!cur && !focusVisible && lastMainFocus) cur = null;
    const next = pickOverlay(ov, cur, dir);
    if (next) tvFocus(next, { remember: false });
    return;
  }

  const stage = document.getElementById('stage');
  if (!stage) return;
  clearStrayFocus();

  if (proActive()) {
    // PRO-режим: основное табло скрыто → пространственная навигация
    // по видимым .selector (шапка: режим/язык/OTA + контент #pro-stage)
    const curp = getCurrentFocus(stage);
    const nextp = spatialPick(stage, curp, dir);
    if (nextp) tvFocus(nextp, { remember: true });
    return;
  }

  let cur = getCurrentFocus(stage);
  if (!cur && lastMainFocus && stage.contains(lastMainFocus) && visible(lastMainFocus)) {
    cur = lastMainFocus;
    if (focusVisible) cur.classList.add('focus');
  }
  const next = pickMain(cur, dir);
  if (next) tvFocus(next, { remember: true });
  else focusMainStart();
}

function onActivateKey(e) {
  if (!isActivateKey(e)) return;
  if (proMenuOpen()) return; // выбор пункта меню режимов делает pro.js
  const root = overlayOpen() ? document.getElementById('ctv-overlay') : document.getElementById('stage');
  if (!root) return;
  clearStrayFocus();
  const cur = getCurrentFocus(root);
  if (!cur || !isSelector(cur) || !root.contains(cur)) return;
  e.preventDefault();
  e.stopPropagation();
  cur.click();
}

function markTabindex() {
  document.querySelectorAll('#stage .selector, #ctv-overlay .selector').forEach((el) => {
    el.setAttribute('tabindex', '0');
  });
  document.querySelectorAll('#stage .whale-meta, #stage [data-no-focus="1"]').forEach((el) => {
    el.setAttribute('tabindex', '-1');
  });
}

function markNonFocusable() {
  const meta = document.querySelector('#whale .whale-meta');
  if (meta) {
    meta.setAttribute('tabindex', '-1');
    meta.setAttribute('data-no-focus', '1');
  }
}

function focusMainStart() {
  markNonFocusable();
  clearStrayFocus();
  const wlAll = document.getElementById('wl-all-btn');
  const zones = mainZoneList();
  const start = (wlAll && visible(wlAll)) ? wlAll : (zones[0] && zones[0].items[0]);
  if (start) tvFocus(start, { remember: true });
}

function restoreMainFocus() {
  markNonFocusable();
  clearStrayFocus();
  if (lastMainFocus && visible(lastMainFocus)) tvFocus(lastMainFocus, { remember: true });
  else focusMainStart();
}

let tvNavInited = false;

function focusOverlayEntry(mode) {
  markTabindex();
  const ov = document.getElementById('ctv-overlay');
  if (!ov) return;
  if (mode === 'tx') {
    const chip = ov.querySelector('.txov-filters .selector');
    if (chip) { tvFocus(chip, { remember: false }); return; }
  }
  if (mode === 'assets') {
    const row = ov.querySelector('.assets-catalog .cfg-row.selector');
    if (row) { tvFocus(row, { remember: false }); return; }
  }
  if (mode === 'news') {
    const item = ov.querySelector('.ov-scroll--news .news-item.selector');
    if (item) { tvFocus(item, { remember: false }); return; }
  }
  const back = document.getElementById('ctv-overlay-back');
  if (back) tvFocus(back, { remember: false });
}

function initTvNav() {
  if (tvNavInited) return;
  tvNavInited = true;
  markNonFocusable();
  markTabindex();
  document.addEventListener('keydown', onNavKey, true);
  document.addEventListener('keydown', onActivateKey, true);
  setTimeout(() => { focusMainStart(); resetIdleTimer(); }, 500);
}

window.tvFocus = tvFocus;
window.TvNav = {
  init: initTvNav,
  focusMainStart,
  focusOverlayEntry,
  restoreMainFocus,
  markTabindex,
  markNonFocusable,
  pickMain,
  spatialPick,
};
