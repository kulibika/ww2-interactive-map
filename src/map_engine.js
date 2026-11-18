// Leaflet Hybrid Map Engine: offline 1939 political map, clipped monthly occupation zones,
// rivers, animated frontlines, optional borderless online relief tiles, battle pins & tactical flyTo
(function (root) {
  function createMapEngine(containerId, store, callbacks) {
    var L = root.L;
    var worldData = root.WW2_WORLD_DATA;
    var tacticalEngineFactory = root.WW2_TACTICAL_ENGINE;

    var map = L.map(containerId, {
      center: [34, 22],
      zoom: 3,
      minZoom: 2,
      maxZoom: 13,
      zoomControl: false,
      worldCopyJump: false,
      maxBounds: [[-72, -215], [84, 215]],
      maxBoundsViscosity: 0.75,
      attributionControl: true
    });

    map.attributionControl.setPrefix(false);
    L.control.zoom({ position: 'topleft' }).addTo(map);

    // Z-ordered custom panes
    map.createPane('paneRelief').style.zIndex = 150;
    map.createPane('paneGraticule').style.zIndex = 180;
    map.createPane('paneCountries').style.zIndex = 240;
    map.createPane('paneOccupation').style.zIndex = 270;
    map.createPane('paneRivers').style.zIndex = 310;
    map.createPane('paneFrontlines').style.zIndex = 360;
    map.createPane('paneTactical').style.zIndex = 420;
    map.createPane('paneBattles').style.zIndex = 470;

    // 1. Optional Borderless Physical Relief Layer (Esri World_Shaded_Relief — ZERO modern political borders)
    var RELIEF_ATTR = 'Рельеф: Esri World Shaded Relief (без совр. границ)';
    var reliefAttrShown = false;
    var reliefLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
      {
        pane: 'paneRelief',
        maxZoom: 13,
        maxNativeZoom: 13,
        opacity: 0.72,
        attribution: ''
      }
    );
    var reliefFailed = false;
    var reliefLoadedOnce = false;
    var consecutiveErrors = 0;

    function syncReliefChrome() {
      var shouldShowAttr = store.state.layers.relief && reliefLoadedOnce && !reliefFailed;
      if (shouldShowAttr && !reliefAttrShown) {
        map.attributionControl.addAttribution(RELIEF_ATTR);
        reliefAttrShown = true;
      } else if (!shouldShowAttr && reliefAttrShown) {
        map.attributionControl.removeAttribution(RELIEF_ATTR);
        reliefAttrShown = false;
      }
      if (callbacks && callbacks.onReliefStatus) {
        callbacks.onReliefStatus({
          active: store.state.layers.relief,
          online: !reliefFailed,
          loaded: reliefLoadedOnce
        });
      }
    }

    reliefLayer.on('tileerror', function () {
      consecutiveErrors++;
      if (!reliefFailed && ((!reliefLoadedOnce && consecutiveErrors >= 1) || consecutiveErrors >= 5)) {
        reliefFailed = true;
        syncReliefChrome();
        restyleCountries();
        renderOccupationZones();
      }
    });
    reliefLayer.on('tileload', function () {
      consecutiveErrors = 0;
      reliefLoadedOnce = true;
      if (reliefFailed) {
        reliefFailed = false;
        restyleCountries();
        renderOccupationZones();
      }
      syncReliefChrome();
    });
    if (store.state.layers.relief) {
      reliefLayer.addTo(map);
    }
    syncReliefChrome();

    // 2. Offline Cartographic Graticule
    var graticuleGroup = L.layerGroup().addTo(map);
    function buildGraticule() {
      var lat, lon;
      for (lat = -60; lat <= 75; lat += 15) {
        L.polyline([[lat, -200], [lat, 200]], {
          pane: 'paneGraticule',
          color: lat === 0 ? 'rgba(148,163,184,0.22)' : 'rgba(148,163,184,0.10)',
          weight: lat === 0 ? 1.1 : 0.7,
          dashArray: lat === 0 ? null : '3 5',
          interactive: false
        }).addTo(graticuleGroup);
      }
      for (lon = -180; lon <= 180; lon += 15) {
        L.polyline([[-70, lon], [82, lon]], {
          pane: 'paneGraticule',
          color: lon === 0 ? 'rgba(148,163,184,0.20)' : 'rgba(148,163,184,0.10)',
          weight: lon === 0 ? 1.1 : 0.7,
          dashArray: lon === 0 ? null : '3 5',
          interactive: false
        }).addTo(graticuleGroup);
      }
    }
    buildGraticule();

    // 3. 1939 World Political Layer
    var countryLayersById = {};
    var countriesLayer = L.geoJSON(worldData.WORLD_1939, {
      pane: 'paneCountries',
      style: function (feature) {
        return computeCountryStyle(feature.properties.id);
      },
      onEachFeature: function (feature, layer) {
        var pid = feature.properties.id;
        countryLayersById[pid] = layer;
        layer.on('mouseover', function () {
          if (store.state.mode === 'tactical') return;
          layer.setStyle({ weight: 1.8, color: '#f8fafc' });
          var fid = store.getRegionFactionId(pid);
          var fmeta = store.getFactionMeta(fid);
          layer.bindTooltip(
            '<strong>' + feature.properties.nameRu + '</strong><br><span style="color:#cbd5e1">' + fmeta.shortLabel + '</span>',
            { sticky: true, className: 'ww2-tooltip' }
          ).openTooltip();
        });
        layer.on('mouseout', function () {
          layer.setStyle(computeCountryStyle(pid));
          layer.closeTooltip();
        });
        layer.on('click', function (ev) {
          if (store.state.mode === 'tactical') return;
          L.DomEvent.stopPropagation(ev);
          store.selectRegion(pid);
        });
      }
    }).addTo(map);

    function computeCountryStyle(regionId) {
      var fid = store.getRegionFactionId(regionId);
      var fmeta = store.getFactionMeta(fid);
      var isTac = store.state.mode === 'tactical';
      var isSelected = store.state.selectedRegionId === regionId && !isTac;
      var reliefOn = store.state.layers.relief && !reliefFailed;
      var baseOpacity = isTac ? (reliefOn ? 0.16 : 0.34) : (reliefOn ? 0.56 : fmeta.fillOpacity);
      return {
        color: isSelected ? '#fbbf24' : (isTac ? 'rgba(203,213,225,0.28)' : fmeta.border),
        weight: isSelected ? 2.2 : (isTac ? 0.75 : 0.9),
        opacity: isTac ? 0.45 : 0.75,
        fillColor: fmeta.color,
        fillOpacity: baseOpacity
      };
    }

    function restyleCountries() {
      var keys = Object.keys(countryLayersById);
      for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        countryLayersById[id].setStyle(computeCountryStyle(id));
      }
    }

    // 4. Occupation Zones Layer (land-clipped monthly overlays)
    var occupationGroup = L.layerGroup().addTo(map);
    function renderOccupationZones() {
      occupationGroup.clearLayers();
      if (store.state.mode === 'tactical' || !store.state.layers.frontlines) return;
      var m = store.getCurrentMonth();
      if (!m) return;
      var ym = m.month;
      var reliefOn = store.state.layers.relief && !reliefFailed;
      var occOp = reliefOn ? 0.56 : 0.85;

      function addZone(geomObj, factionId, label) {
        if (!geomObj) return;
        var fmeta = store.getFactionMeta(factionId);
        var layer = L.geoJSON({ type: 'Feature', properties: {}, geometry: geomObj }, {
          pane: 'paneOccupation',
          interactive: !!label,
          style: {
            color: fmeta.border,
            weight: 1.0,
            dashArray: '4 3',
            fillColor: fmeta.color,
            fillOpacity: occOp
          }
        });
        if (label) {
          layer.bindTooltip(label, { sticky: true, className: 'ww2-tooltip' });
        }
        layer.addTo(occupationGroup);
      }

      if (worldData.EAST_OCC_ZONES && worldData.EAST_OCC_ZONES[ym]) {
        addZone(worldData.EAST_OCC_ZONES[ym], 'axis_occupied', 'Территория под оккупацией стран Оси (' + m.label + ')');
      }
      if (worldData.SOVIET_1945_ZONES && worldData.SOVIET_1945_ZONES[ym]) {
        addZone(worldData.SOVIET_1945_ZONES[ym], 'ussr', 'Зона наступления Красной армии (' + m.label + ')');
      }
      if (worldData.CHINA_OCC_ZONES && ym < '1945-09') {
        var cz = ym >= '1944-05' ? worldData.CHINA_OCC_ZONES.ichigo : worldData.CHINA_OCC_ZONES.base;
        addZone(cz, 'axis_occupied', 'Территория Китая, оккупированная Японией');
      }
      if (worldData.ALLIED_OCC_ZONES) {
        if (ym === '1943-07') addZone(worldData.ALLIED_OCC_ZONES.sicily_1943_07, 'allies', 'Плацдарм союзников на Сицилии');
        if (ym === '1944-06') addZone(worldData.ALLIED_OCC_ZONES.normandy_1944_06, 'allies', 'Нормандский плацдарм (июнь 1944)');
        if (ym === '1944-07') addZone(worldData.ALLIED_OCC_ZONES.normandy_1944_07, 'allies', 'Расширение плацдарма в Нормандии');
        if (ym === '1945-02') addZone(worldData.ALLIED_OCC_ZONES.germany_1945_02, 'allies', 'Занятые союзниками районы Рейнланда');
        if (ym === '1945-03') addZone(worldData.ALLIED_OCC_ZONES.germany_1945_03, 'allies', 'Плацдармы союзников за Рейном');
        if (ym === '1945-04') addZone(worldData.ALLIED_OCC_ZONES.germany_1945_04, 'allies', 'Западная зона наступления союзников (к Эльбе)');
      }
    }

    // 5. Offline Major Rivers Layer
    var riversLayer = L.geoJSON(worldData.RIVERS, {
      pane: 'paneRivers',
      interactive: false,
      style: {
        color: '#5796cf',
        weight: 1.25,
        opacity: 0.72
      }
    });
    if (store.state.layers.rivers) {
      riversLayer.addTo(map);
    }

    // 6. Animated Frontlines Layer
    var frontlinesGroup = L.layerGroup().addTo(map);
    function renderFrontlines() {
      frontlinesGroup.clearLayers();
      if (store.state.mode === 'tactical' || !store.state.layers.frontlines) return;
      var m = store.getCurrentMonth();
      if (!m || !m.frontlines) return;

      for (var i = 0; i < m.frontlines.length; i++) {
        var fl = m.frontlines[i];
        var flColor = fl.style === 'ussr' ? '#ef4444' : fl.style === 'allies' ? '#38bdf8' : '#f59e0b';
        var glow = L.polyline(fl.coords, {
          pane: 'paneFrontlines',
          color: flColor,
          weight: 6,
          opacity: 0.22,
          interactive: false
        }).addTo(frontlinesGroup);
        void glow;

        var line = L.polyline(fl.coords, {
          pane: 'paneFrontlines',
          color: flColor,
          weight: 2.8,
          opacity: 0.95,
          className: 'ww2-frontline ww2-frontline--' + fl.style
        }).addTo(frontlinesGroup);

        line.bindTooltip('<strong>' + fl.theater + '</strong><br>' + fl.label, {
          sticky: true,
          className: 'ww2-tooltip'
        });
      }
    }

    // 7. Global Battle Markers Layer
    var battlesGroup = L.layerGroup().addTo(map);
    function renderBattleMarkers() {
      battlesGroup.clearLayers();
      if (store.state.mode === 'tactical') return;
      var active = store.getActiveBattles();
      for (var i = 0; i < active.length; i++) {
        (function (b) {
          var isSelected = store.state.selectedBattleId === b.id;
          var isTac = !!b.hasTactical;
          var cls = 'battle-pin' +
            (isTac ? ' battle-pin--tactical' : ' battle-pin--standard') +
            (isSelected ? ' is-selected' : '') +
            ' battle-pin--' + b.theater;
          var html = '<div class="' + cls + '" data-battle-id="' + b.id + '">' +
                     '<span class="battle-pin-core">' + (isTac ? '★' : '⚔') + '</span>' +
                     (isTac ? '<span class="battle-pin-tag">' + shortBattleTag(b.title) + '</span>' : '') +
                     '</div>';
          var icon = L.divIcon({
            className: 'battle-marker-wrap',
            iconSize: isTac ? [34, 34] : [26, 26],
            iconAnchor: isTac ? [17, 17] : [13, 13],
            html: html
          });
          var marker = L.marker([b.lat, b.lon], {
            icon: icon,
            pane: 'paneBattles',
            zIndexOffset: isSelected ? 1000 : (isTac ? 600 : 300)
          }).addTo(battlesGroup);

          marker.bindTooltip(
            '<strong>' + b.title + '</strong><br>' +
            '<span style="color:#cbd5e1">' + b.dates + ' · ' + b.theaterRu + '</span>' +
            (isTac ? '<br><span style="color:#fbbf24">★ Доступен детальный тактический режим</span>' : ''),
            { direction: 'top', offset: [0, -12], className: 'ww2-tooltip' }
          );

          marker.on('click', function (ev) {
            L.DomEvent.stopPropagation(ev);
            store.selectBattle(b.id);
          });
        })(active[i]);
      }
    }

    function shortBattleTag(title) {
      if (title.indexOf('Москву') !== -1) return 'Москва';
      if (title.indexOf('Сталинград') !== -1) return 'Сталинград';
      if (title.indexOf('Курск') !== -1) return 'Курск';
      if (title.indexOf('Мидуэй') !== -1) return 'Мидуэй';
      if (title.indexOf('Норманд') !== -1) return 'Нормандия';
      if (title.indexOf('Берлин') !== -1) return 'Берлин';
      return title.slice(0, 12);
    }

    // 8. Tactical Layer Group
    var tacticalGroup = L.layerGroup().addTo(map);
    var tacticalEngine = tacticalEngineFactory.createTacticalEngine(map, tacticalGroup);

    var savedGlobalView = { center: [34, 22], zoom: 3 };
    var prevMode = 'global';
    var prevTacticalId = null;
    var prevTacticalViewKey = null;

    function getUnobstructedCenterOffsetPx() {
      var size = map.getSize();
      var w = (size && size.x) || window.innerWidth;
      var h = (size && size.y) || window.innerHeight;
      var hud = document.querySelector('.hud-top');
      var sb = document.getElementById('sidebar-panel');
      var globalBar = document.getElementById('global-timeline-bar');
      var tacBar = document.getElementById('tactical-timeline-bar');

      var topPad = hud ? (hud.getBoundingClientRect().bottom + 8) : 96;
      var botEl = (tacBar && !tacBar.classList.contains('is-hidden')) ? tacBar : globalBar;
      var botPad = botEl ? Math.max(80, h - botEl.getBoundingClientRect().top + 8) : 105;
      var leftPad = 56;
      var rightPad = 16;
      if (sb && !sb.classList.contains('is-collapsed')) {
        var sbWidth = sb.offsetWidth;
        if (sbWidth > 0 && sbWidth < w * 0.65) {
          var sbRight = parseFloat(window.getComputedStyle(sb).right);
          if (isNaN(sbRight)) sbRight = 12;
          rightPad = Math.max(16, sbWidth + sbRight + 12);
        }
      }
      var visCenterX = leftPad + Math.max(0, w - leftPad - rightPad) / 2;
      var visCenterY = topPad + Math.max(0, h - topPad - botPad) / 2;
      return L.point(visCenterX - w / 2, visCenterY - h / 2);
    }

    function flyToUnobstructed(lat, lon, zoom, duration) {
      var z = zoom;
      var targetPt = map.project([lat, lon], z);
      var offset = getUnobstructedCenterOffsetPx();
      var compCenter = map.unproject(targetPt.subtract(offset), z);
      map.flyTo(compCenter, z, { duration: duration || 0.9, easeLinearity: 0.25 });
    }

    map.on('click', function () {
      if (store.state.mode === 'tactical') {
        if (store.state.selectedUnitId) {
          store.selectUnit(null);
        }
      } else {
        if (store.state.selectedBattleId || store.state.selectedRegionId) {
          store.clearSelection();
        }
      }
    });

    function sync(reason) {
      // Relief layer toggle
      if (reason === 'layer:relief') {
        if (store.state.layers.relief) {
          consecutiveErrors = 0;
          if (!map.hasLayer(reliefLayer)) reliefLayer.addTo(map);
        } else {
          if (map.hasLayer(reliefLayer)) map.removeLayer(reliefLayer);
        }
        syncReliefChrome();
        restyleCountries();
        renderOccupationZones();
        return;
      }

      if (reason === 'layer:rivers') {
        if (store.state.layers.rivers) {
          if (!map.hasLayer(riversLayer)) riversLayer.addTo(map);
        } else {
          if (map.hasLayer(riversLayer)) map.removeLayer(riversLayer);
        }
        return;
      }

      if (reason === 'layer:frontlines') {
        renderOccupationZones();
        renderFrontlines();
        return;
      }

      if (store.state.mode === 'tactical') {
        var tac = store.getActiveTactical();
        var phase = store.getCurrentTacticalPhase();
        if (prevMode !== 'tactical') {
          savedGlobalView = { center: map.getCenter(), zoom: map.getZoom() };
        }
        if (tac) {
          var targetCenter = (phase && phase.center) ? phase.center : tac.center;
          var targetZoom = (phase && phase.zoom) ? phase.zoom : tac.zoom;
          var viewKey = tac.id + '|' + targetCenter[0] + ',' + targetCenter[1] + '@' + targetZoom;
          if (prevMode !== 'tactical' || prevTacticalId !== tac.id || prevTacticalViewKey !== viewKey) {
            flyToUnobstructed(targetCenter[0], targetCenter[1], targetZoom, prevTacticalId === tac.id ? 0.75 : 1.0);
            prevTacticalId = tac.id;
            prevTacticalViewKey = viewKey;
          }
        }
        prevMode = 'tactical';
        restyleCountries();
        occupationGroup.clearLayers();
        frontlinesGroup.clearLayers();
        battlesGroup.clearLayers();
        tacticalEngine.render(tac, phase, store.state.selectedUnitId, function (unit) {
          store.selectUnit(unit.id);
        });
      } else {
        var wasTactical = prevMode === 'tactical';
        if (wasTactical) {
          tacticalEngine.clear();
          if (reason !== 'jumpToBattle') {
            map.flyTo(savedGlobalView.center, savedGlobalView.zoom, { duration: 0.9, easeLinearity: 0.25 });
          }
        }
        prevMode = 'global';
        prevTacticalId = null;
        prevTacticalViewKey = null;
        restyleCountries();
        renderOccupationZones();
        renderFrontlines();
        renderBattleMarkers();
        if (reason === 'jumpToBattle') {
          var jb = store.getSelectedBattle();
          if (jb) {
            var baseZoom = wasTactical ? savedGlobalView.zoom : map.getZoom();
            var targetZoom = Math.max(baseZoom, jb.theater === 'pacific' ? 4 : 5);
            flyToUnobstructed(jb.lat, jb.lon, targetZoom, 0.9);
          }
        }
      }
    }

    // Initial render
    sync('init');

    return {
      map: map,
      sync: sync,
      flyToPoint: function (lat, lon, zoom) {
        flyToUnobstructed(lat, lon, zoom || 5, 0.85);
      },
      isReliefAvailable: function () {
        return !reliefFailed;
      }
    };
  }

  var payload = { createMapEngine: createMapEngine };
  if (typeof module !== 'undefined' && module.exports) { module.exports = payload; }
  root.WW2_MAP_ENGINE = payload;
})(typeof window !== 'undefined' ? window : globalThis);
