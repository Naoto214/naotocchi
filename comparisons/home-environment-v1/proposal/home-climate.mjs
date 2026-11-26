// How the approved effects vary and combine. Nothing here draws: it answers three questions
// for the painters — which layers are present for a scene, how strong the wind is right now,
// and how dense each kind of falling particle is right now.
function hash(value) {
  let bits = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  bits = Math.imul(bits ^ (bits >>> 15), 0x735a2d97);
  return ((bits ^ (bits >>> 15)) >>> 0) / 4294967296;
}
const clamp = (value, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

// ---- Which layers a scene shows -------------------------------------------------------------
const SEALED = new Set(['deepsea','star_stop','memory_lake']);   // weather on the ground does not reach them
const NO_SNOW = new Set(['desert','jungle']);
// Where petals fall in spring and leaves in autumn, and how many of the approved amount.
// The jungle is evergreen; the desert, the snow country, the sea, the deep sea and the stars
// have no trees that shed. The lake is spared the weather but its willow still keeps the seasons.
export const SEASONAL = Object.freeze({forest:1, countryside:1, river_lake:1, mountain:1, city:.85, memory_lake:.7, home:1});
const RAIN_RINGS = new Set(['sea','river_lake','jungle']);
const FIREFLIES = new Set(['forest','countryside','river_lake','jungle']);
// Night skies with open, painted stars, including the one seen through the window at home.
// The jungle canopy and the deep sea have none.
export const STARRY = new Set(['forest','river_lake','countryside','mountain','snow','sea','desert','memory_lake','city','home']);

// Everything that is present for a scene, with the share of its usual amount (1 = as approved).
// Layers coexist wherever that is natural; a layer is reduced or dropped only on a real conflict.
export function layersFor(env) {
  const {region, season, weather, time} = env, sealed = SEALED.has(region);
  const precipitation = sealed ? null : weather === 'rain' ? 'rain' : weather === 'snow' && !NO_SNOW.has(region) ? 'snow' : null;
  const clear = weather === 'sunny' || weather === 'cloudy' || sealed, night = time === 'night', dusk = night || time === 'evening';
  const seasonal = SEASONAL[region] || 0;
  // Petals and leaves keep falling in rain or snow, but only a few: wet ones mostly stay put.
  const wet = precipitation === 'rain' ? .35 : precipitation === 'snow' ? .25 : 1;
  const sky = sealed ? 'sunny' : weather;
  return {
    precipitation,                                       // rain or snow, never both
    rings:precipitation === 'rain' && RAIN_RINGS.has(region),
    petals:season === 'spring' ? seasonal * wet : 0,
    leaves:season === 'autumn' ? seasonal * wet : 0,
    veil:!sealed && weather !== 'sunny',
    // Stars show through thin cloud faintly and not at all through rain or snow.
    twinkle:night && STARRY.has(region) ? (sky === 'sunny' ? 1 : sky === 'cloudy' ? .35 : 0) : 0,
    meteors:night && STARRY.has(region) ? (sky === 'sunny' ? 1 : sky === 'cloudy' ? .3 : 0) : 0,
    fireflies:clear && (region === 'memory_lake' || dusk && season === 'summer' && FIREFLIES.has(region)),
    sunlight:weather === 'sunny' && !night
  };
}

// ---- Wind and density over time -------------------------------------------------------------
// A value holds for a while, then eases to the next. Rising is quick, falling is slow, so a
// strong wind arrives as a gust and dies away gradually.
function drifting(seed, seconds, span, pick) {
  const at = seconds / span, k = Math.floor(at), u = at - k;
  const a = pick(hash(seed + k * 7919)), b = pick(hash(seed + (k + 1) * 7919));
  const window = b > a ? .22 : .6;
  return a + (b - a) * smooth((u - (1 - window)) / window);
}
export const WIND_LEVELS = Object.freeze({calm:.22, light:.6, normal:1, strong:1.45});
export const DENSITY_LEVELS = Object.freeze({small:.55, medium:1, large:1.45});
const windPick = stormy => r => {
  // calm · light · normal · strong; rain and snow lean toward wind.
  const [calm, light, normal] = stormy ? [.06, .26, .68] : [.16, .46, .82];
  return r < calm ? WIND_LEVELS.calm : r < light ? WIND_LEVELS.light : r < normal ? WIND_LEVELS.normal : WIND_LEVELS.strong;
};
const densityPick = r => r < .27 ? DENSITY_LEVELS.small : r < .75 ? DENSITY_LEVELS.medium : DENSITY_LEVELS.large;

// Measured weather, when the game has it: rain in mm/h, snow in cm/h, wind in m/s.
export function fromMeasured(measured) {
  if (!measured) return null;
  const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
  const rain = number(measured.precipitation), snow = number(measured.snowfall), wind = number(measured.windSpeed), gusts = number(measured.windGusts);
  return {
    // Drizzle under 1 mm/h is "small", 1–4 "medium", a downpour over 4 "large".
    rain:rain == null ? null : .5 + .95 * smooth(rain / 6),
    snow:snow == null ? null : .5 + .95 * smooth(snow / 3),
    // Still air to a strong breeze: 0 → calm, 3 m/s → light, 6 → normal, 10 and over → strong.
    wind:wind == null ? null : .2 + 1.3 * smooth(wind / 11),
    gusty:wind != null && gusts != null ? clamp((gusts - wind) / 8) : null
  };
}

// `seed` makes every visit differ. `override` lets a test page pin a level: {wind, density, measured, speed}.
export function createClimate(seed = 1) {
  const base = (seed >>> 0) || 1;
  return {
    // Wind strength at a moment; 1 is the approved strength.
    wind(seconds, env, override = {}) {
      if (typeof override.wind === 'number') return override.wind;
      const t = seconds * (override.speed || 1), stormy = env.weather === 'rain' || env.weather === 'snow';
      const measured = fromMeasured(override.measured);
      if (measured?.wind != null) {
        // The measured speed sets the level; gusts make it swell and ease around that level.
        const swell = drifting(base + 31, t, 19, r => r < .3 ? -.5 : r < .75 ? 0 : 1);
        return clamp(measured.wind * (1 + (.12 + .3 * (measured.gusty ?? .3)) * swell), .15, 1.6);
      }
      return drifting(base + 11, t, 31, windPick(stormy)) * (.92 + .16 * drifting(base + 13, t, 7, r => r));
    },
    // How much of the sky is under cloud, 0 clear to 1 overcast. A fine day has a few passing
    // clouds, sometimes more; grey days vary between broken and solid cover.
    cloud(seconds, env, override = {}) {
      if (typeof override.cloud === 'number') return override.cloud;
      const t = seconds * (override.speed || 1), cover = override.measured?.cloudCover;
      const drift = drifting(base + 71, t, 83, r => r);
      if (env.weather === 'rain') return .9 + .1 * drift;
      if (env.weather === 'snow') return .84 + .14 * drift;
      // Measured cover applies to dry skies only: rain and snow are always under cloud.
      if (typeof cover === 'number' && Number.isFinite(cover) && cover >= 0 && cover <= 100) return clamp(cover / 100 * (.94 + .12 * drift));
      return env.weather === 'cloudy' ? .62 + .3 * drift : .08 + .3 * drift * drift;
    },
    // How many particles of a kind fall, as a share of the approved amount, at a moment.
    density(kind, seconds, env, override = {}) {
      if (typeof override.density === 'number') return override.density;
      const t = seconds * (override.speed || 1), measured = fromMeasured(override.measured);
      if (kind === 'rain' && measured?.rain != null) return measured.rain * (.94 + .12 * drifting(base + 41, t, 23, r => r));
      if (kind === 'snow' && measured?.snow != null) return measured.snow * (.94 + .12 * drifting(base + 43, t, 29, r => r));
      const level = drifting(base + (kind === 'rain' ? 51 : kind === 'snow' ? 53 : kind === 'petal' ? 57 : 59), t, kind === 'rain' ? 47 : 61, densityPick);
      if (kind !== 'petal' && kind !== 'leaf') return level;
      // More petals and leaves come loose while the wind is up.
      const wind = this.wind(seconds, env, override);
      return clamp(level * (.7 + .45 * wind), .4, 1.75);
    }
  };
}
export const levelName = (value, levels) => Object.entries(levels).reduce((best, [name, v]) => Math.abs(v - value) < Math.abs(levels[best] - value) ? name : best, Object.keys(levels)[0]);
