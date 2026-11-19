// Leaflet Hybrid Map Engine: offline 1939 political map, clipped monthly occupation zones,
// rivers, cities (always-visible capitals/major cities + conflict cities), optional relief, battle pins & tactical flyTo
(function (root) {
  function createMapEngine(containerId, store, callbacks) {
    var L = root.L;
    var worldData = root.WW2_WORLD_DATA;
    var citiesData = (root.WW2_CITIES && root.WW2_CITIES.ALWAYS_VISIBLE_CITIES) || [];
    var tacticalEngineFactory = root.WW2_TACTICAL_ENGINE;

    var map = L.map(containerId, {
      center: [34, 22],
      zoom: 3,
      minZoom: 2,
      maxZoom: 13,
      renderer: L.svg({ padding: 0.6 }),
      zoomControl: false,
      worldCopyJump: false,
      maxBounds: [[-72, -215], [84, 215]],
      maxBoundsViscosity: 0.75,
      attributionControl: true
    });

    map.attributionControl.setPrefix(false);
    L.control.zoom({ position: 'topleft' }).addTo(map);

    // Z-ordered custom panes + padded SVG renderers so panning never clips edges
    var paneRelief = map.createPane('paneRelief');
    paneRelief.style.zIndex = 150;
    paneRelief.style.filter = 'brightness(0.76)';
    map.createPane('paneGraticule').style.zIndex = 180;
    map.createPane('paneCountries').style.zIndex = 240;
    map.createPane('paneOccupation').style.zIndex = 270;
    map.createPane('paneRivers').style.zIndex = 310;
    map.createPane('paneCities').style.zIndex = 390;
    map.createPane('paneTactical').style.zIndex = 420;
    map.createPane('paneBattles').style.zIndex = 470;

    var svgGraticule = L.svg({ pane: 'paneGraticule', padding: 0.6 });
    var svgCountries = L.svg({ pane: 'paneCountries', padding: 0.6 });
    var svgOccupation = L.svg({ pane: 'paneOccupation', padding: 0.6 });
    var svgRivers = L.svg({ pane: 'paneRivers', padding: 0.6 });

    // 1. Optional Borderless Physical Relief Layer (Esri World_Shaded_Relief — ZERO modern political borders)
    var RELIEF_ATTR = 'Рельеф: Esri World Shaded Relief (без совр. границ)';
    var reliefAttrShown = false;
    var reliefLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
      {
        pane: 'paneRelief',
        maxZoom: 13,
        maxNativeZoom: 13,
        opacity: 1,
        keepBuffer: 6,
        updateWhenIdle: false,
        updateInterval: 100,
        attribution: ''
      }
    );
    var reliefFailed = false;
    var reliefLoadedOnce = false;
    var consecutiveErrors = 0;

    // Pre-fetch 1 tile ring (256px) outside the visible viewport so panning lands on loaded tiles
    var baseGetTiledPixelBounds = L.TileLayer.prototype._getTiledPixelBounds;
    reliefLayer._getTiledPixelBounds = function (center) {
      var b = baseGetTiledPixelBounds.call(this, center);
      if (reliefFailed) return b;
      return L.bounds(b.min.subtract([256, 256]), b.max.add([256, 256]));
    };

    var mapEl = map.getContainer();

    function syncReliefChrome() {
      var shouldShowAttr = store.state.layers.relief && reliefLoadedOnce && !reliefFailed;
      if (mapEl) {
        mapEl.classList.toggle('is-relief-online', shouldShowAttr);
      }
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
          renderer: svgGraticule,
          color: lat === 0 ? 'rgba(148,163,184,0.22)' : 'rgba(148,163,184,0.10)',
          weight: lat === 0 ? 1.1 : 0.7,
          dashArray: lat === 0 ? null : '3 5',
          interactive: false
        }).addTo(graticuleGroup);
      }
      for (lon = -180; lon <= 180; lon += 15) {
        L.polyline([[-70, lon], [82, lon]], {
          pane: 'paneGraticule',
          renderer: svgGraticule,
          color: lon === 0 ? 'rgba(148,163,184,0.20)' : 'rgba(148,163,184,0.10)',
          weight: lon === 0 ? 1.1 : 0.7,
          dashArray: lon === 0 ? null : '3 5',
          interactive: false
        }).addTo(graticuleGroup);
      }
    }
    buildGraticule();

    function escHtml(str) {
      return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function blurMapFocus(ev) {
      if (ev && ev.originalEvent && ev.originalEvent.target && typeof ev.originalEvent.target.blur === 'function') {
        ev.originalEvent.target.blur();
      }
      if (typeof document !== 'undefined' && document.activeElement &&
          document.activeElement.closest && document.activeElement.closest('.leaflet-container') &&
          typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
    }

    // 3. 1939 World Political Layer
    var countryLayersById = {};
    var countriesLayer = L.geoJSON(worldData.WORLD_1939, {
      pane: 'paneCountries',
      renderer: svgCountries,
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
          blurMapFocus(ev);
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
          renderer: svgOccupation,
          interactive: !!label,
          style: {
            color: fmeta.border,
            weight: 0.9,
            opacity: 0.72,
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
      renderer: svgRivers,
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

    // 6. Cities Layer (always-visible capitals & key cities + selected conflict cities)
    var citiesGroup = L.layerGroup().addTo(map);
    var measureCtx = null;

    function normalizeCityName(name) {
      return String(name || '').toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim();
    }

    function measureLabelSize(text, isConflict, isCapital) {
      if (!measureCtx && typeof document !== 'undefined') {
        var c = document.createElement('canvas');
        if (c && c.getContext) measureCtx = c.getContext('2d');
      }
      var textW;
      if (measureCtx) {
        measureCtx.font = isConflict
          ? '700 10.5px "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif'
          : (isCapital
            ? '700 10px "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif'
            : '600 9.5px "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif');
        textW = Math.ceil(measureCtx.measureText(text).width);
      } else {
        textW = Math.ceil((isConflict ? 7.0 : 6.2) * text.length);
      }
      return {
        w: textW + (isConflict ? 16 : 6),
        h: isConflict ? 19 : (isCapital ? 15 : 14)
      };
    }

    function boxesOverlap(a, b, pad) {
      var p = pad == null ? 2 : pad;
      return !(a[2] + p <= b[0] || a[0] - p >= b[2] || a[3] + p <= b[1] || a[1] - p >= b[3]);
    }

    function overlapArea(a, b) {
      var xOverlap = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0]));
      var yOverlap = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
      return xOverlap * yOverlap;
    }

    function makeCityPlacement(pt, pos, dist, w, h) {
      var d = Math.max(5, Math.round(dist * 0.74));
      if (pos === 'left') {
        return {
          box: [pt.x - dist - w, pt.y - h / 2, pt.x - dist, pt.y + h / 2],
          css: 'right:' + (7 + dist) + 'px;top:50%;transform:translateY(-50%);'
        };
      }
      if (pos === 'top') {
        return {
          box: [pt.x - w / 2, pt.y - dist - h, pt.x + w / 2, pt.y - dist],
          css: 'bottom:' + (7 + dist) + 'px;left:50%;transform:translateX(-50%);'
        };
      }
      if (pos === 'bottom') {
        return {
          box: [pt.x - w / 2, pt.y + dist, pt.x + w / 2, pt.y + dist + h],
          css: 'top:' + (7 + dist) + 'px;left:50%;transform:translateX(-50%);'
        };
      }
      if (pos === 'top-right') {
        return {
          box: [pt.x + d, pt.y - d - h, pt.x + d + w, pt.y - d],
          css: 'left:' + (7 + d) + 'px;bottom:' + (7 + d) + 'px;'
        };
      }
      if (pos === 'top-left') {
        return {
          box: [pt.x - d - w, pt.y - d - h, pt.x - d, pt.y - d],
          css: 'right:' + (7 + d) + 'px;bottom:' + (7 + d) + 'px;'
        };
      }
      if (pos === 'bottom-right') {
        return {
          box: [pt.x + d, pt.y + d, pt.x + d + w, pt.y + d + h],
          css: 'left:' + (7 + d) + 'px;top:' + (7 + d) + 'px;'
        };
      }
      if (pos === 'bottom-left') {
        return {
          box: [pt.x - d - w, pt.y + d, pt.x - d, pt.y + d + h],
          css: 'right:' + (7 + d) + 'px;top:' + (7 + d) + 'px;'
        };
      }
      return {
        box: [pt.x + dist, pt.y - h / 2, pt.x + dist + w, pt.y + h / 2],
        css: 'left:' + (7 + dist) + 'px;top:50%;transform:translateY(-50%);'
      };
    }

    function renderCities() {
      citiesGroup.clearLayers();
      if (store.state.mode === 'tactical') return;

      var z = map.getZoom();
      var selectedBattle = store.getSelectedBattle();
      var merged = [];
      for (var i = 0; i < citiesData.length; i++) {
        var c = citiesData[i];
        merged.push({
          id: c.id,
          name: c.name,
          countryId: c.countryId,
          countryRu: c.countryRu,
          lat: c.lat,
          lon: c.lon,
          isCapital: !!c.isCapital,
          tier: c.tier || 3,
          labelPos: c.labelPos || 'right',
          isAlways: true,
          isConflict: false
        });
      }

      if (selectedBattle && Array.isArray(selectedBattle.cities)) {
        for (var j = 0; j < selectedBattle.cities.length; j++) {
          var cc = selectedBattle.cities[j];
          var ccNorm = normalizeCityName(cc.name);
          var match = null;
          for (var k = 0; k < merged.length; k++) {
            var m = merged[k];
            if (normalizeCityName(m.name) === ccNorm ||
                (Math.abs(m.lat - cc.lat) < 0.08 && Math.abs(m.lon - cc.lon) < 0.08)) {
              match = m;
              break;
            }
          }
          if (match) {
            match.isConflict = true;
            if (cc.labelPos) match.labelPos = cc.labelPos;
            if (cc.name && cc.name.length > match.name.length && cc.name.indexOf('(') !== -1) {
              match.conflictLabel = cc.name;
            }
          } else {
            merged.push({
              id: 'conflict_' + selectedBattle.id + '_' + j,
              name: cc.name,
              countryId: null,
              countryRu: '',
              lat: cc.lat,
              lon: cc.lon,
              isCapital: false,
              tier: 0,
              labelPos: cc.labelPos || 'right',
              isAlways: false,
              isConflict: true
            });
          }
        }
      }

      // Priority order: 0 = conflict city, 1 = major capital, 2 = major key city, 3 = other capital
      merged.sort(function (a, b) {
        var pa = a.isConflict ? 0 : a.tier;
        var pb = b.isConflict ? 0 : b.tier;
        return pa - pb;
      });

      // Obstacles from active battle markers and tactical tags (including selected scale 1.22x)
      var activeBattles = store.getActiveBattles();
      var battlePts = [];
      var obstacleBoxes = [];
      for (var bi = 0; bi < activeBattles.length; bi++) {
        var b = activeBattles[bi];
        var bp = map.project([b.lat, b.lon], z);
        var isSelPin = store.state.selectedBattleId === b.id;
        var baseRad = b.hasTactical ? 16 : 12;
        var rad = isSelPin ? Math.ceil(baseRad * 1.22) + 2 : (baseRad + 2);
        battlePts.push({ x: bp.x, y: bp.y, rad: rad });
        obstacleBoxes.push([bp.x - rad, bp.y - rad, bp.x + rad, bp.y + rad]);
        if (b.hasTactical && !isSelPin) {
          obstacleBoxes.push([bp.x - 38, bp.y + 16, bp.x + 38, bp.y + 35]);
        }
      }

      // Pre-compute projected coordinates & reserve ALL city dots before placing ANY labels
      var dotBoxes = [];
      for (var di = 0; di < merged.length; di++) {
        var dCity = merged[di];
        var dPt = map.project([dCity.lat, dCity.lon], z);
        dCity._pt = dPt;
        var dotR = dCity.isConflict ? 6 : 4;
        dotBoxes.push([dPt.x - dotR, dPt.y - dotR, dPt.x + dotR, dPt.y + dotR]);
      }

      var placedLabels = [];
      var DIR_ORDER = ['right', 'left', 'top', 'bottom', 'top-right', 'top-left', 'bottom-right', 'bottom-left'];

      for (var ci = 0; ci < merged.length; ci++) {
        var city = merged[ci];
        var pt = city._pt;

        var nearPin = false;
        for (var bpi = 0; bpi < battlePts.length; bpi++) {
          var dx = pt.x - battlePts[bpi].x;
          var dy = pt.y - battlePts[bpi].y;
          if (Math.sqrt(dx * dx + dy * dy) < battlePts[bpi].rad + 6) {
            nearPin = true;
            break;
          }
        }

        var displayName = city.conflictLabel || city.name;
        var sz = measureLabelSize(displayName, city.isConflict, city.isCapital);
        var w = sz.w;
        var h = sz.h;

        var candidates = [city.labelPos || 'right'].concat(DIR_ORDER);
        var uniqDirs = [];
        var seenPos = {};
        for (var ui = 0; ui < candidates.length; ui++) {
          if (!seenPos[candidates[ui]]) {
            seenPos[candidates[ui]] = true;
            uniqDirs.push(candidates[ui]);
          }
        }

        var rings;
        if (city.isConflict) {
          rings = [9, 16, 24, 32, 42, 54, 68, 84, 102];
        } else if (city.tier <= 2 && z >= 3) {
          rings = [6, 10, 14, 18, 23, 29, 36, 44, 54, 66, 80];
        } else if (nearPin && z >= 3) {
          rings = [6, 21, 27];
        } else {
          rings = [6];
        }

        var chosen = null;
        var chosenDist = 0;
        var bestFallback = null;
        var bestFallbackDist = rings[0];
        var minOverlap = Infinity;

        for (var ri2 = 0; ri2 < rings.length && !chosen; ri2++) {
          var dist = rings[ri2];
          for (var pi = 0; pi < uniqDirs.length; pi++) {
            var pos = uniqDirs[pi];
            var cand = makeCityPlacement(pt, pos, dist, w, h);
            var box = cand.box;
            var hits = false;
            var area = 0;

            for (var ob = 0; ob < obstacleBoxes.length; ob++) {
              if (boxesOverlap(box, obstacleBoxes[ob], 2)) {
                hits = true;
                area += overlapArea(box, obstacleBoxes[ob]);
              }
            }
            for (var db = 0; db < dotBoxes.length; db++) {
              if (db === ci) continue;
              if (boxesOverlap(box, dotBoxes[db], 2)) {
                hits = true;
                area += overlapArea(box, dotBoxes[db]) + 40;
              }
            }
            for (var lb = 0; lb < placedLabels.length; lb++) {
              if (boxesOverlap(box, placedLabels[lb], 2)) {
                hits = true;
                area += overlapArea(box, placedLabels[lb]);
              }
            }

            if (!hits) {
              chosen = cand;
              chosenDist = dist;
              break;
            }
            if (area < minOverlap) {
              minOverlap = area;
              bestFallback = cand;
              bestFallbackDist = dist;
            }
          }
        }

        var showLabel = false;
        var finalPlacement = null;
        var finalDist = 0;
        if (chosen) {
          showLabel = true;
          finalPlacement = chosen;
          finalDist = chosenDist;
        } else if (city.isConflict) {
          showLabel = true;
          finalPlacement = bestFallback;
          finalDist = bestFallbackDist;
        }

        if (showLabel && finalPlacement) {
          placedLabels.push(finalPlacement.box);
        }

        city._showLabel = showLabel;
        city._labelCss = finalPlacement ? finalPlacement.css : '';
        city._labelBox = finalPlacement ? finalPlacement.box : null;
        city._labelDist = finalDist;
        city._displayName = displayName;
        city._nearPin = nearPin;
      }

      for (var ri = 0; ri < merged.length; ri++) {
        (function (city) {
          var kindClass = city.isConflict
            ? 'city-pin--conflict'
            : (city.isCapital ? 'city-pin--capital' : 'city-pin--major');
          var pinClass = 'city-pin ' + kindClass + (city._nearPin ? ' is-near-pin' : '');
          var leaderHtml = '';
          if (city._showLabel && city._labelBox && city._labelDist >= 15) {
            var b = city._labelBox;
            var pt = city._pt;
            var ax = Math.max(b[0], Math.min(b[2], pt.x));
            var ay = Math.max(b[1], Math.min(b[3], pt.y));
            var ldx = ax - pt.x;
            var ldy = ay - pt.y;
            if (Math.sqrt(ldx * ldx + ldy * ldy) >= 13) {
              var strokeColor = city.isConflict ? 'rgba(251, 191, 36, 0.78)' : 'rgba(226, 232, 240, 0.45)';
              leaderHtml = '<svg class="city-leader" viewBox="0 0 14 14"><line x1="7" y1="7" x2="' +
                (7 + ldx).toFixed(1) + '" y2="' + (7 + ldy).toFixed(1) + '" stroke="' + strokeColor + '" stroke-width="1.2" /></svg>';
            }
          }
          var labelHtml = city._showLabel
            ? '<span class="city-label" style="' + city._labelCss + '">' + escHtml(city._displayName) + '</span>'
            : '';
          var icon = L.divIcon({
            className: 'city-marker-wrap',
            iconSize: [14, 14],
            iconAnchor: [7, 7],
            html: '<div class="' + pinClass + '" data-city-name="' + escHtml(city.name) + '" data-city-conflict="' + (city.isConflict ? '1' : '0') + '">' +
                  leaderHtml +
                  '<span class="city-dot"></span>' +
                  labelHtml +
                  '</div>'
          });
          var marker = L.marker([city.lat, city.lon], {
            icon: icon,
            pane: 'paneCities',
            zIndexOffset: city.isConflict ? 500 : (city.tier === 1 ? 250 : (city.tier === 2 ? 150 : 80))
          }).addTo(citiesGroup);

          var roleText = city.isConflict
            ? (city.isCapital ? 'Столица · Город конфликта' : 'Город конфликта')
            : (city.isCapital ? 'Столица' : 'Важный город');
          var subText = city.countryRu ? (city.countryRu + ' · ' + roleText) : roleText;
          marker.bindTooltip('<strong>' + escHtml(city._displayName) + '</strong><br><span style="color:#cbd5e1">' + escHtml(subText) + '</span>', {
            direction: 'top',
            offset: [0, -8],
            className: 'ww2-tooltip'
          });

          marker.on('click', function (ev) {
            L.DomEvent.stopPropagation(ev);
            blurMapFocus(ev);
            if (!city.isConflict && city.countryId) {
              store.selectRegion(city.countryId);
            }
          });
        })(merged[ri]);
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
                     (isTac && !isSelected ? '<span class="battle-pin-tag">' + shortBattleTag(b.title) + '</span>' : '') +
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
            blurMapFocus(ev);
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

    map.on('zoomend', function () {
      if (store.state.mode === 'global') {
        renderCities();
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
        citiesGroup.clearLayers();
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
        renderBattleMarkers();
        renderCities();
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
