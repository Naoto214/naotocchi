// Each leaf uses the scene’s branch release, depth, wind and fade. Distances
// below are in the 1000 × 1500 painting, independent of the canvas pixel ratio.
const sizes = {A:1.5, B:2, C:2.5};
const clamp01 = x => Math.min(1, Math.max(0, x));

export function sampleAutumnLeaf(i, p, baseSize, state) {
  const t = state.t ?? state.seconds ?? 0;
  const z = p.depth, z2 = z * z;
  const field = state.region === 'countryside';
  const offset = 2.39996 * i + (field ? 1.31 : 0);
  const tempo = .75 + .31 * ((i * 13) % 17) / 16;
  const slow = Math.sin(t * (.21 + .08 * tempo) + offset);
  const bank = t * tempo + offset + .82 * slow;
  const swing = Math.sin(bank), tilt = Math.cos(bank);
  const flutter = Math.sin(bank * 1.73 - offset * .42);
  const flight = Math.sin(Math.PI * p.phase);
  const gust = clamp01((p.gust - .14) / .76);
  const lift = gust * gust * (3 - 2 * gust) * (i % 4 === 1 ? .38 : 1);
  // A broad, slowing bank, a smaller roll, then a quicker downward slip.
  // The shorter field pass keeps the movement close to the orchard or verge.
  const dx = flight * (field ? .88 : 1) * (7 + 40 * z2) * (swing + .31 * flutter);
  const dy = flight * (field ? .60 : 1) * ((2.3 + 15 * z2) * (tilt - .42 * flutter)
    - (9 + 89 * z2) * lift);
  const rotation = .66 * p.rotation + (.40 + .84 * z) * tilt + .19 * flutter + .13 * p.bend;
  const face = Math.sin(1.30 * p.face + .25 * flutter);
  return {
    dx, dy, rotation, face,
    roll:.23 + .77 * Math.abs(face),
    radius:baseSize * p.radius * (sizes[state.leafVariant] ?? 2) * (.91 + .25 * z),
    opacityGain:1.09 + .27 * z
  };
}

// Body, sunlit plane, rim, and midrib for the face and the muted reverse.
const pigments = {
  red:[['#c84b31','#fb8953','#80382e','#ffd097'], ['#af5947','#d99173','#763e35','#efbd90']],
  orange:[['#d77828','#ffb955','#8c4826','#ffe2a0'], ['#ae7245','#e6a772','#815437','#f8d393']],
  gold:[['#dfa332','#ffe086','#895c2b','#a27032'], ['#c38d4e','#edc27f','#825b38','#946738']],
  orchardRed:[['#ce4138','#fb7853','#83362e','#ffd39a'], ['#a73548','#df6971','#713330','#f4b391']]
};
const mix = ['gold','orange','red','red','gold','orange','orange','red','gold'];

function blade(ctx, lobed) {
  ctx.beginPath();
  ctx.moveTo(-.82,.13);
  if (lobed) {
    ctx.quadraticCurveTo(-.87,-.04,-.77,-.22);
    ctx.lineTo(-.90,-.51);
    ctx.quadraticCurveTo(-.62,-.47,-.42,-.32);
    ctx.lineTo(-.49,-.70);
    ctx.quadraticCurveTo(-.14,-.58,.10,-.37);
    ctx.lineTo(.23,-.55);
    ctx.quadraticCurveTo(.47,-.36,.52,-.24);
  } else {
    ctx.quadraticCurveTo(-.90,-.20,-.63,-.38);
    ctx.lineTo(-.71,-.46);
    ctx.quadraticCurveTo(-.49,-.50,-.33,-.44);
    ctx.lineTo(-.39,-.57);
    ctx.quadraticCurveTo(-.02,-.61,.21,-.45);
    ctx.lineTo(.20,-.54);
    ctx.quadraticCurveTo(.43,-.46,.54,-.28);
  }
  ctx.quadraticCurveTo(.75,-.18,1,-.12);
  ctx.quadraticCurveTo(.80,.04,.62,.23);
  if (lobed) {
    ctx.lineTo(.55,.39); ctx.lineTo(.33,.35);
    ctx.quadraticCurveTo(.14,.58,-.13,.68);
    ctx.lineTo(-.10,.46);
    ctx.quadraticCurveTo(-.41,.67,-.70,.61);
    ctx.lineTo(-.61,.40);
  } else {
    ctx.lineTo(.53,.40); ctx.lineTo(.44,.34);
    ctx.quadraticCurveTo(.27,.53,.03,.55);
    ctx.lineTo(.07,.44);
    ctx.quadraticCurveTo(-.40,.66,-.61,.43);
  }
  ctx.quadraticCurveTo(-.78,.36,-.82,.13);
  ctx.closePath();
}

