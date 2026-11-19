import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(import.meta.dirname, '..');
const INDEX_URL = pathToFileURL(path.join(ROOT, 'index.html')).href;
const SHOT_DIR = path.join(process.env.TEMP || '/tmp', 'ww2_screenshots');
fs.mkdirSync(SHOT_DIR, { recursive: true });

function findBrowserPath() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function run() {
  const exe = findBrowserPath();
  assert.ok(exe, 'Chrome or Edge executable not found for Playwright verification');

  const browser = await chromium.launch({
    executablePath: exe,
    headless: true,
    args: ['--no-sandbox', '--allow-file-access-from-files']
  });

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    const errors = [];
    const badRequests = [];
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const txt = msg.text();
        // Ignore blocked external Esri tile errors when we intentionally simulate offline mode
        if (!txt.includes('ERR_FAILED') && !txt.includes('arcgisonline')) {
          errors.push(`console.error: ${txt}`);
        }
      }
    });
    page.on('request', (req) => {
      const u = req.url();
      if (u.startsWith('file://') && (u.endsWith('.json') || u.endsWith('.geojson'))) {
        badRequests.push(u);
      }
    });

    // Simulate STRICT OFFLINE file:// usage by aborting external network requests!
    await page.route(/^https?:\/\//, (route) => route.abort());

    await page.goto(INDEX_URL, { waitUntil: 'load' });
    await page.waitForSelector('.leaflet-container', { timeout: 8000 });
    await page.waitForSelector('path.leaflet-interactive', { timeout: 8000 });

    assert.equal(badRequests.length, 0, `Unexpected local JSON/GeoJSON fetch requests: ${badRequests.join(', ')}`);

    // 1. Verify Sept 1939 initial render & offline relief status/attribution
    const initLabel = await page.textContent('#hud-month-label');
    assert.equal(initLabel.trim(), 'Сентябрь 1939');
    const pathCount = await page.locator('path.leaflet-interactive').count();
    assert.ok(pathCount > 100, `Expected >100 country vector paths offline, got ${pathCount}`);
    const dotClassOffline = await page.locator('#relief-status-dot').getAttribute('class');
    assert.ok(dotClassOffline.includes('is-offline'), 'Relief status dot should show offline in strict offline mode');
    const attrTextOffline = await page.textContent('.leaflet-control-attribution');
    assert.ok(!attrTextOffline.includes('Esri'), 'Offline mode must not display Esri attribution');

    // Verify clicking a country polygon (France North) & Iceland updates localized sidebar across months
    await page.evaluate(() => { window.__WW2_APP__.store.selectRegion('iceland'); });
    await page.waitForTimeout(150);
    const icelandTextSep39 = await page.textContent('#sidebar-body');
    assert.ok(icelandTextSep39.includes('Исландия') && icelandTextSep39.includes('Нейтральные'), 'Iceland should be neutral in Sept 1939');
    assert.ok(!icelandTextSep39.includes('(Iceland)'), 'Country card should not leak English raw subject labels');
    await page.evaluate(() => { window.__WW2_APP__.store.setMonthByStr('1940-05'); });
    await page.waitForTimeout(150);
    const icelandTextMay40 = await page.textContent('#sidebar-body');
    assert.ok(icelandTextMay40.includes('Союзники'), 'Iceland should shift to Allies in May 1940');
    await page.evaluate(() => {
      window.__WW2_APP__.store.clearSelection();
      window.__WW2_APP__.store.setMonthIndex(0);
    });
    await page.waitForTimeout(150);

    await page.screenshot({ path: path.join(SHOT_DIR, '01_global_1939_09.png') });

    // 1a. Verify NO global frontlines exist, focus outline is suppressed when clicking Poland, and always-visible cities render cleanly without label overlap
    const frontlineCountSep39 = await page.locator('.ww2-frontline').count();
    assert.equal(frontlineCountSep39, 0, 'Global map must not render frontline lines');

    // Click Poland polygon directly via real mouse click on projected Poznan area (52.0, 17.0), clear of Warsaw pin
    const polandPt = await page.evaluate(() => {
      const m = window.__WW2_APP__.mapEngine.map;
      const pt = m.latLngToContainerPoint([52.0, 17.0]);
      return { x: pt.x, y: pt.y };
    });
    await page.mouse.click(polandPt.x, polandPt.y);
    await page.waitForTimeout(150);
    const focusOutlineCheck = await page.evaluate(() => {
      const active = document.activeElement;
      const cs = active ? getComputedStyle(active) : null;
      const paths = [...document.querySelectorAll('path.leaflet-interactive')];
      const anyFocusedOutline = paths.some((p) => {
        const s = getComputedStyle(p);
        return p === active && s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
      });
      return {
        selectedRegionId: window.__WW2_APP__.store.state.selectedRegionId,
        sidebar: document.getElementById('sidebar-body').textContent,
        activeTag: active ? active.tagName : null,
        outlineStyle: cs ? cs.outlineStyle : null,
        anyFocusedOutline
      };
    });
    assert.equal(focusOutlineCheck.selectedRegionId, 'poland_west', 'Clicking western Poland must select poland_west region');
    assert.ok(focusOutlineCheck.sidebar.includes('Польша (Западная)'), 'Clicking Poland on map should show Польша (Западная) card');
    assert.equal(focusOutlineCheck.anyFocusedOutline, false, 'Clicked SVG polygon must not display browser focus outline');
    await page.evaluate(() => { window.__WW2_APP__.store.clearSelection(); });
    await page.waitForTimeout(150);

    // Check ALL 45 always-visible Tier 1+2 cities & zero conflict cities when no battle is selected,
    // and zero label-label / label-dot / label-pin overlaps across key months at zoom 3
    for (const checkYm of ['1939-09', '1941-10', '1942-11', '1945-04']) {
      await page.evaluate((ym) => {
        window.__WW2_APP__.store.setMonthByStr(ym);
        window.__WW2_APP__.mapEngine.map.setView([34, 22], 3, { animate: false });
      }, checkYm);
      await page.waitForTimeout(80);
      const citiesCheck = await page.evaluate(() => {
        const pins = [...document.querySelectorAll('.city-pin')];
        const conflictPins = pins.filter((el) => el.getAttribute('data-city-conflict') === '1');
        const labels = [...document.querySelectorAll('.city-label')].map((el) => ({
          text: el.textContent,
          name: el.closest('.city-pin').getAttribute('data-city-name'),
          rect: el.getBoundingClientRect()
        }));
        const dots = pins.map((el) => ({
          name: el.getAttribute('data-city-name'),
          rect: el.querySelector('.city-dot').getBoundingClientRect()
        }));
        const battlePins = [...document.querySelectorAll('.battle-pin')].map((el) => ({
          id: el.getAttribute('data-battle-id'),
          rect: el.getBoundingClientRect()
        }));
        const tier12 = window.WW2_CITIES.ALWAYS_VISIBLE_CITIES.filter((c) => c.tier <= 2).map((c) => c.name);
        const missingTier12 = tier12.filter((n) => !labels.some((l) => l.name === n));
        const hit = (a, b) => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
        const overlaps = [];
        for (let i = 0; i < labels.length; i++) {
          for (let j = i + 1; j < labels.length; j++) {
            if (hit(labels[i].rect, labels[j].rect)) overlaps.push(`LBL:${labels[i].text}<->${labels[j].text}`);
          }
          for (const d of dots) {
            if (d.name !== labels[i].name && hit(labels[i].rect, d.rect)) overlaps.push(`DOT:${labels[i].text}<->${d.name}`);
          }
          for (const p of battlePins) {
            if (hit(labels[i].rect, p.rect)) overlaps.push(`PIN:${labels[i].text}<->${p.id}`);
          }
        }
        return { totalPins: pins.length, conflictCount: conflictPins.length, missingTier12, overlaps };
      });
      assert.ok(citiesCheck.totalPins >= 45, `Expected >=45 always-visible city pins at ${checkYm}, got ${citiesCheck.totalPins}`);
      assert.equal(citiesCheck.conflictCount, 0, `No conflict cities should be shown before selecting a battle (${checkYm})`);
      assert.deepEqual(citiesCheck.missingTier12, [], `All 45 major capitals & key cities must be labeled at zoom 3 (${checkYm}): missing ${citiesCheck.missingTier12.join(', ')}`);
      assert.deepEqual(citiesCheck.overlaps, [], `City label/dot/pin overlaps at zoom 3 (${checkYm}): ${citiesCheck.overlaps.join(', ')}`);
    }
    await page.evaluate(() => { window.__WW2_APP__.store.setMonthIndex(0); });
    await page.waitForTimeout(80);

    // Click an always-visible city marker (Париж) -> selects region without focus outline and keeps ArrowRight timeline shortcut working
    await page.locator('.city-pin[data-city-name="Париж"] .city-dot').click();
    await page.waitForTimeout(120);
    const parisClickState = await page.evaluate(() => ({
      selectedRegionId: window.__WW2_APP__.store.state.selectedRegionId,
      activeInsideMap: !!(document.activeElement && document.activeElement.closest && document.activeElement.closest('.leaflet-container'))
    }));
    assert.equal(parisClickState.selectedRegionId, 'france_north', 'Clicking Paris city marker should select France North');
    assert.equal(parisClickState.activeInsideMap, false, 'Clicking city marker must blur map element so no focus outline appears');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(80);
    assert.equal((await page.textContent('#hud-month-label')).trim(), 'Октябрь 1939', 'ArrowRight must still step month after clicking a city marker');
    await page.evaluate(() => {
      window.__WW2_APP__.store.clearSelection();
      window.__WW2_APP__.store.setMonthIndex(0);
    });
    await page.waitForTimeout(80);

    // Select Poland 1939 battle -> conflict cities ('Варшава', 'Вестерплатте (Гданьск)') appear; deselect -> disappear
    await page.locator('[data-battle-id="poland_1939"]').click();
    await page.waitForTimeout(200);
    const polandBattleCities = await page.evaluate(() =>
      [...document.querySelectorAll('.city-pin[data-city-conflict="1"]')].map((el) => el.getAttribute('data-city-name'))
    );
    assert.ok(polandBattleCities.includes('Варшава') && polandBattleCities.includes('Вестерплатте (Гданьск)'),
      `Expected Poland 1939 conflict cities, got ${polandBattleCities.join(', ')}`);
    await page.locator('#btn-back-month-overview').click();
    await page.waitForTimeout(150);
    const afterDeselectConflictCount = await page.locator('.city-pin[data-city-conflict="1"]').count();
    assert.equal(afterDeselectConflictCount, 0, 'Conflict cities must disappear when deselecting the battle');

    // 1b. Verify Finland remains neutral in 1939-12 while Winter War battle can still be selected; verify Vichy & neutral battle cards
    await page.evaluate(() => { window.__WW2_APP__.store.setMonthByStr('1939-12'); });
    await page.waitForTimeout(200);
    await page.evaluate(() => { window.__WW2_APP__.store.selectRegion('finland'); });
    await page.waitForTimeout(150);
    const finlandDec39 = await page.textContent('#sidebar-body');
    assert.ok(finlandDec39.includes('Финляндия') && finlandDec39.includes('Нейтральные'),
      'Finland must stay neutral in Dec 1939 during Winter War');
    await page.locator('[data-battle-id="winter_war_1939"]').click();
    await page.waitForTimeout(200);
    const winterWarCard = await page.textContent('#sidebar-body');
    assert.ok(winterWarCard.includes('Советско-финская война') && winterWarCard.includes('Финляндия'),
      'Winter War battle card should open even with neutral Finland');
    assert.equal(await page.locator('.versus-col--neutral').count(), 1, 'Winter War card must style neutral Side B');
    const winterWarCities = await page.evaluate(() =>
      [...document.querySelectorAll('.city-pin[data-city-conflict="1"]')].map((el) => el.getAttribute('data-city-name'))
    );
    assert.ok(winterWarCities.includes('Суомуссалми') && winterWarCities.includes('Выборг'),
      `Expected Winter War conflict cities, got ${winterWarCities.join(', ')}`);

    await page.evaluate(() => { window.__WW2_APP__.store.jumpToBattle('mers_el_kebir_1940'); });
    await page.waitForTimeout(150);
    assert.equal(await page.locator('.versus-col--vichy').count(), 1, 'Mers-el-Kebir card must style Vichy Side B');
    await page.evaluate(() => { window.__WW2_APP__.store.jumpToBattle('iran_1941'); });
    await page.waitForTimeout(150);
    assert.equal(await page.locator('.versus-col--neutral').count(), 1, 'Iran 1941 card must style neutral Side B');
    await page.evaluate(() => {
      window.__WW2_APP__.store.clearSelection();
      window.__WW2_APP__.mapEngine.map.setView([34, 22], 3, { animate: false });
    });
    await page.waitForTimeout(150);

    // 2. Scrub global timeline slider to Nov 1942 (index 38) -> Stalingrad & El Alamein
    await page.locator('#global-slider').evaluate((el) => {
      el.value = '38';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(250);
    assert.equal((await page.textContent('#hud-month-label')).trim(), 'Ноябрь 1942');

    // Verify Stalingrad tactical marker appears and clicking it opens full summary card
    const stalPin = page.locator('[data-battle-id="stalingrad_1942"]');
    await stalPin.waitFor({ state: 'visible', timeout: 5000 });
    await stalPin.click();
    await page.waitForTimeout(250);

    const sidebarText = await page.textContent('#sidebar-body');
    assert.ok(sidebarText.includes('Сталинградская битва'), 'Sidebar should show Stalingrad battle card');
    assert.ok(sidebarText.includes('Чуйков'), 'Sidebar should show commanders');
    assert.ok(sidebarText.includes('Паулюс'), 'Sidebar should show Axis commander');

    await page.screenshot({ path: path.join(SHOT_DIR, '02_global_1942_11_stalingrad_card.png') });

    // 3. Enter Stalingrad tactical mode via the Battle Card button
    await page.locator('#btn-enter-tactical').click();
    await page.waitForTimeout(1300); // allow flyTo animation

    assert.ok(!(await page.locator('#tactical-timeline-bar').evaluate((el) => el.classList.contains('is-hidden'))), 'Tactical timeline bar should be visible');
    assert.ok(await page.locator('#global-timeline-bar').evaluate((el) => el.classList.contains('is-hidden')), 'Global timeline bar should be hidden');

    // Verify tactical units & click one
    const unitCountP1 = await page.locator('.tac-unit-card').count();
    assert.ok(unitCountP1 >= 3, `Expected tactical units on Stalingrad phase 1, got ${unitCountP1}`);

    // Switch to Phase 3 (Operation Uranus)
    await page.locator('[data-tac-phase="2"]').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SHOT_DIR, '03_tactical_stalingrad_uranus.png') });

    // Click a tactical unit on the map
    await page.locator('.tac-unit-card').first().click();
    await page.waitForTimeout(200);
    const unitSidebar = await page.textContent('#sidebar-body');
    assert.ok(unitSidebar.includes('Боевая задача и действия в фазе'), 'Unit card should display mission');

    // 4. Test Midway tactical mode (verifies unobstructed antimeridian flyTo zoom & units render cleanly)
    await page.locator('[data-jump-tac="midway"]').click();
    await page.waitForTimeout(1400);
    const midwayProj = await page.evaluate(() => {
      const m = window.__WW2_APP__.mapEngine.map;
      const sb = document.getElementById('sidebar-panel').getBoundingClientRect();
      const pt = m.latLngToContainerPoint([29.6, -179.4]);
      return { x: pt.x, y: pt.y, sbLeft: sb.left, center: m.getCenter() };
    });
    assert.ok(midwayProj.x > 60 && midwayProj.x < midwayProj.sbLeft - 40,
      `Midway center must project into unobstructed map area, got x=${midwayProj.x} vs sbLeft=${midwayProj.sbLeft}`);
    const midwayUnits = await page.locator('.tac-unit-card').count();
    assert.ok(midwayUnits >= 4, `Expected >=4 units in Midway Phase 1, got ${midwayUnits}`);
    await page.screenshot({ path: path.join(SHOT_DIR, '04_tactical_midway.png') });

    // 5. Verify ALL 6 tactical battles & ALL phases have zero card/caption/landmark overlaps and stay unobstructed
    for (const tid of ['moscow', 'stalingrad', 'kursk', 'midway', 'normandy', 'berlin']) {
      await page.locator(`[data-jump-tac="${tid}"]`).click();
      await page.waitForTimeout(1250);
      const phaseCount = await page.locator('[data-tac-phase]').count();
      assert.ok(phaseCount >= 4, `${tid} must have >=4 phases`);
      for (let p = 0; p < phaseCount; p++) {
        await page.locator(`[data-tac-phase="${p}"]`).click();
        await page.waitForTimeout(850);
        const count = await page.locator('.tac-unit-card').count();
        assert.ok(count >= 3, `Expected >=3 units in ${tid} phase ${p + 1}, got ${count}`);
        const phaseIssues = await page.evaluate(() => {
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const sb = document.getElementById('sidebar-panel').getBoundingClientRect();
          const topHud = document.querySelector('.hud-top').getBoundingClientRect();
          const botBar = document.getElementById('tactical-timeline-bar').getBoundingClientRect();
          const zoomCtrl = document.querySelector('.leaflet-top.leaflet-left').getBoundingClientRect();
          const cards = [...document.querySelectorAll('.tac-unit-card')].map((el) => ({ id: el.getAttribute('data-unit-id'), rect: el.getBoundingClientRect() }));
          const captions = [...document.querySelectorAll('.tac-unit-caption')].map((el) => ({ text: el.textContent, rect: el.getBoundingClientRect() }));
          const landmarks = [...document.querySelectorAll('.tac-landmark-label')].map((el) => ({ text: el.textContent, rect: el.getBoundingClientRect() }));
          const hit = (a, b) => !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
          const clipped = (r) => r.left < 0 || r.top < 0 || r.right > vw || r.bottom > vh;
          const out = [];
          for (let i = 0; i < cards.length; i++) {
            for (let j = i + 1; j < cards.length; j++) if (hit(cards[i].rect, cards[j].rect)) out.push(`card:${cards[i].id}<->${cards[j].id}`);
            for (let k = 0; k < landmarks.length; k++) if (hit(cards[i].rect, landmarks[k].rect)) out.push(`card-lm:${cards[i].id}<->${landmarks[k].text}`);
            if (hit(cards[i].rect, sb) || hit(cards[i].rect, topHud) || hit(cards[i].rect, botBar) || hit(cards[i].rect, zoomCtrl)) out.push(`card-occluded:${cards[i].id}`);
            if (clipped(cards[i].rect)) out.push(`card-clipped:${cards[i].id}`);
          }
          for (let i = 0; i < captions.length; i++) {
            for (let j = i + 1; j < captions.length; j++) if (hit(captions[i].rect, captions[j].rect)) out.push(`cap:${captions[i].text}<->${captions[j].text}`);
            for (let k = 0; k < landmarks.length; k++) if (hit(captions[i].rect, landmarks[k].rect)) out.push(`cap-lm:${captions[i].text}<->${landmarks[k].text}`);
            if (hit(captions[i].rect, sb) || hit(captions[i].rect, topHud) || hit(captions[i].rect, botBar) || hit(captions[i].rect, zoomCtrl)) out.push(`cap-occluded:${captions[i].text}`);
            if (clipped(captions[i].rect)) out.push(`cap-clipped:${captions[i].text}`);
          }
          for (let i = 0; i < landmarks.length; i++) {
            if (hit(landmarks[i].rect, sb) || hit(landmarks[i].rect, topHud) || hit(landmarks[i].rect, botBar) || hit(landmarks[i].rect, zoomCtrl)) out.push(`lm-occluded:${landmarks[i].text}`);
            for (let j = i + 1; j < landmarks.length; j++) if (hit(landmarks[i].rect, landmarks[j].rect)) out.push(`lm:${landmarks[i].text}<->${landmarks[j].text}`);
          }
          return out;
        });
        assert.deepEqual(phaseIssues, [], `Tactical overlap issues in ${tid} phase ${p + 1}: ${phaseIssues.join(', ')}`);
      }
    }
    const berlinProj = await page.evaluate(() => {
      const m = window.__WW2_APP__.mapEngine.map;
      const sb = document.getElementById('sidebar-panel').getBoundingClientRect();
      const pt = m.latLngToContainerPoint([52.516, 13.382]);
      return { x: pt.x, sbLeft: sb.left, zoom: m.getZoom() };
    });
    assert.ok(berlinProj.zoom === 12 && berlinProj.x < berlinProj.sbLeft, 'Berlin phase 4 must zoom into city center unobstructed');
    await page.screenshot({ path: path.join(SHOT_DIR, '05_tactical_berlin.png') });

    // 6. Test Escape shortcut exits tactical mode back to global map
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1100);
    assert.ok(!(await page.locator('#global-timeline-bar').evaluate((el) => el.classList.contains('is-hidden'))), 'Global bar must return after Escape');

    // 6a. Test entering tactical mode when sidebar was collapsed (flyTo must reserve reopened sidebar width)
    await page.locator('#btn-toggle-sidebar').click();
    await page.waitForTimeout(350);
    await page.locator('[data-jump-tac="normandy"]').click();
    await page.waitForTimeout(1300);
    const collapsedJumpHits = await page.evaluate(() => {
      const sb = document.getElementById('sidebar-panel');
      const sbRect = sb.getBoundingClientRect();
      const hit = (a, b) => !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
      const els = [...document.querySelectorAll('.tac-unit-card, .tac-unit-caption, .tac-landmark-label')];
      return {
        isCollapsed: sb.classList.contains('is-collapsed'),
        overlaps: els.filter((el) => hit(el.getBoundingClientRect(), sbRect)).map((el) => el.textContent.trim() || el.getAttribute('data-unit-id'))
      };
    });
    assert.deepEqual(collapsedJumpHits, { isCollapsed: false, overlaps: [] },
      'enterTactical from collapsed sidebar must account for reopened sidebar width during flyTo');

    // 6b. Test jumpToBattle directly from tactical mode (zoom 12 -> global battle zoom 5, no savedGlobalView tug-of-war)
    await page.locator('[data-jump-tac="berlin"]').click();
    await page.waitForTimeout(1200);
    await page.locator('[data-tac-phase="3"]').click();
    await page.waitForTimeout(950);
    await page.locator('#battle-search-input').focus();
    await page.locator('#battle-search-input').fill('Эль-Аламейн');
    await page.waitForTimeout(150);
    await page.locator('[data-jump-battle="el_alamein_1942"]').click();
    await page.waitForTimeout(1200);
    const jumpFromTac = await page.evaluate(() => ({
      mode: window.__WW2_APP__.store.state.mode,
      zoom: window.__WW2_APP__.mapEngine.map.getZoom(),
      month: window.__WW2_APP__.store.getCurrentMonth().month
    }));
    assert.deepEqual(jumpFromTac, { mode: 'global', zoom: 5, month: '1942-10' },
      'jumpToBattle from tactical z=12 must cleanly transition to global battle zoom 5');

    // 7. Test theater filter + global search across all 70 battles + autoplay + ArrowRight pause
    await page.locator('[data-theater="pacific"]').click();
    await page.waitForTimeout(100);
    await page.locator('#battle-search-input').focus();
    await page.locator('#battle-search-input').fill('Курск');
    await page.waitForTimeout(150);
    await page.locator('[data-jump-battle="kursk_1943"]').click();
    await page.waitForTimeout(1050);
    assert.equal((await page.textContent('#hud-month-label')).trim(), 'Июль 1943');
    const kurskCitiesCheck = await page.evaluate(() => {
      const conflictPins = [...document.querySelectorAll('.city-pin[data-city-conflict="1"]')];
      const labels = [...document.querySelectorAll('.city-label')].map((el) => ({
        text: el.textContent,
        rect: el.getBoundingClientRect()
      }));
      const hit = (a, b) => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
      const overlaps = [];
      for (let i = 0; i < labels.length; i++) {
        for (let j = i + 1; j < labels.length; j++) {
          if (hit(labels[i].rect, labels[j].rect)) {
            overlaps.push(`${labels[i].text}<->${labels[j].text}`);
          }
        }
      }
      return {
        conflictNames: conflictPins.map((el) => el.getAttribute('data-city-name')),
        selectedTagCount: document.querySelectorAll('.battle-pin.is-selected .battle-pin-tag').length,
        overlaps
      };
    });
    assert.equal(kurskCitiesCheck.selectedTagCount, 0, 'Selected tactical battle pin should hide duplicate bottom tag');
    for (const cname of ['Курск', 'Орёл', 'Белгород', 'Харьков', 'Поныри', 'Прохоровка']) {
      assert.ok(kurskCitiesCheck.conflictNames.includes(cname), `Missing Kursk conflict city: ${cname}`);
    }
    assert.deepEqual(kurskCitiesCheck.overlaps, [], `City label overlap in Kursk view: ${kurskCitiesCheck.overlaps.join(', ')}`);

    // 7a. Audit ALL 70 battles at both zoom 3 and jumpToBattle zoom (4/5) for zero label-label, label-dot, and label-pin overlaps
    const all70Issues = await page.evaluate(() => {
      const store = window.__WW2_APP__.store;
      const map = window.__WW2_APP__.mapEngine.map;
      const hit = (a, b) => !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
      const issues = [];
      for (const b of store.battles) {
        for (const z of [3, b.theater === 'pacific' ? 4 : 5]) {
          store.setMonthByStr(b.monthStart);
          store.setTheaterFilter('all');
          store.selectBattle(b.id);
          map.setView([b.lat, b.lon], z, { animate: false });
          const conflictPins = [...document.querySelectorAll('.city-pin[data-city-conflict="1"]')].map((el) => el.getAttribute('data-city-name'));
          for (const c of b.cities) {
            if (!conflictPins.includes(c.name)) {
              issues.push(`${b.id}@z${z}:missing(${c.name})`);
            }
          }
          const labels = [...document.querySelectorAll('.city-label')].map((el) => ({
            text: el.textContent,
            name: el.closest('.city-pin').getAttribute('data-city-name'),
            rect: el.getBoundingClientRect()
          }));
          const dots = [...document.querySelectorAll('.city-pin')].map((el) => ({
            name: el.getAttribute('data-city-name'),
            rect: el.querySelector('.city-dot').getBoundingClientRect()
          }));
          const pins = [...document.querySelectorAll('.battle-pin')].map((el) => ({
            id: el.getAttribute('data-battle-id'),
            rect: el.getBoundingClientRect()
          }));
          for (let i = 0; i < labels.length; i++) {
            for (let j = i + 1; j < labels.length; j++) {
              if (hit(labels[i].rect, labels[j].rect)) issues.push(`${b.id}@z${z}:LBL(${labels[i].text}<->${labels[j].text})`);
            }
            for (const d of dots) {
              if (d.name !== labels[i].name && hit(labels[i].rect, d.rect)) issues.push(`${b.id}@z${z}:DOT(${labels[i].text}<->${d.name})`);
            }
            for (const p of pins) {
              if (hit(labels[i].rect, p.rect)) issues.push(`${b.id}@z${z}:PIN(${labels[i].text}<->${p.id})`);
            }
          }
        }
      }
      store.clearSelection();
      return issues;
    });
    assert.deepEqual(all70Issues, [], `All-70-battle city audit failed: ${all70Issues.join(', ')}`);

    await page.locator('#btn-speed-global').click();
    await page.locator('#btn-play-global').click();
    await page.waitForTimeout(600);
    assert.notEqual((await page.textContent('#hud-month-label')).trim(), 'Июль 1943', 'Autoplay should advance month');
    await page.keyboard.press('ArrowRight');
    const isPlayingAfterKey = await page.evaluate(() => window.__WW2_APP__.store.state.isPlayingGlobal);
    assert.equal(isPlayingAfterKey, false, 'ArrowRight must pause global autoplay');

    // Test layer toggles
    await page.locator('#btn-layer-frontlines').click();
    await page.locator('#btn-layer-rivers').click();
    await page.locator('#btn-layer-frontlines').click();
    await page.locator('#btn-layer-rivers').click();

    await page.locator('#global-slider').evaluate((el) => {
      el.value = '72';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(250);
    assert.equal((await page.textContent('#hud-month-label')).trim(), 'Сентябрь 1945');

    // 8. Test Legend, Sidebar collapse/reopen & narrow/mobile viewports (no HUD collisions)
    await page.locator('#btn-toggle-legend').click();
    assert.ok(!(await page.locator('#legend-popover').evaluate((el) => el.classList.contains('is-hidden'))), 'Legend should open');
    await page.locator('#btn-toggle-sidebar').click();
    assert.ok(await page.locator('#sidebar-panel').evaluate((el) => el.classList.contains('is-collapsed')), 'Sidebar should collapse');
    await page.locator('#btn-toggle-sidebar').click();
    assert.ok(!(await page.locator('#sidebar-panel').evaluate((el) => el.classList.contains('is-collapsed'))), 'Sidebar should reopen');

    for (const vp of [{ width: 1024, height: 500 }, { width: 800, height: 600 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(200);
      const layout = await page.evaluate(() => {
        const hud = document.querySelector('.hud-top').getBoundingClientRect();
        const sb = document.getElementById('sidebar-panel').getBoundingClientRect();
        const bot = document.getElementById('global-timeline-bar').getBoundingClientRect();
        const zoom = document.querySelector('.leaflet-top.leaflet-left').getBoundingClientRect();
        const leg = document.getElementById('legend-popover').getBoundingClientRect();
        return {
          hudOverlapsSb: hud.bottom > sb.top,
          sbOverlapsBot: sb.bottom > bot.top,
          hudOverlapsZoom: hud.bottom > zoom.top,
          hudOverlapsLegend: hud.bottom > leg.top,
          legendOverlapsBot: leg.bottom > bot.top
        };
      });
      assert.deepEqual(layout, {
        hudOverlapsSb: false,
        sbOverlapsBot: false,
        hudOverlapsZoom: false,
        hudOverlapsLegend: false,
        legendOverlapsBot: false
      },
        `Layout overlap at ${vp.width}x${vp.height}: ${JSON.stringify(layout)}`);
    }

    // Also verify Legend popover does not overlap HUD or tactical bar on narrow/short screens
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('[data-jump-tac="berlin"]').click();
    await page.waitForTimeout(1200);
    for (const vp of [{ width: 1024, height: 500 }, { width: 800, height: 600 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(250);
      const tacLayout = await page.evaluate(() => {
        const hud = document.querySelector('.hud-top').getBoundingClientRect();
        const bot = document.getElementById('tactical-timeline-bar').getBoundingClientRect();
        const leg = document.getElementById('legend-popover').getBoundingClientRect();
        return {
          hudOverlapsLegend: hud.bottom > leg.top,
          legendOverlapsBot: leg.bottom > bot.top
        };
      });
      assert.deepEqual(tacLayout, { hudOverlapsLegend: false, legendOverlapsBot: false },
        `Tactical legend overlap at ${vp.width}x${vp.height}: ${JSON.stringify(tacLayout)}`);
    }

    // 9. Verify fresh mobile 390x844 session auto-collapses sidebar and allows clean city/battle interaction
    const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mobilePage.route(/^https?:\/\//, (route) => route.abort());
    mobilePage.on('pageerror', (err) => errors.push(`mobile pageerror: ${err.message}`));
    await mobilePage.goto(INDEX_URL, { waitUntil: 'load' });
    await mobilePage.waitForSelector('.city-pin', { timeout: 8000 });
    const mobileSidebarCollapsed = await mobilePage.locator('#sidebar-panel').evaluate((el) => el.classList.contains('is-collapsed'));
    assert.equal(mobileSidebarCollapsed, true, 'Mobile 390x844 must initialize with sidebar collapsed');
    await mobilePage.close();

    assert.equal(errors.length, 0, `Browser errors detected:\n${errors.join('\n')}`);
    console.log('E2E file:// offline verification PASSED! Screenshots saved to:', SHOT_DIR);
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
