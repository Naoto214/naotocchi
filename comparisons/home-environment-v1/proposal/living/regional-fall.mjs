// Local painting coordinates are 1000 × 1500. Each emitter keeps its E3 footprint.
import {fallCount, sampleFall} from './fall-motion.mjs';

export function windScale(s) {
  return Math.max(0, Math.min(2, Number.isFinite(s.fall?.wind) ? s.fall.wind : 1));
}

export function drawLocalPrecipitation(ctx, s, emitter) {
  const snow = s.weather === 'snow';
  const kind = snow ? 'snow' : 'rain';
  const {x, y, width, height} = emitter;
  const opts = {region:s.region, seed:emitter.seed, front:emitter.front, depth:s.effects?.depth!==false,
    gusts:s.effects?.gusts!==false};
  const count = fallCount(emitter.count, s.fall);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  ctx.fillStyle = emitter.snowColor ?? '#f5fbff';
  ctx.strokeStyle = emitter.rainColor ?? '#daeef6';
  ctx.lineCap = 'round';
  for (let i=0; i<count; i++) {
    const p = sampleFall(kind, i, s.t, s.fall, opts);
    const px = x + p.x * width, py = y + p.y * height;
    ctx.globalAlpha = Math.min(1, s.alpha * p.alpha * (snow ? .80 : .57));
    ctx.beginPath();
    if (snow) {
      ctx.arc(px, py, emitter.radius * p.radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const length = emitter.length * p.length;
      ctx.lineWidth = (emitter.weight ?? 1.4) * p.radius;
      ctx.moveTo(px - length * p.dx * width / height, py - length);
      ctx.lineTo(px, py);
      ctx.stroke();
    }
  }
  ctx.restore();
}

const autumnFaces = ['#e4ab58', '#cc7b41', '#f1cb7d', '#ce9a57'];
const autumnBacks = ['#a86d48', '#aa6547', '#c08d59', '#a47953'];
const springFaces = ['#ffe1dc', '#ffdae1', '#f9ccdc', '#ffe8dd'];
const springBacks = ['#e4adba', '#eabdc4', '#ddaab9', '#e2b4bf'];
export function drawLocalLeaf(ctx, kind, i, p, x, y, size, alpha) {
  const spring = kind === 'petal';
  const colors = spring
    ? (p.face < 0 ? springBacks : springFaces)
    : (p.face < 0 ? autumnBacks : autumnFaces);
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(p.rotation);
  ctx.scale(size * p.radius, size * p.radius * p.roll);
  ctx.fillStyle = colors[i % colors.length];
  ctx.globalAlpha = Math.min(1, alpha * p.alpha);
  ctx.beginPath();
  if (spring) {
    ctx.moveTo(-1,0);
    ctx.bezierCurveTo(-.65,-.62,.26,-.87,.61,-.55);
    ctx.quadraticCurveTo(.75,-.49,.76,-.23);
    ctx.quadraticCurveTo(.99,-.18,1,.04);
    ctx.bezierCurveTo(.96,.56,.03,.72,-1,0);
  } else {
    ctx.moveTo(-1,0);
    ctx.quadraticCurveTo(-.24,-.71,1,-.10);
    ctx.quadraticCurveTo(.22,.65,-1,0);
  }
  ctx.fill();
  ctx.restore();
}