function paintFace(ctx, lobed, colors) {
  const [body, light, rim, rib] = colors;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rim;
  ctx.lineWidth = .095;
  ctx.beginPath();
  ctx.moveTo(-1.03,.28);
  ctx.quadraticCurveTo(-.95,.17,-.72,.12);
  ctx.stroke();
  blade(ctx,lobed);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.clip();
  // Give the folded blade one lit side with a slightly curved central ridge.
  ctx.beginPath();
  ctx.moveTo(-.90,.16);
  ctx.quadraticCurveTo(-.23,-.08,1,-.12);
  ctx.lineTo(1,-.75); ctx.lineTo(-.95,-.75); ctx.closePath();
  const wash = ctx.createLinearGradient(-.88,.14,.97,-.24);
  wash.addColorStop(0,body); wash.addColorStop(.31,light);
  wash.addColorStop(.66,light); wash.addColorStop(1,body);
  ctx.fillStyle = wash; ctx.fill();
  ctx.beginPath(); ctx.moveTo(-.85,.16);
  ctx.quadraticCurveTo(-.22,-.07,.83,-.11);
  ctx.moveTo(-.35,.046); ctx.quadraticCurveTo(-.16,.21,-.04,.33);
  ctx.strokeStyle = rib; ctx.lineWidth = .064; ctx.stroke();
  ctx.restore();
}

// Both silhouettes, three palette families and the orchard accent use at most fourteen sprites.
// A particle blits one sprite even while it is banking or crossing a gust.
const sprites = new Map();
const spriteWidth = 112, spriteHeight = 80, texels = 48;
function getSprite(key, lobed, colors, ctx) {
  if (sprites.has(key)) return sprites.get(key);
  const doc = ctx.canvas?.ownerDocument ?? globalThis.document;
  const sprite = typeof OffscreenCanvas === 'function'
    ? new OffscreenCanvas(spriteWidth,spriteHeight) : doc?.createElement('canvas');
  if (!sprite) return null;
  sprite.width = spriteWidth; sprite.height = spriteHeight;
  const brush = sprite.getContext('2d');
  if (!brush) return null;
  brush.setTransform(texels,0,0,texels,spriteWidth/2,spriteHeight/2);
  paintFace(brush,lobed,colors);
  sprites.set(key,sprite);
  return sprite;
}

export function drawAutumnLeaf(ctx, i, p, x, y, baseSize, alpha, state) {
  if (p.alpha <= 0 || alpha <= 0) return;
  const g = sampleAutumnLeaf(i,p,baseSize,state);
  let hue = state.leafColor;
  if (!Object.hasOwn(pigments,hue)) {
    // Give the near orchard leaf a carmine reverse against the ochre field.
    hue = state.region === 'countryside' && i === 5 ? 'orchardRed' : mix[i % mix.length];
  }
  const reverse = g.face < 0, lobed = i % 3 !== 1;
  const colors = pigments[hue][Number(reverse)];
  const sprite = getSprite(hue + Number(reverse) + Number(lobed),lobed,colors,ctx);
  ctx.save();
  ctx.translate(x + g.dx, y + g.dy);
  ctx.rotate(g.rotation);
  ctx.scale(g.radius, g.radius * g.roll * (reverse ? -1 : 1));
  ctx.globalAlpha = clamp01(alpha * Math.min(1,p.alpha * g.opacityGain));
  if (sprite) {
    ctx.drawImage(sprite,-spriteWidth/(2*texels),-spriteHeight/(2*texels),spriteWidth/texels,spriteHeight/texels);
  } else {
    paintFace(ctx,lobed,colors);
  }
  ctx.restore();
}
