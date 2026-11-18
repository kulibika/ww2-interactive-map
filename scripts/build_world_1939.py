#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build cleaned September 1, 1939 world GeoJSON + major rivers + land-clipped
monthly occupation polygons for WW2 Interactive Map (file:// bundle).
"""
import json
import os
import urllib.request
from shapely.geometry import shape, mapping, Polygon, MultiPolygon, LineString, box
from shapely.ops import unary_union

CACHE_DIR = os.path.join(os.environ.get('TEMP', '/tmp'), 'ww2_build')
os.makedirs(CACHE_DIR, exist_ok=True)

OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data'))
os.makedirs(OUT_DIR, exist_ok=True)

URLS = {
    'world_1938.geojson': 'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/world_1938.geojson',
    'world_1945.geojson': 'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/world_1945.geojson',
    'rivers_50m.geojson': 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_rivers_lake_centerlines.geojson',
}

def fetch_cached(name):
    path = os.path.join(CACHE_DIR, name)
    if not os.path.exists(path):
        print(f'Downloading {name}...')
        req = urllib.request.Request(URLS[name], headers={'User-Agent': 'Mozilla/5.0'})
        with open(path, 'wb') as f:
            f.write(urllib.request.urlopen(req, timeout=30).read())
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def round_coords(coords, prec=3):
    if not coords:
        return coords
    if isinstance(coords[0], (int, float)):
        return [round(coords[0], prec), round(coords[1], prec)]
    return [round_coords(c, prec) for c in coords]

def clean_geom(geom, tol=0.04, min_area=0.0005):
    if geom.is_empty:
        return None
    g = geom.buffer(0)
    if tol > 0:
        g = g.simplify(tol, preserve_topology=True).buffer(0)
    if g.is_empty:
        return None
    if g.geom_type == 'Polygon':
        return g if g.area >= min_area else None
    if g.geom_type == 'MultiPolygon':
        parts = [p for p in g.geoms if p.area >= min_area]
        if not parts:
            # Keep largest if it's a tiny island nation
            parts = [max(g.geoms, key=lambda p: p.area)]
        if len(parts) == 1:
            return parts[0]
        return MultiPolygon(parts)
    if g.geom_type == 'GeometryCollection':
        polys = [x for x in g.geoms if x.geom_type in ('Polygon', 'MultiPolygon') and x.area >= min_area]
        if not polys:
            return None
        return unary_union(polys)
    return None

def to_feature(fid, name_en, name_ru, subject, group, geom, tol=0.04, min_area=0.0005):
    cg = clean_geom(geom, tol=tol, min_area=min_area)
    if cg is None or cg.is_empty:
        return None
    m = mapping(cg)
    m['coordinates'] = round_coords(m['coordinates'], 3)
    return {
        'type': 'Feature',
        'properties': {
            'id': fid,
            'name': name_en,
            'nameRu': name_ru,
            'subject': subject,
            'group': group,
        },
        'geometry': m,
    }

# Russian translations for world_1938 countries/colonies
RU_NAMES = {
    'Afghanistan': 'Афганистан',
    'Albania': 'Албания (Итал.)',
    'Algeria (France)': 'Алжир (Франция)',
    'American Samoa': 'Американское Самоа (США)',
    'Andorra': 'Андорра',
    'Angola (Portugal)': 'Ангола (Португалия)',
    'Anguilla': 'Ангилья (Брит.)',
    'Antigua and Barbuda': 'Антигуа и Барбуда (Брит.)',
    'Argentina': 'Аргентина',
    'Australia': 'Австралия',
    'Bahamas': 'Багамские о-ва (Брит.)',
    'Barbados': 'Барбадос (Брит.)',
    'Belgian Congo': 'Бельгийское Конго',
    'Belgium': 'Бельгия',
    'Belize': 'Британский Гондурас',
    'Bhutan': 'Бутан',
    'Bolivia': 'Боливия',
    'Botswana': 'Бечуаналенд (Брит.)',
    'Brazil': 'Бразилия',
    'British Somaliland': 'Британское Сомали',
    'Brunei': 'Бруней (Брит.)',
    'Bulgaria': 'Болгария',
    'Burundi': 'Руанда-Урунди (Бельг.)',
    'Canada': 'Канада',
    'Ceylon': 'Цейлон (Брит.)',
    'Chile': 'Чили',
    'Chinese warlords': 'Китайская Республика',
    'Colombia': 'Колумбия',
    'Congo (France)': 'Французское Конго',
    'Costa Rica': 'Коста-Рика',
    'Cuba': 'Куба',
    'Dominica': 'Доминика (Брит.)',
    'Dominican Republic': 'Доминиканская Республика',
    'Dominion of Newfoundland': 'Ньюфаундленд (Брит.)',
    'Dutch East Indies': 'Голландская Ост-Индия',
    'Ecuador': 'Эквадор',
    'Egypt': 'Королевство Египет (Брит. протекторат)',
    'El Salvador': 'Сальвадор',
    'Equatorial Guinea': 'Испанская Гвинея',
    'Eritrea (Italy)': 'Эритрея (Италия)',
    'Estonia': 'Эстония',
    'Ethiopia (Italy)': 'Итальянская Восточная Африка (Эфиопия)',
    'Fiji': 'Фиджи (Брит.)',
    'Finland': 'Финляндия',
    'French Cameroons': 'Французский Камерун',
    'French Equatorial Africa': 'Французская Экваториальная Африка',
    'French Guiana': 'Французская Гвиана',
    'French Somaliland': 'Французское Сомали',
    'French West Africa': 'Французская Западная Африка',
    'Gambia, The': 'Гамбия (Брит.)',
    'Gilbert and Ellice Islands': 'Острова Гилберта и Эллис (Брит.)',
    'Gold Coast': 'Золотой Берег (Брит.)',
    'Greece': 'Греция',
    'Grenada': 'Гренада (Брит.)',
    'Guadeloupe': 'Гваделупа (Франция)',
    'Guam': 'Гуам (США)',
    'Guatemala': 'Гватемала',
    'Guinea-Bissau': 'Португальская Гвинея',
    'Guyana': 'Британская Гвиана',
    'Haiti': 'Гаити',
    'Honduras': 'Гондурас',
    'Hong Kong': 'Гонконг (Брит.)',
    'Hungary': 'Венгрия',
    'Iran': 'Иран',
    'Ireland': 'Ирландия',
    'Italian Somaliland': 'Итальянское Сомали',
    'Jamaica': 'Ямайка (Брит.)',
    'Kenya': 'Кения (Брит.)',
    'Latvia': 'Латвия',
    'Lesotho': 'Басутоленд (Брит.)',
    'Liberia': 'Либерия',
    'Libya': 'Итальянская Ливия',
    'Lithuania': 'Литва',
    'Luxembourg': 'Люксембург',
    'Madagascar (France)': 'Мадагаскар (Франция)',
    'Malawi': 'Ньясаленд (Брит.)',
    'Malaysia': 'Британская Малайя и Борнео',
    'Mandatory Palestine (GB)': 'Подмандатная Палестина (Брит.)',
    'Martinique': 'Мартиника (Франция)',
    'Mexico': 'Мексика',
    'Mongolia': 'Монгольская Народная Республика',
    'Montserrat': 'Монтсеррат (Брит.)',
    'Morocco (France)': 'Французское Марокко',
    'Mozambique (Portugal)': 'Мозамбик (Португалия)',
    'Muscat and Oman': 'Оман (Брит. протекторат)',
    'Nepal': 'Непал',
    'Netherlands': 'Нидерланды',
    'Netherlands Antilles': 'Нидерландские Антилы',
    'New Caledonia': 'Новая Каледония (Франция)',
    'New Hebrides': 'Новые Гебриды (Брит./Франц.)',
    'New Zealand': 'Новая Зеландия',
    'Nicaragua': 'Никарагуа',
    'Nigeria': 'Нигерия (Брит.)',
    'Niue': 'Ниуэ (Новая Зеландия)',
    'Northern Rhodesia': 'Северная Родезия (Брит.)',
    'Norway': 'Норвегия',
    'Panama': 'Панама',
    'Paraguay': 'Парагвай',
    'Peru': 'Перу',
    'Philippines': 'Филиппины (США)',
    'Portugal': 'Португалия',
    'Puerto Rico': 'Пуэрто-Рико (США)',
    'Qatar': 'Катар (Брит.)',
    'Rapa Nui': 'Остров Пасхи (Чили)',
    'Rio De Oro': 'Испанская Сахара (Рио-де-Оро)',
    'Romania': 'Румыния',
    'Rwanda (Belgium)': 'Руанда (Бельгия)',
    'Saint Barthelemy': 'Сен-Бартелеми (Франция)',
    'Saint Kitts and Nevis': 'Сент-Китс и Невис (Брит.)',
    'Saint Lucia': 'Сент-Люсия (Брит.)',
    'Saint Martin': 'Сен-Мартен (Франция/Нид.)',
    'Saint Vincent and the Grenadines': 'Сент-Винсент и Гренадины (Брит.)',
    'Samoa': 'Западное Самоа (Новая Зеландия)',
    'Saudi Arabia': 'Саудовская Аравия',
    'Siam': 'Таиланд (Сиам)',
    'Sierra Leone': 'Сьерра-Леоне (Брит.)',
    'Southern Rhodesia': 'Южная Родезия (Брит.)',
    'Spain': 'Испания',
    'Spanish Sahara': 'Испанское Марокко и Сахара',
    'Sudan': 'Англо-Египетский Судан (Брит.)',
    'Suriname': 'Нидерландская Гвиана (Суринам)',
    'Swaziland': 'Свазиленд (Брит.)',
    'Sweden': 'Швеция',
    'Switzerland': 'Швейцария',
    'Tanzania, United Republic of': 'Танганьика (Брит.)',
    'Tibet': 'Тибет',
    'Togo': 'Того (Франция/Брит.)',
    'Tonga': 'Тонга (Брит.)',
    'Trinidad': 'Тринидад и Тобаго (Брит.)',
    'Trucial Oman': 'Договорный Оман (Брит.)',
    'Tunisia': 'Тунис (Франция)',
    'Turks and Caicos Islands': 'Тёркс и Кайкос (Брит.)',
    'USSR': 'СССР',
    'Uganda': 'Уганда (Брит.)',
    'Union of South Africa': 'Южно-Африканский Союз',
    'United Kingdom': 'Великобритания',
    'United States': 'США',
    'United States Virgin Islands': 'Виргинские о-ва (США)',
    'Uruguay': 'Уругвай',
    'Venezuela': 'Венесуэла',
    'Walbis Bay': 'Юго-Западная Африка (ЮАС)',
    'Wallis and Futuna Islands': 'Уоллис и Футуна (Франция)',
    'Xinjiang': 'Синьцзян (Кит.)',
    'Yemen (UK)': 'Йемен и Аден',
    'Yugoslavia': 'Королевство Югославия',
}

def slugify(name):
    s = name.lower()
    for ch in ["'", "(", ")", ",", "."]:
        s = s.replace(ch, "")
    s = s.replace(" ", "_").replace("-", "_")
    while "__" in s:
        s = s.replace("__", "_")
    return s.strip("_")

def build_world_1939():
    d38 = fetch_cached('world_1938.geojson')
    d45 = fetch_cached('world_1945.geojson')

    f38 = d38['features']
    f45 = d45['features']

    g38 = [shape(f['geometry']).buffer(0) for f in f38]
    g45 = [shape(f['geometry']).buffer(0) for f in f45]

    # Helper to find 1945 feature by exact NAME
    def get45(name):
        parts = [g45[i] for i, feat in enumerate(f45) if feat['properties'].get('NAME') == name]
        return unary_union(parts)

    # Indices to skip from 1938 (duplicates, zero-area slivers, Antarctica, replaced regions)
    skip_indices = {
        5,    # duplicate Qatar
        6,    # duplicate Trucial Oman
        8,    # Laos (merged into French Indochina)
        15,   # Cambodia (merged into French Indochina)
        46,   # France (replaced by North / Vichy split)
        49,   # broken 1938 Turkey
        52,   # zero-area Syria
        57,   # zero-area Kuwait
        76,   # zero-area Jordan
        78,   # duplicate Israel
        94,   # Antarctica
        97,   # French Indo-China (merged)
        98,   # Cochin China (merged)
        109,  # Chinese warlords (cleaned slightly)
        126,  # Czechoslovakia (split into Bohemia-Moravia, Slovakia, Ruthenia)
        127,  # Hungary (expanded with Ruthenia)
        128,  # Germany (Austria separated for May 1945 support)
        131,  # Poland (split into West/East for Sept-Oct 1939)
        138,  # Finland (receives Aland)
        139,  # Denmark (split into Denmark + Greenland)
        140,  # Musandam India sliver
        142,  # Italy (split into North/South for Sept 1943)
        143,  # Ecuador (cleaned vs Peru)
        144,  # Oman duplicate
        145,  # British Raj (Burma subtracted)
        146,  # USSR (cleaned vs Turkey + Chukotka check)
        151,  # duplicate Yemen
        152,  # Syria (replaced by 1945 Syria+Lebanon)
        153,  # Mesopotamia (replaced by Iraq, Jordan, Kuwait)
        154, 155, 156, 157,  # Arabia 1914 overlaps inside Saudi Arabia
        159,  # Dodecanese Italy (merged with Italy South)
        160,  # 1938 Armenia artifact
        242,  # Empire of Japan (split into Japan, Korea, Manchukuo, Taiwan)
        244,  # Saipan (merged into Japanese Mandate)
    }

    # Collect unnamed islands into proper owners
    uk_islands = []
    estonia_islands = []
    finland_islands = []
    germany_islands = []
    solomon_islands = []
    mandate_islands = [g38[244]]  # Saipan
    wake_islands = []

    for i, feat in enumerate(f38):
        if feat['properties'].get('NAME') is None:
            skip_indices.add(i)
            if i in (94, 154):
                continue
            b = g38[i].bounds
            cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
            if -10 < cx < 0 and 50 < cy < 63:
                uk_islands.append(g38[i])
            elif 12.5 < cx < 14.5 and 53.5 < cy < 55:
                germany_islands.append(g38[i])
            elif 21.5 < cx < 24 and 57.5 < cy < 59.5:
                estonia_islands.append(g38[i])
            elif 19 < cx < 21 and 59.5 < cy < 61:
                finland_islands.append(g38[i])
            elif 153 < cx < 164 and -20 < cy < -2:
                solomon_islands.append(g38[i])
            elif 133 < cx < 164 and 4 < cy < 11:
                mandate_islands.append(g38[i])
            elif 166 < cx < 167 and 18 < cy < 20:
                wake_islands.append(g38[i])

    features = []
    seen_ids = set()

    def add_feat(fid, name_en, name_ru, subject, group, geom, tol=0.04, min_area=0.0005):
        if fid in seen_ids:
            raise ValueError(f'Duplicate fid: {fid}')
        f = to_feature(fid, name_en, name_ru, subject, group, geom, tol=tol, min_area=min_area)
        if f is not None:
            seen_ids.add(fid)
            features.append(f)

    # 1. Standard features from 1938
    for i, feat in enumerate(f38):
        if i in skip_indices:
            continue
        name = feat['properties']['NAME']
        subj = feat['properties']['SUBJECTO'] or name
        geom = g38[i]
        if name == 'United Kingdom':
            geom = unary_union([geom] + uk_islands)
        elif name == 'Estonia':
            geom = unary_union([geom] + estonia_islands)
        if name == 'Libya':
            subj = 'Italy'
        elif name == 'Tunisia':
            subj = 'France'
        elif name == 'Sudan':
            subj = 'United Kingdom'
        elif name == 'Egypt':
            subj = 'United Kingdom'
        elif name == 'Yemen (UK)':
            subj = 'Independent/UK'
        elif name == 'Mandatory Palestine (GB)':
            subj = 'United Kingdom'
        elif name == 'Qatar':
            subj = 'United Kingdom'
        elif name == 'Trucial Oman':
            subj = 'United Kingdom'
        elif name == 'Muscat and Oman':
            subj = 'United Kingdom'

        fid = slugify(name)
        name_ru = RU_NAMES.get(name, name)
        add_feat(fid, name, name_ru, subj, subj, geom, tol=0.04 if geom.area > 1 else 0.015, min_area=0.0005)

    # 2. Fixed Turkey & USSR (1945 Turkey + clean Caucasus border)
    turkey_geom = get45('Turkey')
    add_feat('turkey', 'Turkey', 'Турция', 'Turkey', 'Turkey', turkey_geom)

    ussr_geom = g38[146].difference(turkey_geom.buffer(0.01))
    # Include USSR Chukotka far-east tip if missing (< -168 lon in 1945)
    ussr45 = get45('USSR')
    if ussr45.geom_type == 'MultiPolygon':
        chukotka_west_hemi = [p for p in ussr45.geoms if p.bounds[0] < -160]
        if chukotka_west_hemi:
            ussr_geom = unary_union([ussr_geom] + chukotka_west_hemi)
    add_feat('ussr', 'USSR', 'СССР', 'USSR', 'USSR', ussr_geom, tol=0.05)

    # 3. Clean Middle East from 1945
    add_feat('syria_lebanon', 'Syria & Lebanon (France)', 'Сирия и Ливан (Франция)', 'France', 'France',
             unary_union([get45('Syria'), get45('Lebanon')]))
    add_feat('iraq', 'Iraq', 'Королевство Ирак (союз. Брит.)', 'United Kingdom', 'United Kingdom', get45('Iraq'))
    add_feat('transjordan', 'Transjordan (UK)', 'Трансиордания (Брит.)', 'United Kingdom', 'United Kingdom', get45('Jordan'))
    add_feat('kuwait', 'Kuwait (UK)', 'Кувейт (Брит.)', 'United Kingdom', 'United Kingdom', get45('Kuwait'))

    # 4. French Indochina (France in Sept 1939!)
    indochina = unary_union([g38[8], g38[15], g38[97], g38[98]])
    add_feat('french_indochina', 'French Indochina', 'Французский Индокитай', 'France', 'France', indochina)

    # 5. British Raj vs Burma
    burma = get45('Burma')
    raj = g38[145].difference(burma.buffer(0.01))
    add_feat('burma', 'Burma (UK)', 'Бирма (Брит.)', 'United Kingdom', 'United Kingdom', burma)
    add_feat('british_raj', 'British Raj', 'Британская Индия', 'United Kingdom', 'United Kingdom', raj)

    # 6. China & Ecuador cleanup
    china_geom = g38[109]
    add_feat('china', 'Republic of China', 'Китайская Республика', 'China', 'China', china_geom, tol=0.045)
    ecuador_geom = g38[143].difference(g38[70])
    add_feat('ecuador', 'Ecuador', 'Эквадор', 'Ecuador', 'Ecuador', ecuador_geom)

    # 7. Empire of Japan separated into Japan, Korea, Manchukuo, Taiwan
    korea_geom = unary_union([get45('Korea (USSR)'), get45('Korea (USA)')])
    manchu_geom = get45('Manchuria')
    taiwan_geom = get45('Taiwan')
    # Remaining Japan parts = mainland islands + Kurils + S. Sakhalin (exclude mainland Korea/Manchuria box)
    jp_parts = []
    if g38[242].geom_type == 'MultiPolygon':
        for p in g38[242].geoms:
            b = p.bounds
            # Skip mainland Korea/Manchuria part (115..135, 34..53.5) and Taiwan (120..122, 21.9..25.3)
            if p.area > 50:
                continue
            if 119.5 <= b[0] <= 122.5 and 21 <= b[1] <= 26:
                continue
            jp_parts.append(p)
    japan_geom = unary_union(jp_parts) if jp_parts else get45('Japan (USA)')
    add_feat('japan', 'Empire of Japan', 'Японская империя', 'Empire of Japan', 'Japan', japan_geom)
    add_feat('korea', 'Korea (Japan)', 'Корея (Япония)', 'Empire of Japan', 'Japan', korea_geom)
    add_feat('manchukuo', 'Manchukuo (Japan)', 'Маньчжоу-го (Япония)', 'Empire of Japan', 'Japan', manchu_geom)
    add_feat('taiwan', 'Taiwan / Formosa (Japan)', 'Тайвань (Япония)', 'Empire of Japan', 'Japan', taiwan_geom)

    # 8. Pacific Island groups
    add_feat('solomon_islands', 'Solomon Islands (UK/Aus)', 'Соломоновы о-ва (Брит./Австралия)', 'United Kingdom', 'UK',
             unary_union(solomon_islands), tol=0.015, min_area=0.001)
    add_feat('japanese_mandate', 'South Seas Mandate (Japan)', 'Южно-Тихоокеанский мандат (Япония)', 'Empire of Japan', 'Japan',
             unary_union(mandate_islands), tol=0.01, min_area=0.0005)
    add_feat('wake_island', 'Wake Island (US)', 'Остров Уэйк (США)', 'United States', 'USA',
             unary_union(wake_islands), tol=0.005, min_area=0.0001)

    # 9. Finland + Aland
    finland_geom = unary_union([g38[138]] + finland_islands)
    add_feat('finland', 'Finland', 'Финляндия', 'Finland', 'Finland', finland_geom)

    # 10. Denmark vs Greenland vs Iceland
    den_raw = g38[139]
    den_box = box(7.0, 54.0, 16.0, 58.2)
    faroe_box = box(-8.0, 61.0, -6.0, 63.0)
    iceland_box = box(-26.0, 62.5, -12.0, 67.5)
    denmark_geom = den_raw.intersection(den_box)
    iceland_geom = den_raw.intersection(iceland_box)
    greenland_geom = den_raw.difference(den_box).difference(faroe_box).difference(iceland_box)
    add_feat('denmark', 'Denmark', 'Дания', 'Denmark', 'Denmark', denmark_geom, tol=0.02)
    add_feat('iceland', 'Iceland', 'Исландия', 'Iceland', 'Iceland', iceland_geom, tol=0.02)
    add_feat('greenland', 'Greenland (Denmark)', 'Гренландия (Дания)', 'Denmark', 'Denmark', greenland_geom, tol=0.06)

    # 11. Germany & Austria (Sept 1939: Austria is Ostmark inside Greater Germany; May 1945 separated)
    ger_raw = unary_union([g38[128]] + germany_islands)
    austria45 = get45('Austria')
    austria_geom = ger_raw.intersection(austria45.buffer(0.02))
    germany_geom = ger_raw.difference(austria_geom)
    add_feat('germany', 'Germany', 'Германия (Третий рейх)', 'Germany', 'Germany', germany_geom, tol=0.025)
    add_feat('austria', 'Austria (Ostmark / Germany)', 'Австрия (в составе Германии)', 'Germany', 'Germany', austria_geom, tol=0.025)

    # 12. Czechoslovakia (Sept 1939 partition: Bohemia-Moravia, Slovakia, Carpathian Ruthenia -> Hungary)
    cz_raw = g38[126]
    bohemia_box = box(11.0, 47.0, 17.05, 52.0)
    slovakia_box = box(17.05, 47.0, 22.35, 52.0)
    ruthenia_box = box(22.35, 47.0, 25.0, 52.0)
    bohemia_geom = cz_raw.intersection(bohemia_box)
    slovakia_geom = cz_raw.intersection(slovakia_box)
    ruthenia_geom = cz_raw.intersection(ruthenia_box)
    hungary_geom = unary_union([g38[127], ruthenia_geom])
    add_feat('bohemia_moravia', 'Bohemia & Moravia (Germany)', 'Протекторат Богемия и Моравия (Герм.)', 'Germany', 'Germany', bohemia_geom, tol=0.02)
    add_feat('slovakia', 'Slovak Republic (Axis)', 'Словацкая республика (союзник Оси)', 'Slovakia', 'Slovakia', slovakia_geom, tol=0.02)
    add_feat('hungary', 'Hungary', 'Венгрия', 'Hungary', 'Hungary', hungary_geom, tol=0.025)

    # 13. Poland split along Molotov-Ribbentrop / Bug-San line (~21.4..23.5E)
    pol_raw = g38[131]
    mr_west_poly = Polygon([
        (15.0, 47.0), (22.6, 47.0), (22.8, 49.5), (23.7, 51.5),
        (22.5, 52.8), (23.4, 53.6), (22.5, 56.5), (15.0, 56.5)
    ])
    pol_west = pol_raw.intersection(mr_west_poly)
    pol_east = pol_raw.difference(mr_west_poly)
    add_feat('poland_west', 'Poland (West)', 'Польша (Западная)', 'Poland', 'Poland', pol_west, tol=0.025)
    add_feat('poland_east', 'Poland (East / Kresy)', 'Польша (Восточная)', 'Poland', 'Poland', pol_east, tol=0.025)

    # 14. France split along June 1940 Demarcation Line
    fr_raw = g38[46].difference(g38[1].buffer(0.01))
    # Everything south/east of the Demarcation Line = Vichy France (roughly Geneva -> Moulins -> Tours -> Mont-de-Marsan -> Hendaye)
    vichy_mask = Polygon([
        (-2.2, 43.3), (0.6, 46.8), (3.4, 46.7), (6.05, 46.15),
        (10.5, 45.8), (10.5, 40.5), (-2.2, 40.5)
    ])
    fr_vichy = fr_raw.intersection(vichy_mask)
    fr_north = fr_raw.difference(vichy_mask)
    add_feat('france_north', 'France (North & Atlantic)', 'Франция (Север и Атлантика)', 'France', 'France', fr_north, tol=0.025)
    add_feat('france_vichy', 'France (South / Vichy)', 'Франция (Юг / зона Виши)', 'France', 'France', fr_vichy, tol=0.025)

    # 15. Italy split at 41.25N (for Sept 1943 RSI vs Kingdom of the South)
    it_raw = unary_union([g38[142], g38[159]])
    it_south_box = box(6.0, 35.0, 30.0, 41.25)
    it_south = it_raw.intersection(it_south_box)
    it_north = it_raw.difference(it_south_box)
    add_feat('italy_north', 'Italy (North & Central)', 'Италия (Север и Центр)', 'Italy', 'Italy', it_north, tol=0.025)
    add_feat('italy_south', 'Italy (South, Sicily & Sardinia)', 'Италия (Юг, Сицилия и Сардиния)', 'Italy', 'Italy', it_south, tol=0.025)

    world_fc = {
        'type': 'FeatureCollection',
        'features': features,
    }

    # --- RIVERS (Major WW2 rivers for offline & tactical clarity) ---
    rivers_raw = fetch_cached('rivers_50m.geojson')
    KEEP_RIVERS = {
        'Volga': 'Волга',
        'Don': 'Дон',
        'Dnepre': 'Днепр',
        'Vistula': 'Висла',
        'Oder': 'Одер',
        'Elbe': 'Эльба',
        'Rhine': 'Рейн',
        'Seine': 'Сена',
        'Loire': 'Луара',
        'Rhône': 'Рона',
        'Danube': 'Дунай',
        'Po': 'По',
        'Nile': 'Нил',
        'Euphrates': 'Евфрат',
        'Tigris': 'Тигр',
        'Yangtze': 'Янцзы',
        'Huang': 'Хуанхэ',
        'Mekong': 'Меконг',
        'Irrawaddy Delta': 'Иравади',
        'Ganges': 'Ганг',
        'Indus': 'Инд',
        'Amur': 'Амур',
        'Ural': 'Урал',
        'Ob': 'Обь',
        'Yenisei': 'Енисей',
        'Lena': 'Лена',
        'Mississippi': 'Миссисипи',
        'Missouri': 'Миссури',
        'Amazon': 'Амазонка',
    }
    river_features = []
    for rf in rivers_raw['features']:
        rname = rf['properties'].get('name')
        if rname in KEEP_RIVERS:
            rg = shape(rf['geometry']).simplify(0.03, preserve_topology=True)
            m = mapping(rg)
            m['coordinates'] = round_coords(m['coordinates'], 3)
            river_features.append({
                'type': 'Feature',
                'properties': {'name': rname, 'nameRu': KEEP_RIVERS[rname]},
                'geometry': m,
            })

    rivers_fc = {'type': 'FeatureCollection', 'features': river_features}

    # --- LAND-CLIPPED OCCUPATION OVERLAY POLYGONS ---
    # Monthly Eastern Front west-of-line envelopes (lat/lon frontlines from Baltic to Black Sea/Caucasus)
    # Format: list of (lon, lat) from North to South along the frontline
    EAST_FRONTS = {
        '1941-06': [(21.2, 56.2), (24.5, 54.8), (25.5, 53.2), (24.8, 51.6), (24.2, 49.8), (28.0, 46.8)],
        '1941-07': [(27.8, 59.4), (29.0, 57.6), (31.8, 55.2), (32.2, 53.5), (30.1, 51.4), (29.2, 49.0), (29.8, 46.4)],
        '1941-08': [(29.2, 59.8), (31.0, 58.2), (32.8, 55.3), (33.5, 52.8), (30.8, 50.5), (32.5, 48.3), (31.5, 46.6)],
        '1941-09': [(30.1, 60.0), (31.5, 58.8), (33.0, 56.0), (33.8, 53.2), (33.5, 50.6), (35.2, 48.6), (34.4, 46.2)],
        '1941-10': [(30.1, 60.0), (32.4, 58.9), (34.8, 57.0), (35.8, 55.4), (36.3, 53.6), (36.8, 50.6), (37.8, 48.1), (38.8, 47.1), (34.6, 45.2)],
        '1941-11': [(30.2, 60.0), (33.3, 59.6), (34.2, 57.5), (36.4, 56.2), (37.0, 55.4), (38.2, 53.9), (37.2, 51.0), (38.5, 48.5), (39.7, 47.2), (36.5, 45.2)],
        '1941-12': [(30.2, 60.0), (32.1, 59.2), (33.4, 57.3), (35.1, 56.0), (35.9, 55.0), (36.6, 53.8), (36.8, 51.2), (38.3, 48.2), (38.5, 47.2), (36.5, 45.2)],
        '1942-01': [(30.2, 60.0), (32.0, 59.0), (32.3, 57.4), (33.6, 56.2), (34.8, 55.1), (35.5, 53.7), (36.5, 50.8), (37.6, 48.5), (38.4, 47.2), (36.3, 45.2)],
        '1942-02': [(30.2, 60.0), (31.8, 58.8), (31.9, 57.1), (33.2, 56.0), (34.2, 54.8), (35.2, 53.6), (36.4, 50.5), (37.3, 48.6), (38.4, 47.2), (36.0, 45.2)],
        '1942-03': [(30.2, 60.0), (31.8, 58.8), (32.0, 57.0), (33.3, 55.9), (34.3, 54.8), (35.4, 53.6), (36.5, 50.4), (37.4, 48.6), (38.4, 47.2), (35.8, 45.2)],
        '1942-04': [(30.2, 60.0), (31.8, 58.8), (32.0, 57.0), (33.4, 55.9), (34.4, 54.8), (35.5, 53.6), (36.6, 50.2), (37.5, 48.6), (38.4, 47.2), (35.6, 45.2)],
        '1942-05': [(30.2, 60.0), (31.8, 58.8), (32.0, 57.0), (33.4, 55.9), (34.4, 54.8), (35.5, 53.6), (36.9, 50.1), (38.0, 48.3), (38.6, 47.2), (36.5, 45.3)],
        '1942-06': [(30.2, 60.0), (31.8, 58.8), (32.0, 57.0), (33.5, 55.9), (34.5, 54.8), (35.7, 53.6), (38.2, 51.2), (38.5, 49.6), (38.7, 47.5), (36.5, 45.3)],
        '1942-07': [(30.2, 60.0), (31.8, 58.8), (32.0, 57.0), (33.5, 55.9), (34.5, 54.8), (36.0, 53.5), (39.1, 51.6), (41.5, 49.4), (40.5, 47.2), (38.5, 45.8)],
        '1942-08': [(30.2, 60.0), (31.8, 58.8), (32.0, 57.0), (33.5, 55.9), (34.6, 54.8), (36.0, 53.5), (39.1, 51.6), (44.0, 49.2), (44.2, 47.0), (43.5, 44.0), (40.2, 43.8)],
        '1942-09': [(30.2, 60.0), (31.8, 58.8), (32.0, 57.0), (33.6, 55.9), (34.6, 54.8), (36.0, 53.5), (39.1, 51.6), (44.5, 48.7), (45.2, 46.4), (44.6, 43.4), (39.6, 44.0)],
        '1942-10': [(30.2, 60.0), (31.8, 58.8), (32.0, 57.0), (33.6, 55.9), (34.6, 54.8), (36.0, 53.5), (39.1, 51.6), (44.6, 48.7), (45.4, 46.2), (44.7, 43.1), (39.2, 44.1)],
        '1942-11': [(30.2, 60.0), (31.8, 58.8), (32.0, 57.0), (33.6, 55.9), (34.6, 54.8), (36.0, 53.5), (39.1, 51.6), (44.6, 48.7), (45.4, 46.0), (44.5, 43.0), (39.0, 44.2)],
        '1942-12': [(30.2, 60.0), (31.8, 58.8), (31.8, 57.0), (33.5, 55.9), (34.5, 54.8), (36.0, 53.5), (39.1, 51.5), (42.8, 49.0), (43.2, 47.2), (43.5, 44.0), (39.0, 44.2)],
        '1943-01': [(30.5, 60.0), (31.6, 58.8), (31.6, 57.0), (33.4, 55.9), (34.4, 54.8), (36.0, 53.2), (38.8, 51.4), (40.5, 48.8), (40.6, 46.8), (39.2, 45.2)],
        '1943-02': [(30.5, 60.0), (31.4, 58.8), (31.4, 57.0), (33.2, 55.9), (34.2, 54.8), (35.8, 53.0), (36.4, 51.2), (36.5, 49.8), (38.8, 47.4), (37.8, 45.2)],
        '1943-03': [(30.5, 60.0), (31.4, 58.8), (31.0, 57.0), (31.8, 55.6), (33.6, 54.5), (35.6, 52.8), (36.0, 51.4), (36.6, 49.8), (38.8, 47.4), (37.6, 45.2)],
        '1943-04': [(30.4, 60.0), (31.3, 58.8), (31.0, 57.0), (31.6, 55.5), (33.4, 54.4), (35.8, 52.5), (35.7, 51.5), (36.6, 50.2), (38.8, 47.4), (37.5, 45.2)],
        '1943-05': [(30.4, 60.0), (31.3, 58.8), (31.0, 57.0), (31.6, 55.5), (33.4, 54.4), (35.8, 52.5), (35.7, 51.5), (36.6, 50.2), (38.8, 47.4), (37.5, 45.2)],
        '1943-06': [(30.4, 60.0), (31.3, 58.8), (31.0, 57.0), (31.6, 55.5), (33.4, 54.4), (35.8, 52.5), (35.7, 51.5), (36.6, 50.2), (38.8, 47.4), (37.4, 45.2)],
        '1943-07': [(30.4, 60.0), (31.3, 58.8), (31.0, 57.0), (31.6, 55.5), (33.5, 54.4), (36.0, 52.5), (35.7, 51.5), (36.7, 50.5), (38.8, 47.4), (37.4, 45.2)],
        '1943-08': [(30.4, 60.0), (31.3, 58.8), (31.0, 57.0), (31.6, 55.5), (33.2, 54.4), (34.4, 52.8), (35.6, 50.1), (36.8, 48.2), (37.8, 47.0), (37.0, 45.2)],
        '1943-09': [(30.4, 60.0), (31.0, 58.8), (30.8, 57.0), (31.2, 55.2), (31.6, 53.5), (30.8, 51.5), (32.4, 49.4), (35.2, 47.3), (36.5, 46.2)],
        '1943-10': [(30.4, 60.0), (31.0, 58.8), (30.8, 57.0), (30.8, 55.2), (30.9, 53.3), (30.5, 51.2), (32.6, 48.8), (34.8, 46.6), (33.8, 45.8)],
        '1943-11': [(30.2, 60.0), (31.0, 58.8), (30.5, 57.0), (30.5, 55.2), (30.5, 53.0), (29.2, 50.5), (31.5, 48.5), (33.6, 46.3)],
        '1943-12': [(30.0, 60.0), (30.9, 58.8), (30.2, 57.0), (30.2, 55.2), (30.2, 52.8), (28.5, 50.3), (31.2, 48.5), (33.2, 46.3)],
        '1944-01': [(28.2, 59.5), (29.8, 58.4), (29.8, 57.0), (30.1, 55.2), (29.6, 52.4), (27.8, 50.2), (30.8, 48.5), (33.0, 46.3)],
        '1944-02': [(28.0, 59.4), (28.2, 57.8), (29.5, 56.6), (29.8, 55.0), (29.2, 52.2), (27.4, 50.2), (31.0, 48.6), (32.8, 46.3)],
        '1944-03': [(28.0, 59.4), (28.0, 57.8), (28.6, 56.6), (29.6, 55.0), (27.5, 51.8), (25.6, 49.4), (28.8, 47.4), (31.2, 46.3)],
        '1944-04': [(28.0, 59.4), (28.0, 57.8), (28.4, 56.6), (29.4, 55.0), (26.2, 51.4), (25.2, 48.8), (27.8, 47.2), (30.5, 46.2)],
        '1944-05': [(28.0, 59.4), (28.0, 57.8), (28.4, 56.6), (29.4, 55.0), (26.0, 51.2), (25.2, 48.6), (27.6, 47.0), (29.8, 46.0)],
        '1944-06': [(28.0, 60.6), (28.0, 59.4), (28.0, 57.8), (28.2, 56.0), (28.8, 54.2), (26.0, 51.5), (25.2, 48.5), (27.8, 46.8), (29.6, 45.8)],
        '1944-07': [(27.8, 60.5), (27.5, 59.2), (26.8, 57.2), (24.0, 55.5), (23.2, 53.2), (22.6, 50.8), (23.5, 49.2), (27.4, 46.8), (29.4, 45.6)],
        '1944-08': [(27.5, 59.4), (26.8, 57.8), (23.2, 56.5), (22.4, 54.5), (21.3, 52.3), (21.5, 50.5), (23.8, 48.5), (26.2, 45.5), (27.8, 43.8)],
        '1944-09': [(24.8, 59.4), (24.5, 57.5), (22.8, 56.2), (22.2, 54.4), (21.2, 52.3), (21.4, 50.2), (21.6, 47.5), (21.8, 44.5)],
        '1944-10': [(21.5, 56.8), (22.2, 55.5), (22.0, 54.0), (21.2, 52.2), (21.3, 50.0), (20.4, 47.2), (20.4, 44.8)],
        '1944-11': [(21.4, 56.8), (22.1, 55.2), (22.0, 54.0), (21.2, 52.2), (21.2, 49.8), (19.6, 47.6), (19.5, 45.2)],
        '1944-12': [(21.4, 56.8), (22.0, 54.8), (21.8, 53.8), (21.2, 52.2), (21.0, 49.7), (18.8, 47.5), (19.0, 45.4)],
        '1945-01': [(20.5, 55.2), (20.2, 54.6), (18.4, 53.2), (17.2, 51.8), (18.2, 50.1), (18.4, 48.2), (18.2, 46.0)],
        '1945-02': [(19.8, 54.7), (19.5, 54.3), (16.4, 53.4), (14.8, 52.3), (16.4, 50.8), (17.8, 48.5), (17.6, 46.2)],
        '1945-03': [(18.6, 54.5), (18.4, 54.1), (14.4, 53.2), (14.6, 52.2), (16.2, 50.6), (17.4, 48.2), (16.8, 46.4)],
        '1945-04': [(14.2, 53.9), (13.6, 52.6), (13.2, 51.5), (14.4, 49.8), (15.4, 47.8), (15.0, 46.0)],
    }

    ussr_and_moldavia = unary_union([ussr_geom, g38[96]]).buffer(0).intersection(box(12.0, 41.0, 52.0, 72.0)).buffer(0)
    east_1941_06 = unary_union([ussr_geom, g38[40], g38[41], g38[42], g38[96]]).buffer(0).intersection(box(12.0, 41.0, 52.0, 72.0)).buffer(0)
    east_1944_09 = unary_union([ussr_geom, g38[40]]).buffer(0).intersection(box(12.0, 41.0, 52.0, 72.0)).buffer(0)
    east_1944_courland = unary_union([ussr_geom, g38[41], g38[42]]).buffer(0).intersection(box(12.0, 41.0, 52.0, 72.0)).buffer(0)

    occ_zones = {}
    soviet_1945_zones = {}
    for month, pts in EAST_FRONTS.items():
        if month.startswith('1945'):
            # East of the frontline inside Central Europe excluding countries already marked 'ussr' in that month
            non_ussr_parts = [germany_geom, austria_geom, bohemia_geom]
            if month == '1945-01':
                non_ussr_parts.extend([hungary_geom, slovakia_geom])
            elif month in ('1945-02', '1945-03'):
                non_ussr_parts.append(slovakia_geom)
            ce_land = unary_union(non_ussr_parts).buffer(0).intersection(box(11.0, 43.0, 29.0, 57.0)).buffer(0)
            poly_east = [(30.0, 62.0), (pts[0][0], 56.5)] + pts + [(30.0, 42.0), (30.0, 62.0)]
            mask_east = Polygon(poly_east).buffer(0)
            clipped_east = ce_land.intersection(mask_east).simplify(0.04, preserve_topology=True)
            if not clipped_east.is_empty:
                m = mapping(clipped_east)
                m['coordinates'] = round_coords(m['coordinates'], 2)
                soviet_1945_zones[month] = m
        else:
            if month == '1941-06':
                target_land = east_1941_06
            elif month == '1944-09':
                target_land = east_1944_09
            elif month >= '1944-10':
                target_land = east_1944_courland
            else:
                target_land = ussr_and_moldavia
            poly_pts = [(12.0, 72.0)] + pts + [(12.0, 41.0), (12.0, 72.0)]
            mask = Polygon(poly_pts).buffer(0)
            clipped = target_land.intersection(mask).simplify(0.05, preserve_topology=True)
            if not clipped.is_empty:
                m = mapping(clipped)
                m['coordinates'] = round_coords(m['coordinates'], 2)
                occ_zones[month] = m

    # 2. Clipped Japanese occupation zone in China (1939-09 baseline + 1944 Ichi-Go expansion)
    china_base_mask = Polygon([
        (110.5, 42.0), (123.5, 42.0), (123.5, 20.0), (108.0, 20.0),
        (112.5, 23.0), (113.8, 26.5), (114.2, 30.2), (111.5, 32.0),
        (113.5, 35.2), (111.8, 38.5), (110.5, 42.0)
    ])
    china_ichigo_mask = Polygon([
        (110.0, 42.0), (123.5, 42.0), (123.5, 20.0), (106.5, 21.0),
        (108.5, 24.5), (110.2, 27.5), (111.5, 30.8), (110.5, 34.0),
        (111.5, 38.5), (110.0, 42.0)
    ])
    china_occ_base = china_geom.intersection(china_base_mask).simplify(0.05, preserve_topology=True)
    china_occ_ichigo = china_geom.intersection(china_ichigo_mask).simplify(0.05, preserve_topology=True)

    china_zones = {
        'base': {'coordinates': round_coords(mapping(china_occ_base)['coordinates'], 2), 'type': mapping(china_occ_base)['type']},
        'ichigo': {'coordinates': round_coords(mapping(china_occ_ichigo)['coordinates'], 2), 'type': mapping(china_occ_ichigo)['type']},
    }

    # 3. Clipped Western Allied liberation zones in Normandy (1944-06, 1944-07) & Germany (1945-02, 1945-03, 1945-04)
    normandy_06 = fr_north.intersection(box(-1.9, 49.0, -0.1, 49.8))
    normandy_07 = fr_north.intersection(box(-2.0, 48.6, 0.2, 49.8))
    ger_45_02 = germany_geom.intersection(box(5.5, 49.0, 6.8, 52.0))
    ger_45_03 = germany_geom.intersection(box(5.5, 47.0, 8.8, 52.8))
    ger_45_04 = germany_geom.intersection(Polygon([
        (5.5, 46.5), (11.5, 46.5), (12.2, 49.5), (11.8, 52.0),
        (10.6, 53.6), (8.5, 54.8), (5.5, 54.8)
    ]))
    sicily_43_07 = it_south.intersection(box(12.2, 36.5, 15.8, 38.4))

    def geom_to_obj(g):
        sg = g.simplify(0.03, preserve_topology=True)
        m = mapping(sg)
        m['coordinates'] = round_coords(m['coordinates'], 2)
        return m

    allied_zones = {
        'sicily_1943_07': geom_to_obj(sicily_43_07),
        'normandy_1944_06': geom_to_obj(normandy_06),
        'normandy_1944_07': geom_to_obj(normandy_07),
        'germany_1945_02': geom_to_obj(ger_45_02),
        'germany_1945_03': geom_to_obj(ger_45_03),
        'germany_1945_04': geom_to_obj(ger_45_04),
    }

    # Write data/world_1939.js
    out_world = os.path.join(OUT_DIR, 'world_1939.js')
    with open(out_world, 'w', encoding='utf-8') as f:
        f.write('// Auto-generated by scripts/build_world_1939.py — Sept 1, 1939 World Political Map + Major Rivers + Land-Clipped Occupation Zones\n')
        f.write('(function (root) {\n')
        f.write('  var WORLD_1939 = ')
        json.dump(world_fc, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n  var RIVERS = ')
        json.dump(rivers_fc, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n  var EAST_OCC_ZONES = ')
        json.dump(occ_zones, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n  var SOVIET_1945_ZONES = ')
        json.dump(soviet_1945_zones, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n  var CHINA_OCC_ZONES = ')
        json.dump(china_zones, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n  var ALLIED_OCC_ZONES = ')
        json.dump(allied_zones, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n  var EAST_FRONTS = ')
        json.dump(EAST_FRONTS, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n  var payload = {\n')
        f.write('    WORLD_1939: WORLD_1939,\n')
        f.write('    RIVERS: RIVERS,\n')
        f.write('    EAST_OCC_ZONES: EAST_OCC_ZONES,\n')
        f.write('    SOVIET_1945_ZONES: SOVIET_1945_ZONES,\n')
        f.write('    CHINA_OCC_ZONES: CHINA_OCC_ZONES,\n')
        f.write('    ALLIED_OCC_ZONES: ALLIED_OCC_ZONES,\n')
        f.write('    EAST_FRONTS: EAST_FRONTS\n')
        f.write('  };\n')
        f.write('  if (typeof module !== "undefined" && module.exports) { module.exports = payload; }\n')
        f.write('  root.WW2_WORLD_DATA = payload;\n')
        f.write('})(typeof window !== "undefined" ? window : globalThis);\n')

    size_kb = os.path.getsize(out_world) / 1024
    print(f'Generated {out_world}: {len(features)} countries/regions, {len(river_features)} rivers, {len(occ_zones)} East Front monthly zones. Size: {size_kb:.1f} KB')

if __name__ == '__main__':
    build_world_1939()
