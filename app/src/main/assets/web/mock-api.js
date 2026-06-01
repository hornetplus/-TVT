/* =========================================================
   Crypto TV Terminal — МОК-ИСТОЧНИК ДАННЫХ (ТОЛЬКО ДЛЯ ПРЕВЬЮ)
   Заменяет api.js в prototype.html: даёт ту же шину FEED и те же
   события, но числа генерируются локально — чтобы дизайн «жил»
   в браузере без сети (CoinGecko/OKX/RSS недоступны в превью).

   В реальном APK используется api.js (настоящие данные). Этот файл
   в сборку можно не класть; он безвреден, но не нужен на устройстве.
   ========================================================= */
'use strict';

/* ---- шина событий (совместима с api.js) ---- */
const FEED = (() => {
  const subs = {};
  return {
    on(ev, fn) { (subs[ev] = subs[ev] || []).push(fn); },
    emit(ev, data) { (subs[ev] || []).forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } }); },
  };
})();
function relTime(date) {
  const sec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (sec < 60) return 'now';
  const m = Math.floor(sec / 60); if (m < 60) return m + 'm';
  const h = Math.floor(m / 60); if (h < 24) return h + 'h';
  return Math.floor(h / 24) + 'd';
}
function parseNewsDate(raw) { return (raw instanceof Date) ? raw : new Date(raw || Date.now()); }
window.FEED = FEED; window.relTime = relTime; window.parseNewsDate = parseNewsDate;

/* ---- базовые цены и метаданные ---- */
const BASE = {
  BTC: 111250.5, ETH: 2680.45, SOL: 176.61, BNB: 668.17, XRP: 2.42, TON: 3.21,
  DOGE: 0.1824, ADA: 0.621, AVAX: 28.44, LINK: 18.22, TRX: 0.241, DOT: 5.12, USDC: 1.0,
};
const VOL = {
  BTC: 42.1e9, ETH: 21.8e9, SOL: 5.6e9, BNB: 1.2e9, XRP: 2.9e9, TON: 681e6,
  DOGE: 1.4e9, ADA: 720e6, AVAX: 540e6, LINK: 610e6, TRX: 480e6, DOT: 320e6, USDC: 6e9,
};
const rnd = (a, b) => a + Math.random() * (b - a);
const state = {};
Object.keys(BASE).forEach((s) => {
  const p = BASE[s];
  const spark = [];
  let v = p * 0.97;
  for (let i = 0; i < 40; i++) { v += rnd(-p * 0.006, p * 0.0065); spark.push(v); }
  spark[spark.length - 1] = p;
  state[s] = {
    priceUsd: p, change24hPct: rnd(-4, 6), change7dPct: rnd(-8, 12),
    volumeUsd: VOL[s], sparkline: spark, high24h: p * 1.03, low24h: p * 0.96,
  };
});

function emitMarkets() {
  const bySym = {};
  Object.keys(state).forEach((s) => {
    const a = state[s];
    const drift = (Math.random() - 0.48) * a.priceUsd * 0.0016;
    a.priceUsd = Math.max(a.priceUsd + drift, a.priceUsd * 0.5);
    a.change24hPct += (drift / a.priceUsd) * 100;
    a.sparkline = [...a.sparkline.slice(1), a.priceUsd];
    a.high24h = Math.max(a.high24h, a.priceUsd);
    a.low24h = Math.min(a.low24h, a.priceUsd);
    bySym[s] = { priceUsd: a.priceUsd, change24hPct: a.change24hPct, change7dPct: a.change7dPct,
      volumeUsd: a.volumeUsd, sparkline: a.sparkline.slice(), high24h: a.high24h, low24h: a.low24h };
  });
  FEED.emit('markets', bySym);
}

