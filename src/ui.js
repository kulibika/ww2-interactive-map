// UI Controller: HUD, timeline bars (global 73-month & tactical phases), sidebar cards, battle search & legend
(function (root) {
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var KIND_LABELS = {
    armor: 'Танковые / мех. войска',
    infantry: 'Общевойсковая армия / пехота',
    naval: 'Военно-морское соединение',
    air: 'Авиационная группа',
    airborne: 'Воздушно-десантные войска'
  };

  var SIDE_LABELS = {
    ussr: 'СССР (РККА)',
    allies: 'Союзники',
    axis: 'Страны Оси',
    china: 'Китайская Республика'
  };

  var MILESTONES = [
    { month: '1939-09', text: 'IX.39', major: true },
    { month: '1940-06', text: 'VI.40', major: false },
    { month: '1941-06', text: 'VI.41', major: true },
    { month: '1941-12', text: 'XII.41', major: false },
    { month: '1942-11', text: 'XI.42', major: true },
    { month: '1943-07', text: 'VII.43', major: false },
    { month: '1944-06', text: 'VI.44', major: true },
    { month: '1945-05', text: 'V.45', major: false },
    { month: '1945-09', text: 'IX.45', major: true }
  ];

  function createUI(store, mapEngine) {
    var worldFeaturesById = {};
    var worldFeatures = (root.WW2_WORLD_DATA && root.WW2_WORLD_DATA.WORLD_1939 && root.WW2_WORLD_DATA.WORLD_1939.features) || [];
    for (var i = 0; i < worldFeatures.length; i++) {
      worldFeaturesById[worldFeatures[i].properties.id] = worldFeatures[i].properties;
    }

    // DOM elements
    var elMonthLabel = document.getElementById('hud-month-label');
    var elPhaseTag = document.getElementById('hud-phase-tag');
    var elGlobalBar = document.getElementById('global-timeline-bar');
    var elTacticalBar = document.getElementById('tactical-timeline-bar');
    var elSlider = document.getElementById('global-slider');
    var elMilestones = document.getElementById('timeline-milestones');
    var elTickerText = document.getElementById('timeline-ticker-text');
    var elPlayGlobalBtn = document.getElementById('btn-play-global');
    var elSpeedBtn = document.getElementById('btn-speed-global');
    var elPrevMonthBtn = document.getElementById('btn-prev-month');
    var elNextMonthBtn = document.getElementById('btn-next-month');

    var elTacTitle = document.getElementById('tac-bar-title');
    var elTacSteps = document.getElementById('tac-phase-steps');
    var elTacPlayBtn = document.getElementById('btn-play-tactical');
    var elTacPrevBtn = document.getElementById('btn-prev-phase');
    var elTacNextBtn = document.getElementById('btn-next-phase');
    var elExitTacBtn = document.getElementById('btn-exit-tactical');

    var elSidebar = document.getElementById('sidebar-panel');
    var elSidebarBody = document.getElementById('sidebar-body');
    var elSidebarToggle = document.getElementById('btn-toggle-sidebar');

    var elTheaterBtns = document.querySelectorAll('[data-theater]');
    var elLayerRelief = document.getElementById('btn-layer-relief');
    var elLayerFronts = document.getElementById('btn-layer-frontlines');
    var elLayerRivers = document.getElementById('btn-layer-rivers');
    var elLegendBtn = document.getElementById('btn-toggle-legend');
    var elLegendBox = document.getElementById('legend-popover');
    var elLegendItems = document.getElementById('legend-items');

    var elSearchInput = document.getElementById('battle-search-input');
    var elSearchResults = document.getElementById('battle-search-results');
    var elTacQuickBtns = document.querySelectorAll('[data-jump-tac]');

    var elAppShell = document.getElementById('app-shell');
    var elHudTop = document.querySelector('.hud-top');

    function updateLayoutInsets() {
      if (!elAppShell || !elHudTop) return;
      var hudH = Math.ceil(elHudTop.getBoundingClientRect().height);
      var activeBar = store.state.mode === 'tactical' ? elTacticalBar : elGlobalBar;
      var barH = activeBar ? Math.ceil(activeBar.getBoundingClientRect().height) : 88;
      elAppShell.style.setProperty('--hud-top-offset', (hudH + 18) + 'px');
      elAppShell.style.setProperty('--bar-bottom-offset', (barH + 18) + 'px');
    }

    if (typeof ResizeObserver !== 'undefined') {
      var ro = new ResizeObserver(updateLayoutInsets);
      if (elHudTop) ro.observe(elHudTop);
      if (elGlobalBar) ro.observe(elGlobalBar);
      if (elTacticalBar) ro.observe(elTacticalBar);
    }
    window.addEventListener('resize', updateLayoutInsets);

    if (window.innerWidth <= 720 && elSidebar && !elSidebar.classList.contains('is-collapsed')) {
      elSidebar.classList.add('is-collapsed');
      elSidebarToggle.classList.remove('is-active');
      elSidebarToggle.textContent = '◀ Сводка';
    }

    // Build legend once
    function renderLegend() {
      var order = ['allies', 'ussr', 'ussr_prewar', 'china', 'axis', 'axis_occupied', 'vichy', 'allies_occupied', 'neutral'];
      var html = '';
      for (var k = 0; k < order.length; k++) {
        var fm = store.getFactionMeta(order[k]);
        html += '<div class="legend-row">' +
          '<span class="legend-swatch" style="background:' + fm.color + ';border-color:' + fm.border + '"></span>' +
          '<span class="legend-label">' + esc(fm.label) + '</span>' +
          '</div>';
      }
      html += '<div class="legend-divider"></div>' +
        '<div class="legend-row"><span class="legend-pin legend-pin--tac">★</span><span class="legend-label">Ключевая битва с тактическим режимом (6)</span></div>' +
        '<div class="legend-row"><span class="legend-pin legend-pin--std">⚔</span><span class="legend-label">Сражение месяца</span></div>' +
        '<div class="legend-row"><span class="legend-city-dot legend-city-dot--capital"></span><span class="legend-label">Столица государства</span></div>' +
        '<div class="legend-row"><span class="legend-city-dot legend-city-dot--major"></span><span class="legend-label">Важный город основной страны</span></div>' +
        '<div class="legend-row"><span class="legend-city-dot legend-city-dot--conflict"></span><span class="legend-label">Город выбранного конфликта</span></div>';
      elLegendItems.innerHTML = html;
    }
    renderLegend();

    // Build global timeline milestone ticks
    function renderMilestones() {
      var monthIndexMap = {};
      for (var i = 0; i < store.months.length; i++) {
        monthIndexMap[store.months[i].month] = i;
      }
      var html = '';
      for (var j = 0; j < MILESTONES.length; j++) {
        var ms = MILESTONES[j];
        var idx = monthIndexMap[ms.month];
        var pct = (idx / (store.months.length - 1)) * 100;
        html += '<button type="button" class="milestone-tick' + (ms.major ? '' : ' milestone-tick--minor') + '" data-month-idx="' + idx + '" style="left:' + pct.toFixed(2) + '%">' +
          esc(ms.text) + '</button>';
      }
      elMilestones.innerHTML = html;
      var ticks = elMilestones.querySelectorAll('.milestone-tick');
      for (var t = 0; t < ticks.length; t++) {
        ticks[t].addEventListener('click', function () {
          store.setPlayingGlobal(false);
          store.setMonthIndex(parseInt(this.getAttribute('data-month-idx'), 10));
        });
      }
    }
    renderMilestones();

    // Timers for playback (avoid resetting interval on unrelated state emits)
    var globalTimer = null;
    var globalTimerKey = null;
    var tacticalTimer = null;
    var tacticalTimerKey = null;

    function syncPlaybackTimers() {
      var nextGlobalKey = (store.state.isPlayingGlobal && store.state.mode === 'global')
        ? String(store.state.playSpeedMs)
        : null;
      if (nextGlobalKey !== globalTimerKey) {
        if (globalTimer) {
          clearInterval(globalTimer);
          globalTimer = null;
        }
        globalTimerKey = nextGlobalKey;
        if (nextGlobalKey !== null) {
          globalTimer = setInterval(function () {
            if (store.state.monthIndex >= store.months.length - 1) {
              store.setPlayingGlobal(false);
            } else {
              store.stepMonth(1);
            }
          }, store.state.playSpeedMs);
        }
      }

      var nextTacKey = (store.state.isPlayingTactical && store.state.mode === 'tactical') ? 'on' : null;
      if (nextTacKey !== tacticalTimerKey) {
        if (tacticalTimer) {
          clearInterval(tacticalTimer);
          tacticalTimer = null;
        }
        tacticalTimerKey = nextTacKey;
        if (nextTacKey !== null) {
          tacticalTimer = setInterval(function () {
            var tac = store.getActiveTactical();
            if (!tac || store.state.tacticalPhaseIndex >= tac.phases.length - 1) {
              store.setPlayingTactical(false);
            } else {
              store.setTacticalPhase(store.state.tacticalPhaseIndex + 1);
            }
          }, 2600);
        }
      }
    }

    function renderSearchDropdown() {
      var q = store.state.searchQuery;
      var matches = store.searchAllBattles(q).slice(0, 14);
      if (!q && document.activeElement !== elSearchInput) {
        elSearchResults.classList.add('is-hidden');
        return;
      }
      if (!matches.length) {
        elSearchResults.innerHTML = '<div class="search-empty">Сражения не найдены</div>';
      } else {
        var html = '';
        for (var i = 0; i < matches.length; i++) {
          var b = matches[i];
          html += '<button type="button" class="search-result-item" data-jump-battle="' + esc(b.id) + '">' +
            '<span class="search-res-title">' + (b.hasTactical ? '★ ' : '') + esc(b.title) + '</span>' +
            '<span class="search-res-meta">' + esc(b.dates) + ' · ' + esc(b.theaterRu) + '</span>' +
            '</button>';
        }
        elSearchResults.innerHTML = html;
      }
      elSearchResults.classList.remove('is-hidden');

      var items = elSearchResults.querySelectorAll('[data-jump-battle]');
      for (var k = 0; k < items.length; k++) {
        items[k].addEventListener('click', function () {
          var bid = this.getAttribute('data-jump-battle');
          elSearchResults.classList.add('is-hidden');
          elSearchInput.blur();
          store.jumpToBattle(bid);
        });
      }
    }

    function renderBattleSummaryHTML(b, isInTactical) {
      var html = '<div class="card-section">';
      html += '<div class="card-badges">' +
        '<span class="badge badge--theater">' + esc(b.theaterRu) + '</span>' +
        '<span class="badge badge--dates">' + esc(b.dates) + '</span>' +
        '</div>';
      html += '<h2 class="card-title">' + esc(b.title) + '</h2>';

      if (b.hasTactical && !isInTactical) {
        html += '<button type="button" id="btn-enter-tactical" class="btn-tactical-enter" data-tactical-id="' + esc(b.tacticalId) + '">' +
          '★ Открыть тактический режим (войска, удары, фазы)' +
          '</button>';
      } else if (isInTactical) {
        html += '<button type="button" id="btn-sidebar-exit-tac" class="btn-secondary-full">' +
          '← Вернуться к глобальной карте мира' +
          '</button>';
      }

      html += '<div class="versus-grid">' +
        '<div class="versus-col versus-col--' + esc(b.sideAFaction) + '">' +
          '<div class="versus-kicker">Сторона А</div>' +
          '<div class="versus-name">' + esc(b.sideA) + '</div>' +
        '</div>' +
        '<div class="versus-col versus-col--' + esc(b.sideBFaction) + '">' +
          '<div class="versus-kicker">Сторона Б</div>' +
          '<div class="versus-name">' + esc(b.sideB) + '</div>' +
        '</div>' +
      '</div>';

      html += '<div class="detail-block">' +
        '<div class="detail-row"><span class="detail-label">Командующие (А):</span><span class="detail-val">' + esc(b.commandersA) + '</span></div>' +
        '<div class="detail-row"><span class="detail-label">Командующие (Б):</span><span class="detail-val">' + esc(b.commandersB) + '</span></div>' +
      '</div>';

      html += '<div class="detail-block">' +
        '<div class="detail-row"><span class="detail-label">Силы сторон (А):</span><span class="detail-val">' + esc(b.forcesA) + '</span></div>' +
        '<div class="detail-row"><span class="detail-label">Силы сторон (Б):</span><span class="detail-val">' + esc(b.forcesB) + '</span></div>' +
      '</div>';

      html += '<div class="detail-block detail-block--casualties">' +
        '<div class="detail-row"><span class="detail-label">Потери (А):</span><span class="detail-val">' + esc(b.casualtiesA) + '</span></div>' +
        '<div class="detail-row"><span class="detail-label">Потери (Б):</span><span class="detail-val">' + esc(b.casualtiesB) + '</span></div>' +
      '</div>';

      html += '<div class="outcome-box">' +
        '<div class="outcome-title">Итог сражения</div>' +
        '<div class="outcome-text">' + esc(b.outcome) + '</div>' +
      '</div>';

      html += '<p class="card-summary">' + esc(b.summary) + '</p>';

      if (!isInTactical) {
        html += '<button type="button" id="btn-back-month-overview" class="btn-ghost-full">← К обзору месяца</button>';
      }
      html += '</div>';
      return html;
    }

    function renderSidebar() {
      if (store.state.mode === 'tactical') {
        var tac = store.getActiveTactical();
        var phase = store.getCurrentTacticalPhase();
        var unit = store.getSelectedUnit();
        var battle = store.getSelectedBattle();

        if (unit) {
          var uSide = SIDE_LABELS[unit.side] || unit.side;
          var uKind = KIND_LABELS[unit.kind] || unit.kind;
          var uHtml = '<div class="card-section">' +
            '<div class="card-badges">' +
              '<span class="badge badge--side-' + esc(unit.side) + '">' + esc(uSide) + '</span>' +
              '<span class="badge badge--dates">' + esc(uKind) + '</span>' +
            '</div>' +
            '<h2 class="card-title">' + esc(unit.name) + '</h2>' +
            '<div class="detail-block">' +
              '<div class="detail-row"><span class="detail-label">Командующий:</span><span class="detail-val">' + esc(unit.commander) + '</span></div>' +
              '<div class="detail-row"><span class="detail-label">Численность и состав:</span><span class="detail-val">' + esc(unit.strength) + '</span></div>' +
            '</div>' +
            '<div class="outcome-box">' +
              '<div class="outcome-title">Боевая задача и действия в фазе</div>' +
              '<div class="outcome-text">' + esc(unit.mission) + '</div>' +
            '</div>' +
            '<button type="button" id="btn-back-tac-overview" class="btn-ghost-full">← Назад к фазе и соединениям</button>' +
            '</div>';
          elSidebarBody.innerHTML = uHtml;
          document.getElementById('btn-back-tac-overview').addEventListener('click', function () {
            store.selectUnit(null);
          });
          return;
        }

        var tHtml = '<div class="card-section">';
        if (tac && phase) {
          tHtml += '<div class="card-badges">' +
            '<span class="badge badge--tac">Тактический режим</span>' +
            '<span class="badge badge--dates">' + esc(phase.dateRange) + '</span>' +
            '</div>' +
            '<h2 class="card-title">' + esc(tac.title) + '</h2>' +
            '<div class="tac-phase-box">' +
              '<div class="tac-phase-title">' + esc(phase.title) + '</div>' +
              '<p class="tac-phase-summary">' + esc(phase.summary) + '</p>' +
            '</div>' +
            '<div class="tac-units-heading">Соединения и флоты на карте (нажмите для деталей):</div>' +
            '<div class="tac-units-list">';
          for (var u = 0; u < phase.units.length; u++) {
            var uu = phase.units[u];
            tHtml += '<button type="button" class="tac-unit-list-btn tac-unit-list-btn--' + esc(uu.side) + '" data-select-unit="' + esc(uu.id) + '">' +
              '<span class="tac-list-name">' + esc(uu.name) + '</span>' +
              '<span class="tac-list-cmd">' + esc(uu.commander) + '</span>' +
              '</button>';
          }
          tHtml += '</div>';
        }
        tHtml += '</div>';

        if (battle) {
          tHtml += '<div class="sidebar-divider"></div>' + renderBattleSummaryHTML(battle, true);
        }

        elSidebarBody.innerHTML = tHtml;

        var uBtns = elSidebarBody.querySelectorAll('[data-select-unit]');
        for (var k = 0; k < uBtns.length; k++) {
          uBtns[k].addEventListener('click', function () {
            store.selectUnit(this.getAttribute('data-select-unit'));
          });
        }
        var exitBtn2 = document.getElementById('btn-sidebar-exit-tac');
        if (exitBtn2) {
          exitBtn2.addEventListener('click', function () {
            store.exitTactical();
          });
        }
        return;
      }

      // GLOBAL MODE SIDEBAR
      var selectedBattle = store.getSelectedBattle();
      if (selectedBattle) {
        elSidebarBody.innerHTML = renderBattleSummaryHTML(selectedBattle, false);
        var enterBtn = document.getElementById('btn-enter-tactical');
        if (enterBtn) {
          enterBtn.addEventListener('click', function () {
            store.enterTactical(this.getAttribute('data-tactical-id'));
          });
        }
        var backBtn = document.getElementById('btn-back-month-overview');
        if (backBtn) {
          backBtn.addEventListener('click', function () {
            store.clearSelection();
          });
        }
        return;
      }

      var curMonth = store.getCurrentMonth();
      if (store.state.selectedRegionId) {
        var props = worldFeaturesById[store.state.selectedRegionId];
        var fid = store.getRegionFactionId(store.state.selectedRegionId);
        var fmeta = store.getFactionMeta(fid);
        if (props) {
          var baseFid = (store.months[0] && store.months[0].factions && store.months[0].factions[store.state.selectedRegionId]) || 'neutral';
          var baseMeta = store.getFactionMeta(baseFid);
          var rHtml = '<div class="card-section">' +
            '<div class="card-badges">' +
              '<span class="badge badge--dates">' + esc(curMonth.label) + '</span>' +
              '<span class="badge" style="background:' + fmeta.color + ';border-color:' + fmeta.border + '">' + esc(fmeta.shortLabel) + '</span>' +
            '</div>' +
            '<h2 class="card-title">' + esc(props.nameRu) + '</h2>' +
            '<div class="detail-block">' +
              '<div class="detail-row"><span class="detail-label">Статус на сентябрь 1939 г.:</span><span class="detail-val">' + esc(baseMeta.label) + '</span></div>' +
              '<div class="detail-row"><span class="detail-label">Контроль (' + esc(curMonth.label) + '):</span><span class="detail-val">' + esc(fmeta.label) + '</span></div>' +
            '</div>' +
            '<p class="card-summary">' + esc(curMonth.summary) + '</p>' +
            '<button type="button" id="btn-back-month-overview" class="btn-ghost-full">← К обзору месяца</button>' +
            '</div>';
          elSidebarBody.innerHTML = rHtml;
          document.getElementById('btn-back-month-overview').addEventListener('click', function () {
            store.clearSelection();
          });
          return;
        }
      }

      // Default Month Overview + Active Battles list
      var activeBattles = store.getActiveBattles();
      var mHtml = '<div class="card-section">' +
        '<div class="card-badges">' +
          '<span class="badge badge--dates">' + esc(curMonth.label) + '</span>' +
          '<span class="badge badge--theater">' + esc(curMonth.phaseTag) + '</span>' +
        '</div>' +
        '<h2 class="card-title">Обстановка на фронтах</h2>' +
        '<p class="card-summary">' + esc(curMonth.summary) + '</p>' +
        '<div class="tac-units-heading">Активные сражения (' + activeBattles.length + '):</div>';

      if (!activeBattles.length) {
        mHtml += '<div class="empty-note">Нет сражений для выбранного фильтра ТВД в этом месяце.</div>';
      } else {
        mHtml += '<div class="battle-list">';
        for (var j = 0; j < activeBattles.length; j++) {
          var ab = activeBattles[j];
          mHtml += '<button type="button" class="battle-list-item' + (ab.hasTactical ? ' is-tactical' : '') + '" data-select-battle="' + esc(ab.id) + '">' +
            '<div class="bl-top">' +
              '<span class="bl-title">' + (ab.hasTactical ? '★ ' : '') + esc(ab.title) + '</span>' +
            '</div>' +
            '<div class="bl-meta">' + esc(ab.dates) + ' · ' + esc(ab.theaterRu) + '</div>' +
            (ab.hasTactical ? '<div class="bl-tac-hint">Доступна детальная тактическая карта</div>' : '') +
            '</button>';
        }
        mHtml += '</div>';
      }
      mHtml += '</div>';
      elSidebarBody.innerHTML = mHtml;

      var bBtns = elSidebarBody.querySelectorAll('[data-select-battle]');
      for (var bIdx = 0; bIdx < bBtns.length; bIdx++) {
        bBtns[bIdx].addEventListener('click', function () {
          var bid = this.getAttribute('data-select-battle');
          var bObj = store.getBattleById(bid);
          store.selectBattle(bid);
          if (bObj) {
            mapEngine.flyToPoint(bObj.lat, bObj.lon, bObj.theater === 'pacific' ? 4 : 5);
          }
        });
      }
    }

    function renderChrome() {
      var curMonth = store.getCurrentMonth();
      if (curMonth) {
        elMonthLabel.textContent = curMonth.label;
        elPhaseTag.textContent = curMonth.phaseTag;
        elSlider.value = String(store.state.monthIndex);
        elTickerText.textContent = curMonth.summary;
      }

      // Play/pause buttons & speed
      elPlayGlobalBtn.textContent = store.state.isPlayingGlobal ? '⏸ Пауза' : '▶ Пуск';
      elSpeedBtn.textContent = store.state.playSpeedMs <= 500 ? '2×' : '1×';

      // Theater filters active class
      for (var i = 0; i < elTheaterBtns.length; i++) {
        var t = elTheaterBtns[i].getAttribute('data-theater');
        elTheaterBtns[i].classList.toggle('is-active', t === store.state.theaterFilter);
      }

      // Layer buttons
      elLayerRelief.classList.toggle('is-active', store.state.layers.relief);
      elLayerFronts.classList.toggle('is-active', store.state.layers.frontlines);
      elLayerRivers.classList.toggle('is-active', store.state.layers.rivers);

      // Mode switch between global timeline and tactical phase timeline
      if (store.state.mode === 'tactical') {
        elGlobalBar.classList.add('is-hidden');
        elTacticalBar.classList.remove('is-hidden');
        var tac = store.getActiveTactical();
        if (tac) {
          elTacTitle.textContent = tac.title + ' (' + tac.dates + ')';
          elTacPlayBtn.textContent = store.state.isPlayingTactical ? '⏸ Пауза' : '▶ Автоход';
          var stepsHtml = '';
          for (var p = 0; p < tac.phases.length; p++) {
            var ph = tac.phases[p];
            var isCur = p === store.state.tacticalPhaseIndex;
            stepsHtml += '<button type="button" class="tac-step-btn' + (isCur ? ' is-active' : '') + '" data-tac-phase="' + p + '">' +
              '<span class="tac-step-num">Фаза ' + (p + 1) + '</span>' +
              '<span class="tac-step-date">' + esc(ph.dateRange) + '</span>' +
              '</button>';
          }
          elTacSteps.innerHTML = stepsHtml;
          var btns = elTacSteps.querySelectorAll('[data-tac-phase]');
          for (var b = 0; b < btns.length; b++) {
            btns[b].addEventListener('click', function () {
              store.setPlayingTactical(false);
              store.setTacticalPhase(parseInt(this.getAttribute('data-tac-phase'), 10));
            });
          }
        }
      } else {
        elTacticalBar.classList.add('is-hidden');
        elGlobalBar.classList.remove('is-hidden');
      }

      // Highlight quick tactical jump pills if matching
      for (var q = 0; q < elTacQuickBtns.length; q++) {
        var tid = elTacQuickBtns[q].getAttribute('data-jump-tac');
        elTacQuickBtns[q].classList.toggle('is-active', store.state.activeTacticalId === tid);
      }
    }

    // Wire DOM event listeners
    elSlider.max = String(Math.max(0, store.months.length - 1));
    function onSliderChange() {
      var nextVal = parseInt(elSlider.value, 10);
      store.setPlayingGlobal(false);
      store.setMonthIndex(nextVal);
    }
    elSlider.addEventListener('input', onSliderChange);
    elSlider.addEventListener('change', onSliderChange);
    elPrevMonthBtn.addEventListener('click', function () {
      store.setPlayingGlobal(false);
      store.stepMonth(-1);
    });
    elNextMonthBtn.addEventListener('click', function () {
      store.setPlayingGlobal(false);
      store.stepMonth(1);
    });
    elPlayGlobalBtn.addEventListener('click', function () {
      if (store.state.monthIndex >= store.months.length - 1 && !store.state.isPlayingGlobal) {
        store.setMonthIndex(0);
      }
      store.setPlayingGlobal(!store.state.isPlayingGlobal);
    });
    elSpeedBtn.addEventListener('click', function () {
      store.setPlaySpeed(store.state.playSpeedMs <= 500 ? 950 : 450);
    });

    elExitTacBtn.addEventListener('click', function () {
      store.exitTactical();
    });
    elTacPrevBtn.addEventListener('click', function () {
      store.setPlayingTactical(false);
      store.setTacticalPhase(store.state.tacticalPhaseIndex - 1);
    });
    elTacNextBtn.addEventListener('click', function () {
      store.setPlayingTactical(false);
      store.setTacticalPhase(store.state.tacticalPhaseIndex + 1);
    });
    elTacPlayBtn.addEventListener('click', function () {
      var tac = store.getActiveTactical();
      if (tac && store.state.tacticalPhaseIndex >= tac.phases.length - 1 && !store.state.isPlayingTactical) {
        store.setTacticalPhase(0);
      }
      store.setPlayingTactical(!store.state.isPlayingTactical);
    });

    for (var tb = 0; tb < elTheaterBtns.length; tb++) {
      elTheaterBtns[tb].addEventListener('click', function () {
        store.setTheaterFilter(this.getAttribute('data-theater'));
      });
    }

    elLayerRelief.addEventListener('click', function () { store.toggleLayer('relief'); });
    elLayerFronts.addEventListener('click', function () { store.toggleLayer('frontlines'); });
    elLayerRivers.addEventListener('click', function () { store.toggleLayer('rivers'); });

    elLegendBtn.addEventListener('click', function () {
      elLegendBox.classList.toggle('is-hidden');
      elLegendBtn.classList.toggle('is-active', !elLegendBox.classList.contains('is-hidden'));
    });

    elSidebarToggle.addEventListener('click', function () {
      elSidebar.classList.toggle('is-collapsed');
      var open = !elSidebar.classList.contains('is-collapsed');
      elSidebarToggle.classList.toggle('is-active', open);
      elSidebarToggle.textContent = open ? 'Скрыть ▸' : '◀ Сводка';
    });

    elSearchInput.addEventListener('focus', function () {
      renderSearchDropdown();
    });
    elSearchInput.addEventListener('input', function () {
      store.setSearchQuery(this.value);
      renderSearchDropdown();
    });
    document.addEventListener('click', function (ev) {
      if (!elSearchResults.contains(ev.target) && ev.target !== elSearchInput) {
        elSearchResults.classList.add('is-hidden');
      }
    });

    for (var qb = 0; qb < elTacQuickBtns.length; qb++) {
      elTacQuickBtns[qb].addEventListener('click', function () {
        var tid = this.getAttribute('data-jump-tac');
        store.enterTactical(tid);
      });
    }

    // Keyboard shortcuts: Left / Right arrow to scrub timeline or tactical phases; Esc to exit tactical
    document.addEventListener('keydown', function (ev) {
      if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA')) return;
      if (ev.key === 'ArrowLeft') {
        if (store.state.mode === 'tactical') {
          store.setPlayingTactical(false);
          store.setTacticalPhase(store.state.tacticalPhaseIndex - 1);
        } else {
          store.setPlayingGlobal(false);
          store.stepMonth(-1);
        }
      } else if (ev.key === 'ArrowRight') {
        if (store.state.mode === 'tactical') {
          store.setPlayingTactical(false);
          store.setTacticalPhase(store.state.tacticalPhaseIndex + 1);
        } else {
          store.setPlayingGlobal(false);
          store.stepMonth(1);
        }
      } else if (ev.key === 'Escape' && store.state.mode === 'tactical') {
        store.exitTactical();
      }
    });

    // Subscribe UI & Map to store (render DOM before mapEngine.sync so camera padding reads updated UI bars/sidebar)
    store.subscribe(function (_state, reason) {
      if (reason === 'selectBattle' || reason === 'jumpToBattle' || reason === 'selectRegion' || reason === 'enterTactical' || reason === 'selectUnit') {
        if (elSidebar.classList.contains('is-collapsed')) {
          elSidebar.classList.remove('is-collapsed');
          elSidebarToggle.classList.add('is-active');
          elSidebarToggle.textContent = 'Скрыть ▸';
        }
      }
      renderChrome();
      renderSidebar();
      updateLayoutInsets();
      mapEngine.sync(reason);
      syncPlaybackTimers();
    });

    // Initial render
    renderChrome();
    renderSidebar();
    updateLayoutInsets();
  }

  var payload = { createUI: createUI };
  if (typeof module !== 'undefined' && module.exports) { module.exports = payload; }
  root.WW2_UI = payload;
})(typeof window !== 'undefined' ? window : globalThis);
