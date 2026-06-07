/* =========================================================
   Crypto TV Terminal — PRO LIVE loader
   Подменяет mock window.PRO_DATA реальными данными с сервера
   (агрегатор build-pro-data.php → /ctvt/pro-data.json). Сохраняет
   PRO_I18N / PT / PL из pro-data.js (берёт только поля данных).
   Подключать ПОСЛЕ pro.js. Безопасен офлайн: при сбое остаётся
   последний показ (или mock на старте).
   ========================================================= */
'use strict';
(function () {
  var URL = 'https://jjkkll.top/ctvt/pro-data.json';
  var lastStamp = null;

  function activeMode() { try { return localStorage.getItem('ctv.mode') || 'general'; } catch (e) { return 'general'; } }
  function overlayOpen() { var ov = document.getElementById('ctv-overlay'); return !!(ov && !ov.classList.contains('hidden')); }
  function menuOpen() { var m = document.getElementById('mode-menu'); return !!(m && !m.classList.contains('hidden')); }

  function apply(d) {
    if (!d || typeof d !== 'object' || !d.market_heatmap) return;       // sanity: must look like PRO_DATA
    if (d.updatedAt && d.updatedAt === lastStamp) return;               // no change → skip re-render
    lastStamp = d.updatedAt || String(Date.now());
    // сохранить выбранный режим тепловой карты, если был
    try { if (window.PRO_DATA && window.PRO_DATA.market_heatmap && d.market_heatmap) { d.market_heatmap.mode = window.PRO_DATA.market_heatmap.mode || d.market_heatmap.mode; } } catch (e) {}
    window.PRO_DATA = d;
    var m = activeMode();
    // перерисовать активный PRO-экран, но не выдёргивать фокус, если пользователь
    // сейчас навигирует ВНУТРИ экрана, и не мешать открытым меню/оверлею
    var focusedInPro = document.querySelector('#pro-stage .focus');
    if (m !== 'general' && window.CTV_PRO && CTV_PRO.mountMode && !overlayOpen() && !menuOpen() && !focusedInPro) {
      try { CTV_PRO.mountMode(m, false); } catch (e) {}
    }
  }

  function load() {
    if (!window.fetch) return;
    fetch(URL + '?_=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(apply)
      .catch(function () {});
  }

  load();
  setInterval(load, 60000);
  window.CTV_PRO_LIVE = { reload: load };
})();
