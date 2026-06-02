/* =========================================================
   Crypto TV Terminal — настройки пользователя
   • Язык, набор hero-карточек, отслеживаемые активы, источники новостей.
   • Хранится в localStorage (переживает перезагрузку/перезапуск TV).
   • Три попапа (hero / watchlist / news) открываются ПОВЕРХ табло
     через тот же #ctv-overlay, что и списки — поэтому кнопка «Назад»
     на пульте (MainActivity → closeOverlay) закрывает и их.
   • D-pad: пространственная навигация по .selector внутри открытого
     оверлея + Enter/OK активирует.

   Подключать ПОСЛЕ i18n.js и api.js, ДО terminal.js.
   terminal.js регистрирует колбэки перерисовки в window.CTV.*
   ========================================================= */
'use strict';

window.CTV = window.CTV || {}; // сюда terminal.js кладёт rerender-хуки

const SETTINGS = (() => {
  const KEY = 'ctv.settings.v1';
  const PINNED = ['BTC', 'ETH'];               // legacy; не блокируют тумблер
  const ALL = Object.keys(ASSETS).filter((s) => s !== 'USDC');
  const HERO_MAX = 7;

  const defaults = {
    lang: 'ru',
    heroSymbols: ['BTC', 'ETH'],               // 1..6; первый — крупный (featured)
    trackedAssets: ALL.slice(),                // пул для watchlist (вкл. закреплённые)
    disabledNewsSources: [],                   // имена из CONFIG.newsSources, которые выключены
  };

  let state = load();

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
      const s = Object.assign({}, defaults, raw);
      // санити
      s.heroSymbols = (Array.isArray(s.heroSymbols) ? s.heroSymbols : defaults.heroSymbols)
        .filter((x) => ALL.includes(x)).slice(0, HERO_MAX);
      if (!s.heroSymbols.length) s.heroSymbols = ['BTC'];
      s.trackedAssets = (Array.isArray(s.trackedAssets) ? s.trackedAssets : defaults.trackedAssets)
        .filter((x) => ALL.includes(x));
      if (!s.trackedAssets.length) s.trackedAssets = ['BTC', 'ETH'];
      s.heroSymbols = s.heroSymbols.filter((x) => s.trackedAssets.includes(x));
      if (!s.heroSymbols.length) s.heroSymbols = [s.trackedAssets[0]];
      if (!['ru', 'en'].includes(s.lang)) s.lang = 'ru';
      return s;
    } catch (e) { return Object.assign({}, defaults); }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  return {
    PINNED, ALL, HERO_MAX,
    get: () => state,
    get lang() { return state.lang; },
    setLang(l) { state.lang = l; save(); },
    get heroSymbols() { return state.heroSymbols; },
    setHero(arr) {
      state.heroSymbols = arr.filter((s) => state.trackedAssets.includes(s) && ALL.includes(s)).slice(0, HERO_MAX);
      if (!state.heroSymbols.length) state.heroSymbols = [state.trackedAssets[0] || 'BTC'];
      save();
    },
    get trackedAssets() { return state.trackedAssets; },
    setTracked(arr) {
      state.trackedAssets = arr.filter((x, i) => arr.indexOf(x) === i && ALL.includes(x));
      if (!state.trackedAssets.length) state.trackedAssets = ['BTC'];
      const hero = state.heroSymbols.filter((s) => state.trackedAssets.includes(s));
      state.heroSymbols = hero.length ? hero : [state.trackedAssets[0]];
      save();
    },
    isTracked(sym) { return state.trackedAssets.includes(sym); },
    rotatingPool() { return state.trackedAssets.slice(); },
    newsEnabled(name) { return !state.disabledNewsSources.includes(name); },
    setDisabledNews(arr) { state.disabledNewsSources = arr.slice(); save(); },
    isPinned: (s) => PINNED.includes(s),
  };
})();
window.SETTINGS = SETTINGS; // делаем доступным как window.SETTINGS для terminal.js

