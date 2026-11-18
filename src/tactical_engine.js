// Tactical battle map layer renderer: pockets, frontlines, directional arrows, landmarks, clickable units
(function (root) {
  function createTacticalEngine(map, layerGroup) {
    var L = root.L;

    var ARROW_STYLES = {
      ussr_attack: { color: '#ef4444', weight: 4.5, dashArray: null },
      allies_attack: { color: '#38bdf8', weight: 4.5, dashArray: null },
      axis_attack: { color: '#f59e0b', weight: 4.5, dashArray: null },
      air_strike: { color: '#facc15', weight: 3.5, dashArray: '8 6' },
      amphibious: { color: '#2dd4bf', weight: 4, dashArray: '10 6' },
      airborne: { color: '#c084fc', weight: 3.5, dashArray: '5 6' },
      retreat: { color: '#94a3b8', weight: 3.2, dashArray: '6 6' }
    };

    var UNIT_GLYPHS = {
      armor: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="8" width="16" height="8" rx="4"/></svg>',
      infantry: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="6" x2="20" y2="18"/><line x1="20" y1="6" x2="4" y2="18"/></svg>',
      naval: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v14M7 9h10M5 14c0 3.5 3.1 6 7 6s7-2.5 7-6"/></svg>',
      air: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12l8-2 2-6 2 6 8 2-8 2-2 6-2-6z"/></svg>',
      airborne: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 11a8 8 0 0 1 16 0Z"/><path d="M4 11l8 8 8-8"/></svg>'
    };

    function computeScreenAngleDeg(p1, p2) {
      var pt1 = map.latLngToLayerPoint([p1[0], p1[1]]);
      var pt2 = map.latLngToLayerPoint([p2[0], p2[1]]);
      return Math.atan2(pt2.y - pt1.y, pt2.x - pt1.x) * (180 / Math.PI);
    }

    function shortUnitLabel(unit) {
      if (unit && unit.shortName) return unit.shortName;
      var name = unit && unit.name ? unit.name : '';
      if (!name) return '';
      var idx = name.indexOf('(');
      var base = idx > 4 ? name.slice(0, idx).trim() : name;
      base = base
        .replace(/гвардейская танковая армия/gi, 'гв. ТА')
        .replace(/гвардейские танковые армии/gi, 'гв. ТА')
        .replace(/гвардейская армия/gi, 'гв. А')
        .replace(/танковая группа/gi, 'ТГр')
        .replace(/танковая армия/gi, 'ТА')
        .replace(/ударная армия/gi, 'уд. А')
        .replace(/танковый корпус/gi, 'ТК')
        .replace(/Оперативное соединение/gi, 'Соед.')
        .replace(/воздушно-десантные дивизии/gi, 'ВДД');
      return base.length > 32 ? base.slice(0, 30) + '…' : base;
    }

    var currentArrowHeads = [];
    var currentTac = null;
    var currentPhase = null;
    var currentSelectedUnitId = null;
    var currentOnUnitClick = null;

    function rebuildArrowHeads() {
      for (var i = 0; i < currentArrowHeads.length; i++) {
        layerGroup.removeLayer(currentArrowHeads[i]);
      }
      currentArrowHeads = [];
      if (!currentPhase || !currentPhase.arrows) return;

      for (var j = 0; j < currentPhase.arrows.length; j++) {
        var arr = currentPhase.arrows[j];
        if (!arr.coords || arr.coords.length < 2) continue;
        var st = ARROW_STYLES[arr.type] || ARROW_STYLES.axis_attack;
        var n = arr.coords.length;
        var angle = computeScreenAngleDeg(arr.coords[n - 2], arr.coords[n - 1]);
        var tip = arr.coords[n - 1];
        var icon = L.divIcon({
          className: 'tac-arrowhead-wrap',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
          html: '<div class="tac-arrowhead" style="transform:rotate(' + angle.toFixed(1) + 'deg);color:' + st.color + ';">' +
                '<svg viewBox="0 0 20 20" width="20" height="20"><polygon points="2,3 19,10 2,17 6,10" fill="currentColor" stroke="#0b101b" stroke-width="1"/></svg></div>'
        });
        var headMarker = L.marker([tip[0], tip[1]], {
          icon: icon,
          pane: 'paneTactical',
          interactive: false
        }).addTo(layerGroup);
        currentArrowHeads.push(headMarker);
      }
    }

    map.on('zoomend', function () {
      if (currentPhase) rebuildArrowHeads();
    });

    function clear() {
      currentTac = null;
      currentPhase = null;
      currentArrowHeads = [];
      layerGroup.clearLayers();
    }

    function render(tac, phase, selectedUnitId, onUnitClick) {
      layerGroup.clearLayers();
      currentArrowHeads = [];
      currentTac = tac;
      currentPhase = phase;
      currentSelectedUnitId = selectedUnitId;
      currentOnUnitClick = onUnitClick;

      if (!tac || !phase) return;

      // 1. Pockets (encirclements)
      if (phase.pockets) {
        for (var p = 0; p < phase.pockets.length; p++) {
          var pk = phase.pockets[p];
          var pkColor = pk.side === 'axis' ? '#991b1b' : '#1e40af';
          var poly = L.polygon(pk.coords, {
            pane: 'paneTactical',
            color: '#fca5a5',
            weight: 2,
            dashArray: '6 4',
            fillColor: pkColor,
            fillOpacity: 0.32
          }).addTo(layerGroup);
          poly.bindTooltip(pk.label, { sticky: true, className: 'ww2-tooltip' });
        }
      }

      // 2. Local Frontlines
      if (phase.frontlines) {
        for (var f = 0; f < phase.frontlines.length; f++) {
          var fl = phase.frontlines[f];
          var flColor = fl.style === 'ussr' ? '#ef4444' : fl.style === 'allies' ? '#38bdf8' : '#f59e0b';
          var line = L.polyline(fl.coords, {
            pane: 'paneTactical',
            color: flColor,
            weight: 4,
            opacity: 0.9,
            className: 'ww2-frontline ww2-frontline--tactical'
          }).addTo(layerGroup);
          if (fl.label) line.bindTooltip(fl.label, { sticky: true, className: 'ww2-tooltip' });
        }
      }

      // 3. Operational Strike Arrows
      if (phase.arrows) {
        for (var a = 0; a < phase.arrows.length; a++) {
          var arr = phase.arrows[a];
          var st = ARROW_STYLES[arr.type] || ARROW_STYLES.axis_attack;
          var arrowLine = L.polyline(arr.coords, {
            pane: 'paneTactical',
            color: st.color,
            weight: st.weight,
            opacity: 0.92,
            dashArray: st.dashArray,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(layerGroup);
          if (arr.label) arrowLine.bindTooltip(arr.label, { sticky: true, className: 'ww2-tooltip' });
        }
        rebuildArrowHeads();
      }

      // 4. Landmarks (cities, forts, beaches) — supports phase overrides & labelPos
      var landmarks = (phase.landmarks && phase.landmarks.length) ? phase.landmarks : tac.landmarks;
      if (landmarks) {
        for (var l = 0; l < landmarks.length; l++) {
          var lm = landmarks[l];
          var lmPos = lm.labelPos || 'right';
          var lmIcon = L.divIcon({
            className: 'tac-landmark-wrap',
            iconSize: [14, 14],
            iconAnchor: [7, 7],
            html: '<div class="tac-landmark tac-landmark--' + (lm.kind || 'city') + '"></div>' +
                  '<div class="tac-landmark-label tac-pos--' + lmPos + '">' + lm.name + '</div>'
          });
          L.marker([lm.lat, lm.lon], {
            icon: lmIcon,
            pane: 'paneTactical',
            interactive: false
          }).addTo(layerGroup);
        }
      }

      // 5. Clickable Military Units / Fleets
      if (phase.units) {
        for (var u = 0; u < phase.units.length; u++) {
          (function (unit) {
            var isSelected = unit.id === selectedUnitId;
            var glyph = UNIT_GLYPHS[unit.kind] || UNIT_GLYPHS.infantry;
            var sideClass = 'tac-unit--' + (unit.side || 'axis');
            var selClass = isSelected ? ' is-selected' : '';
            var uPos = unit.labelPos || 'bottom';
            var uIcon = L.divIcon({
              className: 'tac-unit-marker',
              iconSize: [34, 24],
              iconAnchor: [17, 12],
              html: '<div class="tac-unit-card ' + sideClass + selClass + '" data-unit-id="' + unit.id + '">' +
                    '<span class="tac-unit-glyph">' + glyph + '</span>' +
                    '</div>' +
                    '<div class="tac-unit-caption tac-unit-pos--' + uPos + ' ' + sideClass + selClass + '">' + shortUnitLabel(unit) + '</div>'
            });
            var m = L.marker([unit.lat, unit.lon], {
              icon: uIcon,
              pane: 'paneTactical',
              zIndexOffset: isSelected ? 900 : 500
            }).addTo(layerGroup);
            m.bindTooltip('<strong>' + unit.name + '</strong><br>Командующий: ' + unit.commander, {
              direction: 'top',
              offset: [0, -14],
              className: 'ww2-tooltip'
            });
            m.on('click', function (ev) {
              L.DomEvent.stopPropagation(ev);
              if (onUnitClick) onUnitClick(unit);
            });
          })(phase.units[u]);
        }
      }
    }

    return {
      render: render,
      clear: clear
    };
  }

  var payload = { createTacticalEngine: createTacticalEngine };
  if (typeof module !== 'undefined' && module.exports) { module.exports = payload; }
  root.WW2_TACTICAL_ENGINE = payload;
})(typeof window !== 'undefined' ? window : globalThis);
