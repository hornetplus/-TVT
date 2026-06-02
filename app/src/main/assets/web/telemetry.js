/* =========================================================
   Crypto TV Terminal — телеметрия для админки
   Шлёт «heartbeat» на backend (онлайн, режим, версия, гео по IP
   считается на сервере). Уникальный device_id хранится в localStorage.
   text/plain тело — чтобы не вызывать CORS-preflight. Безопасно офлайн.
   ========================================================= */
'use strict';
(function () {
  var ENDPOINT = 'https://jjkkll.top/ctvt/admin/api/hit.php';
  var HB_MS = 45000;          // интервал пинга
  var first = true;

  function uuid() {
    return 'tv-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
  }
  function deviceId() {
    try {
      var k = 'ctv.device.id';
      var v = localStorage.getItem(k);
      if (!v) { v = uuid(); localStorage.setItem(k, v); }
      return v;
    } catch (e) { return 'anon-' + Math.random().toString(36).slice(2, 10); }
  }
  function mode() { try { return localStorage.getItem('ctv.mode') || 'general'; } catch (e) { return 'general'; } }
  function webVer() {
    var s = document.getElementById('stage');
    var v = s ? parseInt(s.getAttribute('data-ui-ver'), 10) : 0;
    return v || 0;
  }
  function appVer() {
    try { if (window.AndroidHost && typeof AndroidHost.appVersion === 'function') return String(AndroidHost.appVersion()); } catch (e) {}
    return '';
  }

  function beat() {
    try {
      var body = JSON.stringify({
        device_id: deviceId(), mode: mode(), web_ver: webVer(),
        app_ver: appVer(), event: first ? 'start' : 'ping',
      });
      first = false;
      if (window.fetch) {
        fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: body, cache: 'no-store', keepalive: true }).catch(function () {});
      }
    } catch (e) {}
  }

  setTimeout(beat, 3000);
  setInterval(beat, HB_MS);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) beat(); });
})();