/* =========================================================
   ПОПАПЫ НАСТРОЕК (рендерятся в #ctv-overlay)
   ========================================================= */
const SettingsUI = (() => {
  const $b = () => document.getElementById('ctv-overlay-body');
  let active = null;     // 'hero' | 'watchlist' | 'news'
  let draft = null;      // рабочая копия выбора до «Применить»

  const t = (k, ...a) => window.I18N.t(k, ...a);

  function coinIcon(sym, cls = '') {
    const a = ASSETS[sym] || { color: 'usdc', glyph: '$' };
    return `<span class="coin-ic ${cls}" style="background:var(--c-${a.color})">${a.glyph}</span>`;
  }
  function price(sym) {
    const s = (typeof ASSET_STATE !== 'undefined') && ASSET_STATE[sym];
    if (!s || !window.fmtPrice) return '';
    const pr = window.fmtPrice(s.priceUsd);
    const ch = window.fmtPct ? window.fmtPct(s.change24hPct) : '';
    const cls = s.change24hPct >= 0 ? 'up' : 'down';
    return `<div class="cfg-price"><span class="num">${pr}</span><span class="num ${cls}">${ch}</span></div>`;
  }
  function toggle(on) {
    return `<span class="tgl ${on ? 'on' : ''}"><span class="tgl-knob"></span></span>`;
  }

  /* ---------- HERO ---------- */
  function heroBody() {
    const sel = draft.hero;
    const order = (sym) => sel.indexOf(sym);
    const tracked = new Set(SETTINGS.trackedAssets);
    const rows = SETTINGS.ALL.filter((sym) => tracked.has(sym)).map((sym) => {
      const a = ASSETS[sym];
      const isOn = sel.includes(sym);
      const isFeat = sel[0] === sym;
      const idx = order(sym);
      const full = sel.length >= SETTINGS.HERO_MAX && !isOn;
      const starBtn = isOn
        ? `<button type="button" class="cfg-star ${isFeat ? 'on' : ''} selector" data-act="hero-feature" data-sym="${sym}" tabindex="-1" title="${t('featured')}">
            <svg viewBox="0 0 24 24" fill="${isFeat ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="m12 2 3 6.9 7.5.6-5.7 4.9 1.8 7.3L12 17.8 5.4 21.7l1.8-7.3L1.5 9.5 9 8.9 12 2Z"/></svg>
          </button>`
        : '';
      const orderLbl = isOn ? (isFeat ? t('featured') : '#' + (idx + 1)) : '';
      return `<div class="cfg-row cfg-row--hero ${isOn ? 'sel' : ''} ${full ? 'disabled' : ''} selector" data-act="hero-toggle" data-sym="${sym}" tabindex="-1">
        <div class="cfg-hero-top">
          ${coinIcon(sym, 'small')}
          <div class="cfg-id"><div class="tk">${sym}</div><div class="nm">${a.name}</div></div>
          ${price(sym)}
          ${starBtn}
        </div>
        <div class="cfg-hero-bot">
          <span class="cfg-order ${isOn ? '' : 'dim'}">${orderLbl}</span>
          ${toggle(isOn)}
        </div>
      </div>`;
    }).join('');
    return wrap('hero', t('hero_cfg_title'), t('hero_cfg_sub'),
      `<div class="cfg-list cfg-grid2 cfg-list--hero">${rows}</div>`,
      t('sel_count', sel.length, SETTINGS.HERO_MAX) + ' · ' + t('max_hint'));
  }

  /* ---------- WATCHLIST ---------- */
  function watchlistBody() {
    const sel = draft.tracked;
    const rows = SETTINGS.ALL.map((sym) => {
      const a = ASSETS[sym];
      const pin = SETTINGS.isPinned(sym);
      const isOn = pin || sel.includes(sym);
      return `<div class="cfg-row cfg-row--wl ${isOn ? 'sel' : ''} ${pin ? 'locked' : 'selector'}" ${pin ? '' : `data-act="wl-toggle" data-sym="${sym}" tabindex="-1"`}>
        ${coinIcon(sym)}
        <div class="cfg-id"><div class="tk">${sym}</div><div class="nm">${a.name}</div></div>
        ${price(sym)}
        ${pin ? `<span class="cfg-pin"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>${t('pinned')}</span>` : toggle(isOn)}
      </div>`;
    }).join('');
    const n = SETTINGS.PINNED.length + sel.filter((s) => !SETTINGS.isPinned(s)).length;
    return wrap('watchlist', t('wl_cfg_title'), t('wl_cfg_sub'),
      `<div class="cfg-list cfg-grid2">${rows}</div>`,
      t('sel_count', n, SETTINGS.ALL.length));
  }

  /* ---------- NEWS ---------- */
  function newsBody() {
    const groups = { en: [], ru: [] };
    (CONFIG.newsSources || []).forEach((s) => { (groups[s.lang] || groups.en).push(s); });
    const dis = new Set(draft.disabledNews);
    const srcRow = (s) => {
      const on = !dis.has(s.name);
      return `<div class="cfg-row cfg-row--news ${on ? 'sel' : ''} selector" data-act="news-toggle" data-src="${s.name}" tabindex="-1">
        <span class="news-av cfg-av" style="color:${s.color}">${s.glyph}</span>
        <div class="cfg-id"><div class="tk" style="font-size:17px">${s.name}</div><div class="nm">${s.url.replace(/^https?:\/\//, '').split('/')[0]}</div></div>
        ${toggle(on)}
      </div>`;
    };
    const quick = `<div class="cfg-quick">
      <button class="chip selector" data-act="news-quick" data-q="en" tabindex="-1">${t('all_en')}</button>
      <button class="chip selector" data-act="news-quick" data-q="ru" tabindex="-1">${t('all_ru')}</button>
      <button class="chip selector" data-act="news-quick" data-q="none" tabindex="-1">${t('clear_all')}</button>
    </div>`;
    const section = (title, arr) => arr.length
      ? `<div class="cfg-group-label">${title}</div><div class="cfg-list cfg-grid2">${arr.map(srcRow).join('')}</div>` : '';
    const total = (CONFIG.newsSources || []).length;
    const on = total - dis.size;
    return wrap('news', t('news_cfg_title'), t('news_cfg_sub'),
      quick + section('EN', groups.en) + section('RU', groups.ru),
      t('on_count', on, total));
  }

  /* ---------- общий каркас попапа ---------- */
  function wrap(kind, title, sub, listHtml, footNote) {
    return `<div class="cfg" data-kind="${kind}">
      <div class="cfg-sub">${sub}</div>
      <div class="cfg-scroll">${listHtml}</div>
      <div class="cfg-actions">
        <span class="cfg-note">${footNote}</span>
        <span class="cfg-spacer"></span>
        <button class="btn-ghost cfg-btn selector" data-act="cfg-reset" tabindex="-1">${t('reset')}</button>
        <button class="btn-ghost cfg-btn selector" data-act="cfg-cancel" tabindex="-1">${t('cancel')}</button>
        <button class="btn-ghost cfg-btn cfg-apply selector" data-act="cfg-apply" tabindex="-1">${t('apply')}</button>
      </div>
    </div>`;
  }

  function bodyFor(kind) {
    return kind === 'hero' ? heroBody() : kind === 'watchlist' ? watchlistBody() : newsBody();
  }
  function titleFor(kind) {
    return kind === 'hero' ? t('hero_cfg_title') : kind === 'watchlist' ? t('wl_cfg_title') : t('news_cfg_title');
  }

  function open(kind) {
    active = kind;
    draft = {
      hero: SETTINGS.heroSymbols.slice(),
      tracked: SETTINGS.trackedAssets.slice(),
      disabledNews: SETTINGS.get().disabledNewsSources.slice(),
    };
    window.openOverlay(titleFor(kind), bodyFor(kind), { settings: true, mode: 'cfg' });
    focusFirst();
  }
  function rerender() {
    const b = $b(); if (!b || !active) return;
    b.innerHTML = bodyFor(active);
    focusFirst();
  }
  function focusFirst() {
    const b = $b(); if (!b) return;
    const first = b.querySelector('.cfg-row.selector, .chip.selector');
    if (first) tvFocus(first);
  }

  /* ---------- действия ---------- */
  function handle(act, el) {
    if (act === 'hero-toggle') {
      const sym = el.dataset.sym;
      const i = draft.hero.indexOf(sym);
      if (i >= 0) draft.hero.splice(i, 1);
      else if (draft.hero.length < SETTINGS.HERO_MAX) draft.hero.push(sym);
      rerender();
    } else if (act === 'hero-feature') {
      const sym = el.dataset.sym;
      const i = draft.hero.indexOf(sym);
      if (i > 0) { draft.hero.splice(i, 1); draft.hero.unshift(sym); }
      rerender();
    } else if (act === 'wl-toggle') {
      const sym = el.dataset.sym;
      const i = draft.tracked.indexOf(sym);
      if (i >= 0) draft.tracked.splice(i, 1); else draft.tracked.push(sym);
      rerender();
    } else if (act === 'news-toggle') {
      const name = el.dataset.src;
      const i = draft.disabledNews.indexOf(name);
      if (i >= 0) draft.disabledNews.splice(i, 1); else draft.disabledNews.push(name);
      rerender();
    } else if (act === 'news-quick') {
      const q = el.dataset.q;
      const all = CONFIG.newsSources || [];
      if (q === 'none') draft.disabledNews = all.map((s) => s.name);
      else { // включить все указанного языка (убрать из disabled)
        const langNames = new Set(all.filter((s) => s.lang === q).map((s) => s.name));
        draft.disabledNews = draft.disabledNews.filter((n) => !langNames.has(n));
      }
      rerender();
    } else if (act === 'cfg-reset') {
      if (active === 'hero') draft.hero = ['BTC', 'ETH'];
      else if (active === 'watchlist') draft.tracked = SETTINGS.ALL.slice();
      else draft.disabledNews = [];
      rerender();
    } else if (act === 'cfg-cancel') {
      window.closeOverlay();
    } else if (act === 'cfg-apply') {
      apply();
      window.closeOverlay();
    }
  }
  function apply() {
    if (active === 'hero') {
      const hero = draft.hero.filter((s) => SETTINGS.isTracked(s));
      SETTINGS.setHero(hero.length ? hero : [SETTINGS.trackedAssets[0] || 'BTC']);
      if (window.CTV.applyHero) window.CTV.applyHero();
    } else if (active === 'watchlist') {
      SETTINGS.setTracked(draft.tracked);
      if (window.CTV.applyWatchlist) window.CTV.applyWatchlist();
    } else {
      SETTINGS.setDisabledNews(draft.disabledNews);
      if (window.CTV.applyNews) window.CTV.applyNews();
    }
  }

  return { open, handle, isOpen: () => !!active, close: () => { active = null; draft = null; } };
})();

