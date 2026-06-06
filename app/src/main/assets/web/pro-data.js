/* =========================================================
   Crypto TV Terminal — PRO LAYER · mock-данные + словарь
   ---------------------------------------------------------
   Данные структурированы 1:1 по JSON-схеме из ТЗ (§5):
     session_summary · liquidation_summary · oi_summary ·
     funding_summary · whale_events · smart_news · smart_alerts
   Это ДИЗАЙН-МОКАП: числа реалистичны, но статичны. На этапе
   разработки слой заменяется ответами backend-агрегатора
   (CoinGecko + CryptoPanic + Coinalyze) той же формы.
   Текстовые enum-статусы локализуются через PRO_I18N,
   контентные строки (новости/метки) хранят {ru,en}.
   ========================================================= */
'use strict';

/* ---- bilingual helper for content strings ---- */
function PL(o) {
  if (o == null) return '';
  if (typeof o === 'string') return o;
  const lang = (window.I18N && I18N.get) ? I18N.get() : 'ru';
  return o[lang] != null ? o[lang] : (o.ru || o.en || '');
}

/* =========================================================
   PRO STRING DICTIONARY (enum → label, RU/EN)
   ========================================================= */
const PRO_I18N = {
  ru: {
    /* mode names */
    mode_general: 'Общий режим', mode_general_sub: 'Smart Investor · базовое табло',
    mode_session: 'Обзор сессий', mode_session_sub: 'Азия · Европа · США',
    mode_deriv: 'Деривативы', mode_deriv_sub: 'Ликвидации · OI · Фандинг',
    mode_whale: 'Обзор китов', mode_whale_sub: 'Потоки китов и их смысл',
    mode_news: 'Smart News', mode_news_sub: 'Новости по значимости',
    mode_alerts: 'Smart Alerts', mode_alerts_sub: 'Сигналы и risk-пульс',
    mode_heatmap: 'Тепловая карта', mode_heatmap_sub: 'Обзор рынка · 30+ монет',
    mode_btn: 'Режим', mode_pick: 'Выбор режима', section_basic: 'Базовый', section_pro: 'PRO · Аналитика',

    /* sessions */
    sess_asia: 'Азиатская сессия', sess_europe: 'Европейская сессия', sess_us: 'Американская сессия',
    sess_asia_s: 'Азия', sess_europe_s: 'Европа', sess_us_s: 'США',
    st_active: 'Идёт сейчас', st_closed: 'Закрыта', st_upcoming: 'Скоро',
    bias_bullish: 'Бычий', bias_bearish: 'Медвежий', bias_mixed: 'Смешанный',
    sess_open: 'Открытие', sess_close: 'Закрытие', sess_now: 'Текущая',
    sess_high: 'Максимум', sess_low: 'Минимум', sess_vol: 'Объём', sess_chg: 'Изм. за сессию',
    sm_price: 'Цена', sm_volume: 'Объём', sm_mcap: 'Капитализация',
    oi_delta: 'Δ Open Interest', fund_shift: 'Сдвиг фандинга', liq_sess: 'Ликвидации',
    top_news: 'Главная новость сессии', sess_pending: 'Сессия ещё не началась',
    expert: 'Эксперт', aiph_expectation: 'Ожидание', aiph_midpoint: 'Срез', aiph_closing: 'Заключение',

    /* risk tags */
    rt_short_squeeze: 'Short squeeze', rt_long_squeeze: 'Long squeeze',
    rt_deleveraging: 'Делеверидж', rt_continuation: 'Продолжение тренда',
    rt_distribution: 'Распределение', rt_crowded_longs: 'Перегрев лонгов',
    rt_crowded_shorts: 'Перегрев шортов', rt_accumulation: 'Накопление',

    /* derivatives */
    liq_pro: 'Ликвидации', liq_1h: 'За 1 час', liq_24h: 'За 24 часа', liq_session: 'В текущей сессии',
    liq_dominant: 'Перекос', liq_longs: 'Лонги', liq_shorts: 'Шорты',
    liq_cluster: 'Зоны кластерного давления', liq_heat: 'Карта ликвидаций', liq_byasset: 'Ликвидации по валютам',
    oi_pro: 'Открытые позиции', oi_current: 'Текущий OI', oi_interp: 'Связка цена + OI',
    fund_pro: 'Фандинг-ставки', fund_current: 'Текущий фандинг', fund_dev: 'Отклонение от нейтрали', fund_neutral_band: 'нейтральный диапазон',
    risk_read: 'Сводная risk-интерпретация',
    dv_live: 'в реальном времени', dv_price: 'Цена', dv_heat_sub: 'price × time · агрегировано по биржам',
    dv_coins_sub: 'за 24ч · перекос', dv_ls: 'Лонг / Шорт', dv_ls_topratio: 'L/S топ-трейдеров',
    dv_ls_top: 'Топ-трейдеры', dv_ls_retail: 'Ритейл',
    dv_ls_warn: 'Ритейл перегружен в лонг сильнее умных денег', dv_ls_warn_s: 'Ритейл перегружен в шорт сильнее умных денег', dv_ls_bal: 'Позиционирование сбалансировано',
    dv_options: 'Опционы', dv_dvol: 'DVOL · волатильность', dv_putcall: 'Пут / Колл', dv_maxpain: 'Макс. боль',
    dv_leg_low: 'низкая', dv_leg_int: 'интенсивность', dv_leg_peak: 'пик',
    dv_spot: 'спот', dv_exp: 'экспирация', dv_pc_call: 'перевес call', dv_pc_put: 'перевес put', dv_pc_bal: 'баланс',
    dv_nodata: 'нет данных', dv_now: 'сейчас', dv_oitotal: 'OI совокупно',
    dv_h: 'ч', dv_overheat: 'перегрев', dv_fund_cap: 'ставка по 8ч · 14 периодов', dv_oidelta: 'ΔOI 24ч',

    /* OI status */
    oi_new_money: 'Новые деньги · риск продолжения', oi_short_cover: 'Закрытие шортов',
    oi_bear_build: 'Медвежий набор позиций', oi_delever: 'Делеверидж',
    /* funding interp */
    fi_crowded_longs: 'Перегрев лонгов', fi_crowded_shorts: 'Перегрев шортов', fi_neutral: 'Нейтрально',

    /* whale */
    wh_classify: 'Классификация перевода', wh_flow: 'Чистый поток на биржи',
    w2e: 'Кошелёк → Биржа', e2w: 'Биржа → Кошелёк', w2w: 'Кошелёк → Кошелёк',
    wi_sell_pressure: 'Риск давления продаж', wi_accumulation: 'Сигнал накопления',
    wi_redistribution: 'Перераспределение', wi_neutral: 'Нейтральный перевод',
    wh_inflow: 'Притоки на биржи', wh_outflow: 'Оттоки с бирж', wh_net: 'Чистый поток',
    wh_significant: 'Значимый', wh_recent: 'Последние крупные переводы',
    wh_graph: 'Граф потоков', wh_pressure: 'Давление китов', wh_index: 'КИТ-ИНДЕКС', wh_acc_s: 'накопл.', wh_sell_s: 'продажи',
    wh_net24: 'чистый поток · 24ч', wh_summary: 'Сводка по китам', wh_largest: 'Крупнейший', wh_direction: 'Направление',
    wh_moves: 'Движений · 24ч', wh_mode_l: 'Режим', wh_accum: 'Накопление', wh_distrib: 'Распределение', wh_withdraw: 'вывод', wh_deposit: 'завод',
    wh_lg_acc: 'накопление', wh_lg_sell: 'давление продаж', wh_lg_redis: 'перераспределение',

    /* smart news */
    sn_impact: 'Влияние', sn_why: 'Почему важно', sn_affected: 'Активы',
    sent_positive: 'Позитив', sent_negative: 'Негатив', sent_neutral: 'Нейтрально',
    ev_etf: 'ETF', ev_regulation: 'Регулирование', ev_exchange: 'Биржи',
    ev_macro: 'Макро', ev_hack: 'Взлом', ev_whale: 'Киты',
    sn_featured: 'Высокое влияние', sn_ranked: 'По значимости',

    /* alerts */
    al_pulse: 'Пульс рынка', al_risk_on: 'Risk-on', al_risk_off: 'Risk-off', al_neutral: 'Нейтрально',
    al_drivers: 'Что формирует пульс', al_feed: 'Лента сигналов', al_live: 'в реальном времени',
    pc_oi: 'OI 24ч', pc_liq: 'Ликвидации', pc_fund: 'Фандинг BTC', pc_mom: 'Моментум 24ч',
    a_liquidation_spike: 'Всплеск ликвидаций', a_oi_surge: 'Рост Open Interest',
    a_funding_anomaly: 'Аномалия фандинга', a_session_breakout: 'Пробой сессии',
    a_volume_spike: 'Всплеск объёма', a_whale_inflow: 'Приток китов на биржу', a_risk_pulse: 'Сдвиг risk-режима',
    sev_high: 'Высокий', sev_medium: 'Средний', sev_low: 'Низкий',

    updated: 'Обновлено', source: 'Источник', mock_note: 'Демо-данные · форма backend-ответа',

    /* heatmap */
    hm_title: 'Тепловая карта рынка', hm_size_note: 'Размер плитки — капитализация',
    hm_m_1m: '1м', hm_m_6h: '6ч', hm_m_12h: '12ч', hm_m_24h: '24ч', hm_m_1h: '1ч', hm_m_7d: '7д', hm_m_vol: 'Объём',
    hm_leg_up2: 'Сильный рост', hm_leg_up: 'Рост', hm_leg_flat: 'Нейтрально',
    hm_leg_dn: 'Падение', hm_leg_dn2: 'Сильное падение',
    hm_leg_volhi: 'Высокий объём', hm_leg_volmid: 'Средний', hm_leg_vollo: 'Низкий',
  },
  en: {
    mode_general: 'General mode', mode_general_sub: 'Smart Investor · base board',
    mode_session: 'Session Intelligence', mode_session_sub: 'Asia · Europe · US',
    mode_deriv: 'Derivatives', mode_deriv_sub: 'Liquidations · OI · Funding',
    mode_whale: 'Whale Intelligence', mode_whale_sub: 'Whale flows & meaning',
    mode_news: 'Smart News', mode_news_sub: 'News by significance',
    mode_alerts: 'Smart Alerts', mode_alerts_sub: 'Signals & risk pulse',
    mode_heatmap: 'Market Heatmap', mode_heatmap_sub: 'Market overview · 30+ coins',
    mode_btn: 'Mode', mode_pick: 'Select mode', section_basic: 'Basic', section_pro: 'PRO · Analytics',

    sess_asia: 'Asia session', sess_europe: 'Europe session', sess_us: 'US session',
    sess_asia_s: 'Asia', sess_europe_s: 'Europe', sess_us_s: 'US',
    st_active: 'Live now', st_closed: 'Closed', st_upcoming: 'Upcoming',
    bias_bullish: 'Bullish', bias_bearish: 'Bearish', bias_mixed: 'Mixed',
    sess_open: 'Open', sess_close: 'Close', sess_now: 'Current',
    sess_high: 'High', sess_low: 'Low', sess_vol: 'Volume', sess_chg: 'Session change',
    sm_price: 'Price', sm_volume: 'Volume', sm_mcap: 'Market cap',
    oi_delta: 'Δ Open Interest', fund_shift: 'Funding shift', liq_sess: 'Liquidations',
    top_news: 'Top news of session', sess_pending: 'Session not started yet',
    expert: 'Expert', aiph_expectation: 'Expectation', aiph_midpoint: 'Mid-session', aiph_closing: 'Closing',

    rt_short_squeeze: 'Short squeeze', rt_long_squeeze: 'Long squeeze',
    rt_deleveraging: 'Deleveraging', rt_continuation: 'Trend continuation',
    rt_distribution: 'Distribution', rt_crowded_longs: 'Crowded longs',
    rt_crowded_shorts: 'Crowded shorts', rt_accumulation: 'Accumulation',

    liq_pro: 'Liquidations', liq_1h: 'Past 1h', liq_24h: 'Past 24h', liq_session: 'This session',
    liq_dominant: 'Skew', liq_longs: 'Longs', liq_shorts: 'Shorts',
    liq_cluster: 'Cluster pressure zones', liq_heat: 'Liquidation map', liq_byasset: 'Liquidations by asset',
    oi_pro: 'Open Interest', oi_current: 'Current OI', oi_interp: 'Price + OI read',
    fund_pro: 'Funding rates', fund_current: 'Current funding', fund_dev: 'Deviation from neutral', fund_neutral_band: 'neutral band',
    risk_read: 'Aggregated risk read',
    dv_live: 'real time', dv_price: 'Price', dv_heat_sub: 'price × time · aggregated across exchanges',
    dv_coins_sub: '24h · skew', dv_ls: 'Long / Short', dv_ls_topratio: 'top traders L/S',
    dv_ls_top: 'Top traders', dv_ls_retail: 'Retail',
    dv_ls_warn: 'Retail more long than smart money', dv_ls_warn_s: 'Retail more short than smart money', dv_ls_bal: 'Positioning balanced',
    dv_options: 'Options', dv_dvol: 'DVOL · volatility', dv_putcall: 'Put / Call ratio', dv_maxpain: 'Max Pain',
    dv_leg_low: 'low', dv_leg_int: 'intensity', dv_leg_peak: 'peak',
    dv_spot: 'spot', dv_exp: 'expiry', dv_pc_call: 'call-heavy', dv_pc_put: 'put-heavy', dv_pc_bal: 'balanced',
    dv_nodata: 'no data', dv_now: 'now', dv_oitotal: 'OI total',
    dv_h: 'h', dv_overheat: 'overheat', dv_fund_cap: '8h rate · 14 periods', dv_oidelta: 'ΔOI 24h',

    oi_new_money: 'New money · continuation risk', oi_short_cover: 'Short covering',
    oi_bear_build: 'Bearish buildup', oi_delever: 'Deleveraging',
    fi_crowded_longs: 'Crowded longs', fi_crowded_shorts: 'Crowded shorts', fi_neutral: 'Neutral',

    wh_classify: 'Transfer classification', wh_flow: 'Net exchange flow',
    w2e: 'Wallet → Exchange', e2w: 'Exchange → Wallet', w2w: 'Wallet → Wallet',
    wi_sell_pressure: 'Sell-pressure risk', wi_accumulation: 'Accumulation signal',
    wi_redistribution: 'Redistribution', wi_neutral: 'Neutral transfer',
    wh_inflow: 'Exchange inflows', wh_outflow: 'Exchange outflows', wh_net: 'Net flow',
    wh_significant: 'Significant', wh_recent: 'Recent large transfers',
    wh_graph: 'Flow graph', wh_pressure: 'Whale pressure', wh_index: 'WHALE INDEX', wh_acc_s: 'accum.', wh_sell_s: 'sells',
    wh_net24: 'net flow · 24h', wh_summary: 'Whale summary', wh_largest: 'Largest', wh_direction: 'Direction',
    wh_moves: 'Moves · 24h', wh_mode_l: 'Mode', wh_accum: 'Accumulation', wh_distrib: 'Distribution', wh_withdraw: 'withdrawal', wh_deposit: 'deposit',
    wh_lg_acc: 'accumulation', wh_lg_sell: 'sell pressure', wh_lg_redis: 'redistribution',

    sn_impact: 'Impact', sn_why: 'Why it matters', sn_affected: 'Assets',
    sent_positive: 'Positive', sent_negative: 'Negative', sent_neutral: 'Neutral',
    ev_etf: 'ETF', ev_regulation: 'Regulation', ev_exchange: 'Exchange',
    ev_macro: 'Macro', ev_hack: 'Hack', ev_whale: 'Whale',
    sn_featured: 'High impact', sn_ranked: 'By significance',

    al_pulse: 'Market pulse', al_risk_on: 'Risk-on', al_risk_off: 'Risk-off', al_neutral: 'Neutral',
    al_drivers: 'Pulse drivers', al_feed: 'Signal feed', al_live: 'real-time',
    pc_oi: 'OI 24h', pc_liq: 'Liquidations', pc_fund: 'BTC funding', pc_mom: '24h momentum',
    a_liquidation_spike: 'Liquidation spike', a_oi_surge: 'Open Interest surge',
    a_funding_anomaly: 'Funding anomaly', a_session_breakout: 'Session breakout',
    a_volume_spike: 'Volume spike', a_whale_inflow: 'Whale inflow to exchange', a_risk_pulse: 'Risk regime shift',
    sev_high: 'High', sev_medium: 'Medium', sev_low: 'Low',

    updated: 'Updated', source: 'Source', mock_note: 'Demo data · backend response shape',

    /* heatmap */
    hm_title: 'Market heatmap', hm_size_note: 'Tile size — market cap',
    hm_m_1m: '1M', hm_m_6h: '6H', hm_m_12h: '12H', hm_m_24h: '24H', hm_m_1h: '1H', hm_m_7d: '7D', hm_m_vol: 'Volume',
    hm_leg_up2: 'Strong gain', hm_leg_up: 'Gain', hm_leg_flat: 'Neutral',
    hm_leg_dn: 'Loss', hm_leg_dn2: 'Strong loss',
    hm_leg_volhi: 'High volume', hm_leg_volmid: 'Medium', hm_leg_vollo: 'Low',
  },
};