/* ---- новости (из CONFIG.newsSources, чтобы фильтр по источникам работал) ---- */
const HEADLINES = [
  ['Bitcoin преодолел $111K на фоне возврата бычьего импульса', 'btc'],
  ['Приток в Ethereum-ETF достиг $200M за неделю', 'defi'],
  ['Binance анонсирует новые торговые пары с нулевой комиссией', 'exchange'],
  ['Доминация биткоина превысила 61%, альтсезон на паузе', 'market'],
  ['Рынок NFT прибавил 15% за неделю — лидируют ETH-коллекции', 'nft'],
  ['Индекс страха и жадности вернулся в зону жадности', 'market'],
  ['Крупный фонд раскрыл позицию на $480M в спотовом BTC', 'btc'],
  ['Газ в сети Ethereum опустился до месячного минимума', 'defi'],
  ['Coinbase запускает бессрочные фьючерсы для розницы', 'exchange'],
  ['Solana обновила максимум по активным адресам за сутки', 'defi'],
  ['XRP прибавил 4% после новостей о платёжном партнёрстве', 'market'],
  ['Новый L2-роллап привлёк $1.2B TVL за первую неделю', 'defi'],
];
let hi = 0;
function emitNews(initial) {
  const sources = CONFIG.newsSources || [];
  if (!sources.length) return;
  const src = sources[Math.floor(Math.random() * sources.length)];
  const [title, cat] = HEADLINES[hi % HEADLINES.length]; hi++;
  FEED.emit('news:item', {
    id: src.name + ':' + Date.now() + ':' + hi,
    title, source: src.name, glyph: src.glyph, color: src.color, cat,
    date: new Date(Date.now() - (initial ? rnd(0, 3 * 3600000) : rnd(0, 120000))),
    isNew: !initial,
  });
}

/* ---- крупные сделки ---- */
const WPAIRS = [
  { sym: 'BTC', unit: 'BTC', lo: 200, hi: 3200, px: 111000 },
  { sym: 'ETH', unit: 'ETH', lo: 2000, hi: 20000, px: 2680 },
  { sym: 'SOL', unit: 'SOL', lo: 30000, hi: 240000, px: 176 },
  { sym: 'TON', unit: 'TON', lo: 2e6, hi: 1e7, px: 3.2 },
  { sym: 'XRP', unit: 'XRP', lo: 5e6, hi: 2.4e7, px: 2.42 },
];
function fmtUsd(v) {
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  return '$' + (v / 1e3).toFixed(0) + 'K';
}
function emitWhale() {
  const p = WPAIRS[Math.floor(Math.random() * WPAIRS.length)];
  const dir = Math.random() < 0.55 ? 'in' : 'out';
  const qty = Math.round(rnd(p.lo, p.hi));
  const usd = qty * p.px;
  const sign = dir === 'in' ? '+' : '-';
  FEED.emit('whale', {
    asset: p.sym, dir,
    amount: `${sign}${qty.toLocaleString('en-US')} ${p.unit}`,
    usd: fmtUsd(usd),
    addr: (Math.random() < 0.5 ? 'bc1q' : '0x' + Math.random().toString(16).slice(2, 6)) + '…' + Math.random().toString(16).slice(2, 6),
    ts: Date.now(),
  });
}

/* ---- индикаторы / шапка ---- */
function emitGlobal() {
  FEED.emit('global', { btcDominance: rnd(60.8, 61.8), capUsd: rnd(2.42, 2.5) * 1e12, capChangePct: rnd(-1.5, 3.2) });
}
function emitFng() {
  const v = Math.round(rnd(58, 74));
  FEED.emit('fng', { value: v, label: v >= 75 ? 'Extreme Greed' : v >= 55 ? 'Greed' : v >= 45 ? 'Neutral' : 'Fear' });
}
function emitFunding() {
  FEED.emit('funding', [
    { sym: 'BTC', val: rnd(0.005, 0.015) }, { sym: 'ETH', val: rnd(0.004, 0.012) },
    { sym: 'SOL', val: rnd(-0.004, 0.008) }, { sym: 'XRP', val: rnd(0.001, 0.009) },
  ]);
}
function emitGas() {
  const avg = Math.round(rnd(10, 28));
  FEED.emit('gas', { low: Math.max(6, avg - 6), avg, high: avg + 9, usd: '$' + (avg * 0.034).toFixed(2) });
}
function emitLiq() {
  const long = rnd(120, 260) * 1e6, short = rnd(60, 160) * 1e6;
  FEED.emit('liquidations', { asset: 'BTC', totalUsd: long + short, longUsd: long, shortUsd: short,
    longPct: Math.round((long / (long + short)) * 100) });
}

/* ---- запуск эмиттеров ---- */
function boot() {
  emitMarkets(); emitGlobal(); emitFng(); emitFunding(); emitGas(); emitLiq();
  for (let i = 0; i < 6; i++) emitNews(true);
  for (let i = 0; i < 5; i++) setTimeout(emitWhale, i * 120);

  setInterval(emitMarkets, 2200);
  setInterval(emitGlobal, 8000);
  setInterval(emitFng, 12000);
  setInterval(emitFunding, 9000);
  setInterval(emitGas, 7000);
  setInterval(emitLiq, 10000);
  setInterval(() => emitNews(false), 6500);
  setInterval(emitWhale, 3800);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
