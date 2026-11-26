// The change that links measured weather to the home, written as exact substitutions on the two
// production files so it can be reviewed, tested and applied as it stands. The request count
// does not change: the one existing weather request asks for five more fields.
function replace(text, anchor, change) {
  if (text.split(anchor).length !== 2) throw new Error('Missing or duplicate production anchor ' + anchor.slice(0, 60));
  return text.replace(anchor, () => change);
}
const MEASURED = `
  // Rain, snow and wind as measured, in mm/h, cm/h and m/s. Each field is null unless the
  // service reported a finite, plausible value in a unit we know; nothing is ever guessed.
  function measuredFromResponse(data) {
    var current = data && data.current, units = (data && data.current_units) || {};
    if (!current || typeof current !== 'object') return null;
    function reading(name, limit, convert) {
      var value = current[name], factor = convert[units[name] === undefined ? '' : String(units[name]).toLowerCase()];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || factor === undefined) return null;
      value *= factor;
      return value <= limit ? value : null;
    }
    // Rain and snow are totals over the reporting interval; turn them into an hourly rate.
    var seconds = typeof current.interval === 'number' && current.interval >= 300 && current.interval <= 3600 ? current.interval : 3600;
    var perHour = 3600 / seconds;
    var rain = reading('precipitation', 200 / perHour, { '': 1, 'mm': 1, 'inch': 25.4 });
    var snow = reading('snowfall', 50 / perHour, { '': 1, 'cm': 1, 'inch': 2.54 });
    var speed = { '': 1, 'm/s': 1, 'km/h': 1 / 3.6, 'mp/h': 0.44704, 'mph': 0.44704, 'kn': 0.514444 };
    var wind = reading('wind_speed_10m', 75, speed), gusts = reading('wind_gusts_10m', 110, speed);
    var direction = current.wind_direction_10m;
    var measured = {
      precipitation: rain === null ? null : rain * perHour,
      snowfall: snow === null ? null : snow * perHour,
      windSpeed: wind,
      // A gust below the mean speed is a faulty reading.
      windGusts: gusts !== null && wind !== null && gusts >= wind ? gusts : null,
      windDirection: typeof direction === 'number' && Number.isFinite(direction) && direction >= 0 && direction <= 360 ? direction : null
    };
    return measured.precipitation === null && measured.snowfall === null && measured.windSpeed === null ? null : measured;
  }
`;
exports.FIELDS = 'weather_code,precipitation,snowfall,wind_speed_10m,wind_gusts_10m,wind_direction_10m';
exports.environment = source => {
  let s = replace(source, "current: 'weather_code', timeformat: 'unixtime' }", `current: '${exports.FIELDS}', wind_speed_unit: 'ms', timeformat: 'unixtime' }`);
  s = replace(s, "  function weatherFromResponse(data, now) {", MEASURED + "\n  function weatherFromResponse(data, now) {");
  s = replace(s, "return { mode: details.mode, label: details.label, measuredAt: new Date(measuredMs).toISOString() };",
    "return { mode: details.mode, label: details.label, measuredAt: new Date(measuredMs).toISOString(), measured: measuredFromResponse(data) };");
  return replace(s, "var api = { timeOfDay: timeOfDay, weatherFromResponse: weatherFromResponse,", "var api = { timeOfDay: timeOfDay, weatherFromResponse: weatherFromResponse, measuredFromResponse: measuredFromResponse,");
};
exports.script = source => {
  // Measured values travel with the observed weather only: a manual or simulated sky has none.
  let s = replace(source, "if (fresh && currentRegionId() === 'home') return { weather: observed.mode, source: 'observed' };",
    "if (fresh && currentRegionId() === 'home') return { weather: observed.mode, source: 'observed', conditions: observed.measured || null };");
  return replace(s, "    if (locality) environment.locality = locality;\n    return environment;", "    if (locality) environment.locality = locality;\n    if (w.conditions) environment.conditions = w.conditions;\n    return environment;");
};