function PT(key, ...args) {
  const lang = (window.I18N && I18N.get) ? I18N.get() : 'ru';
  const v = (PRO_I18N[lang] && PRO_I18N[lang][key]);
  if (v == null) return key;
  return typeof v === 'function' ? v(...args) : v;
}

/* =========================================================
   MOCK DATA — форма backend JSON (ТЗ §5)
   ========================================================= */
const PRO_DATA = {

  /* ---- 1. SESSION INTELLIGENCE ---- */
  sessions: [
    {
      session: 'asia', tz: 'UTC+8 · Tokyo / HK / Singapore', window: '00:00–08:00 UTC',
      status: 'closed', marketBias: 'mixed', riskTag: 'distribution',
      openInterestDelta: -1.4, fundingShift: -0.6, liquidationsUsd: 84.2e6,
      assets: [
        { sym: 'BTC', open: 71240, close: 70980, high: 71820, low: 70510, changePct: -0.36, volumeUsd: 14.6e9 },
        { sym: 'ETH', open: 3842, close: 3798, high: 3901, low: 3760, changePct: -1.14, volumeUsd: 7.1e9 },
        { sym: 'SOL', open: 184.2, close: 182.6, high: 188.4, low: 180.1, changePct: -0.87, volumeUsd: 2.3e9 },
      ],
      topNews: { ru: 'Азиатские фонды фиксируют прибыль после ралли BTC', en: 'Asian funds book profit after BTC rally', source: 'CoinDesk' },
    },
    {
      session: 'europe', tz: 'UTC+1 · London / Frankfurt', window: '07:00–16:00 UTC',
      status: 'active', marketBias: 'bullish', riskTag: 'continuation',
      openInterestDelta: 3.8, fundingShift: 1.2, liquidationsUsd: 142.7e6,
      assets: [
        { sym: 'BTC', open: 70980, close: 72160, high: 72340, low: 70840, changePct: 1.66, volumeUsd: 18.9e9 },
        { sym: 'ETH', open: 3798, close: 3884, high: 3902, low: 3781, changePct: 2.26, volumeUsd: 9.4e9 },
        { sym: 'SOL', open: 182.6, close: 187.9, high: 189.7, low: 182.0, changePct: 2.90, volumeUsd: 3.1e9 },
      ],
      topNews: { ru: 'ЕЦБ намекнул на смягчение — рисковые активы растут', en: 'ECB hints at easing — risk assets rally', source: 'Reuters' },
    },
    {
      session: 'us', tz: 'UTC-5 · New York', window: '13:00–21:00 UTC',
      status: 'upcoming', marketBias: 'mixed', riskTag: 'crowded_longs',
      openInterestDelta: 0, fundingShift: 0, liquidationsUsd: 0,
      assets: [
        { sym: 'BTC', open: null, close: null, high: null, low: null, changePct: null, volumeUsd: null },
        { sym: 'ETH', open: null, close: null, high: null, low: null, changePct: null, volumeUsd: null },
        { sym: 'SOL', open: null, close: null, high: null, low: null, changePct: null, volumeUsd: null },
      ],
      topNews: { ru: 'Ожидается отчёт по инфляции США в 13:30 UTC', en: 'US CPI report expected at 13:30 UTC', source: 'Bloomberg' },
    },
  ],

  /* ---- 2. LIQUIDATION SUMMARY ---- */
  liquidation_summary: {
    window1hUsd: 38.6e6, window24hUsd: 412.9e6, sessionUsd: 142.7e6,
    dominantSide: 'shorts',
    long24hUsd: 158.2e6, short24hUsd: 254.7e6,
    source: 'Coinalyze · 1 биржа',
    byAsset: [
      { sym: 'BTC', totalUsd: 196.4e6, shortPct: 64, clusters: [
        { price: 73200, usd: 41e6, side: 'short' }, { price: 72400, usd: 28e6, side: 'short' },
        { price: 70600, usd: 22e6, side: 'long' }, { price: 69800, usd: 31e6, side: 'long' } ] },
      { sym: 'ETH', totalUsd: 121.7e6, shortPct: 58, clusters: [
        { price: 3960, usd: 24e6, side: 'short' }, { price: 3900, usd: 18e6, side: 'short' },
        { price: 3760, usd: 14e6, side: 'long' }, { price: 3700, usd: 19e6, side: 'long' } ] },
    ],
  },

  /* ---- 3. OI SUMMARY ---- */
  oi_summary: [
    { sym: 'BTC', oiUsd: 38.4e9, deltaSessionPct: 3.8, delta1hPct: 0.9, delta4hPct: 2.1, delta24hPct: 6.4, priceChgPct: 1.66, status: 'new_money' },
    { sym: 'ETH', oiUsd: 19.7e9, deltaSessionPct: 2.6, delta1hPct: 0.4, delta4hPct: 1.4, delta24hPct: 4.1, priceChgPct: 2.26, status: 'new_money' },
    { sym: 'SOL', oiUsd: 4.92e9, deltaSessionPct: -1.8, delta1hPct: -0.6, delta4hPct: -0.9, delta24hPct: 3.2, priceChgPct: 2.90, status: 'short_cover' },
  ],

  /* ---- 4. FUNDING SUMMARY ---- */
  funding_summary: [
    { sym: 'BTC', fundingPct: 0.0182, direction: 'up', deviation: 1.8, interpretation: 'crowded_longs' },
    { sym: 'ETH', fundingPct: 0.0104, direction: 'up', deviation: 1.0, interpretation: 'neutral' },
    { sym: 'SOL', fundingPct: -0.0061, direction: 'down', deviation: -0.9, interpretation: 'crowded_shorts' },
  ],

  /* ---- 5. WHALE EVENTS ---- */
  whale_events: [
    { ts: Date.now() - 2 * 60000, asset: 'BTC', amount: '1,240 BTC', usd: 89.4e6, type: 'wallet_to_exchange', fromLabel: { ru: 'Неизвестный кошелёк', en: 'Unknown wallet' }, toLabel: 'Binance', interpretation: 'sell_pressure', significant: true },
    { ts: Date.now() - 9 * 60000, asset: 'ETH', amount: '18,500 ETH', usd: 71.9e6, type: 'exchange_to_wallet', fromLabel: 'Coinbase', toLabel: { ru: 'Холодный кошелёк', en: 'Cold wallet' }, interpretation: 'accumulation', significant: true },
    { ts: Date.now() - 17 * 60000, asset: 'USDT', amount: '50,000,000 USDT', usd: 50.0e6, type: 'wallet_to_exchange', fromLabel: 'Tether Treasury', toLabel: 'Kraken', interpretation: 'neutral', significant: false },
    { ts: Date.now() - 24 * 60000, asset: 'SOL', amount: '210,000 SOL', usd: 39.4e6, type: 'wallet_to_wallet', fromLabel: { ru: 'Фонд', en: 'Fund' }, toLabel: { ru: 'OTC-деск', en: 'OTC desk' }, interpretation: 'redistribution', significant: false },
    { ts: Date.now() - 38 * 60000, asset: 'BTC', amount: '640 BTC', usd: 46.1e6, type: 'exchange_to_wallet', fromLabel: 'OKX', toLabel: { ru: 'Неизвестный кошелёк', en: 'Unknown wallet' }, interpretation: 'accumulation', significant: true },
    { ts: Date.now() - 52 * 60000, asset: 'ETH', amount: '9,800 ETH', usd: 38.1e6, type: 'wallet_to_exchange', fromLabel: { ru: 'Ранний инвестор', en: 'Early investor' }, toLabel: 'Bybit', interpretation: 'sell_pressure', significant: false },
  ],

  /* ---- 6. SMART NEWS ---- */
  smart_news: [
    { ts: Date.now() - 12 * 60000, title: { ru: 'BlackRock увеличил приток в спотовый BTC-ETF на $480M за день', en: 'BlackRock spot BTC ETF sees $480M daily inflow' }, source: 'Bloomberg', coins: ['BTC'], sentiment: 'positive', importance: 5, type: 'etf', why: { ru: 'Рекордный дневной приток усиливает институциональный спрос и снижает доступное предложение BTC.', en: 'Record daily inflow strengthens institutional demand and reduces available BTC supply.' } },
    { ts: Date.now() - 28 * 60000, title: { ru: 'SEC отложила решение по ETH-стейкинг-ETF до сентября', en: 'SEC delays decision on ETH staking ETF to September' }, source: 'Reuters', coins: ['ETH'], sentiment: 'negative', importance: 4, type: 'regulation', why: { ru: 'Задержка добавляет неопределённости вокруг ETH и сдерживает приток капитала в краткосроке.', en: 'The delay adds uncertainty around ETH and caps near-term capital inflow.' } },
    { ts: Date.now() - 46 * 60000, title: { ru: 'Крупная биржа приостановила вывод USDC на фоне технического сбоя', en: 'Major exchange halts USDC withdrawals amid technical glitch' }, source: 'The Block', coins: ['USDC'], sentiment: 'negative', importance: 4, type: 'exchange', why: { ru: 'Остановка выводов повышает риск краткосрочной паники и оттока ликвидности с площадки.', en: 'A withdrawal halt raises the risk of short-term panic and liquidity outflow.' } },
    { ts: Date.now() - 64 * 60000, title: { ru: 'Данные по инфляции США оказались ниже прогноза', en: 'US inflation print comes in below forecast' }, source: 'CoinDesk', coins: ['BTC', 'ETH', 'SOL'], sentiment: 'positive', importance: 5, type: 'macro', why: { ru: 'Более мягкая инфляция повышает вероятность снижения ставок — позитив для рисковых активов.', en: 'Softer inflation raises odds of rate cuts — a tailwind for risk assets.' } },
    { ts: Date.now() - 88 * 60000, title: { ru: 'Кошелёк раннего майнера переместил 4 000 BTC впервые за 12 лет', en: 'Early-miner wallet moves 4,000 BTC for the first time in 12 years' }, source: 'Arkham', coins: ['BTC'], sentiment: 'neutral', importance: 3, type: 'whale', why: { ru: 'Перемещение «спящих» монет может предвещать продажу, но пока без захода на биржу.', en: 'Dormant-coin movement can precede a sale, but no exchange deposit yet.' } },
  ],

  /* ---- 7. SMART ALERTS ---- */
  marketPulse: {
    state: 'risk_on', score: 68,
    drivers: [
      { ru: 'OI растёт вместе с ценой', en: 'OI rising with price', dir: 'up' },
      { ru: 'Перекос ликвидаций в шорты', en: 'Liquidations skewed short', dir: 'up' },
      { ru: 'Приток в спот-ETF положительный', en: 'Spot-ETF inflow positive', dir: 'up' },
      { ru: 'Фандинг BTC перегрет', en: 'BTC funding crowded', dir: 'down' },
    ],
  },
  smart_alerts: [
    { ts: Date.now() - 1 * 60000, type: 'liquidation_spike', severity: 'high', asset: 'BTC', value: '$41M', detail: { ru: 'Каскад шортов на пробое $72.3K', en: 'Short cascade on $72.3K break' } },
    { ts: Date.now() - 4 * 60000, type: 'oi_surge', severity: 'medium', asset: 'BTC', value: '+6.4% / 24ч', detail: { ru: 'Новые деньги входят в лонг', en: 'New money entering longs' } },
    { ts: Date.now() - 7 * 60000, type: 'whale_inflow', severity: 'high', asset: 'BTC', value: '$89.4M', detail: { ru: '1 240 BTC переведены на Binance', en: '1,240 BTC moved to Binance' } },
    { ts: Date.now() - 13 * 60000, type: 'session_breakout', severity: 'medium', asset: 'ETH', value: '$3,902', detail: { ru: 'Пробой максимума евро-сессии', en: 'Europe-session high broken' } },
    { ts: Date.now() - 19 * 60000, type: 'funding_anomaly', severity: 'low', asset: 'SOL', value: '-0.0061%', detail: { ru: 'Фандинг ушёл в отрицательную зону', en: 'Funding flipped negative' } },
    { ts: Date.now() - 26 * 60000, type: 'volume_spike', severity: 'medium', asset: 'ETH', value: '+38%', detail: { ru: 'Объём выше среднего за 4 часа', en: 'Volume above 4h average' } },
  ],
};

