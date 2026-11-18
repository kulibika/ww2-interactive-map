// 73 months (September 1939 - September 1945): monthly geopolitical control, summaries & animated theater frontlines
(function (root) {
  var FACTION_META = {
    allies: {
      id: 'allies',
      label: 'Союзники (Антигитлеровская коалиция)',
      shortLabel: 'Союзники',
      color: '#2c6da8',
      border: '#5a9bd5',
      fillOpacity: 0.62
    },
    ussr_prewar: {
      id: 'ussr_prewar',
      label: 'СССР (1939–июнь 1941, до вступления в войну с Германией)',
      shortLabel: 'СССР (1939–VI.1941)',
      color: '#9c4135',
      border: '#c96557',
      fillOpacity: 0.62
    },
    ussr: {
      id: 'ussr',
      label: 'СССР (Антигитлеровская коалиция, с 22.06.1941)',
      shortLabel: 'СССР',
      color: '#c23b2b',
      border: '#eb6c5d',
      fillOpacity: 0.66
    },
    china: {
      id: 'china',
      label: 'Китайская Республика (союзники в войне против Японии)',
      shortLabel: 'Китай',
      color: '#2a8579',
      border: '#4eb3a6',
      fillOpacity: 0.62
    },
    axis: {
      id: 'axis',
      label: 'Страны «Оси» и союзники (Германия, Италия, Япония и др.)',
      shortLabel: 'Ось',
      color: '#3f4354',
      border: '#727894',
      fillOpacity: 0.72
    },
    axis_occupied: {
      id: 'axis_occupied',
      label: 'Территории, оккупированные державами «Оси»',
      shortLabel: 'Оккуп. Осью',
      color: '#5a454b',
      border: '#995c66',
      fillOpacity: 0.68
    },
    vichy: {
      id: 'vichy',
      label: 'Режим Виши (Франция и колонии, 1940–1942)',
      shortLabel: 'Виши',
      color: '#735970',
      border: '#a1829d',
      fillOpacity: 0.64
    },
    allies_occupied: {
      id: 'allies_occupied',
      label: 'Зоны оккупации Союзников (Германия/Япония, 1945)',
      shortLabel: 'Оккуп. Союзников',
      color: '#46749e',
      border: '#7bb1e0',
      fillOpacity: 0.64
    },
    neutral: {
      id: 'neutral',
      label: 'Нейтральные государства',
      shortLabel: 'Нейтральные',
      color: '#9c9278',
      border: '#bfb59b',
      fillOpacity: 0.50
    }
  };

  // Baseline control on 1939-09 for all 173 features in world_1939.js
  var INITIAL_FACTIONS = {
    // Axis & Axis spheres (Sept 1, 1939)
    germany: 'axis',
    austria: 'axis',
    bohemia_moravia: 'axis',
    slovakia: 'axis',
    italy_north: 'axis', // Pact of Steel / non-belligerent until June 10, 1940
    italy_south: 'axis',
    libya: 'axis',
    eritrea_italy: 'axis',
    ethiopia_italy: 'axis',
    italian_somaliland: 'axis',
    albania: 'axis', // Occupied/annexed by Italy in April 1939
    japan: 'axis',
    korea: 'axis',
    manchukuo: 'axis',
    taiwan: 'axis',
    japanese_mandate: 'axis',

    // USSR & Mongolia
    ussr: 'ussr_prewar',
    mongolia: 'ussr_prewar',

    // China fighting Japan since 1937
    china: 'china',
    xinjiang: 'china',

    // Allies at war in Sept 1939 (Britain, Commonwealth, France & empires, Poland)
    united_kingdom: 'allies',
    canada: 'allies',
    australia: 'allies',
    new_zealand: 'allies',
    union_of_south_africa: 'allies',
    dominion_of_newfoundland: 'allies',
    british_raj: 'allies',
    burma: 'allies',
    ceylon: 'allies',
    malaysia: 'allies',
    brunei: 'allies',
    hong_kong: 'allies',
    egypt: 'allies',
    sudan: 'allies',
    mandatory_palestine_gb: 'allies',
    transjordan: 'allies',
    iraq: 'allies',
    kuwait: 'allies',
    muscat_and_oman: 'allies',
    trucial_oman: 'allies',
    qatar: 'allies',
    yemen_uk: 'allies',
    british_somaliland: 'allies',
    kenya: 'allies',
    uganda: 'allies',
    tanzania_united_republic_of: 'allies',
    northern_rhodesia: 'allies',
    southern_rhodesia: 'allies',
    botswana: 'allies',
    swaziland: 'allies',
    lesotho: 'allies',
    malawi: 'allies',
    walbis_bay: 'allies',
    nigeria: 'allies',
    gold_coast: 'allies',
    sierra_leone: 'allies',
    gambia_the: 'allies',
    fiji: 'allies',
    gilbert_and_ellice_islands: 'allies',
    solomon_islands: 'allies',
    tonga: 'allies',
    niue: 'allies',
    samoa: 'allies',
    bahamas: 'allies',
    barbados: 'allies',
    belize: 'allies',
    guyana: 'allies',
    jamaica: 'allies',
    trinidad: 'allies',
    dominica: 'allies',
    grenada: 'allies',
    antigua_and_barbuda: 'allies',
    anguilla: 'allies',
    montserrat: 'allies',
    saint_kitts_and_nevis: 'allies',
    saint_lucia: 'allies',
    saint_vincent_and_the_grenadines: 'allies',
    turks_and_caicos_islands: 'allies',

    france_north: 'allies',
    france_vichy: 'allies',
    algeria_france: 'allies',
    morocco_france: 'allies',
    tunisia: 'allies',
    french_west_africa: 'allies',
    french_equatorial_africa: 'allies',
    french_cameroons: 'allies',
    congo_france: 'allies',
    madagascar_france: 'allies',
    french_somaliland: 'allies',
    syria_lebanon: 'allies',
    french_indochina: 'allies',
    french_guiana: 'allies',
    guadeloupe: 'allies',
    martinique: 'allies',
    saint_barthelemy: 'allies',
    saint_martin: 'allies',
    new_caledonia: 'allies',
    new_hebrides: 'allies',
    wallis_and_futuna_islands: 'allies',
    togo: 'allies',

    poland_west: 'allies',
    poland_east: 'allies',

    // Neutral states in Sept 1939 (including USA, neutrals of Europe, Baltics, Balkans, Latin America)
    united_states: 'neutral',
    philippines: 'neutral',
    puerto_rico: 'neutral',
    united_states_virgin_islands: 'neutral',
    guam: 'neutral',
    wake_island: 'neutral',
    american_samoa: 'neutral',
    netherlands: 'neutral',
    dutch_east_indies: 'neutral',
    suriname: 'neutral',
    netherlands_antilles: 'neutral',
    belgium: 'neutral',
    belgian_congo: 'neutral',
    burundi: 'neutral',
    rwanda_belgium: 'neutral',
    luxembourg: 'neutral',
    denmark: 'neutral',
    iceland: 'neutral',
    greenland: 'neutral',
    norway: 'neutral',
    sweden: 'neutral',
    finland: 'neutral',
    estonia: 'neutral',
    latvia: 'neutral',
    lithuania: 'neutral',
    ireland: 'neutral',
    switzerland: 'neutral',
    spain: 'neutral',
    spanish_sahara: 'neutral',
    rio_de_oro: 'neutral',
    equatorial_guinea: 'neutral',
    portugal: 'neutral',
    angola_portugal: 'neutral',
    mozambique_portugal: 'neutral',
    guinea_bissau: 'neutral',
    andorra: 'neutral',
    hungary: 'neutral',
    romania: 'neutral',
    bulgaria: 'neutral',
    yugoslavia: 'neutral',
    greece: 'neutral',
    turkey: 'neutral',
    iran: 'neutral',
    saudi_arabia: 'neutral',
    afghanistan: 'neutral',
    liberia: 'neutral',
    rapa_nui: 'neutral',
    nepal: 'allies',
    bhutan: 'allies',
    tibet: 'neutral',
    siam: 'neutral',
    mexico: 'neutral',
    cuba: 'neutral',
    haiti: 'neutral',
    dominican_republic: 'neutral',
    guatemala: 'neutral',
    honduras: 'neutral',
    el_salvador: 'neutral',
    nicaragua: 'neutral',
    costa_rica: 'neutral',
    panama: 'neutral',
    colombia: 'neutral',
    venezuela: 'neutral',
    ecuador: 'neutral',
    peru: 'neutral',
    bolivia: 'neutral',
    brazil: 'neutral',
    paraguay: 'neutral',
    uruguay: 'neutral',
    chile: 'neutral',
    argentina: 'neutral'
  };

  // Monthly faction changes applied sequentially from 1939-09 to 1945-09
  var FACTION_CHANGES = {
    '1939-10': {
      poland_west: 'axis_occupied',
      poland_east: 'ussr_prewar'
    },
    '1939-12': {
      finland: 'allies' // Winter War: Finland fighting USSR (shown distinct from USSR_prewar)
    },
    '1940-03': {
      finland: 'neutral' // Moscow Peace Treaty
    },
    '1940-04': {
      denmark: 'axis_occupied',
      norway: 'axis_occupied',
      greenland: 'allies'
    },
    '1940-05': {
      iceland: 'allies',
      netherlands: 'axis_occupied',
      belgium: 'axis_occupied',
      luxembourg: 'axis_occupied',
      dutch_east_indies: 'allies',
      suriname: 'allies',
      netherlands_antilles: 'allies',
      belgian_congo: 'allies',
      burundi: 'allies',
      rwanda_belgium: 'allies'
    },
    '1940-06': {
      france_north: 'axis_occupied',
      france_vichy: 'vichy',
      algeria_france: 'vichy',
      morocco_france: 'vichy',
      tunisia: 'vichy',
      french_west_africa: 'vichy',
      french_equatorial_africa: 'vichy',
      french_cameroons: 'vichy',
      congo_france: 'vichy',
      madagascar_france: 'vichy',
      french_somaliland: 'vichy',
      syria_lebanon: 'vichy',
      french_indochina: 'vichy',
      french_guiana: 'vichy',
      guadeloupe: 'vichy',
      martinique: 'vichy',
      togo: 'vichy',
      estonia: 'ussr_prewar',
      latvia: 'ussr_prewar',
      lithuania: 'ussr_prewar'
    },
    '1940-08': {
      british_somaliland: 'axis_occupied',
      french_equatorial_africa: 'allies',
      french_cameroons: 'allies',
      congo_france: 'allies',
      new_caledonia: 'allies',
      new_hebrides: 'allies'
    },
    '1940-09': {
      french_indochina: 'axis_occupied'
    },
    '1940-10': {
      greece: 'allies'
    },
    '1940-11': {
      hungary: 'axis',
      romania: 'axis'
    },
    '1941-03': {
      bulgaria: 'axis',
      british_somaliland: 'allies'
    },
    '1941-04': {
      yugoslavia: 'axis_occupied',
      greece: 'axis_occupied',
      eritrea_italy: 'allies'
    },
    '1941-05': {
      ethiopia_italy: 'allies',
      italian_somaliland: 'allies',
      iraq: 'allies'
    },
    '1941-06': {
      ussr: 'ussr',
      mongolia: 'ussr',
      finland: 'axis',
      syria_lebanon: 'allies',
      poland_east: 'axis_occupied'
    },
    '1941-07': {
      estonia: 'axis_occupied',
      latvia: 'axis_occupied',
      lithuania: 'axis_occupied'
    },
    '1941-08': {
      iran: 'allies'
    },
    '1941-12': {
      united_states: 'allies',
      puerto_rico: 'allies',
      united_states_virgin_islands: 'allies',
      american_samoa: 'allies',
      philippines: 'allies',
      guam: 'axis_occupied',
      wake_island: 'axis_occupied',
      hong_kong: 'axis_occupied',
      siam: 'axis',
      cuba: 'allies',
      panama: 'allies',
      costa_rica: 'allies',
      dominican_republic: 'allies',
      el_salvador: 'allies',
      guatemala: 'allies',
      haiti: 'allies',
      honduras: 'allies',
      nicaragua: 'allies'
    },
    '1942-02': {
      malaysia: 'axis_occupied',
      brunei: 'axis_occupied'
    },
    '1942-03': {
      dutch_east_indies: 'axis_occupied'
    },
    '1942-04': {
      burma: 'axis_occupied'
    },
    '1942-05': {
      philippines: 'axis_occupied',
      solomon_islands: 'axis_occupied',
      gilbert_and_ellice_islands: 'axis_occupied',
      mexico: 'allies'
    },
    '1942-08': {
      brazil: 'allies'
    },
    '1942-11': {
      france_vichy: 'axis_occupied',
      algeria_france: 'allies',
      morocco_france: 'allies',
      french_west_africa: 'allies',
      togo: 'allies',
      madagascar_france: 'allies',
      tunisia: 'axis_occupied'
    },
    '1942-12': {
      french_somaliland: 'allies'
    },
    '1943-01': {
      libya: 'allies'
    },
    '1943-05': {
      tunisia: 'allies'
    },
    '1943-07': {
      guadeloupe: 'allies',
      martinique: 'allies',
      french_guiana: 'allies'
    },
    '1943-09': {
      italy_south: 'allies',
      italy_north: 'axis'
    },
    '1943-11': {
      gilbert_and_ellice_islands: 'allies',
      solomon_islands: 'allies'
    },
    '1944-01': {
      liberia: 'allies'
    },
    '1944-07': {
      guam: 'allies'
    },
    '1944-08': {
      france_north: 'allies',
      france_vichy: 'allies',
      poland_east: 'ussr',
      romania: 'ussr'
    },
    '1944-09': {
      belgium: 'allies',
      luxembourg: 'allies',
      bulgaria: 'ussr',
      finland: 'allies',
      estonia: 'ussr'
    },
    '1944-10': {
      greece: 'allies',
      latvia: 'ussr',
      lithuania: 'ussr',
      yugoslavia: 'allies'
    },
    '1944-11': {
      albania: 'allies'
    },
    '1945-01': {
      poland_west: 'ussr'
    },
    '1945-02': {
      hungary: 'ussr',
      turkey: 'allies',
      peru: 'allies',
      ecuador: 'allies',
      paraguay: 'allies',
      uruguay: 'allies',
      venezuela: 'allies'
    },
    '1945-03': {
      philippines: 'allies',
      saudi_arabia: 'allies',
      argentina: 'allies'
    },
    '1945-04': {
      slovakia: 'ussr',
      austria: 'allies'
    },
    '1945-05': {
      germany: 'allies_occupied',
      bohemia_moravia: 'allies',
      italy_north: 'allies',
      denmark: 'allies',
      norway: 'allies',
      netherlands: 'allies',
      burma: 'allies'
    },
    '1945-08': {
      manchukuo: 'ussr',
      korea: 'allies',
      malaysia: 'allies',
      brunei: 'allies',
      dutch_east_indies: 'allies',
      french_indochina: 'allies',
      hong_kong: 'allies',
      siam: 'allies'
    },
    '1945-09': {
      japan: 'allies_occupied',
      taiwan: 'china',
      wake_island: 'allies',
      japanese_mandate: 'allies'
    }
  };

  // Helper to generate Pacific defensive perimeter / frontline polyline [lat, lon]
  var PACIFIC_FRONTS = {
    '1941-12': [[46, 152], [32, 165], [19.3, 166.6], [13.5, 145], [14, 122], [7, 106], [5, 100]],
    '1942-01': [[48, 154], [30, 168], [19.3, 166.6], [8, 171], [-4, 152], [2, 125], [3, 103], [14, 98]],
    '1942-02': [[48, 154], [26, 170], [19.3, 166.6], [6, 172], [-6, 155], [-8, 120], [-6, 105], [16, 97]],
    '1942-03': [[49, 155], [24, 172], [19.3, 166.6], [3, 173], [-8, 158], [-10, 125], [-8, 105], [18, 96]],
    '1942-04': [[50, 156], [26, 173], [19.3, 166.6], [2, 174], [-9, 160], [-10, 130], [-9, 105], [21, 94]],
    '1942-05': [[52, 165], [30, 176], [20, 170], [1, 175], [-10, 161], [-9, 145], [-10, 120], [22, 93]],
    '1942-06': [[53, 174], [32, 179], [20, 170], [1, 174], [-9.5, 160.5], [-8.5, 147], [-10, 120], [22, 93]],
    '1942-07': [[53, 174], [30, 174], [19.3, 166.6], [1, 174], [-9.5, 160.5], [-9.0, 147.5], [-10, 120], [22, 93]],
    '1942-08': [[53, 173], [28, 172], [19.3, 166.6], [1, 173], [-9.3, 160.0], [-9.0, 147.5], [-10, 120], [22, 93]],
    '1942-09': [[53, 173], [28, 172], [19.3, 166.6], [1, 173], [-9.2, 159.8], [-9.0, 147.3], [-10, 120], [22, 93]],
    '1942-10': [[53, 173], [28, 172], [19.3, 166.6], [1, 173], [-9.1, 159.5], [-8.8, 147.5], [-10, 120], [22, 93]],
    '1942-11': [[53, 173], [28, 172], [19.3, 166.6], [1, 173], [-8.8, 159.0], [-8.6, 148.0], [-10, 120], [22, 93]],
    '1942-12': [[53, 173], [28, 172], [19.3, 166.6], [1, 173], [-8.5, 158.5], [-8.2, 148.0], [-10, 120], [22, 93]],
    '1943-01': [[53, 173], [28, 171], [19.3, 166.6], [1, 173], [-8.2, 158.0], [-7.5, 147.5], [-10, 120], [22, 93]],
    '1943-02': [[53, 173], [28, 171], [19.3, 166.6], [1, 173], [-7.8, 157.0], [-7.2, 147.0], [-10, 120], [22, 93]],
    '1943-05': [[52, 170], [27, 170], [19.3, 166.6], [1, 173], [-7.4, 156.5], [-6.8, 146.5], [-10, 120], [22, 93]],
    '1943-08': [[51, 157], [26, 168], [19.3, 166.6], [1, 173], [-6.8, 156.0], [-6.5, 146.0], [-10, 120], [22, 93]],
    '1943-11': [[51, 157], [25, 167], [19.3, 166.6], [5, 169], [-6.0, 154.5], [-5.5, 144.5], [-10, 120], [22, 93]],
    '1944-02': [[51, 157], [24, 164], [10, 160], [6, 151], [-4.5, 143], [-10, 120], [23, 93]],
    '1944-04': [[51, 157], [22, 158], [10, 150], [4, 141], [-2.5, 140], [-9, 120], [24, 94]],
    '1944-06': [[51, 157], [22, 148], [15, 144], [5, 136], [-1, 135], [-9, 120], [24, 94]],
    '1944-07': [[51, 157], [24, 145], [14, 142], [4, 134], [-1, 132], [-9, 120], [23, 94]],
    '1944-09': [[50, 156], [26, 142], [14, 134], [6, 129], [-2, 126], [-9, 118], [22, 95]],
    '1944-10': [[50, 156], [26, 142], [15, 128], [10.5, 125], [2, 122], [-9, 118], [21, 95]],
    '1944-12': [[50, 156], [26, 141], [16, 124], [12, 121], [2, 118], [-9, 115], [21, 95]],
    '1945-01': [[50, 156], [26, 141], [17, 121], [14, 120], [2, 116], [-9, 114], [20, 95]],
    '1945-02': [[50, 156], [25, 141.3], [19, 121], [14, 120], [2, 115], [-9, 113], [20, 95]],
    '1945-03': [[50, 156], [26.5, 136], [20, 121], [13, 119], [2, 115], [-9, 113], [19, 96]],
    '1945-04': [[50, 156], [27.5, 128], [21, 121], [10, 118], [1, 115], [-9, 113], [18, 96.5]],
    '1945-05': [[50, 156], [28.0, 127.5], [21, 120], [8, 116], [-1, 116], [-9, 113], [16, 97]],
    '1945-06': [[50, 156], [28.5, 127.0], [21, 119], [5, 116], [-2, 116], [-9, 113], [14, 98]],
    '1945-07': [[50, 156], [30.0, 128.0], [22, 119], [5, 114], [-3, 114], [-9, 112], [13, 98]],
    '1945-08': [[46, 143], [43, 129], [39, 123], [32, 122], [23, 116], [14, 108]]
  };

  function getPacificFront(ym) {
    if (ym < '1941-12' || ym === '1945-09') return null;
    var keys = Object.keys(PACIFIC_FRONTS).sort();
    var chosen = keys[0];
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] <= ym) chosen = keys[i];
    }
    return PACIFIC_FRONTS[chosen];
  }

  var CHINA_FRONT_BASE = [[41.0, 112.0], [38.5, 112.2], [35.2, 113.5], [32.0, 111.5], [30.2, 114.2], [26.5, 113.8], [23.0, 112.5]];
  var CHINA_FRONT_ICHIGO = [[41.0, 111.5], [38.5, 111.5], [34.0, 110.5], [30.8, 111.5], [27.5, 110.2], [24.5, 108.5], [22.0, 107.2]];

  var NORTH_AFRICA_FRONTS = {
    '1940-09': [[31.6, 25.9], [30.5, 25.6]],
    '1940-12': [[31.5, 25.0], [30.0, 24.8]],
    '1941-01': [[32.8, 21.8], [31.2, 21.0]],
    '1941-02': [[30.8, 18.2], [29.5, 18.5]],
    '1941-04': [[31.8, 25.0], [30.5, 24.7]],
    '1941-12': [[31.1, 18.6], [29.8, 18.8]],
    '1942-02': [[32.1, 23.4], [31.0, 23.3]],
    '1942-06': [[31.4, 27.2], [29.8, 27.0]],
    '1942-07': [[30.8, 28.9], [29.8, 28.8]],
    '1942-10': [[30.8, 28.9], [29.8, 28.8]],
    '1942-11': [[32.0, 20.0], [30.8, 19.6]],
    '1943-01': [[33.1, 11.4], [32.2, 10.6]],
    '1943-03': [[34.2, 10.0], [33.5, 9.6]],
    '1943-04': [[37.0, 9.8], [36.4, 10.4]]
  };

  var WESTERN_ITALY_FRONTS = {
    '1939-09': { western: [[51.2, 20.8], [52.4, 21.0], [50.2, 19.6]] }, // Polish campaign
    '1940-05': { western: [[51.1, 2.4], [50.2, 3.2], [49.7, 4.8], [49.1, 6.2]] },
    '1943-07': { italy: [[38.1, 14.8], [37.5, 15.0], [37.0, 14.9]] },
    '1943-08': { italy: [[38.2, 15.5], [37.8, 15.6]] },
    '1943-09': { italy: [[40.9, 14.1], [41.1, 15.4], [41.3, 16.2]] },
    '1943-12': { italy: [[41.3, 13.7], [41.7, 14.1], [42.3, 14.4]] },
    '1944-05': { italy: [[41.5, 13.2], [42.0, 13.8], [42.4, 14.2]] },
    '1944-06': { western: [[49.6, -1.8], [49.3, -1.1], [49.2, -0.3]], italy: [[42.9, 10.6], [43.2, 12.1], [43.5, 13.5]] },
    '1944-07': { western: [[49.3, -1.6], [48.9, -1.0], [49.1, -0.2]], italy: [[43.7, 10.3], [43.6, 12.0], [43.8, 13.2]] },
    '1944-08': { western: [[49.4, 0.2], [48.9, 2.3], [47.9, 3.5], [44.2, 5.2]], italy: [[43.9, 10.2], [44.0, 12.6]] },
    '1944-09': { western: [[51.4, 4.8], [51.0, 5.8], [49.8, 6.1], [48.4, 6.9], [47.6, 7.2]], italy: [[44.1, 10.1], [44.2, 12.4]] },
    '1944-12': { western: [[51.8, 5.2], [50.4, 5.7], [50.1, 5.9], [49.5, 6.3], [48.4, 7.6]], italy: [[44.2, 10.2], [44.4, 12.2]] },
    '1945-02': { western: [[51.8, 6.0], [50.8, 6.4], [49.6, 6.5], [48.7, 7.7]], italy: [[44.3, 10.2], [44.4, 12.2]] },
    '1945-03': { western: [[51.8, 6.8], [50.7, 7.3], [49.8, 8.2], [48.9, 8.3]], italy: [[44.4, 10.3], [44.5, 12.2]] },
    '1945-04': { western: [[53.5, 9.8], [52.2, 11.6], [51.5, 12.3], [50.2, 12.0], [48.2, 11.5]], italy: [[45.5, 9.2], [45.6, 12.0]] }
  };

  var MONTH_DETAILS = [
    { month: '1939-09', label: 'Сентябрь 1939', phaseTag: 'Начало Второй мировой войны', summary: '1 сентября Германия вторгается в Польшу. 3 сентября Великобритания и Франция объявляют войну Германии. 17 сентября СССР вводит войска в Восточную Польшу.' },
    { month: '1939-10', label: 'Октябрь 1939', phaseTag: 'Раздел Польши и «Странная война»', summary: 'Капитуляция последних польских частей (Коцк, 6 октября). Западная Польша под контролем Рейха, Восточная — СССР. На Западном фронте устанавливается позиционное затишье.' },
    { month: '1939-11', label: 'Ноябрь 1939', phaseTag: '«Странная война»', summary: 'Окончание польской кампании. 30 ноября начинается Советско-финская (Зимняя) война; боевые действия разворачиваются в Карелии и Заполярье.' },
    { month: '1939-12', label: 'Декабрь 1939', phaseTag: 'Зимняя война и Атлантика', summary: 'Тяжёлые бои на линии Маннергейма в Финляндии. В Южной Атлантике происходит бой у залива Ла-Плата и затопление немецкого крейсера «Адмирал граф Шпее».' },
    { month: '1940-01', label: 'Январь 1940', phaseTag: 'Зимняя война', summary: 'Перегруппировка Красной армии на Карельском перешейке, подготовка прорыва линии Маннергейма; морская блокада Германии в Северном море.' },
    { month: '1940-02', label: 'Февраль 1940', phaseTag: 'Прорыв линии Маннергейма', summary: '11 февраля советские войска начинают мощное наступление на Карельском перешейке и прорывают главную полосу финской обороны.' },
    { month: '1940-03', label: 'Март 1940', phaseTag: 'Окончание Зимней войны', summary: '12 марта подписан Московский мирный договор между СССР и Финляндией. Германия готовит операцию «Везерюбунг» против Дании и Норвегии.' },
    { month: '1940-04', label: 'Апрель 1940', phaseTag: 'Вторжение в Скандинавию', summary: '9 апреля вермахт оккупирует Данию и высаживается в Норвегии. Англо-французские войска и флот вступают в бои за Нарвик и Центральную Норвегию.' },
    { month: '1940-05', label: 'Май 1940', phaseTag: 'Блицкриг на Западе', summary: '10 мая Германия вторгается в Нидерланды, Бельгию, Люксембург и Францию. Танковый прорыв через Арденны к Ла-Маншу отрезает союзные армии; эвакуация из Дюнкерка.' },
    { month: '1940-06', label: 'Июнь 1940', phaseTag: 'Падение Франции', summary: '10 июня Италия вступает в войну. 14 июня падает Париж, 22 июня подписано Компьенское перемирие: север Франции оккупирован, на юге создан режим Виши. СССР присоединяет Прибалтику и Бессарабию.' },
    { month: '1940-07', label: 'Июль 1940', phaseTag: 'Битва за Британию', summary: 'Люфтваффе начинает воздушное наступление на британские конвои и аэродромы. Британский флот нейтрализует французские корабли в Мерс-эль-Кебире.' },
    { month: '1940-08', label: 'Август 1940', phaseTag: 'Воздушная битва над Англией', summary: '«День орла» и кульминация налётов Люфтваффе на базы RAF. Итальянские войска занимают Британское Сомали; Французская Экваториальная Африка переходит на сторону де Голля.' },
    { month: '1940-09', label: 'Сентябрь 1940', phaseTag: 'Битва за Британию и Северная Африка', summary: 'Провал планов высадки вермахта в Британии («Морской лев»). Италия вторгается в Египет; Япония вводит войска в северный Индокитай и подписывает Тройственный пакт.' },
    { month: '1940-10', label: 'Октябрь 1940', phaseTag: 'Вторжение в Грецию', summary: '28 октября Италия нападает на Грецию, но встречает упорное сопротивление в горах Эпира. Бомбардировки Лондона переходят в ночной «Блиц».' },
    { month: '1940-11', label: 'Ноябрь 1940', phaseTag: 'Расширение блока Оси', summary: 'Греческие войска отбрасывают итальянцев в Албанию; британская авиация наносит удар по Таранто. Венгрия, Румыния и Словакия присоединяются к Тройственному пакту.' },
    { month: '1940-12', label: 'Декабрь 1940', phaseTag: 'Операция «Компас»', summary: 'Британские войска генерала О’Коннора громят итальянскую 10-ю армию при Сиди-Баррани и наступают в Ливию. Гитлер утверждает директиву «Барбаросса».' },
    { month: '1941-01', label: 'Январь 1941', phaseTag: 'Разгром итальянцев в Киренаике', summary: 'Союзники берут Бардию и Тобрук, продвигаясь по побережью Ливии. Британское наступление начинается в Восточной Африке (Эритрея и Эфиопия).' },
    { month: '1941-02', label: 'Февраль 1941', phaseTag: 'Прибытие Африканского корпуса', summary: 'Разгром остатков итальянской 10-й армии при Беда-Фомме. В Триполи высаживается немецкий Африканский корпус Эрвина Роммеля.' },
    { month: '1941-03', label: 'Март 1941', phaseTag: 'Матапан и Восточная Африка', summary: 'Болгария присоединяется к Оси; США принимают закон о ленд-лизе. Ройял Нэви громит итальянский флот у мыса Матапан; союзники отвоёвывают Британское Сомали.' },
    { month: '1941-04', label: 'Апрель 1941', phaseTag: 'Балканская кампания', summary: '6 апреля вермахт вторгается в Югославию и Грецию. Роммель оттесняет британцев к границе Египта и осаждает Тобрук; падение Асмэры в Эритрее.' },
    { month: '1941-05', label: 'Май 1941', phaseTag: 'Крит и гибель «Бисмарка»', summary: 'Немецкий воздушный десант захватывает Крит. В Атлантике потоплен линкор «Бисмарк». Британцы восстанавливают контроль над Ираком и освобождают Эфиопию.' },
    { month: '1941-06', label: 'Июнь 1941', phaseTag: 'Начало Великой Отечественной войны', summary: '22 июня Германия и её союзники вторгаются в СССР (операция «Барбаросса»). Стремительное продвижение в Прибалтике, Белоруссии (Минск) и на Украине.' },
    { month: '1941-07', label: 'Июль 1941', phaseTag: 'Смоленское сражение', summary: 'Упорные бои под Смоленском задерживают группу армий «Центр». На Украине разворачивается битва за Киев; в Прибалтике бои идут на подступах к Ленинграду.' },
    { month: '1941-08', label: 'Август 1941', phaseTag: 'Оборона Ленинграда и Киева', summary: 'Советско-британский ввод войск в Иран открывает южный коридор ленд-лиза. Под Смоленском советские войска контратакуют под Ельней; немцы выходят к Днепру и Новгороду.' },
    { month: '1941-09', label: 'Сентябрь 1941', phaseTag: 'Киев, блокада Ленинграда, подступы к Москве', summary: 'Немецкие войска замыкают сухопутную блокаду Ленинграда. Крупное окружение советских армий под Киевом. 30 сентября начинается наступление на Москву («Тайфун»).' },
    { month: '1941-10', label: 'Октябрь 1941', phaseTag: 'Битва за Москву: прорыв к столице', summary: 'Окружения под Вязьмой и Брянском, падение Калинина, Калуги и Харькова. 20 октября в Москве введено осадное положение; героическая оборона на Можайской линии.' },
    { month: '1941-11', label: 'Ноябрь 1941', phaseTag: 'Кризис под Москвой и Тобрук', summary: 'Парад 7 ноября на Красной площади. Немцы подходят к каналу Москва—Волга, но остановлены под Тулой и на северном фланге. Британская операция «Крусейдер» в Ливии.' },
    { month: '1941-12', label: 'Декабрь 1941', phaseTag: 'Контрнаступление под Москвой и Пёрл-Харбор', summary: '5–6 декабря Красная армия переходит в контрнаступление и отбрасывает вермахт от Москвы. 7 декабря Япония атакует Пёрл-Харбор — война становится по-настоящему глобальной.' },
    { month: '1942-01', label: 'Январь 1942', phaseTag: 'Общее наступление под Москвой и Азия', summary: 'Советские войска наступают под Москвой и Ржевом. На Тихом океане Япония занимает Манилу, Куала-Лумпур и высаживается в Рабауле; победа Китая при Чанше.' },
    { month: '1942-02', label: 'Февраль 1942', phaseTag: 'Падение Сингапура', summary: '15 февраля падает британская крепость Сингапур. Сражение в Яванском море открывает Японии путь к Голландской Ост-Индии.' },
    { month: '1942-03', label: 'Март 1942', phaseTag: 'Завоевание Ост-Индии и Бирмы', summary: 'Капитуляция союзников на Яве, падение Рангуна в Бирме. На Восточном фронте стабилизация на ржевско-вяземском выступе и под Ленинградом.' },
    { month: '1942-04', label: 'Апрель 1942', phaseTag: 'Рейд Дулиттла и Бирма', summary: 'Американские бомбардировщики B-25 совершают символический налёт на Токио. Япония завершает разгром союзников на Батаане и в центральной Бирме.' },
    { month: '1942-05', label: 'Май 1942', phaseTag: 'Коралловое море и Харьков', summary: 'Первое в истории сражение авианосцев в Коралловом море срывает высадку японцев в Порт-Морсби. На Восточном фронте неудача советского наступления под Харьковом и в Крыму.' },
    { month: '1942-06', label: 'Июнь 1942', phaseTag: 'Битва за Мидуэй и Газала', summary: '4–7 июня флот США топит 4 японских авианосца у атолла Мидуэй — перелом на Тихом океане. В Африке Роммель берёт Тобрук; на юге СССР начинается летнее наступление вермахта.' },
    { month: '1942-07', label: 'Июль 1942', phaseTag: 'Прорыв к Сталинграду и Кавказу', summary: 'Падение Севастополя и Ростова. Немецкая группа армий «Б» прорывается в излучину Дона к Сталинграду, группа «А» идёт на Кавказ. В Египте фронт остановлен у Эль-Аламейна.' },
    { month: '1942-08', label: 'Август 1942', phaseTag: 'Сталинград и Гуадалканал', summary: 'Немецкие части выходят к Волге севернее Сталинграда и на перевалы Кавказа. 7 августа американская морская пехота высаживается на Гуадалканале (Соломоновы о-ва).' },
    { month: '1942-09', label: 'Сентябрь 1942', phaseTag: 'Уличные бои в Сталинграде', summary: 'Ожесточённые бои за Мамаев курган, вокзал и заводы Сталинграда. Упорная борьба в проливе Слот и на Хендерсон-Филд на Гуадалканале.' },
    { month: '1942-10', label: 'Октябрь 1942', phaseTag: 'Эль-Аламейн и штурм заводов', summary: '23 октября 8-я британская армия Монтгомери начинает решающее наступление при Эль-Аламейне. В Сталинграде 62-я армия Чуйкова удерживает берег Волги.' },
    { month: '1942-11', label: 'Ноябрь 1942', phaseTag: 'Операция «Уран» и «Факел»', summary: '8 ноября союзники высаживаются в Марокко и Алжире; немцы оккупируют зону Виши. 19 ноября Красная армия начинает операцию «Уран» и окружает 6-ю армию под Сталинградом.' },
    { month: '1942-12', label: 'Декабрь 1942', phaseTag: 'Разгром «Зимней грозы» и Средний Дон', summary: 'Отражение попытки Манштейна деблокировать Сталинград, операция «Малый Сатурн» и освобождение Котельниково. Союзники наступают в Тунисе и Ливии.' },
    { month: '1943-01', label: 'Январь 1943', phaseTag: 'Операция «Кольцо» и прорыв блокады Ленинграда', summary: '18 января прорыв блокады Ленинграда («Искра»). Освобождение Воронежа, Кавказа и Триполи. 31 января Паулюс сдаётся в южном котле Сталинграда.' },
    { month: '1943-02', label: 'Февраль 1943', phaseTag: 'Победа под Сталинградом и Гуадалканал', summary: '2 февраля капитуляция остатков 6-й армии в Сталинграде. Японцы эвакуируются с Гуадалканала. Контрудар Манштейна под Харьковом в конце месяца.' },
    { month: '1943-03', label: 'Март 1943', phaseTag: 'Ликвидация Ржевского выступа и Атлантика', summary: 'Стабилизация фронта на линии Северский Донец — Курский выступ. Пик Битвы за Атлантику: критические бои за конвои SC-122 и HX-229.' },
    { month: '1943-04', label: 'Апрель 1943', phaseTag: 'Подготовка летней кампании', summary: 'Весенняя распутица на Восточном фронте. В Тунисе союзники сжимают кольцо вокруг группы армий «Африка». В Тихом океане ликвидирован адмирал Ямамото.' },
    { month: '1943-05', label: 'Май 1943', phaseTag: 'Капитуляция в Тунисе и перелом в Атлантике', summary: '13 мая капитуляция итало-немецких войск в Тунисе — Африка полностью очищена. «Чёрный май» для кригсмарине: Дёниц отзывает подлодки из Северной Атлантики.' },
    { month: '1943-06', label: 'Июнь 1943', phaseTag: 'Затишье перед Курском и Сицилией', summary: 'Обе стороны концентрируют бронетанковые резервы на Курской дуге. Союзная авиация и флот готовят высадку на Сицилию; в Тихом океане бои за Нью-Джорджию.' },
    { month: '1943-07', label: 'Июль 1943', phaseTag: 'Курская дуга и высадка на Сицилии', summary: '5 июля начинается битва на Курской дуге (сражение под Прохоровкой 12 июля). 10 июля союзники высаживаются на Сицилии; 25 июля падение режима Муссолини.' },
    { month: '1943-08', label: 'Август 1943', phaseTag: 'Освобождение Орла, Белгорода и Харькова', summary: 'Победа Красной армии на Курской дуге, освобождение Орла, Белгорода и Харькова, начало битвы за Днепр. Союзники завершают взятие Сицилии.' },
    { month: '1943-09', label: 'Сентябрь 1943', phaseTag: 'Выход к Днепру и перемирие Италии', summary: '8 сентября капитуляция Италии; немцы занимают север и центр страны (ИСР). Советские армии форсируют Днепр; освобождены Новороссийск и Смоленск.' },
    { month: '1943-10', label: 'Октябрь 1943', phaseTag: 'Битва за Днепр', summary: 'Ожесточённые бои за плацдармы на правом берегу Днепра и прорыв линии «Вотан» к Мелитополю. В Италии фронт стабилизируется у линии Густава.' },
    { month: '1943-11', label: 'Ноябрь 1943', phaseTag: 'Освобождение Киева и битва за Тараву', summary: '6 ноября освобождён Киев. Десанты США на Бугенвиле и кровавый штурм атолла Тарава (о-ва Гилберта) открывают наступление через Центральный Тихий океан.' },
    { month: '1943-12', label: 'Декабрь 1943', phaseTag: 'Правобережная Украина', summary: 'Начало Днепровско-Карпатской стратегической наступательной операции (Житомирско-Бердичевская). На Тихом океане бои на Новой Британии.' },
    { month: '1944-01', label: 'Январь 1944', phaseTag: 'Полное снятие блокады Ленинграда и Анцио', summary: '27 января полностью снята блокада Ленинграда. На Украине окружение немецкой группировки у Корсуня. Союзники высаживаются под Анцио и штурмуют Монте-Кассино.' },
    { month: '1944-02', label: 'Февраль 1944', phaseTag: 'Корсунь-Шевченковский и Маршалловы о-ва', summary: 'Ликвидация корсуньского котла. США берут Кваджалейн и Эниветок на Маршалловых островах, мощный удар по базе Трук.' },
    { month: '1944-03', label: 'Март 1944', phaseTag: 'Выход к Пруту и битва при Импхале', summary: '«Удар десяти фронтов» на Правобережной Украине: освобождены Херсон, Винница, Черновцы; Красная армия выходит на границу Румынии. Японское наступление в Индии у Импхала.' },
    { month: '1944-04', label: 'Апрель 1944', phaseTag: 'Освобождение Одессы и операция «Ити-Го»', summary: 'Освобождение Одессы и прорыв в Крым. В Китае Япония начинает крупнейшее сухопутное наступление «Ити-Го». Союзники высаживаются в Холландии (Новая Гвинея).' },
    { month: '1944-05', label: 'Май 1944', phaseTag: 'Освобождение Крыма и прорыв под Кассино', summary: '9 мая освобождён Севастополь. В Италии союзники прорывают линию Густава при Монте-Кассино и соединяются с плацдармом Анцио.' },
    { month: '1944-06', label: 'Июнь 1944', phaseTag: 'День «Д», «Багратион» и Марианские о-ва', summary: '6 июня высадка союзников в Нормандии («Оверлорд»). 4 июня взят Рим. 15 июня высадка на Сайпане и разгром японского авианосного флота в Филиппинском море. 23 июня старт операции «Багратион».' },
    { month: '1944-07', label: 'Июль 1944', phaseTag: 'Разгром группы армий «Центр» и Сен-Ло', summary: 'Освобождение Минска, Вильнюса, Львова; выход Красной армии к Висле. В Нормандии операция «Кобра» прорывает немецкий фронт. Взятие Сайпана и Гуама.' },
    { month: '1944-08', label: 'Август 1944', phaseTag: 'Париж, Ясско-Кишинёвский котёл', summary: 'Фалезский котёл, высадка в Провансе и освобождение Парижа (25 августа). В Ясско-Кишинёвской операции разгромлена группа армий «Южная Украина»; Румыния выходит из Оси.' },
    { month: '1944-09', label: 'Сентябрь 1944', phaseTag: 'Рывок к Рейну и выход Болгарии и Финляндии', summary: 'Освобождение Бельгии, провал воздушно-десантной операции «Маркет Гарден» в Арнеме. Финляндия и Болгария подписывают перемирие с СССР; прорыв в Прибалтике.' },
    { month: '1944-10', label: 'Октябрь 1944', phaseTag: 'Белград, Рига и залив Лейте', summary: 'Освобождение Риги, Петсамо и Белграда; бои в Венгрии. В Тихом океане высадка США на о. Лейте и крупнейшее морское сражение в истории — разгром Императорского флота.' },
    { month: '1944-11', label: 'Ноябрь 1944', phaseTag: 'Битва в Хюртгенвальде и Будапешт', summary: 'Советские войска штурмуют подступы к Будапешту и очищают Моонзундский архипелаг. На Западе тяжёлые бои в Эльзасе, Лотарингии и Хюртгенском лесу.' },
    { month: '1944-12', label: 'Декабрь 1944', phaseTag: 'Арденны и окружение Будапешта', summary: '16 декабря последнее крупное контрнаступление вермахта на Западе (битва в Арденнах). Окружение немецко-венгерской группировки в Будапеште.' },
    { month: '1945-01', label: 'Январь 1945', phaseTag: 'Висло-Одерская операция и Арденны', summary: '12 января старт Висло-Одерской операции: освобождена Варшава, Красная армия выходит к Одеру и Восточной Пруссии. На Западе ликвидирован Арденнский выступ; высадка на Лусоне.' },
    { month: '1945-02', label: 'Февраль 1945', phaseTag: 'Ялта, Будапешт и Иводзима', summary: 'Ялтинская конференция. Падение Будапешта (13 февраля), бои в Померании и Силезии. 19 февраля высадка морской пехоты США на Иводзиме.' },
    { month: '1945-03', label: 'Март 1945', phaseTag: 'Переправа через Рейн и освобождение Манилы', summary: 'Союзники захватывают мост в Ремагене и форсируют Рейн, окружая Рур. Завершение взятия Иводзимы и Манилы; Красная армия отражает контрудар у Балатона.' },
    { month: '1945-04', label: 'Апрель 1945', phaseTag: 'Битва за Берлин, Эльба и Окинава', summary: '1 апреля высадка США на Окинаве. Взятие Кёнигсберга и Вены. 16 апреля начало Берлинской операции; 25 апреля встреча на Эльбе у Торгау; 30 апреля самоубийство Гитлера.' },
    { month: '1945-05', label: 'Май 1945', phaseTag: 'Победа в Европе', summary: '2 мая падение Берлина. 7–8 мая подписание акта о безоговорочной капитуляции Германии (9 мая в СССР — День Победы). Освобождение Праги и Рангуна; тяжёлые бои на Окинаве.' },
    { month: '1945-06', label: 'Июнь 1945', phaseTag: 'Окончание битвы за Окинаву', summary: '22 июня завершается кровопролитная битва за Окинаву. В Европе начинается управление оккупированной Германией и подготовка Потсдамской конференции.' },
    { month: '1945-07', label: 'Июль 1945', phaseTag: 'Потсдам и морская блокада Японии', summary: 'Потсдамская конференция (17 июля — 2 августа) принимает Потсдамскую декларацию. Союзная авиация и флот наносят удары по метрополии Японии; испытание ядерной бомбы в США.' },
    { month: '1945-08', label: 'Август 1945', phaseTag: 'Маньчжурская операция и атомные бомбардировки', summary: '6 и 9 августа атомные бомбардировки Хиросимы и Нагасаки. 8 августа СССР объявляет войну Японии и громит Квантунскую армию в Маньчжурии. 15 августа заявление о капитуляции Японии.' },
    { month: '1945-09', label: 'Сентябрь 1945', phaseTag: 'Окончание Второй мировой войны', summary: '2 сентября 1945 года на борту линкора «Миссури» подписан Акт о капитуляции Японии. Вторая мировая война официально завершена.' }
  ];

  // Precompute all 73 months' faction tables and frontlines cleanly
  function buildMonthlyStates(eastFronts) {
    var states = [];
    var current = Object.assign({}, INITIAL_FACTIONS);

    // Helper to get latest front <= month from a map
    function pickLatest(obj, ym, maxGapStop) {
      var keys = Object.keys(obj).sort();
      var chosen = null;
      for (var i = 0; i < keys.length; i++) {
        if (keys[i] <= ym) chosen = keys[i];
      }
      if (!chosen) return null;
      if (maxGapStop && ym >= maxGapStop) return null;
      return obj[chosen];
    }

    for (var i = 0; i < MONTH_DETAILS.length; i++) {
      var m = MONTH_DETAILS[i];
      var ym = m.month;
      if (FACTION_CHANGES[ym]) {
        var patch = FACTION_CHANGES[ym];
        var pkeys = Object.keys(patch);
        for (var j = 0; j < pkeys.length; j++) {
          current[pkeys[j]] = patch[pkeys[j]];
        }
      }

      // Build frontlines list for this month
      var fronts = [];
      if (eastFronts && eastFronts[ym]) {
        // Convert [lon, lat] -> [lat, lon]
        var eCoords = eastFronts[ym].map(function (pt) { return [pt[1], pt[0]]; });
        fronts.push({
          id: 'eastern',
          theater: 'Восточный фронт',
          style: ym >= '1943-01' ? 'ussr' : 'axis',
          label: 'Линия Восточного фронта (' + m.label + ')',
          coords: eCoords
        });
      }

      var pac = getPacificFront(ym);
      if (pac) {
        fronts.push({
          id: 'pacific',
          theater: 'Тихий океан',
          style: ym >= '1943-06' ? 'allies' : 'axis',
          label: 'Периметр японской обороны / Тихоокеанский фронт',
          coords: pac
        });
      }

      if (ym < '1945-09') {
        fronts.push({
          id: 'china',
          theater: 'Китай',
          style: 'axis',
          label: 'Линия фронта в Китае',
          coords: ym >= '1944-05' ? CHINA_FRONT_ICHIGO : CHINA_FRONT_BASE
        });
      }

      var na = (ym >= '1940-09' && ym <= '1943-05') ? pickLatest(NORTH_AFRICA_FRONTS, ym, '1943-05') : null;
      if (na) {
        fronts.push({
          id: 'north_africa',
          theater: 'Северная Африка',
          style: ym >= '1942-11' ? 'allies' : 'axis',
          label: 'Североафриканский фронт',
          coords: na
        });
      }

      var wi = pickLatest(WESTERN_ITALY_FRONTS, ym, '1945-05');
      if (wi) {
        if (wi.western && (ym === '1939-09' || ym === '1940-05' || ym >= '1944-06')) {
          fronts.push({
            id: 'western',
            theater: 'Западный фронт',
            style: ym >= '1944-06' ? 'allies' : 'axis',
            label: ym === '1939-09' ? 'Фронт в Польше' : 'Западный фронт',
            coords: wi.western
          });
        }
        if (wi.italy && ym >= '1943-07') {
          fronts.push({
            id: 'italy',
            theater: 'Итальянский фронт',
            style: 'allies',
            label: 'Итальянский фронт',
            coords: wi.italy
          });
        }
      }

      states.push({
        index: i,
        month: ym,
        label: m.label,
        phaseTag: m.phaseTag,
        summary: m.summary,
        factions: Object.assign({}, current),
        frontlines: fronts
      });
    }
    return states;
  }

  var eastFronts = (root.WW2_WORLD_DATA && root.WW2_WORLD_DATA.EAST_FRONTS) || null;
  if (!eastFronts && typeof require === 'function') {
    try { eastFronts = require('./world_1939.js').EAST_FRONTS; } catch (e) {}
  }

  var MONTHS = buildMonthlyStates(eastFronts);

  var payload = {
    FACTION_META: FACTION_META,
    MONTHS: MONTHS,
    INITIAL_FACTIONS: INITIAL_FACTIONS,
    FACTION_CHANGES: FACTION_CHANGES,
    buildMonthlyStates: buildMonthlyStates
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = payload; }
  root.WW2_TIMELINE = payload;
})(typeof window !== 'undefined' ? window : globalThis);
