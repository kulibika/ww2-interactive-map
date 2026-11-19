// Always-visible world cities: capitals & 2 key cities for major WW2 powers, plus capitals of other notable countries
(function (root) {
  var ALWAYS_VISIBLE_CITIES = [
    // --- Major Countries (Tier 1 Capital + Tier 2 Two Key Cities each) ---
    // USSR
    { id: 'moscow', name: 'Москва', countryId: 'ussr', countryRu: 'СССР', lat: 55.755, lon: 37.617, isCapital: true, tier: 1, labelPos: 'right' },
    { id: 'leningrad', name: 'Ленинград', countryId: 'ussr', countryRu: 'СССР', lat: 59.934, lon: 30.335, isCapital: false, tier: 2, labelPos: 'left' },
    { id: 'stalingrad', name: 'Сталинград', countryId: 'ussr', countryRu: 'СССР', lat: 48.708, lon: 44.513, isCapital: false, tier: 2, labelPos: 'right' },

    // Germany
    { id: 'berlin', name: 'Берлин', countryId: 'germany', countryRu: 'Германия', lat: 52.520, lon: 13.405, isCapital: true, tier: 1, labelPos: 'top' },
    { id: 'hamburg', name: 'Гамбург', countryId: 'germany', countryRu: 'Германия', lat: 53.551, lon: 9.994, isCapital: false, tier: 2, labelPos: 'top-left' },
    { id: 'munich', name: 'Мюнхен', countryId: 'germany', countryRu: 'Германия', lat: 48.135, lon: 11.582, isCapital: false, tier: 2, labelPos: 'top-left' },

    // United Kingdom
    { id: 'london', name: 'Лондон', countryId: 'united_kingdom', countryRu: 'Великобритания', lat: 51.507, lon: -0.128, isCapital: true, tier: 1, labelPos: 'bottom-left' },
    { id: 'birmingham', name: 'Бирмингем', countryId: 'united_kingdom', countryRu: 'Великобритания', lat: 52.486, lon: -1.890, isCapital: false, tier: 2, labelPos: 'top-left' },
    { id: 'glasgow', name: 'Глазго', countryId: 'united_kingdom', countryRu: 'Великобритания', lat: 55.864, lon: -4.252, isCapital: false, tier: 2, labelPos: 'top' },

    // France
    { id: 'paris', name: 'Париж', countryId: 'france_north', countryRu: 'Франция', lat: 48.857, lon: 2.352, isCapital: true, tier: 1, labelPos: 'bottom-left' },
    { id: 'lyon', name: 'Лион', countryId: 'france_vichy', countryRu: 'Франция', lat: 45.764, lon: 4.836, isCapital: false, tier: 2, labelPos: 'left' },
    { id: 'marseille', name: 'Марсель', countryId: 'france_vichy', countryRu: 'Франция', lat: 43.296, lon: 5.370, isCapital: false, tier: 2, labelPos: 'bottom' },

    // Italy
    { id: 'rome', name: 'Рим', countryId: 'italy_north', countryRu: 'Италия', lat: 41.903, lon: 12.496, isCapital: true, tier: 1, labelPos: 'left' },
    { id: 'milan', name: 'Милан', countryId: 'italy_north', countryRu: 'Италия', lat: 45.464, lon: 9.190, isCapital: false, tier: 2, labelPos: 'bottom' },
    { id: 'naples', name: 'Неаполь', countryId: 'italy_south', countryRu: 'Италия', lat: 40.852, lon: 14.268, isCapital: false, tier: 2, labelPos: 'right' },

    // Poland
    { id: 'warsaw', name: 'Варшава', countryId: 'poland_west', countryRu: 'Польша', lat: 52.230, lon: 21.012, isCapital: true, tier: 1, labelPos: 'top' },
    { id: 'krakow', name: 'Краков', countryId: 'poland_west', countryRu: 'Польша', lat: 50.065, lon: 19.945, isCapital: false, tier: 2, labelPos: 'left' },
    { id: 'lwow', name: 'Львов', countryId: 'poland_east', countryRu: 'Польша', lat: 49.840, lon: 24.030, isCapital: false, tier: 2, labelPos: 'right' },

    // United States
    { id: 'washington', name: 'Вашингтон', countryId: 'united_states', countryRu: 'США', lat: 38.907, lon: -77.037, isCapital: true, tier: 1, labelPos: 'bottom' },
    { id: 'new_york', name: 'Нью-Йорк', countryId: 'united_states', countryRu: 'США', lat: 40.713, lon: -74.006, isCapital: false, tier: 2, labelPos: 'right' },
    { id: 'chicago', name: 'Чикаго', countryId: 'united_states', countryRu: 'США', lat: 41.878, lon: -87.630, isCapital: false, tier: 2, labelPos: 'left' },

    // Japan
    { id: 'tokyo', name: 'Токио', countryId: 'japan', countryRu: 'Японская империя', lat: 35.676, lon: 139.650, isCapital: true, tier: 1, labelPos: 'top' },
    { id: 'osaka', name: 'Осака', countryId: 'japan', countryRu: 'Японская империя', lat: 34.694, lon: 135.502, isCapital: false, tier: 2, labelPos: 'bottom' },
    { id: 'nagasaki', name: 'Нагасаки', countryId: 'japan', countryRu: 'Японская империя', lat: 32.750, lon: 129.878, isCapital: false, tier: 2, labelPos: 'left' },

    // Republic of China
    { id: 'chongqing', name: 'Чунцин', countryId: 'china', countryRu: 'Китайская Республика', lat: 29.563, lon: 106.551, isCapital: true, tier: 1, labelPos: 'left' },
    { id: 'shanghai', name: 'Шанхай', countryId: 'china', countryRu: 'Китайская Республика', lat: 31.230, lon: 121.474, isCapital: false, tier: 2, labelPos: 'right' },
    { id: 'beijing', name: 'Пекин', countryId: 'china', countryRu: 'Китайская Республика', lat: 39.904, lon: 116.407, isCapital: false, tier: 2, labelPos: 'top' },

    // Canada
    { id: 'ottawa', name: 'Оттава', countryId: 'canada', countryRu: 'Канада', lat: 45.421, lon: -75.697, isCapital: true, tier: 1, labelPos: 'top' },
    { id: 'toronto', name: 'Торонто', countryId: 'canada', countryRu: 'Канада', lat: 43.653, lon: -79.383, isCapital: false, tier: 2, labelPos: 'left' },
    { id: 'vancouver', name: 'Ванкувер', countryId: 'canada', countryRu: 'Канада', lat: 49.283, lon: -123.121, isCapital: false, tier: 2, labelPos: 'right' },

    // Australia
    { id: 'canberra', name: 'Канберра', countryId: 'australia', countryRu: 'Австралия', lat: -35.281, lon: 149.130, isCapital: true, tier: 1, labelPos: 'left' },
    { id: 'sydney', name: 'Сидней', countryId: 'australia', countryRu: 'Австралия', lat: -33.869, lon: 151.209, isCapital: false, tier: 2, labelPos: 'top' },
    { id: 'melbourne', name: 'Мельбурн', countryId: 'australia', countryRu: 'Австралия', lat: -37.814, lon: 144.963, isCapital: false, tier: 2, labelPos: 'bottom' },

    // British Raj (India)
    { id: 'new_delhi', name: 'Нью-Дели', countryId: 'british_raj', countryRu: 'Британская Индия', lat: 28.614, lon: 77.209, isCapital: true, tier: 1, labelPos: 'top' },
    { id: 'calcutta', name: 'Калькутта', countryId: 'british_raj', countryRu: 'Британская Индия', lat: 22.573, lon: 88.364, isCapital: false, tier: 2, labelPos: 'right' },
    { id: 'bombay', name: 'Бомбей', countryId: 'british_raj', countryRu: 'Британская Индия', lat: 19.076, lon: 72.878, isCapital: false, tier: 2, labelPos: 'left' },

    // Brazil
    { id: 'rio_de_janeiro', name: 'Рио-де-Жанейро', countryId: 'brazil', countryRu: 'Бразилия', lat: -22.907, lon: -43.173, isCapital: true, tier: 1, labelPos: 'right' },
    { id: 'sao_paulo', name: 'Сан-Паулу', countryId: 'brazil', countryRu: 'Бразилия', lat: -23.550, lon: -46.633, isCapital: false, tier: 2, labelPos: 'left' },
    { id: 'salvador', name: 'Салвадор', countryId: 'brazil', countryRu: 'Бразилия', lat: -12.971, lon: -38.511, isCapital: false, tier: 2, labelPos: 'right' },

    // Spain
    { id: 'madrid', name: 'Мадрид', countryId: 'spain', countryRu: 'Испания', lat: 40.417, lon: -3.704, isCapital: true, tier: 1, labelPos: 'top' },
    { id: 'barcelona', name: 'Барселона', countryId: 'spain', countryRu: 'Испания', lat: 41.387, lon: 2.169, isCapital: false, tier: 2, labelPos: 'right' },
    { id: 'seville', name: 'Севилья', countryId: 'spain', countryRu: 'Испания', lat: 37.389, lon: -5.984, isCapital: false, tier: 2, labelPos: 'bottom' },

    // Turkey
    { id: 'ankara', name: 'Анкара', countryId: 'turkey', countryRu: 'Турция', lat: 39.933, lon: 32.860, isCapital: true, tier: 1, labelPos: 'right' },
    { id: 'istanbul', name: 'Стамбул', countryId: 'turkey', countryRu: 'Турция', lat: 41.008, lon: 28.978, isCapital: false, tier: 2, labelPos: 'top' },
    { id: 'izmir', name: 'Измир', countryId: 'turkey', countryRu: 'Турция', lat: 38.424, lon: 27.143, isCapital: false, tier: 2, labelPos: 'left' },

    // --- Other Country Capitals (Tier 3: dot always shown, label shown when non-overlapping) ---
    { id: 'helsinki', name: 'Хельсинки', countryId: 'finland', countryRu: 'Финляндия', lat: 60.170, lon: 24.938, isCapital: true, tier: 3, labelPos: 'left' },
    { id: 'stockholm', name: 'Стокгольм', countryId: 'sweden', countryRu: 'Швеция', lat: 59.329, lon: 18.069, isCapital: true, tier: 3, labelPos: 'top' },
    { id: 'oslo', name: 'Осло', countryId: 'norway', countryRu: 'Норвегия', lat: 59.914, lon: 10.752, isCapital: true, tier: 3, labelPos: 'left' },
    { id: 'copenhagen', name: 'Копенгаген', countryId: 'denmark', countryRu: 'Дания', lat: 55.676, lon: 12.568, isCapital: true, tier: 3, labelPos: 'top' },
    { id: 'dublin', name: 'Дублин', countryId: 'ireland', countryRu: 'Ирландия', lat: 53.350, lon: -6.260, isCapital: true, tier: 3, labelPos: 'left' },
    { id: 'lisbon', name: 'Лиссабон', countryId: 'portugal', countryRu: 'Португалия', lat: 38.722, lon: -9.139, isCapital: true, tier: 3, labelPos: 'left' },
    { id: 'amsterdam', name: 'Амстердам', countryId: 'netherlands', countryRu: 'Нидерланды', lat: 52.368, lon: 4.904, isCapital: true, tier: 3, labelPos: 'top' },
    { id: 'brussels', name: 'Брюссель', countryId: 'belgium', countryRu: 'Бельгия', lat: 50.850, lon: 4.352, isCapital: true, tier: 3, labelPos: 'left' },
    { id: 'bern', name: 'Берн', countryId: 'switzerland', countryRu: 'Швейцария', lat: 46.948, lon: 7.447, isCapital: true, tier: 3, labelPos: 'left' },
    { id: 'vienna', name: 'Вена', countryId: 'austria', countryRu: 'Австрия', lat: 48.208, lon: 16.374, isCapital: true, tier: 3, labelPos: 'left' },
    { id: 'prague', name: 'Прага', countryId: 'bohemia_moravia', countryRu: 'Богемия и Моравия', lat: 50.075, lon: 14.438, isCapital: true, tier: 3, labelPos: 'right' },
    { id: 'bratislava', name: 'Братислава', countryId: 'slovakia', countryRu: 'Словакия', lat: 48.149, lon: 17.107, isCapital: true, tier: 3, labelPos: 'bottom' },
    { id: 'budapest', name: 'Будапешт', countryId: 'hungary', countryRu: 'Венгрия', lat: 47.498, lon: 19.040, isCapital: true, tier: 3, labelPos: 'right' },
    { id: 'bucharest', name: 'Бухарест', countryId: 'romania', countryRu: 'Румыния', lat: 44.427, lon: 26.103, isCapital: true, tier: 3, labelPos: 'right' },
    { id: 'sofia', name: 'София', countryId: 'bulgaria', countryRu: 'Болгария', lat: 42.698, lon: 23.322, isCapital: true, tier: 3, labelPos: 'bottom' },
    { id: 'belgrade', name: 'Белград', countryId: 'yugoslavia', countryRu: 'Югославия', lat: 44.817, lon: 20.460, isCapital: true, tier: 3, labelPos: 'left' },
    { id: 'athens', name: 'Афины', countryId: 'greece', countryRu: 'Греция', lat: 37.984, lon: 23.728, isCapital: true, tier: 3, labelPos: 'bottom' },
    { id: 'cairo', name: 'Каир', countryId: 'egypt', countryRu: 'Египет', lat: 30.044, lon: 31.236, isCapital: true, tier: 3, labelPos: 'right' },
    { id: 'tehran', name: 'Тегеран', countryId: 'iran', countryRu: 'Иран', lat: 35.689, lon: 51.389, isCapital: true, tier: 3, labelPos: 'right' },
    { id: 'baghdad', name: 'Багдад', countryId: 'iraq', countryRu: 'Ирак', lat: 33.315, lon: 44.366, isCapital: true, tier: 3, labelPos: 'right' },
    { id: 'riyadh', name: 'Эр-Рияд', countryId: 'saudi_arabia', countryRu: 'Саудовская Аравия', lat: 24.714, lon: 46.675, isCapital: true, tier: 3, labelPos: 'right' },
    { id: 'kabul', name: 'Кабул', countryId: 'afghanistan', countryRu: 'Афганистан', lat: 34.555, lon: 69.208, isCapital: true, tier: 3, labelPos: 'right' },
    { id: 'bangkok', name: 'Бангкок', countryId: 'siam', countryRu: 'Таиланд (Сиам)', lat: 13.756, lon: 100.502, isCapital: true, tier: 3, labelPos: 'right' },
    { id: 'manila', name: 'Манила', countryId: 'philippines', countryRu: 'Филиппины', lat: 14.599, lon: 120.984, isCapital: true, tier: 3, labelPos: 'right' },
    { id: 'batavia', name: 'Батавия', countryId: 'dutch_east_indies', countryRu: 'Голландская Ост-Индия', lat: -6.209, lon: 106.846, isCapital: true, tier: 3, labelPos: 'bottom' },
    { id: 'seoul', name: 'Сеул', countryId: 'korea', countryRu: 'Корея', lat: 37.567, lon: 126.978, isCapital: true, tier: 3, labelPos: 'left' },
    { id: 'ulaanbaatar', name: 'Улан-Батор', countryId: 'mongolia', countryRu: 'Монголия', lat: 47.886, lon: 106.906, isCapital: true, tier: 3, labelPos: 'top' },
    { id: 'wellington', name: 'Веллингтон', countryId: 'new_zealand', countryRu: 'Новая Зеландия', lat: -41.287, lon: 174.776, isCapital: true, tier: 3, labelPos: 'left' },
    { id: 'mexico_city', name: 'Мехико', countryId: 'mexico', countryRu: 'Мексика', lat: 19.433, lon: -99.133, isCapital: true, tier: 3, labelPos: 'right' },
    { id: 'buenos_aires', name: 'Буэнос-Айрес', countryId: 'argentina', countryRu: 'Аргентина', lat: -34.604, lon: -58.382, isCapital: true, tier: 3, labelPos: 'left' },
    { id: 'pretoria', name: 'Претория', countryId: 'union_of_south_africa', countryRu: 'Южно-Африканский Союз', lat: -25.748, lon: 28.229, isCapital: true, tier: 3, labelPos: 'right' },
    { id: 'addis_ababa', name: 'Аддис-Абеба', countryId: 'ethiopia_italy', countryRu: 'Эфиопия', lat: 9.030, lon: 38.740, isCapital: true, tier: 3, labelPos: 'right' },
    { id: 'algiers', name: 'Алжир', countryId: 'algeria_france', countryRu: 'Алжир', lat: 36.753, lon: 3.059, isCapital: true, tier: 3, labelPos: 'bottom' }
  ];

  var payload = { ALWAYS_VISIBLE_CITIES: ALWAYS_VISIBLE_CITIES };
  if (typeof module !== 'undefined' && module.exports) { module.exports = payload; }
  root.WW2_CITIES = payload;
})(typeof window !== 'undefined' ? window : globalThis);