/* ---------- Каталог «Все активы» (тумблеры → обзор + hero) ---------- */
const AssetsCatalog = (() => {
  const t = (k, ...a) => window.I18N.t(k, ...a);

  function coinIcon(sym, cls = '') {
    const a = ASSETS[sym] || { color: 'usdc', glyph: '$' };
    return `<span class="coin-ic ${cls}" style="background:var(--c-${a.color})">${a.glyph}</span>`;
  }
  function price(sym) {
    const s = ASSET_STATE[sym];
    if (!s || !window.fmtPrice) return '';
    const pr = window.fmtPrice(s.priceUsd);
    const ch = window.fmtPct ? window.fmtPct(s.change24hPct) : '';
    const cls = s.change24hPct >= 0 ? 'up' : 'down';
    return `<div class="cfg-price"><span class="num">${pr}</span><span class="num ${cls}">${ch}</span></div>`;
  }
  function toggle(on) {
    return `<span class="tgl ${on ? 'on' : ''}"><span class="tgl-knob"></span></span>`;
  }

  function sortedSymbols() {
    return SETTINGS.ALL.slice().sort((a, b) => {
      const va = (ASSET_STATE[a] && ASSET_STATE[a].volumeUsd) || 0;
      const vb = (ASSET_STATE[b] && ASSET_STATE[b].volumeUsd) || 0;
      return vb - va;
    });
  }

  function html() {
    const on = SETTINGS.trackedAssets.length;
    const rows = sortedSymbols().map((sym) => {
      const a = ASSETS[sym];
      const isOn = SETTINGS.isTracked(sym);
      return `<div class="cfg-row cfg-row--wl selector" data-act="asset-toggle" data-sym="${sym}" tabindex="-1">
        ${coinIcon(sym, 'small')}
        <div class="cfg-id"><div class="tk">${sym}</div><div class="nm">${a.name}</div></div>
        ${price(sym)}
        ${toggle(isOn)}
      </div>`;
    }).join('');
    return `<div class="cfg assets-catalog">
      <div class="cfg-sub">${t('all_assets_sub')}</div>
      <div class="cfg-scroll"><div class="cfg-list cfg-grid2 cfg-list--assets">${rows}</div></div>
      <div class="cfg-note assets-catalog-note">${t('on_count', on, SETTINGS.ALL.length)}</div>
    </div>`;
  }

  function applyToggle(sym) {
    if (!SETTINGS.ALL.includes(sym)) return;
    let tracked = SETTINGS.trackedAssets.slice();
    const i = tracked.indexOf(sym);
    if (i >= 0) tracked.splice(i, 1);
    else tracked.push(sym);
    SETTINGS.setTracked(tracked);
    if (window.CTV.applyWatchlist) window.CTV.applyWatchlist();
    if (window.CTV.applyHero) window.CTV.applyHero();
    const body = document.getElementById('ctv-overlay-body');
    if (body && document.querySelector('.ctv-overlay--assets')) {
      body.innerHTML = html();
      if (window.TvNav && TvNav.markTabindex) TvNav.markTabindex();
      const row = body.querySelector(`[data-sym="${sym}"]`);
      if (row && window.tvFocus) tvFocus(row, { remember: false });
    }
  }

  function open() {
    window.openOverlay(t('all_assets'), html(), { mode: 'assets' });
    if (window.TvNav && TvNav.focusOverlayEntry) TvNav.focusOverlayEntry('assets');
  }

  return { open, applyToggle, html };
})();
window.AssetsCatalog = AssetsCatalog;

