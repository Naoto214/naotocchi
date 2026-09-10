(function (root) {
  'use strict';

  var GEO_TIMEOUT_MS = 10000;
  var HTTP_TIMEOUT_MS = 10000;
  var HOUR_MS = 60 * 60 * 1000;

  function milliseconds(value) {
    if (value instanceof Date) return value.getTime();
    return typeof value === 'number' ? value : new Date(value).getTime();
  }

  function timeOfDay(mode, date) {
    if (mode === 'morning' || mode === 'day' || mode === 'evening' || mode === 'night') return mode;
    var hour = (date || new Date()).getHours();
    if (hour >= 5 && hour <= 10) return 'morning';
    if (hour >= 11 && hour <= 15) return 'day';
    if (hour >= 16 && hour <= 18) return 'evening';
    return 'night';
  }

  // 現在地の天気が取れないときに使う「地域の気候からの予想天気」。
  // 地域ごとの出やすさ(はれ/くもり/あめ/ゆき)を季節で補正し、日付と
  // 3時間ごとの時間帯と地域からきまるハッシュで決定的に選ぶ(同じ
  // 時間帯なら何度呼んでも同じ天気、3時間ごとに変わる)
  var CLIMATE = {
    home: [45, 30, 20, 5], city: [45, 30, 20, 5], countryside: [45, 30, 20, 5],
    forest: [35, 35, 28, 2], river_lake: [35, 35, 28, 2], mountain: [35, 30, 15, 20],
    snow: [22, 30, 8, 40], sea: [50, 25, 25, 0], deepsea: [30, 40, 30, 0],
    jungle: [25, 25, 50, 0], desert: [78, 15, 7, 0], star_stop: [60, 40, 0, 0], memory_lake: [40, 40, 20, 0]
  };
  var WEATHER_MODES = ['sunny', 'cloudy', 'rain', 'snow'];
  var WEATHER_LABELS = { sunny: 'はれ', cloudy: 'くもり', rain: 'あめ', snow: 'ゆき' };

  function climateFor(regionId, season) {
    var base = (CLIMATE[regionId] || CLIMATE.home).slice();
    if (season === 'winter') {
      // ふゆ: あめの 6わりが ゆきに、ゆきの ふる 地域は さらに ゆきが ふえる
      var toSnow = Math.round(base[2] * 0.6); base[2] -= toSnow; base[3] += toSnow;
      if (base[3] > 0) { base[0] = Math.max(10, base[0] - 10); base[3] += 10; }
    } else if (season === 'summer') {
      // なつ: ゆきぐに いがいの ゆきは あめに、あめが すこし ふえる
      if (regionId !== 'snow') { base[2] += base[3]; base[3] = 0; } else { var keep = Math.round(base[3] * 0.4); base[2] += base[3] - keep; base[3] = keep; }
      base[2] += 5; base[0] = Math.max(10, base[0] - 5);
    }
    return base;
  }

  function hash32(text) {
    var h = 2166136261;
    for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }

  function simulatedWeather(regionId, season, date) {
    var d = date || new Date();
    var block = Math.floor(d.getHours() / 3);
    var key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate() + ':' + block + ':' + (regionId || 'home');
    var weights = climateFor(regionId, season);
    var total = weights.reduce(function (a, b) { return a + b; }, 0) || 1;
    var roll = (hash32(key) % 1000) / 1000 * total;
    var mode = WEATHER_MODES[0];
    for (var i = 0; i < weights.length; i++) { roll -= weights[i]; if (roll < 0) { mode = WEATHER_MODES[i]; break; } }
    return { mode: mode, label: WEATHER_LABELS[mode], simulated: true };
  }

  function weatherDetails(code) {
    if (!Number.isInteger(code)) return null;
    if (code === 0 || code === 1) return { mode: 'sunny', label: 'はれ' };
    if ([2, 3, 45, 48].indexOf(code) !== -1) return { mode: 'cloudy', label: 'くもり' };
    if ([71, 73, 75, 77, 85, 86].indexOf(code) !== -1) return { mode: 'snow', label: 'ゆき' };
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].indexOf(code) !== -1) {
      return { mode: 'rain', label: 'あめ' };
    }
    return null;
  }

  function weatherFromResponse(data, now) {
    var current = data && data.current;
    var details = weatherDetails(current && current.weather_code);
    var observedSeconds = current && current.time;
    var currentMs = milliseconds(now === undefined ? new Date() : now);
    if (!details || typeof observedSeconds !== 'number' || !Number.isFinite(observedSeconds) || !Number.isFinite(currentMs)) return null;
    var measuredMs = observedSeconds * 1000;
    if (currentMs - measuredMs > 2 * HOUR_MS || measuredMs - currentMs > 15 * 60 * 1000) return null;
    return { mode: details.mode, label: details.label, measuredAt: new Date(measuredMs).toISOString() };
  }

  function hiragana(value) {
    if (typeof value !== 'string') return '';
    return value.normalize('NFKC').replace(/[ァ-ヶ]/g, function (character) {
      return String.fromCharCode(character.charCodeAt(0) - 0x60);
    }).trim();
  }

  function municipalityFromResponse(data) {
    var locations = data && data.response && data.response.location;
    if (!Array.isArray(locations)) return null;
    var candidates = locations.filter(function (item) {
      return item && typeof item.city === 'string' && item.city.trim() && item.city.trim().length <= 80 &&
        typeof item.distance === 'number' && Number.isFinite(item.distance) && item.distance >= 0 && item.distance <= 25000;
    }).sort(function (a, b) { return a.distance - b.distance; });
    if (!candidates.length) return null;
    var closest = candidates[0];
    var name = closest.city.trim();
    var reading = hiragana(closest.city_kana === undefined ? closest['city-kana'] : closest.city_kana);
    var kana = /^[ぁ-ゖー・\s]+$/.test(reading) && reading.length <= 120 ? reading : null;
    return { name: name, kana: kana, display: kana || name };
  }

  function validCoordinates(coords) {
    return coords && typeof coords.latitude === 'number' && Number.isFinite(coords.latitude) && Math.abs(coords.latitude) <= 90 &&
      typeof coords.longitude === 'number' && Number.isFinite(coords.longitude) && Math.abs(coords.longitude) <= 180;
  }

  function locate(geolocation) {
    return new Promise(function (resolve, reject) {
      if (!geolocation || typeof geolocation.getCurrentPosition !== 'function') {
        reject(new Error('location_unavailable'));
        return;
      }
      var settled = false;
      var timer = setTimeout(function () {
        if (!settled) { settled = true; reject(new Error('location_timeout')); }
      }, GEO_TIMEOUT_MS);
      function finish(callback, value) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        callback(value);
      }
      try {
        geolocation.getCurrentPosition(function (position) {
          var coords = position && position.coords;
          finish(validCoordinates(coords) ? resolve : reject,
            validCoordinates(coords) ? coords : new Error('location_unavailable'));
        }, function (failure) {
          var reason = failure && failure.code === 1 ? 'location_denied' :
            failure && failure.code === 3 ? 'location_timeout' : 'location_unavailable';
          finish(reject, new Error(reason));
        }, { enableHighAccuracy: false, maximumAge: 5 * 60 * 1000, timeout: GEO_TIMEOUT_MS });
      } catch (_) {
        finish(reject, new Error('location_unavailable'));
      }
    });
  }

  function getJSON(url, fetcher) {
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer;
    var timeout = new Promise(function (_, reject) {
      timer = setTimeout(function () {
        if (controller) controller.abort();
        reject(new Error('provider_timeout'));
      }, HTTP_TIMEOUT_MS);
    });
    var request = Promise.resolve().then(function () {
      return fetcher(url, { signal: controller && controller.signal, cache: 'no-store', redirect: 'error', headers: { Accept: 'application/json' } });
    }).then(function (response) {
      if (!response || !response.ok) throw new Error('provider_unavailable');
      return response.json();
    });
    return Promise.race([request, timeout]).finally(function () { clearTimeout(timer); });
  }

  function providerURLs(coords) {
    var weatherLatitude = coords.latitude.toFixed(2);
    var weatherLongitude = coords.longitude.toFixed(2);
    var city = new URL('https://geoapi.heartrails.com/api/json');
    city.search = new URLSearchParams({ method: 'searchByGeoLocation', x: String(coords.longitude), y: String(coords.latitude) }).toString();
    var weather = new URL('https://api.open-meteo.com/v1/forecast');
    weather.search = new URLSearchParams({ latitude: weatherLatitude, longitude: weatherLongitude, current: 'weather_code', timeformat: 'unixtime' }).toString();
    return [city.toString(), weather.toString()];
  }

  function locationMessage(reason) {
    if (reason === 'location_denied') return '位置情報の利用が拒否されました。';
    if (reason === 'location_timeout') return '位置情報の取得がタイムアウトしました。';
    return '位置情報を利用できません。';
  }

  function createTracker(options) {
    options = options || {};
    var geolocation = options.geolocation;
    var fetcher = Object.prototype.hasOwnProperty.call(options, 'fetcher') ? options.fetcher : (root && root.fetch);
    var now = typeof options.now === 'function' ? options.now : function () { return new Date(); };
    var onChange = typeof options.onChange === 'function' ? options.onChange : function () {};
    var state = { status: 'idle', municipality: null, weather: null, updatedAt: null, error: null };
    var inFlight = null;

    function snapshot() {
      return {
        status: state.status,
        municipality: state.municipality && Object.assign({}, state.municipality),
        weather: state.weather && Object.assign({}, state.weather),
        updatedAt: state.updatedAt,
        error: state.error
      };
    }
    function publish(next) {
      state = next;
      try { onChange(snapshot()); } catch (_) {}
      return snapshot();
    }
    function request() {
      if (inFlight) return inFlight;
      publish({ status: 'loading', municipality: null, weather: null, updatedAt: null, error: null });
      inFlight = locate(geolocation).then(function (coords) {
        var urls = providerURLs(coords);
        var requests = typeof fetcher === 'function'
          ? [getJSON(urls[0], fetcher), getJSON(urls[1], fetcher)]
          : [Promise.reject(new Error('provider_unavailable')), Promise.reject(new Error('provider_unavailable'))];
        return Promise.allSettled(requests).then(function (results) {
          var municipality = results[0].status === 'fulfilled' ? municipalityFromResponse(results[0].value) : null;
          var current = now();
          var weather = results[1].status === 'fulfilled' ? weatherFromResponse(results[1].value, current) : null;
          var missing = [];
          if (!municipality) missing.push('市区町村を取得できません。');
          if (!weather) missing.push('天気を取得できません。');
          var status = municipality && weather ? 'ready' : municipality || weather ? 'partial' : 'error';
          return publish({ status: status, municipality: municipality, weather: weather,
            updatedAt: new Date(milliseconds(current)).toISOString(), error: missing.length ? missing.join(' ') : null });
        });
      }).catch(function (failure) {
        var reason = failure && failure.message;
        var error = reason && reason.indexOf('location_') === 0 ? locationMessage(reason) : '環境情報を取得できません。';
        return publish({ status: 'error', municipality: null, weather: null, updatedAt: null, error: error });
      }).finally(function () { inFlight = null; });
      return inFlight;
    }
    return { request: request, snapshot: snapshot };
  }

  var api = { timeOfDay: timeOfDay, weatherFromResponse: weatherFromResponse, simulatedWeather: simulatedWeather,
    municipalityFromResponse: municipalityFromResponse, createTracker: createTracker };
  if (typeof window !== 'undefined') window.NaotocchiEnvironment = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
