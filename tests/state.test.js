const test = require('node:test');
const assert = require('node:assert/strict');

const timeline = require('../data/timeline_events.js');
const battlesData = require('../data/battles.js');
const tacticalData = require('../data/tactical_battles.js');
const { createStore } = require('../src/state.js');

function makeStore() {
  return createStore({
    MONTHS: timeline.MONTHS,
    FACTION_META: timeline.FACTION_META,
    BATTLES: battlesData.BATTLES,
    TACTICAL_BATTLES: tacticalData.TACTICAL_BATTLES
  });
}

test('store initializes at 1939-09 and clamps timeline steps', () => {
  const store = makeStore();
  assert.equal(store.state.mode, 'global');
  assert.equal(store.getCurrentMonth().month, '1939-09');

  store.stepMonth(-10);
  assert.equal(store.state.monthIndex, 0);

  store.setMonthIndex(999);
  assert.equal(store.state.monthIndex, 72);
  assert.equal(store.getCurrentMonth().month, '1945-09');
});

test('store filters battles by month and theater and clears inactive selection on month change', () => {
  const store = makeStore();
  store.setMonthByStr('1942-11');
  const active = store.getActiveBattles();
  assert.ok(active.some((b) => b.id === 'stalingrad_1942'));
  assert.ok(active.some((b) => b.id === 'el_alamein_1942'));

  store.selectBattle('stalingrad_1942');
  assert.equal(store.getSelectedBattle().id, 'stalingrad_1942');

  // Filter to mediterranean -> stalingrad should deselect
  store.setTheaterFilter('mediterranean');
  assert.equal(store.state.selectedBattleId, null);
  assert.ok(store.getActiveBattles().every((b) => b.theater === 'mediterranean'));

  // Jump directly to Kursk -> resets filter/mode and sets month to 1943-07
  const jumped = store.jumpToBattle('kursk_1943');
  assert.equal(jumped.id, 'kursk_1943');
  assert.equal(store.getCurrentMonth().month, '1943-07');
  assert.equal(store.state.theaterFilter, 'all');
  assert.equal(store.state.selectedBattleId, 'kursk_1943');
});

test('store handles tactical entry, phase transitions, unit selection, and global exit', () => {
  const store = makeStore();
  assert.equal(store.enterTactical('nonexistent'), false);

  assert.equal(store.enterTactical('stalingrad'), true);
  assert.equal(store.state.mode, 'tactical');
  assert.equal(store.getActiveTactical().id, 'stalingrad');
  assert.equal(store.state.tacticalPhaseIndex, 0);

  const ph0 = store.getCurrentTacticalPhase();
  store.selectUnit(ph0.units[0].id);
  assert.equal(store.getSelectedUnit().id, ph0.units[0].id);

  // Move to phase 2 -> unit selection clears if ID doesn't exist in phase 2
  store.setTacticalPhase(2);
  assert.equal(store.state.tacticalPhaseIndex, 2);
  assert.equal(store.state.selectedUnitId, null);

  // Clamp phase index
  store.setTacticalPhase(99);
  assert.equal(store.state.tacticalPhaseIndex, 3);

  store.exitTactical();
  assert.equal(store.state.mode, 'global');
  assert.equal(store.state.activeTacticalId, null);
  assert.equal(store.state.selectedUnitId, null);
});

test('global search ignores theaterFilter, matches commanders, and enterTactical clears region & incompatible filter', () => {
  const store = makeStore();
  store.setTheaterFilter('pacific');
  // Global search still finds Stalingrad and searches by commander name
  const byTitle = store.searchAllBattles('Сталинград');
  assert.ok(byTitle.some((b) => b.id === 'stalingrad_1942'));
  const byCmd = store.searchAllBattles('Роммель');
  assert.ok(byCmd.some((b) => b.id === 'el_alamein_1942'));

  // Select a region then enter Eastern tactical battle while theaterFilter is 'pacific'
  store.selectRegion('iceland');
  assert.equal(store.state.selectedRegionId, 'iceland');
  assert.equal(store.enterTactical('stalingrad'), true);
  assert.equal(store.state.selectedRegionId, null);
  assert.equal(store.state.theaterFilter, 'all');
  store.exitTactical();
  assert.ok(store.getActiveBattles().some((b) => b.id === 'stalingrad_1942'));
});
