// Fall tracks are functions of the shared scene clock. Seeking, split view and
// skipping a frame give the same position, independently of the render cadence.
const TAU = 2 * Math.PI;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const unit = value => value - Math.floor(value);
const factor = (value, lo, hi) => Number.isFinite(value) ? clamp(value, lo, hi) : 1;
const smooth = value => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};
function hash(value) {
  let bits = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  bits = Math.imul(bits ^ (bits >>> 15), 0x735a2d97);
  return ((bits ^ (bits >>> 15)) >>> 0) / 4294967296;
}
export function fallCount(base, controls) {
  return clamp(Math.round(Math.max(0, base) * factor(controls?.count, 0, 1.5)), 0, 64);
}

// Used only when the painting does not supply its own wind field. Sea winds
// have a longer fetch, indoor glass and frost on sheltered ground feel less.
const exposure = { sea: 1.1, river_lake: .67, home: .23, countryside: .78,
  mountain: .94, jungle: .4, desert: .97, city: .52, snow: .76, memory_lake: .35 };
export function fallWind(seconds, x, depth, enabled = true, region = 'forest') {
  const local = seconds - 3.8 * x - .65 * depth;
  const block = Math.floor(local / 26);
  const centre = 8 + 9 * hash(block + 214);
  const weight = Math.max(0, 1 - Math.abs(unit(local / 26) * 26 - centre) / 5.4);
  const gust = enabled ? smooth(weight) : 0;
  const direction = hash(block + 1201) < .4 ? -1 : 1;
  const gain = exposure[region] ?? .6;
  const breath = .21 * Math.sin(local * .54) + .11 * Math.sin(local * .95 + depth);
  return { gust: gust * gain, bend: (breath + direction * gust) * gain };
}

const kinds = { leaf: 1787, petal: 1873, snow: 1999, rain: 2099 };
const records = new Map();
function getTrack(kind, i, region, seed) {
  const key = region + '/' + kind + '/' + seed;
  let group = records.get(key);
  if (!group) {
    group = [];
    records.set(key, group);
  }
  if (group[i]) return group[i];
  const id = Math.imul(seed, 331) + i * 79 + kinds[kind];
  const band = ((i % 3) + .15 + .70 * hash(id)) / 3;
  const track = {
    id, band, offset: hash(id + 1), tempo: .82 + .37 * hash(id + 2),
    sway: .63 + .73 * hash(id + 3), eddy: .46 + .56 * hash(id + 4),
    rotation: (hash(id + 5) - .5) * TAU, spin: .68 + .67 * hash(id + 6),
    chirality: hash(id + 7) > .5 ? 1 : -1,
    susceptible: hash(id + 8) < .36, variation: .81 + .37 * hash(id + 9),
    flight: NaN, windAge: new Float64Array(64), windBend: new Float64Array(64),
    windGust: new Float64Array(64)
  };
  group[i] = track;
  return track;
}

const windSpacing = .65;
// A displacement is the integral of the signed wind. This keeps a leaf moving
// downwind through a front and gently settles its lateral speed after passage.
// Cache the integral and field at uniform knots per fall. The knot count is
// fixed even at 25% speed, and grows lazily by at most one in ordinary playback.
function windTransport(track, localAge, life, secondsPerLocal, birth, sourceX, z, options, speed, scale) {
  const step = Math.max(windSpacing * speed, life / 60);
  const knot = Math.floor(localAge / step);
  const evaluate = index => {
    const seconds = birth + index * step * secondsPerLocal;
    return options.front
      ? options.front(seconds, sourceX, z, options.gusts !== false)
      : fallWind(seconds, sourceX, z, options.gusts !== false, options.region);
  };
  // A given track has one active passage. Cache keys also cover comparison
  // edits made while paused; replay after seeking back reconstructs the knots.
  if (track.birth !== birth || track.z !== z || track.anchor !== sourceX ||
      track.gusts !== options.gusts || track.field !== options.fieldKey ||
      track.speed !== speed || track.front !== options.front) {
    track.birth = birth; track.z = z; track.anchor = sourceX;
    track.gusts = options.gusts; track.field = options.fieldKey;
    track.speed = speed; track.front = options.front;
    const first = evaluate(0);
    track.windAge[0] = 0; track.windBend[0] = first.bend; track.windGust[0] = first.gust;
    track.knots = 0;
  }
  const bends = track.windBend, gusts = track.windGust, integral = track.windAge;
  while (track.knots <= knot) {
    const j = track.knots + 1, field = evaluate(j);
    bends[j] = field.bend; gusts[j] = field.gust;
    integral[j] = integral[j - 1] + .5 * (bends[j - 1] + bends[j]) * step;
    track.knots = j;
  }
  const f = localAge / step - knot;
  const bend = bends[knot] + f * (bends[knot + 1] - bends[knot]);
  return {
    distance: (integral[knot] + .5 * (bends[knot] + bend) * f * step) * secondsPerLocal * scale,
    bend: bend * scale,
    gust: (gusts[knot] + f * (gusts[knot + 1] - gusts[knot])) * scale
  };
}

