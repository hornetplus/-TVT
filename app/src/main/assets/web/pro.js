/* =========================================================
   Crypto TV Terminal — PRO LAYER · контроллер + экраны
   ---------------------------------------------------------
   • Кнопка «Режим» в шапке → выпадающее меню (D-pad + клик).
   • Переключает #pro-stage (поверх области main+whale).
   • 5 PRO-экранов рендерятся из PRO_DATA (форма backend JSON).
   • Сохраняет выбор в localStorage, реагирует на смену языка.
   Подключать ПОСЛЕ terminal.js (использует $,$$,coinIcon,
   fmtVol,fmtPct,relTime,ASSET_STATE из общего скоупа).
   ========================================================= */
'use strict';

(function () {
  const LS_KEY = 'ctv.mode';

  /* ---------- helpers ---------- */
  const sel = (s, r = document) => r.querySelector(s);
  const fbMeta = { USDT: { color: 'sol', glyph: '₮' } };
  function proCoin(sym, cls = '') {
    const a = (typeof ASSET_STATE !== 'undefined') ? ASSET_STATE[sym] : null;
    if (a && typeof coinIcon === 'function') return coinIcon(a, cls);
    const fb = fbMeta[sym] || { color: 'usdc', glyph: '$' };
    return `<span class="coin-ic ${cls}" style="background:var(--c-${fb.color})">${fb.glyph}</span>`;
  }
  function usd(v) { return (typeof fmtVol === 'function') ? fmtVol(v) : '$' + v; }
  function pct(v) { return (typeof fmtPct === 'function') ? fmtPct(v) : (v >= 0 ? '+' : '') + v + '%'; }
  function rel(ts) { return (typeof window.relTime === 'function') ? window.relTime(new Date(ts)) : ''; }
  function dirCls(v) { return v == null ? '' : v >= 0 ? 'up' : 'down'; }
  const D = () => window.PRO_DATA;

  /* ---------- SVG icons ---------- */
  const IC = {
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
    layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/></svg>',
    whale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12c2 0 3-1.5 5-1.5S14 12 14 12s-1 4-6 4a5 5 0 0 1-5-4Z"/><path d="M14 12c1-3 4-5 8-5-1 2-1 3 0 5-2 .5-3 1.5-3 3"/><path d="M6 11.5V9"/></svg>',
    news: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    chevDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    arrowR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    flame: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5Z"/></svg>',
    activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
    target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>',
    wave: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12c1.5 0 1.5-3 3-3s1.5 6 3 6 1.5-9 3-9 1.5 6 3 6 1.5-3 3-3"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/></svg>',
    move: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>',
    heat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="9" height="12" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="17" width="9" height="4" rx="1"/></svg>',
  };
  const alertIc = { liquidation_spike: IC.flame, oi_surge: IC.activity, funding_anomaly: IC.wave,
    session_breakout: IC.target, volume_spike: IC.bolt, whale_inflow: IC.whale, risk_pulse: IC.shield };

  /* ---------- ring gauge ---------- */
  function ringGauge(score, color, r, stroke) {
    const C = 2 * Math.PI * r;
    const off = C * (1 - Math.max(0, Math.min(100, score)) / 100);
    const cx = r + stroke; const sz = (r + stroke) * 2;
    return `<svg width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}">
      <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="${stroke}"/>
      <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/>
    </svg>`;
  }

  /* =========================================================
     MODE REGISTRY
     ========================================================= */
  const MODES = [
    { id: 'general', pro: false, ic: IC.grid,   nameK: 'mode_general', subK: 'mode_general_sub' },
    { id: 'session', pro: true,  ic: IC.globe,  nameK: 'mode_session', subK: 'mode_session_sub', render: renderSession },
    { id: 'deriv',   pro: true,  ic: IC.layers, nameK: 'mode_deriv',   subK: 'mode_deriv_sub',   render: renderDerivatives },
    { id: 'whale',   pro: true,  ic: IC.whale,  nameK: 'mode_whale',   subK: 'mode_whale_sub',   render: renderWhaleIntel },
    { id: 'news',    pro: true,  ic: IC.news,   nameK: 'mode_news',    subK: 'mode_news_sub',    render: renderSmartNews },
    { id: 'alerts',  pro: true,  ic: IC.bell,   nameK: 'mode_alerts',  subK: 'mode_alerts_sub',  render: renderSmartAlerts },
    { id: 'heatmap', pro: true,  ic: IC.heat,   nameK: 'mode_heatmap', subK: 'mode_heatmap_sub', render: renderHeatmap },
  ];
  const modeById = (id) => MODES.find((m) => m.id === id) || MODES[0];
  let currentMode = (function () { try { return localStorage.getItem(LS_KEY) || 'general'; } catch (e) { return 'general'; } })();
  if (!modeById(currentMode)) currentMode = 'general';

  /* =========================================================
     SCREEN HEADER helper
     ========================================================= */
  function proHead(m, metaHtml) {
    return `<div class="pro-head">
      <span class="ph-ic">${m.ic}</span>
      <span class="ph-title">${PT(m.nameK)}</span>
      <span class="ph-pro">PRO</span>
      <span class="ph-spacer"></span>
      <span class="ph-meta">${metaHtml || ''}</span>
    </div>`;
  }

  /* =========================================================
     A · SESSION INTELLIGENCE
     ========================================================= */
  function biasTag(b) { return `<span class="bias-tag ${b}">${PT('bias_' + b)}</span>`; }
  function riskTagEl(rt) {
    const col = { short_squeeze: 'var(--up)', long_squeeze: 'var(--down)', deleveraging: 'var(--ink-2)',
      continuation: 'var(--up)', distribution: 'var(--mixed)', crowded_longs: 'var(--mixed)', crowded_shorts: 'var(--mixed)' }[rt] || 'var(--cyan)';
    return `<span class="risk-tag"><span class="rt-dot" style="background:${col}"></span>${PT('rt_' + rt)}</span>`;
  }
  let sessionMetric = 'price'; // 'price' | 'volume' | 'mcap'
  function sessAssetRow(a) {
    if (a.open == null) {
      return `<div class="sess-arow">${proCoin(a.sym, 'small')}
        <div><div class="sa-tk">${a.sym}</div><div class="sa-ohlc">—</div></div>
        <div class="sa-right"><div class="sa-chg" style="color:var(--ink-4)">—</div></div></div>`;
    }
    const fp = (v) => v >= 1000 ? '$' + Math.round(v).toLocaleString('en-US') : '$' + (+v).toFixed((+v) >= 1 ? 2 : 4);
    let main, sub;
    if (sessionMetric === 'volume') {
      main = `<div class="sa-chg ${dirCls(a.changePct)}">${usd(a.volumeUsd)}</div><div class="sa-vol">${PT('sess_vol')}</div>`;
      sub = `${PT('sess_high')} ${fp(a.high)} · ${PT('sess_low')} ${fp(a.low)}`;
    } else if (sessionMetric === 'mcap') {
      main = `<div class="sa-chg ${dirCls(a.changePct)}">${a.marketCap ? usd(a.marketCap) : '—'}</div><div class="sa-vol">${PT('sm_mcap')}</div>`;
      sub = `${PT('sess_vol')} ${usd(a.volumeUsd)}`;
    } else {
      main = `<div class="sa-chg ${dirCls(a.changePct)}">${pct(a.changePct)}</div><div class="sa-vol">${PT('sess_vol')} ${usd(a.volumeUsd)}</div>`;
      sub = `${PT('sess_high')} ${fp(a.high)} · ${PT('sess_low')} ${fp(a.low)}`;
    }
    return `<div class="sess-arow">${proCoin(a.sym, 'small')}
      <div><div class="sa-tk">${a.sym}</div><div class="sa-ohlc">${sub}</div></div>
      <div class="sa-right">${main}</div></div>`;
  }
  function sessCard(s) {
    const nameK = { asia: 'sess_asia', europe: 'sess_europe', us: 'sess_us' }[s.session];
    const isUp = s.status === 'upcoming';
    const body = isUp
      ? `<div class="sess-empty">${IC.clock}<div class="se-t">${PT('st_upcoming')}<br>${s.window}</div></div>`
      : `<div class="sess-assets">${s.assets.map(sessAssetRow).join('')}</div>
         <div class="sess-deriv">
           <div class="sd-cell"><div class="sd-l">${PT('oi_delta')}</div><div class="sd-v ${dirCls(s.openInterestDelta)}">${pct(s.openInterestDelta)}</div></div>
           <div class="sd-cell"><div class="sd-l">${PT('fund_shift')}</div><div class="sd-v ${dirCls(s.fundingShift)}">${pct(s.fundingShift)}</div></div>
           <div class="sd-cell"><div class="sd-l">${PT('liq_sess')}</div><div class="sd-v">${usd(s.liquidationsUsd)}</div></div>
         </div>`;
    return `<section class="panel sess-card ${s.status}">
      <div class="sess-top">
        <div><div class="sess-name">${PT(nameK)}</div><div class="sess-tz">${s.tz}</div></div>
        <span class="sess-status ${s.status}"><span class="live-dot"></span>${PT('st_' + s.status)}</span>
      </div>
      <div class="sess-tags">${biasTag(s.marketBias)}${riskTagEl(s.riskTag)}</div>
      ${body}
      <div class="sess-news"><div style="min-width:0;width:100%"><div class="sn-l"><span class="sn-expert">${PT('expert')}</span><span class="sn-phase">· ${PT('aiph_' + (s.aiInsight ? s.aiInsight.phase : 'closing'))}</span></div>
        <div class="sn-t">${(function(){var lng=(window.I18N&&I18N.get)?I18N.get():'ru'; var ai=s.aiInsight?(s.aiInsight[lng]||s.aiInsight.ru||s.aiInsight.en||''):''; if(ai) return ai; var t=PL(s.topNews && s.topNews.title != null ? s.topNews.title : s.topNews); return t ? t : '<span style="color:var(--ink-4)">'+(s.status==='upcoming'?PT('sess_pending'):'—')+'</span>';})()}</div></div></div>
    </section>`;
  }
  function renderSession(m) {
    const metrics = [['price', 'sm_price'], ['volume', 'sm_volume'], ['mcap', 'sm_mcap']];
    const tabs = `<span class="hm-tabs">${metrics.map(([id, k]) =>
      `<button type="button" class="hm-tab selector ${id === sessionMetric ? 'active' : ''}" data-sm="${id}" tabindex="-1">${PT(k)}</button>`).join('')}</span>`;
    return `<div class="pro-screen">${proHead(m, tabs)}
      <div class="pro-body sess-grid">${D().sessions.map(sessCard).join('')}</div></div>`;
  }

  /* =========================================================
     B · DERIVATIVES (Liquidations + OI + Funding)
     ========================================================= */
  function heatRows(asset) {
    const max = Math.max(...asset.clusters.map((c) => c.usd));
    return asset.clusters.slice().sort((a, b) => b.price - a.price).map((c) => `
      <div class="heat-row">
        <span class="hr-price">$${Math.round(c.price).toLocaleString('en-US')}</span>
        <span class="hr-track"><span class="hr-fill ${c.side}" style="width:${Math.round(c.usd / max * 100)}%"></span></span>
        <span class="hr-usd ${c.side === 'short' ? 'down' : 'up'}">${usd(c.usd)}</span>
      </div>`).join('');
  }
  function liqCard(a) {
    const shortPct = (a.shortPct != null) ? a.shortPct : 50;
    const longPct = 100 - shortPct;
    const dom = shortPct >= longPct ? 'down' : 'up';
    return `<div class="da-card liq-card">
      <div class="da-top">${proCoin(a.sym, 'small')}<span class="da-tk">${a.sym}</span><span class="da-main num ${dom}">${usd(a.totalUsd || 0)}</span></div>
      <div class="liqc-bar"><span class="liqc-seg up" style="width:${longPct}%"></span><span class="liqc-seg down" style="width:${shortPct}%"></span></div>
      <div class="liqc-legend"><span class="up">${PT('liq_longs')} ${longPct}%</span><span class="down">${shortPct}% ${PT('liq_shorts')}</span></div>
    </div>`;
  }
  function renderLiqPanel() {
    const L = D().liquidation_summary;
    const longShare = Math.round(L.long24hUsd / (L.long24hUsd + L.short24hUsd) * 100);
    const shortShare = 100 - longShare;
    return `<section class="panel deriv-liq">
      <div class="pro-panel-title">${IC.flame}${PT('liq_pro')}<span class="src">${L.source}</span></div>
      <div class="liq-windows">
        <div class="liq-win"><div class="lw-l">${PT('liq_1h')}</div><div class="lw-v">${usd(L.window1hUsd)}</div></div>
        <div class="liq-win sess"><div class="lw-l">${PT('liq_session')}</div><div class="lw-v" style="color:var(--cyan)">${usd(L.sessionUsd)}</div></div>
        <div class="liq-win"><div class="lw-l">${PT('liq_24h')}</div><div class="lw-v">${usd(L.window24hUsd)}</div></div>
      </div>
      <div class="liq-skew">
        <span class="ls-tag up">${PT('liq_longs')} ${longShare}%</span>
        <span class="ls-bar"><span class="ls-long ls-seg" style="width:${longShare}%">${usd(L.long24hUsd)}</span><span class="ls-short ls-seg" style="width:${shortShare}%">${usd(L.short24hUsd)}</span></span>
        <span class="ls-tag down">${shortShare}% ${PT('liq_shorts')}</span>
      </div>
      <div class="liq-cards-wrap">
        <div class="pro-panel-title" style="font-size:13px">${PT('liq_byasset')}</div>
        <div class="liq-cards">${L.byAsset.slice(0, 6).map(liqCard).join('')}</div>
      </div>
    </section>`;
  }
  function oiCard(o) {
    const st = { new_money: 'oi_new_money', short_cover: 'oi_short_cover', bear_build: 'oi_bear_build', delever: 'oi_delever' }[o.status];
    const itc = { new_money: 'bull', short_cover: 'warn', bear_build: 'bear', delever: 'flat' }[o.status];
    return `<div class="da-card">
      <div class="da-top">${proCoin(o.sym, 'small')}<span class="da-tk">${o.sym}</span><span class="da-main num">${usd(o.oiUsd)}</span></div>
      <div class="da-deltas">
        <span class="da-delta"><span class="dd-l">1ч</span><span class="dd-v num ${dirCls(o.delta1hPct)}">${pct(o.delta1hPct)}</span></span>
        <span class="da-delta"><span class="dd-l">4ч</span><span class="dd-v num ${dirCls(o.delta4hPct)}">${pct(o.delta4hPct)}</span></span>
        <span class="da-delta"><span class="dd-l">24ч</span><span class="dd-v num ${dirCls(o.delta24hPct)}">${pct(o.delta24hPct)}</span></span>
      </div>
      <span class="interp-tag ${itc}"><span class="it-dot"></span>${PT(st)}</span>
    </div>`;
  }
  function fundCard(f) {
    const itc = { crowded_longs: 'warn', crowded_shorts: 'bear', neutral: 'flat' }[f.interpretation];
    const val = (f.fundingPct >= 0 ? '+' : '') + f.fundingPct.toFixed(4) + '%';
    const dev = Math.max(-100, Math.min(100, f.deviation / 2.5 * 100));
    const fill = dev >= 0 ? `<span class="fd-fill pos" style="width:${dev / 2}%"></span>` : `<span class="fd-fill neg" style="width:${-dev / 2}%"></span>`;
    return `<div class="da-card">
      <div class="da-top">${proCoin(f.sym, 'small')}<span class="da-tk">${f.sym}</span><span class="da-main num ${dirCls(f.fundingPct)}">${val}</span></div>
      <div class="fund-dev"><span class="fd-track">${fill}</span></div>
      <span class="interp-tag ${itc}"><span class="it-dot"></span>${PT('fi_' + f.interpretation)}</span>
    </div>`;
  }
  /* ---- Derivatives PRO (mockup-inspired, our design tokens) ---- */
  const CC = { cyan:'#2BE3F0', up:'#1FD98A', down:'#FF4D6A', gold:'#F0B23B', ink2:'#8C96AC', ink3:'#586079', grid:'rgba(255,255,255,.05)' };
  let derivAsset = 'BTC';
  let derivNavRaf = 0, derivPendingSym = '';
  // смена валюты: перерисовать и ВЕРНУТЬ фокус на выбранный таб (курсор не убегает на кнопку режима)
  function selectDerivAsset(sym) {
    if (!sym || sym === derivAsset) return;
    derivAsset = sym;
    mountMode('deriv', true);
    var act = sel('#pro-stage .dv-atab.on');
    if (act && window.tvFocus) window.tvFocus(act, { remember: true });
  }
  // авто-выбор при наведении пультом (листать одной стрелкой), с дебаунсом на кадр
  function scheduleDerivAsset(sym) {
    if (!sym || sym === derivAsset) return;
    derivPendingSym = sym;
    if (derivNavRaf) cancelAnimationFrame(derivNavRaf);
    derivNavRaf = requestAnimationFrame(function () { derivNavRaf = 0; selectDerivAsset(derivPendingSym); });
  }
  const DV = () => (D().derivatives || {});
  function dvNoData() { return `<div class="dv-nodata">${PT('dv_nodata')}</div>`; }
  function fmtK(v) { v = +v || 0; if (v >= 1000) return '$' + (v/1000).toFixed(1) + 'K'; if (v >= 1) return '$' + (v >= 100 ? v.toFixed(1) : v.toFixed(2)); return '$' + v.toFixed(4); }
  function dvPrice(v) { v = +v || 0; if (v >= 1000) return '$' + Math.round(v).toLocaleString('en-US'); if (v >= 1) return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); return '$' + v.toFixed(4); }
  function fmtComma(v) { return '$' + (Math.round(+v||0)).toLocaleString('en-US'); }
  function dvPriceOf(sym) {
    const lh = (DV().liqHeat || {})[sym]; if (lh && lh.cur) return lh.cur;
    const c = ((D().market_heatmap && D().market_heatmap.coins) || []).filter((x) => x.symbol === sym)[0];
    return c ? c.price : 0;
  }
  function dvHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function dvRng(seed) { let s = seed >>> 0; return () => { s = (s*1664525 + 1013904223) >>> 0; return s/4294967296; }; }
  function dvHeatColor(v) {
    const stops = [[0,[10,17,27]],[.16,[13,64,86]],[.34,[28,150,165]],[.52,[31,210,150]],[.70,[235,200,75]],[.85,[245,140,48]],[1,[255,72,98]]];
    let a = stops[0], b = stops[stops.length-1];
    for (let i=0;i<stops.length-1;i++){ if (v>=stops[i][0] && v<=stops[i+1][0]){ a=stops[i]; b=stops[i+1]; break; } }
    const f=(v-a[0])/((b[0]-a[0])||1), c=k=>Math.round(a[1][k]+(b[1][k]-a[1][k])*f);
    return `rgb(${c(0)},${c(1)},${c(2)})`;
  }
  function dvHeatSvg(sym) {
    const lh = (DV().liqHeat || {})[sym];
    if (!lh || !lh.hours || lh.hours.length < 3) return dvNoData();
    const hours = lh.hours, lo = lh.lo, hi = lh.hi, cur = lh.cur, span = (hi - lo) || 1, N = hours.length;
    const W = 600, H = 320, COLS = 38, ROWS = 24;
    const colOf = (i) => (i/(N-1))*(COLS-1), rowOf = (p) => Math.max(0, Math.min(1, (hi-p)/span))*(ROWS-1);
    const rnd = dvRng(dvHash(sym));
    const grid = []; for (let r = 0; r < ROWS; r++) { const row = []; for (let c = 0; c < COLS; c++) row.push(0.05 + rnd()*0.06); grid.push(row); }
    let maxV = 0; hours.forEach((h) => { const v = h.long + h.short; if (v > maxV) maxV = v; });
    const sx = 2.6, sy = 1.7;
    hours.forEach((h, i) => { const cc = colOf(i), rr = rowOf(h.price), inten = 0.25 + 1.05*((h.long+h.short)/(maxV||1));
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const dx = (c-cc)/sx, dy = (r-rr)/sy; grid[r][c] += inten*Math.exp(-(dx*dx+dy*dy)/2); } });
    let gmax = 0; grid.forEach((row) => row.forEach((v) => { if (v > gmax) gmax = v; }));
    const norm = gmax*0.82 || 1, cw = W/COLS, ch = H/ROWS, gap = 1.1; let rects = '';
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const v = Math.min(1, grid[r][c]/norm);
      rects += `<rect x="${(c*cw+gap/2).toFixed(1)}" y="${(r*ch+gap/2).toFixed(1)}" width="${(cw-gap).toFixed(1)}" height="${(ch-gap).toFixed(1)}" rx="2.2" fill="${dvHeatColor(v)}" opacity="${(0.16+0.84*v).toFixed(2)}"/>`;
    }
    const cy = (rowOf(cur)/(ROWS-1)*H).toFixed(1);
    const line = `<line x1="0" y1="${cy}" x2="${W}" y2="${cy}" stroke="${CC.cyan}" stroke-width="1.6" stroke-dasharray="7 5" opacity=".92"/>`;
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${rects}${line}</svg>`;
  }
  function dvClusterTags(sym) {
    const lh = (DV().liqHeat || {})[sym]; if (!lh || !lh.clusters || !lh.clusters.length) return '';
    const span = (lh.hi - lh.lo) || 1;
    return lh.clusters.slice(0, 2).map((c, i) => {
      const top = Math.max(5, Math.min(90, (lh.hi - c.price)/span*100));
      return `<div class="dv-ctag" style="top:${top.toFixed(0)}%;left:${i===0?'50%':'26%'}">${fmtK(c.price)} · <b>${usd(c.usd)}</b></div>`;
    }).join('');
  }
  function dvPriceAxis(sym) {
    const lh = (DV().liqHeat || {})[sym]; if (!lh) return '';
    let out = ''; const span = (lh.hi - lh.lo) || 1;
    for (let i = 0; i <= 6; i++) { const v = lh.hi - span*i/6; const near = Math.abs(v - lh.cur) < span/12;
      out += `<div class="${near ? 'now' : ''}">${fmtK(v)}</div>`; }
    return out;
  }
  function dvHeatHead(sym) {
    const price = dvPriceOf(sym);
    const la = ((D().liquidation_summary || {}).byAsset || []).filter((a) => a.sym === sym)[0];
    const liq24 = la ? la.totalUsd : 0, shortPct = la ? la.shortPct : 50;
    const skewSide = shortPct >= 50 ? 'down' : 'up';
    const skewTxt = shortPct >= 50 ? `${shortPct}% ${PT('liq_shorts')}` : `${100-shortPct}% ${PT('liq_longs')}`;
    return `<div class="dv-heat-big">
      <div class="dv-hb-px num">${dvPrice(price)}<i>${sym}</i></div>
      <div class="dv-hb-sub">${PT('liq_pro')} / 24${PT('dv_h')} <b>${usd(liq24)}</b> · <b class="${skewSide}">${skewTxt}</b></div>
    </div>`;
  }
  function dvAssetTabs() {
    return `<div class="dv-atabs">${['BTC','ETH','SOL','BNB','XRP','DOGE','ADA','AVAX','LINK','DOT','LTC'].map((s) =>
      `<button type="button" class="dv-atab selector${s===derivAsset?' on':''}" data-da="${s}" tabindex="-1">${proCoin(s,'small')}<b>${s}</b></button>`).join('')}</div>`;
  }
  function dvHeatLegend() {
    return `<span class="dv-heatleg"><span class="bar"></span><span class="lab"><span>${PT('dv_leg_low')}</span><span>${PT('dv_leg_int')}</span><span>${PT('dv_leg_peak')}</span></span></span>`;
  }
  function dvOiSvg(sym) {
    const op = (DV().oiPrice || {})[sym]; if (!op || op.length < 4) return dvNoData();
    const W = 520, H = 230, pad = 6, N = op.length;
    const pr = op.map((p) => p.price), oi = op.map((p) => p.oi);
    const pmin = Math.min(...pr)*0.999, pmax = Math.max(...pr)*1.001, omin = Math.min(...oi)*0.99, omax = Math.max(...oi)*1.01;
    const X = (i) => pad + (W-2*pad)*i/(N-1), Yp = (v) => pad + (H-2*pad)*(1-(v-pmin)/((pmax-pmin)||1)), Yo = (v) => pad + (H-2*pad)*(1-(v-omin)/((omax-omin)||1));
    let g = ''; for (let i = 0; i <= 3; i++){ const y = pad + (H-2*pad)*i/3; g += `<line x1="0" y1="${y.toFixed(1)}" x2="${W}" y2="${y.toFixed(1)}" stroke="${CC.grid}"/>`; }
    let ap = `M ${X(0).toFixed(1)} ${Yo(oi[0]).toFixed(1)}`; oi.forEach((v,i) => ap += ` L ${X(i).toFixed(1)} ${Yo(v).toFixed(1)}`); ap += ` L ${X(N-1).toFixed(1)} ${H-pad} L ${X(0).toFixed(1)} ${H-pad} Z`;
    let ol = ''; oi.forEach((v,i) => ol += `${i?'L':'M'} ${X(i).toFixed(1)} ${Yo(v).toFixed(1)} `);
    let pl = ''; pr.forEach((v,i) => pl += `${i?'L':'M'} ${X(i).toFixed(1)} ${Yp(v).toFixed(1)} `);
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <defs><linearGradient id="dvOiG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${CC.up}" stop-opacity=".26"/><stop offset="1" stop-color="${CC.up}" stop-opacity="0"/></linearGradient></defs>
      ${g}<path d="${ap}" fill="url(#dvOiG)"/><path d="${ol}" fill="none" stroke="${CC.up}" stroke-width="1.6" opacity=".8"/>
      <path d="${pl}" fill="none" stroke="${CC.cyan}" stroke-width="2.4" stroke-linejoin="round"/>
      <circle cx="${X(N-1).toFixed(1)}" cy="${Yp(pr[N-1]).toFixed(1)}" r="3.2" fill="#fff"/></svg>`;
  }
  function dvOiKpi(sym) {
    const op = (DV().oiPrice || {})[sym]; if (!op || !op.length) return '';
    const last = op[op.length-1].oi, first = op[0].oi, d24 = first > 0 ? ((last-first)/first*100) : 0;
    return `<span class="dv-kpi"><small>${PT('dv_oitotal')}</small><b class="num">${usd(last)}</b></span>
      <span class="dv-kpi"><small>${PT('dv_oidelta')}</small><b class="num ${dirCls(d24)}">${pct(+d24.toFixed(2))}</b></span>`;
  }
  function dvOiChart(sym) {
    const op = (DV().oiPrice || {})[sym]; if (!op || op.length < 4) return dvNoData();
    const pr = op.map((p) => p.price), oi = op.map((p) => p.oi);
    const pmin = Math.min(...pr), pmax = Math.max(...pr), omin = Math.min(...oi), omax = Math.max(...oi);
    let yl = '', yr = ''; for (let i = 0; i <= 3; i++) { yl += `<div>${fmtK(pmax-(pmax-pmin)*i/3)}</div>`; yr += `<div>${usd(omax-(omax-omin)*i/3)}</div>`; }
    return `<div class="dv-cax">
      <div class="dv-yl">${yl}</div>
      <div class="dv-plot">${dvOiSvg(sym)}</div>
      <div class="dv-yr">${yr}</div>
      <div class="dv-xr"><span>-24${PT('dv_h')}</span><span>-12${PT('dv_h')}</span><span>${PT('dv_now')}</span></div>
    </div>`;
  }
  function dvFundChart(sym) {
    const fh = (DV().fundingHist || {})[sym]; if (!fh || !fh.length) return dvNoData();
    const W = 300, H = 150, pad = 6, N = fh.length, over = 0.01;
    const amax = Math.max(0.012, ...fh.map((f) => Math.abs(f.pct))), zeroY = H/2, half = zeroY - pad, gap = (W-2*pad)/N, bw = gap*0.62;
    let bars = ''; fh.forEach((f, i) => { const x = pad + gap*i + (gap-bw)/2, bh = Math.abs(f.pct)/amax*half;
      const y = f.pct >= 0 ? zeroY-bh : zeroY, col = Math.abs(f.pct)>=0.03?CC.down:(Math.abs(f.pct)>=over?CC.gold:(f.pct>=0?CC.up:CC.down));
      bars += `<rect class="${i===N-1?'dv-fbar-live':''}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(2,bh).toFixed(1)}" rx="1.5" fill="${col}"/>`; });
    const ovY = zeroY - half*(over/amax);
    const svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <line x1="0" y1="${zeroY}" x2="${W}" y2="${zeroY}" stroke="rgba(255,255,255,.18)"/>
      <line x1="0" y1="${ovY.toFixed(1)}" x2="${W}" y2="${ovY.toFixed(1)}" stroke="${CC.gold}" stroke-width="1" stroke-dasharray="4 3" opacity=".6"/>
      ${bars}</svg>`;
    return `<div class="dv-cax fund">
      <div class="dv-yl"><div>+${amax.toFixed(3)}%</div><div class="z">0%</div><div>−${amax.toFixed(3)}%</div></div>
      <div class="dv-plot">${svg}<span class="dv-over" style="top:${(ovY/H*100).toFixed(1)}%">${PT('dv_overheat')}</span></div>
      <div class="dv-xr"><span>−${N}×8${PT('dv_h')}</span><span>${PT('dv_now')}</span></div>
    </div>`;
  }
  function dvFundKpi(sym) {
    const f = (D().funding_summary || []).filter((x) => x.sym === sym)[0]; if (!f) return '';
    return `<span class="dv-kpi"><small>${sym} · ${PT('fund_current').toLowerCase()}</small><b class="num ${dirCls(f.fundingPct)}">${(f.fundingPct>=0?'+':'')+f.fundingPct.toFixed(4)}%</b></span>`;
  }
  function dvLongShort(sym) {
    const ls = (DV().longShort || {})[sym]; if (!ls) return dvNoData();
    const warn = ls.retailLong - ls.topLong;
    const note = warn >= 8 ? PT('dv_ls_warn') : (warn <= -8 ? PT('dv_ls_warn_s') : PT('dv_ls_bal'));
    const row = (lab, lng, sht) => `<div class="dv-ls-row"><div class="dv-ls-lab"><span>${lab}</span><b class="num">${lng} / ${sht}</b></div>
      <div class="dv-ls-bar"><span class="dv-ls-l" style="width:${lng}%"></span><span class="dv-ls-s" style="width:${sht}%"></span></div></div>`;
    return `<div class="dv-ls-big"><b class="num">${ls.topRatio.toFixed(2)}</b><small>${PT('dv_ls_topratio')}</small></div>
      ${row(PT('dv_ls_top'), ls.topLong, ls.topShort)}${row(PT('dv_ls_retail'), ls.retailLong, ls.retailShort)}
      <div class="dv-ls-note${warn>=8?' warn':''}">${note}</div>`;
  }
  function dvSparkSvg(hours, sym) {
    const W = 120, H = 24, N = hours.length, vals = hours.map((h) => h.long + h.short), mx = Math.max(...vals) || 1;
    const X = (i) => i/(N-1)*W, Y = (v) => H-2-(v/mx)*(H-4); let pl = ''; vals.forEach((v,i) => pl += `${i?'L':'M'} ${X(i).toFixed(1)} ${Y(v).toFixed(1)} `);
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><linearGradient id="spk-${sym}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${CC.cyan}" stop-opacity=".34"/><stop offset="1" stop-color="${CC.cyan}" stop-opacity="0"/></linearGradient></defs>
      <path d="${pl}L ${W} ${H} L 0 ${H} Z" fill="url(#spk-${sym})"/><path d="${pl}" fill="none" stroke="${CC.cyan}" stroke-width="1.4"/></svg>`;
  }
  function dvCoinCard(a) {
    const shortPct = a.shortPct != null ? a.shortPct : 50, longPct = 100 - shortPct, dom = shortPct >= longPct ? 'down' : 'up';
    const lh = (DV().liqHeat || {})[a.sym], spark = (lh && lh.hours) ? dvSparkSvg(lh.hours, a.sym) : '';
    return `<div class="dv-coin">
      <div class="dv-coin-top">${proCoin(a.sym,'small')}<span class="dv-coin-tk">${a.sym}</span><span class="dv-coin-amt num ${dom}">${usd(a.totalUsd||0)}</span></div>
      <div class="dv-coin-bot"><div class="dv-coin-spark">${spark}</div>
        <div class="dv-coin-skew"><span class="dv-cs-bar"><span class="up" style="width:${longPct}%"></span><span class="down" style="width:${shortPct}%"></span></span>
        <span class="num"><b class="${dom}">${shortPct}%</b> ${PT('liq_shorts')}</span></div></div>
    </div>`;
  }
  function dvGaugeSvg(frac) {
    frac = Math.max(0, Math.min(1, frac)); const cx = 62, cy = 66, r = 48;
    const pt = (a) => [cx + r*Math.cos(Math.PI*(1-a)), cy - r*Math.sin(Math.PI*(1-a))];
    const arc = (a0, a1) => { const s = pt(a0), e = pt(a1); return `M ${s[0].toFixed(1)} ${s[1].toFixed(1)} A ${r} ${r} 0 0 1 ${e[0].toFixed(1)} ${e[1].toFixed(1)}`; };
    const a = Math.PI*(1-frac), kx = cx + r*Math.cos(a), ky = cy - r*Math.sin(a);
    return `<svg viewBox="0 0 124 76" preserveAspectRatio="xMidYMid meet">
      <path d="${arc(0,1)}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="8" stroke-linecap="round"/>
      <defs><linearGradient id="dvG"><stop offset="0" stop-color="${CC.cyan}"/><stop offset="1" stop-color="${CC.gold}"/></linearGradient></defs>
      <path d="${arc(0,frac)}" fill="none" stroke="url(#dvG)" stroke-width="8" stroke-linecap="round"/>
      <circle cx="${kx.toFixed(1)}" cy="${ky.toFixed(1)}" r="3.4" fill="#fff"/></svg>`;
  }
  function dvOptions() {
    const o = DV().options; if (!o) return dvNoData();
    const frac = (o.dvol || 0) / 120, dvCls = o.dvolChg >= 0 ? 'up' : 'down';
    const pcr = o.putCall, pcPos = pcr != null ? Math.max(0, Math.min(100, (pcr-0.4)/1.2*100)) : 50;
    const pcLab = pcr == null ? '—' : (pcr < 0.9 ? PT('dv_pc_call') : (pcr > 1.1 ? PT('dv_pc_put') : PT('dv_pc_bal')));
    const mpCls = (o.spotVsMaxPainPct || 0) >= 0 ? 'up' : 'down';
    return `<div class="dv-opt-grid">
      <div class="dv-ocard"><span class="dv-ol">${PT('dv_dvol')}</span>
        <div class="dv-gauge">${dvGaugeSvg(frac)}<div class="dv-gv num">${o.dvol != null ? o.dvol : '—'}<i>idx</i></div></div>
        <span class="dv-obadge ${dvCls}">${o.dvolChg>=0?'+':''}${o.dvolChg} / 24${PT('dv_h')}</span></div>
      <div class="dv-ocard"><span class="dv-ol">${PT('dv_putcall')}</span>
        <div class="dv-ocard-mid"><div class="dv-pc-val num">${pcr != null ? pcr.toFixed(2) : '—'}</div><span class="dv-obadge flat">${pcLab}</span></div>
        <div class="dv-pc-bar"><i style="left:${pcPos.toFixed(0)}%"></i></div>
        <div class="dv-pc-scale num"><span>0.4</span><span>1.0</span><span>1.6</span></div></div>
      <div class="dv-ocard"><span class="dv-ol">${PT('dv_maxpain')}</span>
        <div class="dv-ocard-mid"><div class="dv-mp-val num">${o.maxPain ? fmtComma(o.maxPain) : '—'}</div>
          <div class="dv-mp-dist num ${mpCls}">${PT('dv_spot')} ${(o.spotVsMaxPainPct||0)>=0?'+':''}${o.spotVsMaxPainPct}%</div></div>
        <div class="dv-mp-sub">${PT('dv_exp')} ${o.expiry || '—'}</div></div>
    </div>`;
  }
  function dvRisk() {
    const o = (D().oi_summary || []).filter((x) => x.sym === 'BTC')[0];
    const f = (D().funding_summary || []).filter((x) => x.sym === 'BTC')[0];
    const L = D().liquidation_summary || {};
    if (!o || !f) return `<span class="dv-risk-ic">${IC.activity}</span><div class="dv-risk-tx"><div class="dv-risk-l">${PT('risk_read')}</div><div class="dv-risk-v">—</div></div>`;
    const pUp = o.priceChgPct >= 0, oUp = o.delta24hPct >= 0, shortSkew = (L.short24hUsd||0) >= (L.long24hUsd||0), crowded = f.interpretation === 'crowded_longs';
    const pA = pUp?'↑':'↓', oA = oUp?'↑':'↓', pCls = pUp?'up':'down', oCls = oUp?'up':'down';
    const skew = { ru: shortSkew?'в шорты':'в лонги', en: shortSkew?'short':'long' };
    let cc;
    if (pUp && oUp) cc = { ru:'<span class="up">риск продолжения вверх</span>', en:'<span class="up">upside continuation risk</span>' };
    else if (!pUp && !oUp) cc = { ru:'<span class="down">делеверидж, давление вниз</span>', en:'<span class="down">deleveraging, downside pressure</span>' };
    else if (pUp && !oUp) cc = { ru:'<span style="color:var(--gold)">рост на закрытии шортов</span>', en:'<span style="color:var(--gold)">short-covering rally</span>' };
    else cc = { ru:'<span style="color:var(--gold)">набор шортов</span>', en:'<span style="color:var(--gold)">short build-up</span>' };
    const tail = crowded ? { ru:', но фандинг BTC перегрет → возможен локальный откат', en:', but BTC funding crowded → local pullback possible' } : { ru:'', en:'' };
    const tx = {
      ru:`Цена <b class="${pCls}">${pA}</b> + OI <b class="${oCls}">${oA}</b> + перекос ликвидаций ${skew.ru} — ${cc.ru}${tail.ru}.`,
      en:`Price <b class="${pCls}">${pA}</b> + OI <b class="${oCls}">${oA}</b> + liquidations skewed ${skew.en} — ${cc.en}${tail.en}.`
    };
    return `<span class="dv-risk-ic">${IC.activity}</span><div class="dv-risk-tx"><div class="dv-risk-l">${PT('risk_read')}</div><div class="dv-risk-v">${PL(tx)}</div></div>`;
  }
  function renderDerivatives(m) {
    const sym = derivAsset;
    return `<div class="pro-screen">${proHead(m, `<span class="dv-live"><span class="dv-pulse"></span>${PT('dv_live')}</span>`)}
      <div class="pro-body deriv2">
        <div class="deriv2-grid">
          <section class="panel dv-heat">
            <div class="dv-heat-top">${dvAssetTabs()}${dvHeatHead(sym)}</div>
            <div class="pro-panel-title sm dv-heat-title">${IC.flame}${PT('liq_heat')}<span class="src">${PT('dv_heat_sub')}</span>${dvHeatLegend()}</div>
            <div class="dv-heat-wrap"><div class="dv-heat-canvas">${dvHeatSvg(sym)}<div class="dv-heat-wave"></div>${dvClusterTags(sym)}</div>
              <div class="dv-price-axis">${dvPriceAxis(sym)}</div>
              <div class="dv-time-axis"><span>-24${PT('dv_h')}</span><span>-12${PT('dv_h')}</span><span>${PT('dv_now')}</span></div></div>
          </section>
          <section class="panel dv-oi">
            <div class="pro-panel-title dv-thead">${IC.activity}${PT('oi_pro')} × ${PT('dv_price')}<span class="dv-kpis">${dvOiKpi(sym)}</span></div>
            <div class="dv-legend"><span><i style="background:${CC.cyan}"></i>${PT('dv_price')} ${sym}</span><span><i style="background:${CC.up}"></i>${PT('oi_pro')}</span></div>
            ${dvOiChart(sym)}
          </section>
          <section class="panel dv-fund">
            <div class="pro-panel-title dv-thead">${IC.wave}${PT('fund_pro')}<span class="dv-kpis">${dvFundKpi(sym)}</span></div>
            <div class="dv-cap dv-fcap">${PT('dv_fund_cap')}</div>
            ${dvFundChart(sym)}
          </section>
          <section class="panel dv-ls">
            <div class="pro-panel-title">${IC.move}${PT('dv_ls')}</div>${dvLongShort(sym)}
          </section>
          <section class="panel dv-coins">
            <div class="pro-panel-title">${IC.flame}${PT('liq_byasset')}<span class="src">${PT('dv_coins_sub')}</span></div>
            <div class="dv-coins">${((D().liquidation_summary||{}).byAsset||[]).slice(0,6).map(dvCoinCard).join('')}</div>
          </section>
          <section class="panel dv-opt">
            <div class="pro-panel-title">${IC.target}${PT('dv_options')}<span class="src">Deribit · BTC</span></div>${dvOptions()}
          </section>
        </div>
        <section class="dv-risk">${dvRisk()}</section>
      </div></div>`;
  }

  /* =========================================================
     C · WHALE INTELLIGENCE
     ========================================================= */
  function whaleRow(w) {
    const dirMap = { wallet_to_exchange: 'in', exchange_to_wallet: 'out', wallet_to_wallet: 'move' };
    const dir = dirMap[w.type];
    const dirIc = dir === 'in' ? IC.arrowR : dir === 'out' ? IC.arrowR : IC.move;
    const itc = { sell_pressure: 'bear', accumulation: 'bull', redistribution: 'warn', neutral: 'flat' }[w.interpretation];
    return `<div class="whale-erow ${w.significant ? 'significant' : ''}">
      <span class="we-dir ${dir}">${dirIc}</span>
      <span class="we-asset">${proCoin(w.asset, 'small')}<div><div class="wa-tk">${w.asset}</div><div class="wa-amt">${w.amount}</div></div></span>
      <div class="we-route">
        <div class="we-class">${PT(w.type === 'wallet_to_exchange' ? 'w2e' : w.type === 'exchange_to_wallet' ? 'e2w' : 'w2w')}</div>
        <div class="we-path">${PL(w.fromLabel)}<span class="wp-arrow">${IC.arrowR}</span>${PL(w.toLabel)}</div>
      </div>
      <div class="we-right">
        <span class="we-usd ${dir}">${usd(w.usd)}</span>
        <span class="interp-tag ${itc}"><span class="it-dot"></span>${PT('wi_' + w.interpretation)}</span>
        <span class="we-time">${rel(w.ts)}</span>
      </div>
    </div>`;
  }
  function whaleStats() {
    const ev = D().whale_events || [];
    let inflow = 0, outflow = 0, largest = null, accCount = 0;
    ev.forEach((w) => {
      if (w.type === 'wallet_to_exchange') inflow += w.usd;
      else if (w.type === 'exchange_to_wallet') { outflow += w.usd; accCount++; }
      if (!largest || w.usd > largest.usd) largest = w;
    });
    const tot = inflow + outflow || 1, net = outflow - inflow;
    const idx = Math.max(0, Math.min(100, Math.round(50 + (net / tot) * 50)));
    const dirPct = ev.length ? Math.round(accCount / ev.length * 100) : 50;
    return { ev, inflow, outflow, net, tot, largest, count: ev.length, idx, dirPct };
  }
  function whaleGauge(idx, pressure) {
    const ang = Math.max(-82, Math.min(82, -pressure * 82));
    const col = idx >= 55 ? CC.up : idx <= 45 ? CC.down : '#8C7BF0';
    return `<svg viewBox="0 0 400 230" preserveAspectRatio="xMidYMid meet">
      <defs><linearGradient id="whArc" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${CC.up}"/><stop offset="0.5" stop-color="#8C7BF0"/><stop offset="1" stop-color="${CC.down}"/></linearGradient></defs>
      <path d="M 60 195 A 145 145 0 0 1 340 195" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="20" stroke-linecap="round"/>
      <path d="M 60 195 A 145 145 0 0 1 340 195" fill="none" stroke="url(#whArc)" stroke-width="3.5" stroke-linecap="round" opacity=".6"/>
      <text x="54" y="221" fill="${CC.up}" font-size="14" text-anchor="middle">${PT('wh_acc_s')}</text>
      <text x="346" y="221" fill="${CC.down}" font-size="14" text-anchor="middle">${PT('wh_sell_s')}</text>
      <line x1="200" y1="195" x2="200" y2="76" stroke="#e8eef7" stroke-width="3" stroke-linecap="round" transform="rotate(${ang.toFixed(1)} 200 195)"/>
      <circle cx="200" cy="195" r="10" fill="#0a1422" stroke="#e8eef7" stroke-width="2"/><circle cx="200" cy="195" r="3.5" fill="${col}"/>
      <text x="200" y="150" fill="${col}" font-size="44" font-weight="700" text-anchor="middle">${idx}</text>
      <text x="200" y="176" fill="${CC.ink3}" font-size="12" letter-spacing="2" text-anchor="middle">${PT('wh_index')}</text>
    </svg>`;
  }
  function whaleNet(s) {
    return `<div class="wh-net-big">
      <div class="wh-nv num ${s.net>=0?'up':'down'}">${s.net>=0?'+':'−'}${usd(Math.abs(s.net))}</div>
      <div class="wh-nl">${PT('wh_net24')}</div>
      <div class="wh-nsplit">
        <div><div class="k">${PT('wh_inflow')}</div><div class="vv num down">${usd(s.inflow)}</div></div>
        <div><div class="k">${PT('wh_outflow')}</div><div class="vv num up">${usd(s.outflow)}</div></div>
      </div></div>`;
  }
  function whaleSummary(s) {
    const lg = s.largest, acc = s.idx >= 50;
    return `<div class="wh-sum">
      <div class="wh-srow"><span class="k">${PT('wh_largest')}</span><span class="v num">${lg?usd(lg.usd):'—'} <small>${lg?lg.asset:''}</small></span></div>
      <div class="wh-srow"><span class="k">${PT('wh_direction')}</span><span class="v num ${s.dirPct>=50?'up':'down'}">${s.dirPct}% ${s.dirPct>=50?PT('wh_withdraw'):PT('wh_deposit')}</span></div>
      <div class="wh-srow"><span class="k">${PT('wh_moves')}</span><span class="v num">${s.count}</span></div>
      <div class="wh-srow"><span class="k">${PT('wh_mode_l')}</span><span class="wh-chip ${acc?'acc':'dist'}">● ${acc?PT('wh_accum'):PT('wh_distrib')}</span></div>
    </div>`;
  }
  function whaleFeedRow(w) {
    const dir = w.type === 'wallet_to_exchange' ? 'in' : w.type === 'exchange_to_wallet' ? 'out' : 'move';
    const itc = { sell_pressure: 'bear', accumulation: 'bull', redistribution: 'warn', neutral: 'flat' }[w.interpretation];
    return `<div class="wf-row ${w.significant ? 'sig' : ''} ${dir}">
      <span class="wf-ic">${proCoin(w.asset, 'small')}</span>
      <div class="wf-mid">
        <div class="wf-l1"><b>${w.asset}</b><span class="wf-usd ${dir}">${usd(w.usd)}</span></div>
        <div class="wf-l2"><span class="wf-route">${PL(w.fromLabel)}<span class="wf-ar">${IC.arrowR}</span>${PL(w.toLabel)}</span><span class="wf-tg ${itc}">${PT('wi_' + w.interpretation)}</span></div>
      </div>
    </div>`;
  }
  function renderWhaleIntel(m) {
    const s = whaleStats();
    return `<div class="pro-screen">${proHead(m, `<span class="dv-live"><span class="dv-pulse"></span>${PT('dv_live')}</span>`)}
      <div class="pro-body whale2">
        <div class="wh-left">
          <section class="panel wh-graph">
            <div class="pro-panel-title">${IC.move}${PT('wh_graph')}</div>
            <div class="wh-canvas-host"><canvas id="whale-canvas"></canvas></div>
            <div class="wh-legend">
              <span><i class="wh-ld" style="background:${CC.up}"></i>${PT('e2w')} · ${PT('wh_lg_acc')}</span>
              <span><i class="wh-ld" style="background:${CC.down}"></i>${PT('w2e')} · ${PT('wh_lg_sell')}</span>
              <span><i class="wh-ld" style="background:#8C7BF0"></i>${PT('w2w')} · ${PT('wh_lg_redis')}</span>
            </div>
          </section>
          <div class="wh-bottom">
            <section class="panel wh-gauge-p"><div class="pro-panel-title">${IC.activity}${PT('wh_pressure')}</div><div class="wh-gauge">${whaleGauge(s.idx, s.net/s.tot)}</div></section>
            <section class="panel wh-net-p"><div class="pro-panel-title">${IC.wave}${PT('wh_flow')}</div>${whaleNet(s)}</section>
            <section class="panel wh-sum-p"><div class="pro-panel-title">${IC.whale}${PT('wh_summary')}</div>${whaleSummary(s)}</section>
          </div>
        </div>
        <section class="panel wh-feed-p">
          <div class="pro-panel-title">${IC.activity}${PT('wh_recent')}<span class="src">${PT('dv_live')}</span></div>
          <div class="wh-feed">${s.ev.slice(0, 14).map(whaleFeedRow).join('')}</div>
        </section>
      </div></div>`;
  }
  /* ---- whale flow canvas engine (один canvas, лёгкий rAF) ---- */
  let whaleRAF = 0, whaleBoil = 0, whaleLive = false, whaleResizeBound = false;
  function stopWhaleGraph() { whaleLive = false; if (whaleRAF) { cancelAnimationFrame(whaleRAF); whaleRAF = 0; } if (whaleBoil) { clearInterval(whaleBoil); whaleBoil = 0; } }
  function whaleHexA(c, a) { if (!c || c[0] !== '#') return c; const n = parseInt(c.slice(1), 16); return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`; }
  function buildWhaleGrid(W, H) {
    const g = document.createElement('canvas'); g.width = W; g.height = H; const c = g.getContext('2d');
    const step = 40;
    c.strokeStyle = 'rgba(70,108,150,0.12)'; c.lineWidth = 1;
    for (let x = step; x < W; x += step) { c.beginPath(); c.moveTo(x+0.5, 0); c.lineTo(x+0.5, H); c.stroke(); }
    for (let y = step; y < H; y += step) { c.beginPath(); c.moveTo(0, y+0.5); c.lineTo(W, y+0.5); c.stroke(); }
    c.fillStyle = 'rgba(92,132,178,0.42)';
    for (let x = step; x < W; x += step) for (let y = step; y < H; y += step) { c.beginPath(); c.arc(x, y, 1.2, 0, 6.2832); c.fill(); }
    const vg = c.createRadialGradient(W/2, H*0.45, Math.min(W,H)*0.16, W/2, H*0.45, Math.max(W,H)*0.62);
    vg.addColorStop(0, 'rgba(12,17,28,0)'); vg.addColorStop(1, 'rgba(12,17,28,0.93)');
    c.fillStyle = vg; c.fillRect(0, 0, W, H);
    return g;
  }
  function whaleBubble(ctx, x, y, r, color, label, sub, pulse, isEx) {
    const rr = r * (1 + (pulse||0)*0.12);
    if (isEx) { ctx.beginPath(); ctx.arc(x, y, rr+7, 0, 6.2832); ctx.strokeStyle = whaleHexA(color, 0.18 + (pulse||0)*0.4); ctx.lineWidth = 1.5; ctx.stroke(); }
    ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.2832); ctx.fillStyle = '#0A1322'; ctx.fill();
    ctx.lineWidth = isEx ? 3 : 2.4; ctx.strokeStyle = whaleHexA(color, 0.82 + (pulse||0)*0.18); ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = isEx ? color : '#E7EDF4';
    ctx.font = '700 ' + Math.round(isEx ? Math.min(16, rr*0.52) : Math.min(13, rr*0.82)) + 'px sans-serif';
    ctx.fillText(label, x, isEx ? y - 4 : y);
    if (sub) {
      ctx.fillStyle = isEx ? '#8C96AC' : whaleHexA(color, 0.95);
      ctx.font = '700 ' + (isEx ? 10 : 10) + 'px sans-serif';
      ctx.fillText(sub, x, isEx ? y + 13 : y + rr + 9); // у токенов — под пузырём
    }
  }
  function startWhaleGraph() {
    stopWhaleGraph();
    const cv = sel('#whale-canvas'); if (!cv) return;
    const host = cv.parentElement, ctx = cv.getContext('2d');
    const wg = D().whaleGraph || { exchanges: [], tokens: [] };
    const ev = D().whale_events || [];
    if (!wg.exchanges || !wg.exchanges.length) return;
    let gridCv = null;
    function size() { cv.width = Math.round(host.clientWidth || 600); cv.height = Math.round(host.clientHeight || 400); gridCv = buildWhaleGrid(cv.width, cv.height); }
    size();
    const dirCol = (d) => d === 'acc' ? CC.up : d === 'sell' ? CC.down : '#8C7BF0';
    let btcPrice = 63000; const coins = (D().market_heatmap && D().market_heatmap.coins) || []; const bc = coins.filter((c) => c.symbol === 'BTC')[0]; if (bc && bc.price) btcPrice = bc.price;
    const exs = wg.exchanges.slice(0, 6), N = exs.length, maxVol = Math.max(1, ...exs.map((e) => e.vol));
    const cols = Math.min(3, N), rows = Math.max(1, Math.ceil(N/cols));
    exs.forEach((e, i) => {
      e.i = i; e.rBase = 30 + 16*Math.sqrt(e.vol/maxVol);
      e.gx = ((i % cols) + 0.5) / cols; e.gy = (Math.floor(i / cols) + 0.5) / rows; // ячейка сетки 3×2 (доли)
      e.bx = e.gx * cv.width; e.by = e.gy * cv.height;
      e.ox = 0; e.oy = 0; e.ovx = 0; e.ovy = 0; e._a = Math.random()*6.28; e._b = Math.random()*6.28;
      e._sa = 0.7+Math.random()*0.5; e._sb = 0.6+Math.random()*0.45; e.pulse = 0; e.usdVol = e.vol*btcPrice; e.clusterR = 0;
      e._orbPh = Math.random()*6.28; e._orbSpd = (0.12 + Math.random()*0.08) * (Math.random() < 0.5 ? 1 : -1); // вся «планетная система» биржи вращается как единое целое
    });
    // 5 монет-«планет» у каждой биржи (настраивается: SETTINGS.whaleTokens)
    const tokList = (window.SETTINGS && SETTINGS.whaleTokens && SETTINGS.whaleTokens.length) ? SETTINGS.whaleTokens.slice(0, 6) : ['BTC','ETH','TON','SOL','XRP'];
    const tokData = {}; (wg.tokens || []).forEach((t) => { tokData[t.sym] = t; });
    const maxAmt = Math.max(0.4, ...(wg.tokens || []).map((t) => t.amt));
    const toks = [];
    exs.forEach((e) => {
      tokList.forEach((sym, si) => {
        const d = tokData[sym] || { dir: 'redis', amt: 0.25 };
        toks.push({ sym, parent: e, dir: d.dir, amt: d.amt, slot: si, cnt: tokList.length, i: toks.length,
          r: 14 + 7*Math.sqrt(Math.min(1, d.amt/maxAmt)), pulse: 0, orbSpd: 0.30 + Math.random()*0.22, orbPh: Math.random()*6.28 });
      });
    });
    toks.forEach((t) => { t.orbR = (t.parent.rBase + 18 + t.r) * 1.2; t.parent.clusterR = Math.max(t.parent.clusterR, t.orbR + t.r); });
    const volTot = exs.reduce((a, e) => a + e.vol, 0) || 1;
    let ei = 0;
    function boil() {
      if (!whaleLive) return;
      const w = ev.length ? ev[ei++ % ev.length] : null;
      let r = Math.random()*volTot, pick = exs[0];
      for (let j = 0; j < exs.length; j++) { r -= exs[j].vol; if (r <= 0) { pick = exs[j]; break; } }
      const cx = cv.width/2, cy = cv.height/2;
      let dx = cx - (pick.bx || cx), dy = cy - (pick.by || cy), dl = Math.hypot(dx, dy) || 1;
      const mag = w ? Math.min(1, w.usd/2e6) : 0.4, imp = 5 + mag*9;
      pick.ovx += dx/dl*imp; pick.ovy += dy/dl*imp; pick.pulse = 1;
      if (w) { const tk = toks.filter((t) => t.parent === pick && t.sym === w.asset)[0]; if (tk) tk.pulse = 1; }
    }
    const t0 = performance.now();
    let lastDraw = 0;
    function frame(now) {
      if (!whaleLive) return;
      whaleRAF = requestAnimationFrame(frame);
      if (now - lastDraw < 32) return; // кап ~30fps — щадим слабый ТВ
      lastDraw = now;
      const t = (now - t0)/1000, W = cv.width, H = cv.height, cx = W/2, cy = H/2, hw = W/2 - 40, hh = H/2 - 34;
      ctx.clearRect(0, 0, W, H);
      if (gridCv) ctx.drawImage(gridCv, 0, 0); // сетка фона
      // биржи: цель на эллипсе (по фазе) + живой дрейф; плавно тянемся к цели
      exs.forEach((e) => {
        e._a += e._sa*0.016; e._b += e._sb*0.016;
        const tx = e.gx*W + Math.cos(e._a)*Math.min(52, hw*0.09) + Math.sin(e._b*1.2)*22;
        const ty = e.gy*H + Math.sin(e._b)*Math.min(20, hh*0.05) + Math.cos(e._a*1.1)*12;
        e.bx += (tx - e.bx)*0.03; e.by += (ty - e.by)*0.03;
      });
      // отталкивание бирж, чтобы кластеры не наезжали
      for (let i = 0; i < N; i++) for (let j = i+1; j < N; j++) {
        const a = exs[i], b = exs[j]; let dx = b.bx - a.bx, dy = b.by - a.by, d = Math.hypot(dx, dy) || 1;
        const minD = a.clusterR + b.clusterR + 22;
        if (d < minD) { const k = (minD - d) * 0.85 / d; a.bx -= dx*k; a.by -= dy*k; b.bx += dx*k; b.by += dy*k; }
      }
      // зажим в безопасную зону + пружина «кипения»
      exs.forEach((e) => {
        e.bx = Math.max(e.clusterR, Math.min(W - e.clusterR, e.bx)); e.by = Math.max(e.clusterR, Math.min(H - e.clusterR, e.by));
        e.ovx += -e.ox*0.02; e.ovy += -e.oy*0.02; e.ovx *= 0.9; e.ovy *= 0.9; e.ox += e.ovx; e.oy += e.ovy;
        e.x = e.bx + e.ox; e.y = e.by + e.oy; e.pulse = e.pulse > 0.01 ? e.pulse*0.94 : 0;
      });
      // токены — на орбите своей биржи
      toks.forEach((tk) => { const a = (tk.slot/tk.cnt)*6.2832 + tk.parent._orbPh + t*tk.parent._orbSpd; tk.x = tk.parent.x + Math.cos(a)*tk.orbR; tk.y = tk.parent.y + Math.sin(a)*tk.orbR*0.94; tk.pulse = tk.pulse > 0.01 ? tk.pulse*0.93 : 0; });
      // межбиржевое пунктирное кольцо
      ctx.setLineDash([5, 7]); ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(96,124,162,0.26)';
      for (let i = 0; i < N; i++) { const a = exs[i], b = exs[(i+1)%N]; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      ctx.setLineDash([]);
      // непрерывные цветные связи биржа↔токен: свечение + текучий штрих (направление по потоку)
      toks.forEach((tk) => {
        const p = tk.parent, c = dirCol(tk.dir), out = tk.dir === 'acc';
        ctx.strokeStyle = whaleHexA(c, 0.16); ctx.lineWidth = 4.5; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(tk.x, tk.y); ctx.stroke();
        ctx.strokeStyle = whaleHexA(c, 0.92); ctx.lineWidth = 2; ctx.setLineDash([4, 11]);
        ctx.lineDashOffset = (out ? -1 : 1) * (t * 26);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(tk.x, tk.y); ctx.stroke();
      });
      ctx.setLineDash([]); ctx.lineDashOffset = 0;
      // токены (со значением) + биржи поверх
      toks.forEach((tk) => whaleBubble(ctx, tk.x, tk.y, tk.r, dirCol(tk.dir), tk.sym, (tk.dir==='sell'?'−':'+')+'$'+tk.amt.toFixed(2)+'M', tk.pulse, false));
      exs.forEach((e) => whaleBubble(ctx, e.x, e.y, e.rBase, CC.gold, e.id, '$'+(e.usdVol/1e9).toFixed(1)+'B', e.pulse, true));
    }
    whaleLive = true;
    frame(performance.now()); // первый кадр сразу (виден даже без rAF) + запуск цикла
    whaleBoil = setInterval(boil, 1900);
    boil(); setTimeout(boil, 600);
    if (!whaleResizeBound) { whaleResizeBound = true; window.addEventListener('resize', () => { if (whaleLive) size(); }); }
  }

  /* =========================================================
     D · SMART NEWS
     ========================================================= */
  function impDots(n) {
    let s = '';
    for (let i = 0; i < 5; i++) s += `<i class="${i < n ? 'on' : ''}"></i>`;
    return `<span class="imp-dots">${s}</span>`;
  }
  function coinChips(coins) { return coins.map((c) => `<span class="coin-chip">${c}</span>`).join(''); }
  function featCard(n) {
    return `<section class="panel snews-feat-card">
      <div class="sf-top"><span class="ev-tag ${n.type}">${PT('ev_' + n.type)}</span>
        <span class="sent-tag ${n.sentiment}">${PT('sent_' + n.sentiment)}</span>
        <span class="sf-imp">${impDots(n.importance)}</span></div>
      <div class="sf-title">${PL(n.title)}</div>
      <div class="sf-why">${PL(n.why)}</div>
      <div class="sf-foot"><span class="sf-src">${n.source}</span><span class="sf-time">${rel(n.ts)}</span>
        <span style="flex:1"></span>${coinChips(n.coins)}</div>
    </section>`;
  }
  function rankedRow(n, i) {
    return `<div class="snews-rrow">
      <span class="sr-rank num">${i}</span>
      <div class="sr-body">
        <div class="sr-meta"><span class="ev-tag ${n.type}">${PT('ev_' + n.type)}</span>
          <span class="sent-tag ${n.sentiment}">${PT('sent_' + n.sentiment)}</span>${impDots(n.importance)}</div>
        <div class="sr-title">${PL(n.title)}</div>
        <div class="sr-foot"><span class="sr-src">${n.source} · ${rel(n.ts)}</span><span class="sr-coins">${coinChips(n.coins)}</span></div>
      </div></div>`;
  }
  function renderSmartNews(m) {
    const list = D().smart_news.slice().sort((a, b) => b.importance - a.importance || b.ts - a.ts);
    const feat = list.slice(0, 2);
    const rest = list.slice(2);
    return `<div class="pro-screen">${proHead(m)}
      <div class="pro-body news-grid">
        <div class="snews-featured">${feat.map(featCard).join('')}</div>
        <section class="panel snews-ranked">
          <div class="pro-panel-title">${IC.news}${PT('sn_ranked')}</div>
          <div class="snews-rrows">${rest.map((n, i) => rankedRow(n, i + 3)).join('')}</div>
        </section>
      </div></div>`;
  }

  /* =========================================================
     E · SMART ALERTS (pulse + feed)
     ========================================================= */
  function pulseComponents() {
    const oi = (D().oi_summary || []).filter((o) => o.sym === 'BTC')[0];
    const L = D().liquidation_summary || {};
    const fn = (D().funding_summary || []).filter((f) => f.sym === 'BTC')[0];
    const hmc = ((D().market_heatmap && D().market_heatmap.coins) || []).filter((c) => c.symbol === 'BTC')[0];
    const longUsd = L.long24hUsd || 0, shortUsd = L.short24hUsd || 0, totL = (longUsd + shortUsd) || 1;
    const skew = Math.round(shortUsd / totL * 100);
    const items = [
      { l: PT('pc_oi'), v: oi ? pct(oi.delta24hPct) : '—', cls: oi ? dirCls(oi.delta24hPct) : '' },
      { l: PT('pc_liq'), v: skew + '% ' + PT('liq_shorts'), cls: skew >= 50 ? 'down' : 'up' },
      { l: PT('pc_fund'), v: fn ? ((fn.fundingPct >= 0 ? '+' : '') + fn.fundingPct + '%') : '—', cls: fn ? dirCls(fn.fundingPct) : '' },
      { l: PT('pc_mom'), v: hmc ? pct(hmc.priceChange24h) : '—', cls: hmc ? dirCls(hmc.priceChange24h) : '' },
    ];
    return `<div class="pulse-comps">${items.map((i) => `<div class="pulse-comp"><div class="pcm-l">${i.l}</div><div class="pcm-v ${i.cls}">${i.v}</div></div>`).join('')}</div>`;
  }
  function renderSmartAlerts(m) {
    const P = D().marketPulse;
    const color = P.state === 'risk_on' ? 'var(--up)' : P.state === 'risk_off' ? 'var(--down)' : 'var(--mixed)';
    const stateCls = P.state === 'risk_on' ? 'pulse-state-on' : P.state === 'risk_off' ? 'pulse-state-off' : 'pulse-state-neutral';
    const stateLbl = PT('al_' + P.state);
    const drivers = P.drivers.map((d) => `<div class="pd-row"><span class="pd-ar ${d.dir}">${d.dir === 'up' ? IC.up : IC.down}</span>${PL(d)}</div>`).join('');
    const alerts = D().smart_alerts.slice(0, 10).map((a) => `
      <div class="alert-row ${a.severity}">
        <span class="ar-ic">${alertIc[a.type] || IC.bell}</span>
        <div class="ar-body"><div class="ar-type">${PT('a_' + a.type)}</div><div class="ar-detail">${PL(a.detail)}</div></div>
        <div class="ar-right"><div class="ar-val">${a.value}</div>
          <div class="ar-meta"><span class="ar-asset">${a.asset}</span>${rel(a.ts)}</div></div>
      </div>`).join('');
    return `<div class="pro-screen">${proHead(m)}
      <div class="pro-body alerts-grid">
        <section class="panel pulse-panel">
          <div class="pro-panel-title">${IC.shield}${PT('al_pulse')}</div>
          <div class="pulse-gauge">
            <div class="pulse-ring">${ringGauge(P.score, color, 116, 14)}
              <div class="pulse-center"><div class="pc-state ${stateCls}">${stateLbl}</div>
                <div class="pc-score num">${P.score} / 100</div></div></div>
          </div>
          <div class="pulse-drivers"><div class="pd-l">${PT('al_drivers')}</div>${drivers}</div>
          ${pulseComponents()}
        </section>
        <section class="panel alert-feed-panel">
          <div class="pro-panel-title">${IC.bell}${PT('al_feed')}<span class="src">${PT('al_live')}</span></div>
          <div class="alert-rows">${alerts}</div>
        </section>
      </div></div>`;
  }

  /* =========================================================
     F · MARKET HEATMAP (squarified treemap)
     ========================================================= */
  let heatmapMode = '24h';
  function hmCoinsSorted() {
    return D().market_heatmap.coins.slice().sort((a, b) => b.marketCap - a.marketCap);
  }
  function hmValue(c) {
    switch (heatmapMode) {
      case '1m': return c.priceChange1m;
      case '1h': return c.priceChange1h;
      case '6h': return c.priceChange6h;
      case '12h': return c.priceChange12h;
      case '7d': return c.priceChange7d;
      case 'volume': return c.volume24h;
      default: return c.priceChange24h;
    }
  }
  function hmColor(c) {
    if (heatmapMode === 'volume') {
      const max = Math.max(...D().market_heatmap.coins.map((x) => x.volume24h)) || 1;
      const n = c.volume24h / max;
      if (n >= 0.45) return { bg: '#1597a8', fg: '#04181b' };
      if (n >= 0.15) return { bg: '#155f6b', fg: '#bdeef4' };
      if (n >= 0.05) return { bg: '#1a3942', fg: '#86d7e0' };
      return { bg: '#222a39', fg: '#9aa3b4' };
    }
    const v = hmValue(c);
    const bands = { '1m': [0.1, 0.5], '1h': [0.4, 1.5], '6h': [1, 4], '12h': [1.5, 6], '24h': [1.5, 5], '7d': [3, 10] };
    const band = bands[heatmapMode] || [1.5, 5];
    if (v >= band[1]) return { bg: '#13a06a', fg: '#eafff4' };
    if (v >= band[0]) return { bg: '#176b49', fg: '#cdeede' };
    if (v > -band[0]) return { bg: '#232b3a', fg: '#9aa3b4' };
    if (v > -band[1]) return { bg: '#7a2937', fg: '#f4cdd5' };
    return { bg: '#c0334a', fg: '#ffe4ea' };
  }
  /* squarified treemap → массив прямоугольников в px (W×H) */
  function squarify(items, W, H) {
    const total = items.reduce((s, it) => s + it.value, 0) || 1;
    const nodes = items.map((it) => ({ it, area: it.value / total * (W * H) }));
    const out = [];
    let rect = { x: 0, y: 0, w: W, h: H };
    const worst = (row, len) => {
      if (!row.length) return Infinity;
      const sum = row.reduce((s, r) => s + r.area, 0);
      const mx = Math.max(...row.map((r) => r.area));
      const mn = Math.min(...row.map((r) => r.area));
      const s2 = sum * sum, l2 = len * len;
      return Math.max((l2 * mx) / s2, s2 / (l2 * mn));
    };
    const layoutRow = (row) => {
      const sum = row.reduce((s, r) => s + r.area, 0);
      if (rect.w >= rect.h) { // колонка слева
        const colW = sum / rect.h;
        let oy = rect.y;
        row.forEach((r) => { const hh = r.area / sum * rect.h; out.push({ it: r.it, x: rect.x, y: oy, w: colW, h: hh }); oy += hh; });
        rect = { x: rect.x + colW, y: rect.y, w: rect.w - colW, h: rect.h };
      } else { // ряд сверху
        const rowH = sum / rect.w;
        let ox = rect.x;
        row.forEach((r) => { const ww = r.area / sum * rect.w; out.push({ it: r.it, x: ox, y: rect.y, w: ww, h: rowH }); ox += ww; });
        rect = { x: rect.x, y: rect.y + rowH, w: rect.w, h: rect.h - rowH };
      }
    };
    let row = [];
    let i = 0;
    while (i < nodes.length) {
      const len = Math.min(rect.w, rect.h);
      const withNode = row.concat(nodes[i]);
      if (row.length === 0 || worst(row, len) >= worst(withNode, len)) { row = withNode; i++; }
      else { layoutRow(row); row = []; }
    }
    if (row.length) layoutRow(row);
    return out;
  }
  function layoutHeatmap() {
    const tm = document.getElementById('hm-treemap');
    if (!tm) return;
    const W = tm.clientWidth, H = tm.clientHeight;
    if (!W || !H) return;
    const coins = hmCoinsSorted();
    const rects = squarify(coins.map((c) => ({ value: Math.max(c.marketCap, 1), coin: c })), W, H);
    const tiles = tm.querySelectorAll('.hm-tile');
    rects.forEach((r, idx) => {
      const t = tiles[idx]; if (!t) return;
      const c = r.it.coin;
      const gap = 3;
      t.style.left = r.x + 'px'; t.style.top = r.y + 'px';
      t.style.width = Math.max(0, r.w - gap) + 'px'; t.style.height = Math.max(0, r.h - gap) + 'px';
      const col = hmColor(c);
      t.style.background = col.bg; t.style.color = col.fg;
      const minDim = Math.min(r.w, r.h);
      const v = hmValue(c);
      const valStr = heatmapMode === 'volume' ? usd(v) : pct(v);
      if (minDim < 38) {
        t.classList.add('tiny');
        const fs = Math.max(9, Math.min(15, minDim * 0.4));
        t.innerHTML = `<span class="hm-tk" style="font-size:${fs.toFixed(0)}px">${c.symbol}</span>`;
      } else {
        t.classList.remove('tiny');
        const fs = Math.max(13, Math.min(40, minDim * 0.32));
        t.innerHTML = `<span class="hm-tk" style="font-size:${fs.toFixed(0)}px">${c.symbol}</span>`
          + `<span class="hm-ch" style="font-size:${(fs * 0.6).toFixed(0)}px">${valStr}</span>`;
      }
    });
  }
  function hmLegend() {
    if (heatmapMode === 'volume') {
      return `<div class="hm-legend">
        <span class="hm-leg"><span class="sw" style="background:#1597a8"></span>${PT('hm_leg_volhi')}</span>
        <span class="hm-leg"><span class="sw" style="background:#155f6b"></span>${PT('hm_leg_volmid')}</span>
        <span class="hm-leg"><span class="sw" style="background:#222a39"></span>${PT('hm_leg_vollo')}</span>
      </div>`;
    }
    return `<div class="hm-legend">
      <span class="hm-leg"><span class="sw" style="background:#13a06a"></span>${PT('hm_leg_up2')}</span>
      <span class="hm-leg"><span class="sw" style="background:#176b49"></span>${PT('hm_leg_up')}</span>
      <span class="hm-leg"><span class="sw" style="background:#232b3a"></span>${PT('hm_leg_flat')}</span>
      <span class="hm-leg"><span class="sw" style="background:#7a2937"></span>${PT('hm_leg_dn')}</span>
      <span class="hm-leg"><span class="sw" style="background:#c0334a"></span>${PT('hm_leg_dn2')}</span>
    </div>`;
  }
  function renderHeatmap(m) {
    const modes = [['1m', 'hm_m_1m'], ['1h', 'hm_m_1h'], ['6h', 'hm_m_6h'], ['12h', 'hm_m_12h'], ['24h', 'hm_m_24h'], ['7d', 'hm_m_7d'], ['volume', 'hm_m_vol']];
    const tabs = `<span class="hm-tabs">${modes.map(([id, k]) =>
      `<button type="button" class="hm-tab selector ${id === heatmapMode ? 'active' : ''}" data-hm="${id}" tabindex="-1">${PT(k)}</button>`).join('')}</span>`;
    const tiles = hmCoinsSorted().map((c, i) => `<div class="hm-tile" data-i="${i}"></div>`).join('');
    return `<div class="pro-screen">${proHead(m, tabs)}
      <div class="pro-body hm-body">
        <section class="panel hm-panel">
          <div class="hm-treemap" id="hm-treemap">${tiles}</div>
        </section>
      </div>
      ${hmLegend()}</div>`;
  }

  /* =========================================================
     MODE BUTTON + MENU
     ========================================================= */
  function renderButtonInner() {
    const m = modeById(currentMode);
    return `<span class="mb-ic">${m.ic}</span>
      <span class="mb-text"><span class="mb-kicker">${PT('mode_btn')}${m.pro ? '<span class="mb-pro">PRO</span>' : ''}</span>
        <span class="mb-name">${PT(m.nameK)}</span></span>
      <span class="mb-chev">${IC.chevDown}</span>`;
  }
  function menuItem(m) {
    return `<div class="mode-item ${m.pro ? 'pro' : ''} ${m.id === currentMode ? 'active' : ''} selector-pro" data-mode="${m.id}" tabindex="-1">
      <span class="mi-ic">${m.ic}</span>
      <span class="mi-text"><span class="mi-name">${PT(m.nameK)}</span><span class="mi-sub">${PT(m.subK)}</span></span>
      ${m.pro ? `<span class="mi-badge">PRO</span>` : ''}<span class="mi-check">${IC.check}</span>
    </div>`;
  }
  function renderMenu() {
    const basic = MODES.filter((m) => !m.pro);
    const pro = MODES.filter((m) => m.pro);
    return `<div class="mode-sec-label">${PT('section_basic')}</div>
      ${basic.map(menuItem).join('')}
      <div class="mode-sec-label pro">${PT('section_pro')}</div>
      ${pro.map(menuItem).join('')}`;
  }

  let menuOpen = false;
  function positionMenu() {
    const menu = sel('#mode-menu'), btn = sel('#mode-btn'), stage = sel('#stage');
    if (!menu || !btn || !stage) return;
    const br = btn.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    const scale = (sr.width / 1920) || 1;       // масштаб #stage (fitStage)
    let leftD = (br.left - sr.left) / scale;     // позиция кнопки в дизайн-координатах сцены
    const topD = (br.bottom - sr.top) / scale + 8;
    const mw = menu.offsetWidth || 460;
    if (leftD + mw > 1920 - 16) leftD = 1920 - mw - 16;
    if (leftD < 16) leftD = 16;
    menu.style.left = leftD + 'px';
    menu.style.top = topD + 'px';
  }
  function openMenu() {
    const menu = sel('#mode-menu'), scrim = sel('#mode-scrim'), btn = sel('#mode-btn');
    if (!menu) return;
    menu.innerHTML = renderMenu();
    menu.classList.remove('hidden');
    scrim.classList.remove('hidden');
    btn.setAttribute('aria-expanded', 'true');
    menuOpen = true;
    positionMenu();
    const active = menu.querySelector('.mode-item.active') || menu.querySelector('.mode-item');
    if (active) { menu.querySelectorAll('.mode-item.focus').forEach((n) => n.classList.remove('focus')); active.classList.add('focus'); }
  }
  function closeMenu() {
    const menu = sel('#mode-menu'), scrim = sel('#mode-scrim'), btn = sel('#mode-btn');
    if (menu) menu.classList.add('hidden');
    if (scrim) scrim.classList.add('hidden');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    menuOpen = false;
  }
  function toggleMenu() { menuOpen ? closeMenu() : openMenu(); }

  function fitSessionInsights() {
    // уменьшаем шрифт инсайта, пока текст не влезет ЦЕЛИКОМ (без обрезки)
    var nodes = document.querySelectorAll('#pro-stage .sess-news .sn-t');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      el.style.fontSize = '17px';
      var fs = 17, guard = 0;
      while (el.scrollHeight > el.clientHeight + 1 && fs > 9 && guard < 30) { fs -= 0.5; el.style.fontSize = fs + 'px'; guard++; }
    }
  }
  function mountMode(id, persist) {
    currentMode = id;
    stopWhaleGraph(); // остановить canvas-анимацию при уходе/смене режима
    if (persist) { try { localStorage.setItem(LS_KEY, id); } catch (e) {} }
    const m = modeById(id);
    const btn = sel('#mode-btn');
    if (btn) { btn.innerHTML = renderButtonInner(); btn.classList.toggle('is-pro', !!m.pro); }
    const root = sel('#pro-stage');
    if (m.pro && m.render) {
      document.body.classList.add('pro-active');
      if (root) root.innerHTML = m.render(m);
    } else {
      document.body.classList.remove('pro-active');
      if (root) root.innerHTML = '';
    }
    if (typeof fitStage === 'function') fitStage();
    if (m.id === 'heatmap') {
      requestAnimationFrame(() => requestAnimationFrame(layoutHeatmap));
      setTimeout(layoutHeatmap, 80);
    }
    if (m.id === 'session') {
      requestAnimationFrame(fitSessionInsights);
      setTimeout(fitSessionInsights, 80);
    }
    if (m.id === 'whale') {
      requestAnimationFrame(() => requestAnimationFrame(startWhaleGraph));
      setTimeout(startWhaleGraph, 90);
    }
  }
  function selectMode(id) { closeMenu(); mountMode(id, true); }

  /* =========================================================
     INIT
     ========================================================= */
  function init() {
    const stage = sel('#stage');
    if (!stage) return;

    // вставляем кнопку режима после блока с часами
    const clock = stage.querySelector('.hdr-cell.clock');
    const wrap = document.createElement('div');
    wrap.className = 'hdr-cell hdr-mode';
    wrap.innerHTML = `<button type="button" id="mode-btn" class="mode-btn selector" aria-haspopup="true" aria-expanded="false">${renderButtonInner()}</button>`;
    if (clock && clock.parentNode) clock.parentNode.insertBefore(wrap, clock.nextSibling);
    else stage.querySelector('#header').appendChild(wrap);
    // меню — ПРЯМОЙ потомок #stage (масштабируется со сценой, поверх контента, без stacking-ловушек)
    if (!sel('#mode-menu')) {
      const mm = document.createElement('div');
      mm.id = 'mode-menu'; mm.className = 'mode-menu hidden';
      stage.appendChild(mm);
    }

    // pro-stage контейнер
    if (!sel('#pro-stage')) {
      const ps = document.createElement('div');
      ps.id = 'pro-stage';
      const whale = sel('#whale');
      stage.insertBefore(ps, whale ? whale.nextSibling : null);
    }
    // scrim для закрытия по клику вне меню
    if (!sel('#mode-scrim')) {
      const sc = document.createElement('div');
      sc.id = 'mode-scrim'; sc.className = 'hidden';
      stage.appendChild(sc);
    }

    sel('#mode-btn').addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(); });
    sel('#mode-scrim').addEventListener('click', closeMenu);
    sel('#mode-menu').addEventListener('click', (e) => {
      const item = e.target.closest('.mode-item');
      if (item) selectMode(item.dataset.mode);
    });

    // переключение режима heatmap (24h/1h/7d/volume) + relayout
    sel('#pro-stage').addEventListener('click', (e) => {
      const tab = e.target.closest('[data-hm]');
      if (tab) { heatmapMode = tab.dataset.hm; D().market_heatmap.mode = heatmapMode; mountMode('heatmap', true); return; }
      const smt = e.target.closest('[data-sm]');
      if (smt) { sessionMetric = smt.dataset.sm; mountMode('session', true); return; }
      const dat = e.target.closest('[data-da]');
      if (dat) { selectDerivAsset(dat.dataset.da); }
    });
    // пульт навёлся на таб валюты → сразу применяем (быстрый просмотр одной стрелкой)
    sel('#pro-stage').addEventListener('focusin', (e) => {
      if (currentMode !== 'deriv') return;
      const dt = e.target.closest('[data-da]');
      if (dt && dt.dataset.da !== derivAsset) scheduleDerivAsset(dt.dataset.da);
    });
    window.addEventListener('resize', () => { if (currentMode === 'heatmap') { requestAnimationFrame(layoutHeatmap); setTimeout(layoutHeatmap, 80); } });

    // D-pad / клавиатура для меню
    document.addEventListener('keydown', (e) => {
      if (!menuOpen) return;
      const menu = sel('#mode-menu');
      const items = [...menu.querySelectorAll('.mode-item')];
      if (!items.length) return;
      let cur = menu.querySelector('.mode-item.focus');
      let idx = items.indexOf(cur);
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault(); idx = (idx + 1) % items.length;
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault(); idx = (idx - 1 + items.length) % items.length;
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault(); if (cur) selectMode(cur.dataset.mode); return;
      } else if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'Back') {
        e.preventDefault(); closeMenu(); sel('#mode-btn').focus(); return;
      } else { return; }
      items.forEach((n) => n.classList.remove('focus'));
      items[idx].classList.add('focus');
      items[idx].focus({ preventScroll: true });
    });

    // перерисовка при смене языка
    if (window.I18N && I18N.onChange) {
      I18N.onChange(() => {
        const btn = sel('#mode-btn');
        if (btn) btn.innerHTML = renderButtonInner();
        if (menuOpen) { sel('#mode-menu').innerHTML = renderMenu(); }
        const m = modeById(currentMode);
        if (m.pro && m.render) { const r = sel('#pro-stage'); if (r) r.innerHTML = m.render(m); }
        if (currentMode === 'heatmap') { requestAnimationFrame(() => requestAnimationFrame(layoutHeatmap)); setTimeout(layoutHeatmap, 80); }
        if (currentMode === 'session') { requestAnimationFrame(fitSessionInsights); setTimeout(fitSessionInsights, 80); }
        if (currentMode === 'whale') { stopWhaleGraph(); requestAnimationFrame(() => requestAnimationFrame(startWhaleGraph)); setTimeout(startWhaleGraph, 90); }
      });
    }

    mountMode(currentMode, false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // экспорт для отладки / интеграции
  window.CTV_PRO = { mountMode, MODES, openMenu, closeMenu, layoutHeatmap };
})();