/* ---- 8. MARKET HEATMAP (отдельное ТЗ) ----
   Источник: CoinGecko /coins/markets (top-30/40 by market cap).
   Поля плитки 1:1 с ТЗ; sizeWeight/displayColor вычисляются в pro.js
   (в проде их готовит backend). Формат: [sym,name,rank,mcapB,1h,24h,7d,volB] */
const HM_RAW = [
  ['BTC', 'Bitcoin', 1, 1380, 0.3, 1.66, 5.1, 52],
  ['ETH', 'Ethereum', 2, 470, 0.5, 2.26, 7.2, 24],
  ['USDT', 'Tether', 3, 158, 0.0, 0.01, 0.0, 70],
  ['BNB', 'BNB', 4, 95, 0.2, 0.9, 3.1, 3.2],
  ['SOL', 'Solana', 5, 88, 0.6, 2.9, 9.4, 6.1],
  ['XRP', 'XRP', 6, 72, -0.2, -1.2, 2.4, 4.0],
  ['USDC', 'USD Coin', 7, 54, 0.0, 0.0, 0.01, 8.5],
  ['DOGE', 'Dogecoin', 8, 28, 1.1, 4.2, 12.5, 2.6],
  ['ADA', 'Cardano', 9, 22, -0.3, -2.1, -3.4, 1.1],
  ['TRX', 'TRON', 10, 19, 0.1, 0.4, 1.2, 0.9],
  ['AVAX', 'Avalanche', 11, 16, 0.4, 1.8, -2.1, 1.0],
  ['LINK', 'Chainlink', 12, 14, -0.5, -1.9, 4.6, 0.8],
  ['TON', 'Toncoin', 13, 13, 0.3, 1.1, 6.3, 0.5],
  ['DOT', 'Polkadot', 14, 11, -0.4, -1.6, -5.2, 0.6],
  ['MATIC', 'Polygon', 15, 9.5, 0.2, 0.7, -1.1, 0.7],
  ['SHIB', 'Shiba Inu', 16, 8.8, 1.5, 6.1, 18.2, 1.3],
  ['LTC', 'Litecoin', 17, 7.9, -0.1, -0.6, 2.1, 0.6],
  ['BCH', 'Bitcoin Cash', 18, 7.2, 0.2, 1.3, 3.8, 0.5],
  ['NEAR', 'NEAR', 19, 6.5, -0.6, -3.2, -7.1, 0.4],
  ['UNI', 'Uniswap', 20, 6.1, 0.4, 2.0, 5.5, 0.5],
  ['ICP', 'Internet Computer', 21, 5.6, -0.3, -1.4, -4.2, 0.3],
  ['APT', 'Aptos', 22, 5.1, 0.5, 2.4, 8.1, 0.4],
  ['XLM', 'Stellar', 23, 4.8, 0.0, 0.3, 1.0, 0.2],
  ['ETC', 'Ethereum Classic', 24, 4.4, -0.2, -0.9, -2.6, 0.3],
  ['FIL', 'Filecoin', 25, 3.9, 0.6, 3.1, 6.9, 0.3],
  ['HBAR', 'Hedera', 26, 3.6, -0.4, -2.2, -5.8, 0.2],
  ['ARB', 'Arbitrum', 27, 3.2, 0.3, 1.5, 4.4, 0.4],
  ['VET', 'VeChain', 28, 3.0, 0.1, 0.6, -1.4, 0.15],
  ['OP', 'Optimism', 29, 2.8, -0.5, -2.7, -6.3, 0.3],
  ['INJ', 'Injective', 30, 2.5, 0.8, 4.6, 11.2, 0.3],
  ['SUI', 'Sui', 31, 2.3, 0.7, 3.4, 9.8, 0.4],
  ['IMX', 'Immutable', 32, 2.0, -0.3, -1.7, -3.9, 0.15],
  ['AAVE', 'Aave', 33, 1.9, 0.5, 2.8, 7.4, 0.25],
  ['RNDR', 'Render', 34, 1.7, 1.2, 5.4, 15.1, 0.3],
  ['GRT', 'The Graph', 35, 1.5, -0.6, -3.6, -8.2, 0.12],
  ['ALGO', 'Algorand', 36, 1.3, 0.2, 0.9, -2.0, 0.1],
];
PRO_DATA.market_heatmap = {
  mode: '24h',
  updatedAt: new Date().toISOString(),
  coins: HM_RAW.map((r) => ({
    symbol: r[0], name: r[1], rank: r[2],
    marketCap: r[3] * 1e9,
    priceChange1h: r[4], priceChange24h: r[5], priceChange7d: r[6],
    volume24h: r[7] * 1e9,
  })),
};

window.PRO_DATA = PRO_DATA;
window.PRO_I18N = PRO_I18N;
window.PT = PT;
window.PL = PL;