function initSettings() {
  const map = { 'hero-cfg-btn': 'hero', 'news-cfg-btn': 'news' };
  Object.keys(map).forEach((id) => {
    const b = document.getElementById(id);
    if (b) b.addEventListener('click', () => SettingsUI.open(map[id]));
  });

  // делегирование кликов внутри тела оверлея (тумблеры/кнопки попапа)
  const body = document.getElementById('ctv-overlay-body');
  if (body) body.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    if (el.dataset.act === 'asset-toggle' && el.dataset.sym) {
      AssetsCatalog.applyToggle(el.dataset.sym);
      return;
    }
    if (!SettingsUI.isOpen()) return;
    if (el.classList.contains('disabled')) return;
    SettingsUI.handle(el.dataset.act, el);
  });

  const wlAll = document.getElementById('wl-all-btn');
  const wlCfg = document.getElementById('wl-cfg-btn');
  if (wlAll) wlAll.addEventListener('click', () => AssetsCatalog.open());
  if (wlCfg) wlCfg.addEventListener('click', () => AssetsCatalog.open());

  // сбрасываем активный попап при закрытии оверлея
  const back = document.getElementById('ctv-overlay-back');
  if (back) back.addEventListener('click', () => SettingsUI.close());

}
window.SettingsUI = SettingsUI;
window.initSettings = initSettings;
