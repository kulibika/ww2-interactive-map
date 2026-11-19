const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const worldData = require('../data/world_1939.js');
const citiesData = require('../data/cities.js');
const timeline = require('../data/timeline_events.js');
const battlesData = require('../data/battles.js');
const tacticalData = require('../data/tactical_battles.js');

test('index.html uses local scripts only and contains no fetch() calls', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(!/type=["']module["']/.test(html), 'must not use ES modules so file:// works without CORS');
  assert.ok(!/https?:\/\//i.test(html), 'index.html must not depend on external CDNs');
  const appFiles = ['state.js', 'map_engine.js', 'tactical_engine.js', 'ui.js', 'app.js'];
  for (const f of appFiles) {
    const code = fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8');
    assert.ok(!/\bfetch\s*\(/.test(code), `${f} must not call fetch()`);
  }
});

test('WORLD_1939 GeoJSON has valid 1939 countries, rivers, and clipped occupation zones', () => {
  const features = worldData.WORLD_1939.features;
  assert.ok(features.length >= 165, `expected >=165 features, got ${features.length}`);

  const ids = new Set();
  for (const f of features) {
    assert.equal(f.type, 'Feature');
    assert.ok(f.properties && f.properties.id, 'feature missing id');
    assert.ok(f.properties.nameRu, `feature ${f.properties.id} missing nameRu`);
    assert.ok(!ids.has(f.properties.id), `duplicate feature id: ${f.properties.id}`);
    ids.add(f.properties.id);
    assert.ok(['Polygon', 'MultiPolygon'].includes(f.geometry.type));
    assert.ok(f.geometry.coordinates.length > 0);
  }

  // Key 1939 splits must exist
  for (const keyId of ['germany', 'austria', 'bohemia_moravia', 'slovakia', 'poland_west', 'poland_east', 'france_north', 'france_vichy', 'italy_north', 'italy_south', 'iceland', 'greenland', 'manchukuo', 'korea', 'taiwan', 'burma']) {
    assert.ok(ids.has(keyId), `missing historical region: ${keyId}`);
  }

  assert.ok(worldData.RIVERS.features.length >= 30, 'should embed major world rivers');
  assert.equal(Object.keys(worldData.EAST_OCC_ZONES).length, 43, 'expected 43 monthly East Front clipped polygons (1941-06..1944-12)');
  assert.equal(Object.keys(worldData.SOVIET_1945_ZONES).length, 4, 'expected 4 monthly 1945 Soviet Central Europe polygons');
});

test('TIMELINE covers exact 73 months (1939-09..1945-09) and maps all 173 country IDs', () => {
  const months = timeline.MONTHS;
  assert.equal(months.length, 73, 'WW2 timeline must be exactly 73 months');
  assert.equal(months[0].month, '1939-09');
  assert.equal(months[72].month, '1945-09');

  // Verify strict monthly sequence
  let y = 1939;
  let m = 9;
  for (let i = 0; i < 73; i++) {
    const expected = `${y}-${String(m).padStart(2, '0')}`;
    assert.equal(months[i].month, expected);
    assert.ok(months[i].label.length > 4);
    assert.ok(months[i].summary.length > 20);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }

  const featureIds = worldData.WORLD_1939.features.map((f) => f.properties.id);
  const validFactions = new Set(Object.keys(timeline.FACTION_META));
  for (const mo of months) {
    for (const id of featureIds) {
      const f = mo.factions[id];
      assert.ok(f, `month ${mo.month} missing faction for ${id}`);
      assert.ok(validFactions.has(f), `invalid faction ${f} for ${id} at ${mo.month}`);
    }
  }

  // Spot-check key historical territorial shifts
  const byYm = Object.fromEntries(months.map((x) => [x.month, x]));
  assert.equal(byYm['1939-09'].factions.poland_west, 'allies');
  assert.equal(byYm['1939-10'].factions.poland_west, 'axis_occupied');
  assert.equal(byYm['1939-10'].factions.poland_east, 'ussr_prewar');
  assert.equal(byYm['1940-06'].factions.france_north, 'axis_occupied');
  assert.equal(byYm['1940-06'].factions.france_vichy, 'vichy');
  assert.equal(byYm['1939-09'].factions.iceland, 'neutral');
  assert.equal(byYm['1940-05'].factions.iceland, 'allies');
  assert.equal(byYm['1941-06'].factions.ussr, 'ussr');
  assert.equal(byYm['1941-12'].factions.united_states, 'allies');
  assert.equal(byYm['1942-11'].factions.france_vichy, 'axis_occupied');
  assert.equal(byYm['1943-09'].factions.italy_south, 'allies');
  assert.equal(byYm['1943-09'].factions.italy_north, 'axis');
  assert.equal(byYm['1944-08'].factions.france_north, 'allies');
  assert.equal(byYm['1945-05'].factions.germany, 'allies_occupied');
  assert.equal(byYm['1945-09'].factions.japan, 'allies_occupied');

  // Finland must remain neutral during Winter War (no artificial battle-only recoloring)
  assert.equal(byYm['1939-09'].factions.finland, 'neutral');
  assert.equal(byYm['1939-12'].factions.finland, 'neutral');
  assert.equal(byYm['1940-02'].factions.finland, 'neutral');
  assert.equal(byYm['1940-03'].factions.finland, 'neutral');
  assert.equal(byYm['1941-06'].factions.finland, 'axis');
  assert.equal(byYm['1944-09'].factions.finland, 'allies');

  // No country should temporarily switch away from neutral and revert back to neutral for a battle
  for (const id of featureIds) {
    let sawNonNeutral = false;
    for (const mo of months) {
      const f = mo.factions[id];
      if (f !== 'neutral') {
        sawNonNeutral = true;
      } else if (sawNonNeutral) {
        assert.fail(`country ${id} reverted to neutral at ${mo.month} (possible artificial battle-only recoloring)`);
      }
    }
  }

  // Global frontlines must be removed across all 73 months
  for (const mo of months) {
    assert.deepEqual(mo.frontlines, [], `global frontlines should be empty at ${mo.month}`);
  }
});

test('ALWAYS_VISIBLE_CITIES defines capitals and 2 key cities for major powers', () => {
  const cities = citiesData.ALWAYS_VISIBLE_CITIES;
  assert.ok(Array.isArray(cities) && cities.length >= 45);
  const ids = new Set();
  const featureIds = new Set(worldData.WORLD_1939.features.map((f) => f.properties.id));
  for (const c of cities) {
    assert.ok(c.id && !ids.has(c.id), `duplicate or missing city id: ${c.id}`);
    ids.add(c.id);
    assert.ok(c.name && c.countryId && c.countryRu);
    assert.ok(featureIds.has(c.countryId), `city ${c.id} references unknown region ${c.countryId}`);
    assert.ok(c.lat >= -70 && c.lat <= 80 && c.lon >= -180 && c.lon <= 180);
  }
  const majorGroups = [
    'СССР', 'Германия', 'Великобритания', 'Франция', 'Италия', 'Польша',
    'США', 'Японская империя', 'Китайская Республика', 'Канада',
    'Австралия', 'Британская Индия', 'Бразилия', 'Испания', 'Турция'
  ];
  for (const country of majorGroups) {
    const grp = cities.filter((c) => c.countryRu === country && c.tier <= 2);
    assert.equal(grp.length, 3, `${country} should have 1 capital + 2 key cities`);
    assert.equal(grp.filter((c) => c.isCapital).length, 1, `${country} should have 1 capital`);
  }
});

test('BATTLES dataset is complete, spans all theaters & all 73 months, and links 6 tactical battles', () => {
  const battles = battlesData.BATTLES;
  assert.ok(battles.length >= 40, `expected >= 40 battles, got ${battles.length}`);

  const ids = new Set();
  const tacticalLinked = [];
  const validBattleFactions = new Set(['allies', 'ussr', 'axis', 'china', 'vichy', 'neutral']);
  for (const b of battles) {
    assert.ok(!ids.has(b.id), `duplicate battle id: ${b.id}`);
    ids.add(b.id);
    assert.ok(b.title && b.dates && b.sideA && b.sideB);
    assert.ok(validBattleFactions.has(b.sideAFaction), `invalid sideAFaction in ${b.id}: ${b.sideAFaction}`);
    assert.ok(validBattleFactions.has(b.sideBFaction), `invalid sideBFaction in ${b.id}: ${b.sideBFaction}`);
    assert.ok(b.commandersA && b.commandersB && b.forcesA && b.forcesB && b.casualtiesA && b.casualtiesB);
    assert.ok(b.outcome && b.summary);
    assert.ok(b.monthStart >= '1939-09' && b.monthEnd <= '1945-09' && b.monthStart <= b.monthEnd);
    assert.ok(b.lat >= -70 && b.lat <= 80 && b.lon >= -180 && b.lon <= 180);
    assert.ok(Array.isArray(b.cities), `battle ${b.id} must have cities array`);
    const cityNames = new Set();
    for (const c of b.cities) {
      assert.ok(c.name && typeof c.lat === 'number' && typeof c.lon === 'number', `invalid city in ${b.id}`);
      assert.ok(!cityNames.has(c.name), `duplicate city ${c.name} in ${b.id}`);
      cityNames.add(c.name);
      assert.ok(c.lat >= -70 && c.lat <= 80 && c.lon >= -180 && c.lon <= 180);
    }
    if (b.hasTactical) tacticalLinked.push(b);
  }

  const byId = Object.fromEntries(battles.map((b) => [b.id, b]));
  assert.equal(byId.winter_war_1939.sideBFaction, 'neutral');
  assert.equal(byId.iran_1941.sideBFaction, 'neutral');
  assert.equal(byId.mers_el_kebir_1940.sideBFaction, 'vichy');

  assert.equal(tacticalLinked.length, 6, 'expected exactly 6 tactical battles');
  for (const tb of tacticalLinked) {
    assert.ok(tacticalData.TACTICAL_BATTLES[tb.tacticalId], `missing tactical entry for ${tb.tacticalId}`);
  }

  // Every month should have at least 1 active battle
  for (const m of timeline.MONTHS) {
    const active = battles.filter((b) => b.monthStart <= m.month && b.monthEnd >= m.month);
    assert.ok(active.length >= 1, `month ${m.month} has zero active battles`);
  }
});

test('TACTICAL_BATTLES have valid phases, units, arrows, frontlines, and continuous antimeridian coords', () => {
  const tacMap = tacticalData.TACTICAL_BATTLES;
  const keys = Object.keys(tacMap);
  assert.deepEqual(keys.sort(), ['berlin', 'kursk', 'midway', 'moscow', 'normandy', 'stalingrad']);

  for (const key of keys) {
    const tac = tacMap[key];
    assert.ok(Array.isArray(tac.center) && tac.center.length === 2);
    assert.ok(tac.zoom >= 5 && tac.zoom <= 11);
    assert.ok(tac.phases.length >= 4, `${key} should have >=4 phases`);
    for (const ph of tac.phases) {
      assert.ok(ph.id && ph.title && ph.dateRange && ph.summary);
      assert.ok(ph.units.length >= 3, `${ph.id} should have >=3 clickable units`);
      assert.ok(ph.arrows.length >= 1, `${ph.id} should have operational arrows`);
      for (const u of ph.units) {
        assert.ok(u.id && u.name && u.commander && u.strength && u.mission);
        assert.ok(['ussr', 'allies', 'axis'].includes(u.side));
        assert.ok(Math.abs(u.lon - tac.center[1]) < 15, `unit ${u.id} lon (${u.lon}) too far from battle center (${tac.center[1]}) — possible antimeridian bug!`);
      }
      for (const arr of ph.arrows) {
        assert.ok(arr.coords.length >= 2);
        for (const pt of arr.coords) {
          assert.ok(Math.abs(pt[1] - tac.center[1]) < 15, `arrow ${arr.label} pt lon (${pt[1]}) too far from center (${tac.center[1]})`);
        }
      }
      const lms = (ph.landmarks && ph.landmarks.length) ? ph.landmarks : (tac.landmarks || []);
      for (const lm of lms) {
        assert.ok(lm.name && typeof lm.lat === 'number' && typeof lm.lon === 'number', `${ph.id} invalid landmark`);
        assert.ok(Math.abs(lm.lon - tac.center[1]) < 15, `landmark ${lm.name} lon (${lm.lon}) too far from center (${tac.center[1]})`);
      }
    }
  }
});
