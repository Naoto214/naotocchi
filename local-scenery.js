(function (root) {
  'use strict';

  var PROFILE_DESCRIPTIONS = {
    metropolis: '高い建物とにぎやかな通りのある都会の景色',
    harbor: '港と海が見えるまちの景色',
    basin: '山々に囲まれたまちの景色',
    town: '一般的なまちなかの景色'
  };

  var TOKYO_WARDS = [
    '千代田区', '中央区', '港区', '新宿区', '文京区', '台東区', '墨田区', '江東区',
    '品川区', '目黒区', '大田区', '世田谷区', '渋谷区', '中野区', '杉並区', '豊島区',
    '北区', '荒川区', '板橋区', '練馬区', '足立区', '葛飾区', '江戸川区'
  ];
  var OSAKA_CITY_WARDS = [
    '旭区', '阿倍野区', '生野区', '北区', '此花区', '城東区', '住之江区', '住吉区',
    '大正区', '中央区', '鶴見区', '天王寺区', '浪速区', '西区', '西成区', '西淀川区',
    '東住吉区', '東成区', '東淀川区', '平野区', '福島区', '港区', '都島区', '淀川区'
  ];

  function cleanText(value, maximum) {
    if (typeof value !== 'string') return '';
    var text = value.normalize('NFKC').trim().replace(/\s+/g, ' ');
    if (!text || Array.from(text).length > maximum || /[<>\u0000-\u001f\u007f]/.test(text)) return '';
    return text;
  }

  function cleanMunicipality(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    var name = cleanText(value.name, 80);
    if (!name) return null;
    var display = cleanText(value.display, 120) || name;
    var prefecture = cleanText(value.prefecture, 40) || null;
    return { name: name, display: display, prefecture: prefecture };
  }

  function matchesPlace(place, name, prefecture) {
    if (place.name !== name) return false;
    return !place.prefecture || place.prefecture === prefecture;
  }

  function profileFor(place) {
    // These are intentionally small, explicit illustration choices. Unknown
    // municipalities stay on the neutral town profile instead of inferring a
    // landscape from a suffix such as 市 or 区.
    if (matchesPlace(place, '函館市', '北海道')) return 'harbor';
    if (matchesPlace(place, '飯田市', '長野県')) return 'basin';
    if (matchesPlace(place, '大阪市', '大阪府')) return 'metropolis';
    if ((!place.prefecture || place.prefecture === '大阪府') && place.name.indexOf('大阪市') === 0 &&
        OSAKA_CITY_WARDS.indexOf(place.name.slice(3)) !== -1) return 'metropolis';
    if (place.prefecture === '東京都' && TOKYO_WARDS.indexOf(place.name) !== -1) return 'metropolis';
    return 'town';
  }

  function resolveLocality(municipality) {
    var place = cleanMunicipality(municipality);
    if (!place) return null;
    var profileId = profileFor(place);
    return {
      name: place.name,
      display: place.display,
      prefecture: place.prefecture,
      profileId: profileId,
      description: PROFILE_DESCRIPTIONS[profileId]
    };
  }

  function sanitizeLocality(value) {
    return resolveLocality(value);
  }

  var api = { resolveLocality: resolveLocality, sanitizeLocality: sanitizeLocality };
  if (typeof window !== 'undefined') window.NaotocchiLocalScenery = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
