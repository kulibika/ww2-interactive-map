// Pure application state store and selectors (works in browser file:// and Node.js tests)
(function (root) {
  function createStore(deps) {
    var months = (deps && deps.MONTHS) || (root.WW2_TIMELINE && root.WW2_TIMELINE.MONTHS) || [];
    var factionMeta = (deps && deps.FACTION_META) || (root.WW2_TIMELINE && root.WW2_TIMELINE.FACTION_META) || {};
    var battles = (deps && deps.BATTLES) || (root.WW2_BATTLES && root.WW2_BATTLES.BATTLES) || [];
    var tacticalMap = (deps && deps.TACTICAL_BATTLES) || (root.WW2_TACTICAL && root.WW2_TACTICAL.TACTICAL_BATTLES) || {};

    var monthToIndex = {};
    for (var i = 0; i < months.length; i++) {
      monthToIndex[months[i].month] = i;
    }

    var state = {
      mode: 'global', // 'global' | 'tactical'
      monthIndex: 0,
      isPlayingGlobal: false,
      playSpeedMs: 950,
      theaterFilter: 'all',
      searchQuery: '',
      selectedBattleId: null,
      selectedRegionId: null,
      activeTacticalId: null,
      tacticalPhaseIndex: 0,
      isPlayingTactical: false,
      selectedUnitId: null,
      layers: {
        relief: true,
        frontlines: true,
        rivers: true
      }
    };

    var listeners = [];

    function emit(reason) {
      for (var k = 0; k < listeners.length; k++) {
        listeners[k](state, reason);
      }
    }

    function subscribe(fn) {
      listeners.push(fn);
      return function () {
        listeners = listeners.filter(function (l) { return l !== fn; });
      };
    }

    function clampMonth(idx) {
      if (!months.length) return 0;
      return Math.max(0, Math.min(months.length - 1, idx));
    }

    function getCurrentMonth() {
      return months[state.monthIndex] || null;
    }

    function getFactionMeta(factionId) {
      return factionMeta[factionId] || factionMeta.neutral || { id: 'neutral', label: 'Нейтральные', shortLabel: 'Нейтр.', color: '#9c9278', border: '#bfb59b', fillOpacity: 0.5 };
    }

    function getRegionFactionId(regionId) {
      var m = getCurrentMonth();
      if (!m || !m.factions) return 'neutral';
      return m.factions[regionId] || 'neutral';
    }

    function getActiveBattles() {
      var m = getCurrentMonth();
      if (!m) return [];
      var ym = m.month;
      return battles.filter(function (b) {
        if (b.monthStart > ym || b.monthEnd < ym) return false;
        if (state.theaterFilter !== 'all' && b.theater !== state.theaterFilter) return false;
        return true;
      });
    }

    function searchAllBattles(query) {
      var q = (query || '').trim().toLowerCase();
      return battles.filter(function (b) {
        if (!q) return true;
        return b.title.toLowerCase().indexOf(q) !== -1 ||
               b.theaterRu.toLowerCase().indexOf(q) !== -1 ||
               b.sideA.toLowerCase().indexOf(q) !== -1 ||
               b.sideB.toLowerCase().indexOf(q) !== -1 ||
               (b.commandersA && b.commandersA.toLowerCase().indexOf(q) !== -1) ||
               (b.commandersB && b.commandersB.toLowerCase().indexOf(q) !== -1);
      });
    }

    function getBattleById(id) {
      for (var i = 0; i < battles.length; i++) {
        if (battles[i].id === id) return battles[i];
      }
      return null;
    }

    function getSelectedBattle() {
      return state.selectedBattleId ? getBattleById(state.selectedBattleId) : null;
    }

    function getActiveTactical() {
      return state.activeTacticalId ? (tacticalMap[state.activeTacticalId] || null) : null;
    }

    function getCurrentTacticalPhase() {
      var tac = getActiveTactical();
      if (!tac || !tac.phases || !tac.phases.length) return null;
      var idx = Math.max(0, Math.min(tac.phases.length - 1, state.tacticalPhaseIndex));
      return tac.phases[idx];
    }

    function getSelectedUnit() {
      var phase = getCurrentTacticalPhase();
      if (!phase || !state.selectedUnitId) return null;
      for (var i = 0; i < phase.units.length; i++) {
        if (phase.units[i].id === state.selectedUnitId) return phase.units[i];
      }
      return null;
    }

    function setMonthIndex(idx) {
      var next = clampMonth(idx);
      if (next === state.monthIndex) return;
      state.monthIndex = next;
      // If selected battle is no longer active in the new month, deselect cleanly
      if (state.selectedBattleId) {
        var b = getSelectedBattle();
        var ym = months[next].month;
        if (!b || b.monthStart > ym || b.monthEnd < ym) {
          state.selectedBattleId = null;
        }
      }
      emit('month');
    }

    function setMonthByStr(ym) {
      if (ym in monthToIndex) {
        setMonthIndex(monthToIndex[ym]);
      }
    }

    function stepMonth(delta) {
      setMonthIndex(state.monthIndex + delta);
    }

    function setTheaterFilter(theater) {
      state.theaterFilter = theater || 'all';
      if (state.selectedBattleId) {
        var b = getSelectedBattle();
        if (b && state.theaterFilter !== 'all' && b.theater !== state.theaterFilter) {
          state.selectedBattleId = null;
        }
      }
      emit('filter');
    }

    function setSearchQuery(q) {
      state.searchQuery = q || '';
      emit('search');
    }

    function selectBattle(battleId) {
      state.selectedBattleId = battleId;
      state.selectedRegionId = null;
      emit('selectBattle');
    }

    function jumpToBattle(battleId) {
      var b = getBattleById(battleId);
      if (!b) return null;
      if (state.mode === 'tactical') {
        state.mode = 'global';
        state.activeTacticalId = null;
        state.selectedUnitId = null;
        state.isPlayingTactical = false;
      }
      state.isPlayingGlobal = false;
      if (b.monthStart in monthToIndex) {
        state.monthIndex = monthToIndex[b.monthStart];
      }
      if (state.theaterFilter !== 'all' && state.theaterFilter !== b.theater) {
        state.theaterFilter = 'all';
      }
      state.selectedBattleId = b.id;
      state.selectedRegionId = null;
      emit('jumpToBattle');
      return b;
    }

    function selectRegion(regionId) {
      state.selectedRegionId = regionId;
      state.selectedBattleId = null;
      emit('selectRegion');
    }

    function clearSelection() {
      state.selectedBattleId = null;
      state.selectedRegionId = null;
      emit('clearSelection');
    }

    function enterTactical(tacticalId) {
      var tac = tacticalMap[tacticalId];
      if (!tac) return false;
      state.isPlayingGlobal = false;
      state.isPlayingTactical = false;
      state.mode = 'tactical';
      state.activeTacticalId = tacticalId;
      state.tacticalPhaseIndex = 0;
      state.selectedUnitId = null;
      state.selectedRegionId = null;
      if (tac.battleId) {
        var b = getBattleById(tac.battleId);
        if (b) {
          state.selectedBattleId = b.id;
          if (state.theaterFilter !== 'all' && state.theaterFilter !== b.theater) {
            state.theaterFilter = 'all';
          }
          var curYm = months[state.monthIndex] ? months[state.monthIndex].month : '';
          if ((curYm < b.monthStart || curYm > b.monthEnd) && (b.monthStart in monthToIndex)) {
            state.monthIndex = monthToIndex[b.monthStart];
          }
        }
      }
      emit('enterTactical');
      return true;
    }

    function exitTactical() {
      if (state.mode !== 'tactical') return;
      state.isPlayingTactical = false;
      state.mode = 'global';
      state.activeTacticalId = null;
      state.tacticalPhaseIndex = 0;
      state.selectedUnitId = null;
      emit('exitTactical');
    }

    function setTacticalPhase(idx) {
      var tac = getActiveTactical();
      if (!tac || !tac.phases.length) return;
      var next = Math.max(0, Math.min(tac.phases.length - 1, idx));
      state.tacticalPhaseIndex = next;
      // Preserve unit selection if same id exists in new phase, else clear
      if (state.selectedUnitId) {
        var stillExists = tac.phases[next].units.some(function (u) { return u.id === state.selectedUnitId; });
        if (!stillExists) state.selectedUnitId = null;
      }
      emit('tacticalPhase');
    }

    function selectUnit(unitId) {
      state.selectedUnitId = unitId;
      emit('selectUnit');
    }

    function toggleLayer(layerKey) {
      if (layerKey in state.layers) {
        state.layers[layerKey] = !state.layers[layerKey];
        emit('layer:' + layerKey);
      }
    }

    function setPlayingGlobal(val) {
      var next = !!val;
      if (state.isPlayingGlobal === next) return;
      state.isPlayingGlobal = next;
      emit('playGlobal');
    }

    function setPlayingTactical(val) {
      var next = !!val;
      if (state.isPlayingTactical === next) return;
      state.isPlayingTactical = next;
      emit('playTactical');
    }

    function setPlaySpeed(ms) {
      state.playSpeedMs = ms;
      emit('speed');
    }

    return {
      state: state,
      months: months,
      battles: battles,
      tacticalMap: tacticalMap,
      subscribe: subscribe,
      getCurrentMonth: getCurrentMonth,
      getFactionMeta: getFactionMeta,
      getRegionFactionId: getRegionFactionId,
      getActiveBattles: getActiveBattles,
      searchAllBattles: searchAllBattles,
      getBattleById: getBattleById,
      getSelectedBattle: getSelectedBattle,
      getActiveTactical: getActiveTactical,
      getCurrentTacticalPhase: getCurrentTacticalPhase,
      getSelectedUnit: getSelectedUnit,
      setMonthIndex: setMonthIndex,
      setMonthByStr: setMonthByStr,
      stepMonth: stepMonth,
      setTheaterFilter: setTheaterFilter,
      setSearchQuery: setSearchQuery,
      selectBattle: selectBattle,
      jumpToBattle: jumpToBattle,
      selectRegion: selectRegion,
      clearSelection: clearSelection,
      enterTactical: enterTactical,
      exitTactical: exitTactical,
      setTacticalPhase: setTacticalPhase,
      selectUnit: selectUnit,
      toggleLayer: toggleLayer,
      setPlayingGlobal: setPlayingGlobal,
      setPlayingTactical: setPlayingTactical,
      setPlaySpeed: setPlaySpeed
    };
  }

  var payload = { createStore: createStore };
  if (typeof module !== 'undefined' && module.exports) { module.exports = payload; }
  root.WW2_STATE = payload;
})(typeof window !== 'undefined' ? window : globalThis);
