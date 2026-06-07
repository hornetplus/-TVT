/* =========================================================
   Crypto TV Terminal — метаданные и НАЧАЛЬНОЕ состояние
   ========================================================= */
'use strict';

const ASSETS = {
  BTC:  { name: 'Bitcoin',       color: 'btc',  glyph: '₿' },
  ETH:  { name: 'Ethereum',      color: 'eth',  glyph: 'Ξ' },
  SOL:  { name: 'Solana',        color: 'sol',  glyph: 'S' },
  BNB:  { name: 'BNB',           color: 'bnb',  glyph: 'B' },
  XRP:  { name: 'XRP',           color: 'xrp',  glyph: 'X' },
  TON:  { name: 'Toncoin',       color: 'ton',  glyph: '◈' },
  DOGE: { name: 'Dogecoin',      color: 'doge', glyph: 'Ð' },
  ADA:  { name: 'Cardano',       color: 'ada',  glyph: '₳' },
  AVAX: { name: 'Avalanche',     color: 'avax', glyph: 'A' },
  LINK: { name: 'Chainlink',     color: 'link', glyph: 'L' },
  TRX:  { name: 'TRON',          color: 'trx',  glyph: 'T' },
  DOT:  { name: 'Polkadot',      color: 'dot',  glyph: '●' },
  MATIC:{ name: 'Polygon',       color: 'matic',glyph: 'M' },
  LTC:  { name: 'Litecoin',      color: 'ltc',  glyph: 'Ł' },
  SHIB: { name: 'Shiba Inu',     color: 'shib', glyph: 'S' },
  BCH:  { name: 'Bitcoin Cash',  color: 'bch',  glyph: 'B' },
  UNI:  { name: 'Uniswap',       color: 'uni',  glyph: 'U' },
  ATOM: { name: 'Cosmos',        color: 'atom', glyph: 'C' },
  NEAR: { name: 'NEAR',          color: 'near', glyph: 'N' },
  APT:  { name: 'Aptos',         color: 'apt',  glyph: 'A' },
  SUI:  { name: 'Sui',           color: 'sui',  glyph: 'S' },
  HBAR: { name: 'Hedera',        color: 'hbar', glyph: 'H' },
  ICP:  { name: 'Internet Computer', color: 'icp', glyph: 'I' },
  FIL:  { name: 'Filecoin',      color: 'fil',  glyph: 'F' },
  ARB:  { name: 'Arbitrum',      color: 'arb',  glyph: 'A' },
  OP:   { name: 'Optimism',      color: 'op',   glyph: 'O' },
  INJ:  { name: 'Injective',     color: 'inj',  glyph: 'I' },
  IMX:  { name: 'Immutable',     color: 'imx',  glyph: 'I' },
  STX:  { name: 'Stacks',        color: 'stx',  glyph: 'S' },
  USDC: { name: 'USD Coin',      color: 'usdc', glyph: '$' },
};

const ASSET_STATE = {};
Object.keys(ASSETS).forEach((sym) => {
  const a = ASSETS[sym];
  ASSET_STATE[sym] = {
    symbol: sym, name: a.name, color: a.color, glyph: a.glyph,
    priceUsd: 0, change24hPct: 0, change7dPct: 0,
    volumeUsd: 0, direction: 'up', sparkline: [],
  };
});

const WATCHLIST_CFG = {
  windowSize: 8,
  rotationIntervalSec: 10,
};

const HERO_STATE = {
  BTC: { symbol: 'BTC', name: 'Bitcoin',  color: 'btc', glyph: '₿', priceUsd: 0, change24hPct: 0, change7dPct: 0, support: [0, 0], resistance: [0, 0], direction: 'up', sparkline: [] },
  ETH: { symbol: 'ETH', name: 'Ethereum', color: 'eth', glyph: 'Ξ', priceUsd: 0, change24hPct: 0, change7dPct: 0, support: [0, 0], resistance: [0, 0], direction: 'up', sparkline: [] },
};

const MARKET = {
  status: 'open',
  fearGreed: 50, fgLabel: 'Neutral',
  btcDominance: 0,
  totalMarketCapUsd: 0, capChange: 0,
  altseason: 0,
};

const INDICATORS = {
  liquidations: { asset: 'BTC', total: '—', longUsd: '—', shortUsd: '—', longPct: null },
  funding: [
    { sym: 'BTC', val: null }, { sym: 'ETH', val: null },
    { sym: 'SOL', val: null }, { sym: 'XRP', val: null },
  ],
  gas: { value: null, low: null, avg: null, high: null, usd: null },
};

const NEWS_SEED = [];
const WHALE_SEED = [];
