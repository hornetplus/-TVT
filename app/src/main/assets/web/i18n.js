/* =========================================================
   Crypto TV Terminal — i18n (RU / EN)
   Переводит ТОЛЬКО интерфейс: подписи, кнопки, состояния,
   относительное время и даты в шапке. Числа/цены/тикеры
   остаются в единой финансовой нотации (en-US) на обоих языках.

   Подключать ПОСЛЕ api.js (переопределяет window.relTime) и ДО
   settings.js / terminal.js. Текущий язык хранит settings.js
   (localStorage); здесь — только словарь и применение.
   ========================================================= */
'use strict';

const I18N = (() => {
  const DICT = {
    ru: {
      brand_sub: 'Биржевое табло',
      market_status: 'Статус рынка',
      market_open: 'Открыт',
      fng: 'Индекс страха и жадности',
      btc_dom: 'Доминация BTC',
      altseason: 'Альтсезон',
      market_cap: 'Капитализация рынка',
      btn_update: 'Обновить',
      ota_checking: 'Проверка обновлений…',
      ota_updated: (v) => `Установлено · web v${v}`,
      ota_uptodate: (v) => `Актуально · web v${v}`,
      ota_apk_only: 'Кнопка работает в приложении на ТВ',
      language: 'Язык',

      overview: 'Обзор рынка',
      tab_usd: 'USD', tab_pct: '24Ч %', tab_vol: 'Объём',
      all_assets: 'Все активы',
      all_assets_sub: 'Включённые монеты — в обзоре рынка и доступны для карточек «В фокусе»',
      wl_empty: 'Включите монеты в «Все активы»',

      focus: 'В фокусе',
      support: 'Поддержка', resistance: 'Сопротивление',
      h24: '24ч', d7: '7Д',

      liquidations: 'Ликвидации',
      long: 'Лонг', short: 'Шорт', na: 'н/д',
      funding: 'Фандинг',
      gas: 'Газ', gas_low: 'Низкий', gas_mid: 'Средний', gas_high: 'Высокий', btc_fee: 'Комиссия',

      news: 'Новости', all: 'Все',
      whale: 'Крупные сделки', realtime: 'в реальном времени', all_tx: 'Все транзакции',

      back_terminal: 'Назад в терминал', back: 'Назад', forward: 'Вперёд',

      /* настройки / попапы */
      settings: 'Настройки',
      hero_cfg_title: 'Карточки в фокусе',
      hero_cfg_sub: 'Выберите до 7 валют · первая — крупная',
      wl_cfg_title: 'Отслеживаемые активы',
      wl_cfg_sub: 'BTC и ETH закреплены вверху списка',
      news_cfg_title: 'Источники новостей',
      news_cfg_sub: 'Включите ленты, из которых брать новости',
      pinned: 'закреплено', featured: 'крупная',
      apply: 'Применить', cancel: 'Отмена', reset: 'Сброс',
      all_en: 'Все EN', all_ru: 'Все RU', clear_all: 'Снять все',
      search: 'Поиск…',
      sel_count: (n, t) => `Выбрано ${n} из ${t}`,
      max_hint: 'Максимум 7 карточек',
      on_count: (n, t) => `Включено ${n} из ${t}`,

      /* whale overlay */
      tx_time: 'Время', tx_type: 'Тип', tx_asset: 'Актив',
      tx_amount: 'Количество', tx_value: 'Сумма', tx_route: 'Направление',
      tx_in: 'Приток', tx_out: 'Вывод',
      f_all: 'Все', f_in: 'Притоки', f_out: 'Выводы',
      sum_in: 'Притоки', sum_out: 'Выводы', sum_net: 'Чистый поток',
      no_tx: 'Крупных сделок пока нет',
      loading_tx: 'Загрузка крупных сделок с бирж…',

      /* news overlay / states */
      news_overlay: 'Новости · последние часы',
      news_empty: 'Нет свежих новостей',

      /* altseason verdicts */
      season_btc: 'Сезон BTC', season_alt: 'Альтсезон', season_mix: 'Смешанный',

      /* categories */
      cat_market: 'Маркет', cat_defi: 'DeFi', cat_exchange: 'Биржа', cat_nft: 'NFT', cat_btc: 'Биткоин',

      /* fear & greed */
      'Extreme Fear': 'Крайний страх', 'Fear': 'Страх', 'Neutral': 'Нейтрально',
      'Greed': 'Жадность', 'Extreme Greed': 'Крайняя жадность',

      months: ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'],
      dow: ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'],

      rt_now: 'сейчас', rt_min: 'мин', rt_h: 'ч', rt_d: 'д',
    },

    en: {
      brand_sub: 'Live market board',
      market_status: 'Market status',
      market_open: 'Open',
      fng: 'Fear & Greed index',
      btc_dom: 'BTC dominance',
      altseason: 'Altseason',
      market_cap: 'Market cap',
      btn_update: 'Update',
      ota_checking: 'Checking for updates…',
      ota_updated: (v) => `Updated · web v${v}`,
      ota_uptodate: (v) => `Up to date · web v${v}`,
      ota_apk_only: 'Update button works in the TV app only',
      language: 'Language',

      overview: 'Market overview',
      tab_usd: 'USD', tab_pct: '24H %', tab_vol: 'Volume',
      all_assets: 'All assets',
      all_assets_sub: 'Enabled coins appear in market overview and can be added to «In focus» cards',
      wl_empty: 'Enable coins in «All assets»',

      focus: 'In focus',
      support: 'Support', resistance: 'Resistance',
      h24: '24h', d7: '7D',

      liquidations: 'Liquidations',
      long: 'Long', short: 'Short', na: 'n/a',
      funding: 'Funding',
      gas: 'Gas', gas_low: 'Low', gas_mid: 'Medium', gas_high: 'High', btc_fee: 'Fee',

      news: 'News', all: 'All',
      whale: 'Large trades', realtime: 'real-time', all_tx: 'All transactions',

      back_terminal: 'Back to terminal', back: 'Back', forward: 'Next',

      settings: 'Settings',
      hero_cfg_title: 'Focus cards',
      hero_cfg_sub: 'Pick up to 7 coins · the first is featured',
      wl_cfg_title: 'Tracked assets',
      wl_cfg_sub: 'BTC and ETH are pinned to the top',
      news_cfg_title: 'News sources',
      news_cfg_sub: 'Toggle the feeds you want news from',
      pinned: 'pinned', featured: 'featured',
      apply: 'Apply', cancel: 'Cancel', reset: 'Reset',
      all_en: 'All EN', all_ru: 'All RU', clear_all: 'Clear all',
      search: 'Search…',
      sel_count: (n, t) => `${n} of ${t} selected`,
      max_hint: 'Up to 7 cards',
      on_count: (n, t) => `${n} of ${t} enabled`,

      tx_time: 'Time', tx_type: 'Type', tx_asset: 'Asset',
      tx_amount: 'Amount', tx_value: 'Value', tx_route: 'Route',
      tx_in: 'Inflow', tx_out: 'Outflow',
      f_all: 'All', f_in: 'Inflows', f_out: 'Outflows',
      sum_in: 'Inflows', sum_out: 'Outflows', sum_net: 'Net flow',
      no_tx: 'No large trades yet',
      loading_tx: 'Loading large trades from exchanges…',

      news_overlay: 'News · last hours',
      news_empty: 'No fresh news',

      season_btc: 'BTC season', season_alt: 'Altseason', season_mix: 'Mixed',

      cat_market: 'Market', cat_defi: 'DeFi', cat_exchange: 'Exchange', cat_nft: 'NFT', cat_btc: 'Bitcoin',

      'Extreme Fear': 'Extreme Fear', 'Fear': 'Fear', 'Neutral': 'Neutral',
      'Greed': 'Greed', 'Extreme Greed': 'Extreme Greed',

      months: ['January','February','March','April','May','June','July','August','September','October','November','December'],
      dow: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],

      rt_now: 'now', rt_min: 'm', rt_h: 'h', rt_d: 'd',
    },
  };

  let lang = 'ru';
  const listeners = [];

  function t(key, ...args) {
    const v = (DICT[lang] && DICT[lang][key]);
    if (v == null) return key;
    return typeof v === 'function' ? v(...args) : v;
  }
  function cat(c) { return t('cat_' + c) || t('cat_market'); }

  /* применить статические строки: textContent у [data-i18n], placeholder у [data-i18n-ph] */
  function applyStatic(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    root.querySelectorAll('[data-i18n-ph]').forEach((el) => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
    });
    root.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const label = t(el.getAttribute('data-i18n-aria'));
      el.setAttribute('aria-label', label);
      el.setAttribute('title', label);
    });
    document.documentElement.lang = lang;
  }

  function set(next) {
    if (!DICT[next] || next === lang) { if (DICT[next]) { applyStatic(); listeners.forEach((fn) => fn(lang)); } return; }
    lang = next;
    applyStatic();
    listeners.forEach((fn) => fn(lang));
  }
  function onChange(fn) { listeners.push(fn); }
  function get() { return lang; }

  /* локализованное относительное время (переопределяет api.js relTime) */
  function relTime(date) {
    const sec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (sec < 60) return t('rt_now');
    const m = Math.floor(sec / 60);
    if (m < 60) return lang === 'ru' ? `${m} ${t('rt_min')}` : `${m}${t('rt_min')}`;
    const h = Math.floor(m / 60);
    if (h < 24) return lang === 'ru' ? `${h} ${t('rt_h')}` : `${h}${t('rt_h')}`;
    const d = Math.floor(h / 24);
    return lang === 'ru' ? `${d} ${t('rt_d')}` : `${d}${t('rt_d')}`;
  }

  return { t, cat, set, get, onChange, applyStatic, relTime,
           months: () => DICT[lang].months, dow: () => DICT[lang].dow };
})();

/* переопределяем глобальный relTime локализованным (api.js уже выставил свой) */
window.I18N = I18N;
window.relTime = I18N.relTime;
