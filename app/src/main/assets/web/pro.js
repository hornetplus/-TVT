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
      <span class="ph-meta">${metaHtml || (`<span class="dot"></span>${PT('mock_note')}`)}</span>
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
  function sessAssetRow(a) {
    if (a.open == null) {
      return `<div class="sess-arow">${proCoin(a.sym, 'small')}
        <div><div class="sa-tk">${a.sym}</div><div class="sa-ohlc">—</div></div>
        <div class="sa-right"><div class="sa-chg" style="color:var(--ink-4)">—</div></div></div>`;
    }
    const fp = (v) => v >= 1000 ? '$' + Math.round(v).toLocaleString('en-US') : '$' + v.toFixed(1);
    return `<div class="sess-arow">${proCoin(a.sym, 'small')}
      <div><div class="sa-tk">${a.sym}</div>
        <div class="sa-ohlc">${PT('sess_high')} ${fp(a.high)} · ${PT('sess_low')} ${fp(a.low)}</div></div>
      <div class="sa-right"><div class="sa-chg ${dirCls(a.changePct)}">${pct(a.changePct)}</div>
        <div class="sa-vol">${PT('sess_vol')} ${usd(a.volumeUsd)}</div></div></div>`;
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
      <div class="sess-news"><div><div class="sn-l">${PT('top_news')}</div>
        <div class="sn-t">${PL(s.topNews)}</div><div class="sn-src">${s.topNews.source}</div></div></div>
    </section>`;
  }
  function renderSession(m) {
    return `<div class="pro-screen">${proHead(m)}
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
      <div class="liq-heat">
        <div class="pro-panel-title" style="font-size:13px">${PT('liq_cluster')}</div>
        ${L.byAsset.map((a) => `<div class="heat-asset">
          <div class="ha-head">${proCoin(a.sym, 'small')}<span class="ha-tk">${a.sym}</span><span class="ha-tot">${usd(a.totalUsd)}</span></div>
          <div class="heat-rows">${heatRows(a)}</div></div>`).join('')}
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
  function renderDerivatives(m) {
    const oi = D().oi_summary, fn = D().funding_summary;
    return `<div class="pro-screen">${proHead(m)}
      <div class="pro-body deriv-grid">
        ${renderLiqPanel()}
        <section class="panel deriv-oi">
          <div class="pro-panel-title">${IC.activity}${PT('oi_pro')}</div>
          <div class="da-list">${oi.map(oiCard).join('')}</div>
        </section>
        <section class="panel deriv-fund">
          <div class="pro-panel-title">${IC.wave}${PT('fund_pro')}</div>
          <div class="da-list">${fn.map(fundCard).join('')}</div>
        </section>
        <section class="panel deriv-risk">
          <span class="dr-ic" style="background:var(--up-fill);color:var(--up)">${IC.activity}</span>
          <div class="dr-text"><div class="dr-l">${PT('risk_read')}</div>
            <div class="dr-v">${PL({ ru: 'Цена ↑ + OI ↑ + перекос ликвидаций в шорты — <span class="up">риск продолжения вверх</span>, но фандинг BTC перегрет → возможен локальный откат.', en: 'Price ↑ + OI ↑ + liquidations skewed short — <span class="up">upside continuation risk</span>, but BTC funding is crowded → local pullback possible.' })}</div></div>
        </section>
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
      <div class="we-right"><div class="we-usd ${dir}">${usd(w.usd)}</div>
        <div class="we-interp"><span class="interp-tag ${itc}"><span class="it-dot"></span>${PT('wi_' + w.interpretation)}</span></div></div>
    </div>`;
  }
  function renderWhaleIntel(m) {
    const ev = D().whale_events;
    let inflow = 0, outflow = 0;
    ev.forEach((w) => { if (w.type === 'wallet_to_exchange') inflow += w.usd; else if (w.type === 'exchange_to_wallet') outflow += w.usd; });
    const net = inflow - outflow;
    const tot = inflow + outflow || 1;
    return `<div class="pro-screen">${proHead(m)}
      <div class="pro-body whale-grid">
        <section class="panel whale-flow">
          <div class="pro-panel-title">${IC.whale}${PT('wh_flow')}</div>
          <div class="flow-net"><div class="fn-l">${PT('wh_net')}</div>
            <div class="fn-v ${net >= 0 ? 'down' : 'up'}">${net >= 0 ? '+' : '−'}${usd(Math.abs(net))}</div></div>
          <div class="flow-bars">
            <div class="flow-bar"><div class="fb-head"><span>${PT('wh_inflow')}</span><span class="down">${usd(inflow)}</span></div>
              <div class="fb-track"><span class="fb-fill in" style="width:${Math.round(inflow / tot * 100)}%"></span></div></div>
            <div class="flow-bar"><div class="fb-head"><span>${PT('wh_outflow')}</span><span class="up">${usd(outflow)}</span></div>
              <div class="fb-track"><span class="fb-fill out" style="width:${Math.round(outflow / tot * 100)}%"></span></div></div>
          </div>
          <div class="flow-legend">
            <div class="flow-leg"><span class="fl-dot" style="background:var(--down)"></span>${PT('w2e')} · ${PT('wi_sell_pressure')}</div>
            <div class="flow-leg"><span class="fl-dot" style="background:var(--up)"></span>${PT('e2w')} · ${PT('wi_accumulation')}</div>
            <div class="flow-leg"><span class="fl-dot" style="background:var(--violet)"></span>${PT('w2w')} · ${PT('wi_redistribution')}</div>
          </div>
        </section>
        <section class="panel whale-list-panel">
          <div class="pro-panel-title">${IC.activity}${PT('wh_recent')}<span class="src">${PT('al_live')}</span></div>
          <div class="whale-rows">${ev.map(whaleRow).join('')}</div>
        </section>
      </div></div>`;
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
  function renderSmartAlerts(m) {
    const P = D().marketPulse;
    const color = P.state === 'risk_on' ? 'var(--up)' : P.state === 'risk_off' ? 'var(--down)' : 'var(--mixed)';
    const stateCls = P.state === 'risk_on' ? 'pulse-state-on' : P.state === 'risk_off' ? 'pulse-state-off' : 'pulse-state-neutral';
    const stateLbl = PT('al_' + P.state);
    const drivers = P.drivers.map((d) => `<div class="pd-row"><span class="pd-ar ${d.dir}">${d.dir === 'up' ? IC.up : IC.down}</span>${PL(d)}</div>`).join('');
    const alerts = D().smart_alerts.map((a) => `
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
    return heatmapMode === '1h' ? c.priceChange1h
      : heatmapMode === '7d' ? c.priceChange7d
        : heatmapMode === 'volume' ? c.volume24h : c.priceChange24h;
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
    const band = heatmapMode === '1h' ? [0.4, 1.5] : heatmapMode === '7d' ? [3, 10] : [1.5, 5];
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
    const modes = [['24h', 'hm_m_24h'], ['1h', 'hm_m_1h'], ['7d', 'hm_m_7d'], ['volume', 'hm_m_vol']];
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
  function openMenu() {
    const menu = sel('#mode-menu'), scrim = sel('#mode-scrim'), btn = sel('#mode-btn');
    if (!menu) return;
    menu.innerHTML = renderMenu();
    menu.classList.remove('hidden');
    scrim.classList.remove('hidden');
    btn.setAttribute('aria-expanded', 'true');
    menuOpen = true;
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

  function mountMode(id, persist) {
    currentMode = id;
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
    wrap.innerHTML = `<button type="button" id="mode-btn" class="mode-btn selector" aria-haspopup="true" aria-expanded="false">${renderButtonInner()}</button>
      <div id="mode-menu" class="mode-menu hidden"></div>`;
    if (clock && clock.parentNode) clock.parentNode.insertBefore(wrap, clock.nextSibling);
    else stage.querySelector('#header').appendChild(wrap);

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
      document.body.appendChild(sc);
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
      if (tab) { heatmapMode = tab.dataset.hm; D().market_heatmap.mode = heatmapMode; mountMode('heatmap', true); }
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
      });
    }

    mountMode(currentMode, false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // экспорт для отладки / интеграции
  window.CTV_PRO = { mountMode, MODES, openMenu, closeMenu, layoutHeatmap };
})();
