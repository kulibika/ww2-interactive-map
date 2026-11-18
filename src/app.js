// Application bootstrap
(function (root) {
  function boot() {
    var store = root.WW2_STATE.createStore({
      MONTHS: root.WW2_TIMELINE.MONTHS,
      FACTION_META: root.WW2_TIMELINE.FACTION_META,
      BATTLES: root.WW2_BATTLES.BATTLES,
      TACTICAL_BATTLES: root.WW2_TACTICAL.TACTICAL_BATTLES
    });

    var reliefStatusBadge = document.getElementById('relief-status-dot');
    var mapEngine = root.WW2_MAP_ENGINE.createMapEngine('map', store, {
      onReliefStatus: function (status) {
        if (!reliefStatusBadge) return;
        var active = typeof status === 'object' ? !!status.active : !!status;
        var online = typeof status === 'object' ? !!status.online : !!status;
        reliefStatusBadge.classList.toggle('is-online', active && online);
        reliefStatusBadge.classList.toggle('is-offline', active && !online);
        if (!active) {
          reliefStatusBadge.title = 'Слой физического рельефа отключён';
        } else if (online) {
          reliefStatusBadge.title = 'Физический рельеф (онлайн, без современных границ)';
        } else {
          reliefStatusBadge.title = 'Офлайн-режим: встроенная векторная карта 1939 г.';
        }
      }
    });

    root.WW2_UI.createUI(store, mapEngine);
    root.__WW2_APP__ = { store: store, mapEngine: mapEngine };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