// x/y use the caller's unit rectangle. 'dx' is the normalized rain slope;
// convert it to the drawing rectangle's aspect ratio with width / height.
// 'anchorX' lets individual boughs use the same source for wind and release.
export function sampleFall(kind, i, seconds, controls, options = {}) {
  const { region = 'forest', seed = 0 } = options;
  const track = getTrack(kind, i, region, seed);
  const z = options.depth === false ? .52 : track.band;
  const speed = factor(controls?.speed, .25, 2);
  const size = factor(controls?.size, .5, 2);
  const wind = factor(controls?.wind, 0, 2);
  const rain = kind === 'rain', snow = kind === 'snow', petal = kind === 'petal';
  const base = rain ? 2.21 : snow ? 18.8 : petal ? 31.8 : 22.5;
  const life = base * track.tempo / (.70 + .76 * z);
  const progress = seconds * speed / life + track.offset;
  const flight = Math.floor(progress), phase = unit(progress);
  if (track.flight !== flight) {
    track.flight = flight;
    track.startX = .04 + .92 * hash(track.id + 37 * flight + 31);
    track.opacity = .70 + .30 * hash(track.id + 37 * flight + 47);
    track.length = .73 + .54 * hash(track.id + 37 * flight + 53);
  }
  const sourceX = options.anchorX ?? track.startX;
  const radius = (.46 + .98 * z) * track.variation * size;
  const birth = (flight - track.offset) * life / speed;
  const edge = smooth(phase / .075) * smooth((1 - phase) / .11);
  const alpha = edge * track.opacity * (.65 + .35 * z);

  if (rain) {
    // A drop samples the local air once on release. A gust changes the next
    // drops' incidence; none steer, wobble, or change orientation mid-streak.
    if (track.birth !== birth || track.anchor !== sourceX || track.z !== z ||
        track.gusts !== options.gusts || track.front !== options.front || track.field !== options.fieldKey) {
      track.birth = birth; track.anchor = sourceX; track.z = z;
      track.gusts = options.gusts; track.front = options.front; track.field = options.fieldKey;
      track.release = options.front
        ? options.front(birth, sourceX, z, options.gusts !== false)
        : fallWind(birth, sourceX, z, options.gusts !== false, region);
    }
    const field = track.release;
    // The deadband keeps calm rain vertical; its smooth shoulder avoids a
    // visible snap when a stronger current crosses that threshold.
    const magnitude = Math.max(0, Math.abs(field.bend) - .22);
    const dx = magnitude && wind ? Math.sign(field.bend) * Math.min(.39, .24 * magnitude * wind / speed) : 0;
    return { sourceX, x: sourceX + dx * phase, y: phase, phase, depth: z, radius,
      length: track.length * (.81 + .38 * z) * size, alpha, rotation: 0,
      roll: 1, face: 1, dx, dy: 1, gust: field.gust * wind, bend: field.bend * wind };
  }
  const age = phase * life;
  const flow = windTransport(track, age, life, 1 / speed, birth, sourceX, z, options, speed, wind);
  // Phase modulation and each leaf's own period break the mechanical lock
  // between horizontal drift, pitch and the turning face. Snow close to the
  // lens catches small eddies; distant crystals keep a narrower path.
  // Fall speed controls gravity; local eddies, flip cadence and passing fronts
  // remain on the scene clock, shared with the boughs and the other residents.
  const local = seconds;
  const slow = Math.sin(local * (.17 + .13 * track.eddy) + track.rotation);
  const angle = local * (.57 + .38 * track.eddy) * (petal ? .77 : 1)
    + track.rotation + .77 * slow;
  const arc = Math.sin(angle);
  const airResponse = snow ? .016 + .034 * z : petal ? .044 : .035;
  const flutter = (snow ? .002 + .023 * z * z : petal ? .027 : .020) * track.sway;
  const x = sourceX + airResponse * flow.distance + flutter * arc;
  let y = phase, rotation = 0, face = 1;
  if (!snow) {
    const glide = Math.sin(phase * Math.PI);
    const pitch = local * (.81 + .42 * track.eddy) * track.spin * (petal ? .57 : 1);
    rotation = track.rotation + track.chirality * (pitch + .82 * slow)
      + (petal ? .28 : .44) * flow.bend;
    face = Math.cos(rotation * .83 + .72 * arc);
    const lift = track.susceptible ? smooth((flow.gust - .25) / .77) : 0;
    y += glide * ((petal ? .013 : .008) * arc - lift * (petal ? .16 : .12));
  } else {
    y += .0040 * z * z * Math.sin(angle * .73 + track.rotation) * Math.sin(phase * Math.PI);
  }
  // When the wind carries a track outside the painting, dissipate it at the
  // edge instead of wrapping horizontally onto the opposite tree or window.
  const lateralFade = smooth((x + .01) / .045) * smooth((1.01 - x) / .045);
  return { sourceX, x, y, phase, depth: z, radius, length: size, rotation,
    face, roll: .15 + .85 * Math.abs(face), alpha: alpha * lateralFade,
    dx: 0, dy: 1, gust: flow.gust, bend: flow.bend };
}
