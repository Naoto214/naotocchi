// なおとっち — Character 3D の うごき(clip ファイル なし。bone の 数字を まいフレーム きめる)。
//
// layer:  1) base locomotion(species の あるきかた: 4 足 / よちよち / およぐ / はう / はばたく / ゆれる …)と idle の 姿勢
//         2) emotion posture(canonical emotion → spec の body 数字: はねる・うなだれ・そっぽ・ふるえ)
//         3) temporary reaction(イベントで 1 かい: hop / huff / yawn / wobble)
// reduced motion(animLv 0): はねる・ゆれる・ふるえ・reaction の うごき を とめる。あるく 足の うごき は 半分 のこす(移動が わかる ため)
import SPEC from './spec-esm.mjs';
import { THREE } from './geometry.mjs';
const hangingOffset = new THREE.Vector3();
import { applyFaceExpression, blink } from './rig.mjs';

const TAU = Math.PI * 2;
const approach = (v, to, d) => (v < to ? Math.min(to, v + d) : Math.max(to, v - d));
const lerp = (a, b, t) => a + (b - a) * t;
export const REACTION_MS = { hop: 700, huff: 800, yawn: 1400, wobble: 1100 };
export const GAIT_HZ = { quadWalk: 2.1, waddle: 2.4, swimHover: 1.6, humanWalk: 1.9, crawl: 1.5, inchCrawl: 1.3, hangSway: 0.6, hopSway: 1.8, flutter: 1.0, plantSway: 1.6, squashHop: 1.7, clusterBob: 1.6, radialShuffle: 1.7, blobFloat: 1.2 };

// Grafted fish reuse the owning actor's gait phase; only their appendages move.
// No extra actor state, root hover, emotion vocabulary or gameplay events.
function swimAppendages(B,s,m,k,prefix='',offset=0){
  const ph=s.phase*TAU+offset,tail=B[prefix+'tail'],left=B[prefix+'finL'],right=B[prefix+'finR'];
  if(tail)tail.rotation.y+=Math.sin(ph+.9)*(.3+.25*m)*Math.max(k.amp,.4);
  if(left&&right){left.rotation.y+=Math.sin(s.t*7+offset)*.35*Math.max(k.idle,.3);right.rotation.y-=Math.sin(s.t*7+offset)*.35*Math.max(k.idle,.3);}
}

export function createAnimState(seed = 0) {
  return { t: (seed % 97) * 0.37, phase: 0, move: 0, blinkIn: 1.5 + (seed % 7) * 0.4, blinkT: -1, reaction: null, emotion: null, expr: SPEC.expressionParams('normal') };
}
export function setEmotion(inst, emotion) {
  const em = SPEC.CANONICAL_EMOTIONS.includes(emotion) ? emotion : 'normal';
  if (inst.anim.emotion === em) return false;
  inst.anim.emotion = em; inst.anim.expr = SPEC.expressionParams(em);
  applyFaceExpression(inst.face, em);
  return true;
}
export function react(inst, kind, nowS) {
  if (!Object.hasOwn(REACTION_MS, kind)) return false;
  inst.anim.reaction = { kind, t0: nowS != null ? nowS : inst.anim.t };
  return true;
}
function restore(bones) {
  for (const b of Object.values(bones)) { const r = b.userData.rest; if (!r) continue; b.position.copy(r.p); b.rotation.copy(r.r); b.scale.copy(r.s); }
}

// ---------------- base locomotion
const LOCO = {
  quadWalk(B, s, m, k, meta) {
    const ph = s.phase * TAU, sw = 0.6 * m * k.amp;
    if (B.legFL) { B.legFL.rotation.x += Math.sin(ph) * sw; B.legBR.rotation.x += Math.sin(ph) * sw; B.legFR.rotation.x += Math.sin(ph + Math.PI) * sw; B.legBL.rotation.x += Math.sin(ph + Math.PI) * sw; }
    B.body.position.y += Math.abs(Math.sin(ph)) * 0.03 * m * k.amp;
    B.head.rotation.x += Math.sin(ph * 2) * 0.04 * m * k.amp;
    if (B.tail) B.tail.rotation.y += Math.sin(s.t * (5 + 6 * s.expr.body.bounce)) * (0.25 + 0.45 * s.expr.body.bounce) * k.idle + Math.sin(ph) * 0.2 * m * k.amp;
    // idle の 姿勢(ふせ / おすわり)。あるくと 立つ
    const w = 1 - m, pose = meta.idlePose;
    const lifted = meta.poseProfile?.pawLift;
    if (lifted && B[lifted]) B[lifted].rotation.x += (meta.poseProfile.pawLiftAngle ?? -1) * w;
    if (pose === 'recline' && w > 0) {
      const p=meta.poseProfile;
      B.body.position.y=lerp(B.body.position.y,meta.bodyR*.89,w);
      B.body.rotation.y+=p.yaw*w;B.body.rotation.z+=p.roll*w;
      B.head.rotation.y+=p.headYaw*w;B.head.rotation.z+=.08*w;B.head.position.y+=meta.bodyR*.25*w;
      for(const [n,a,z,roll]of [['legFL',-1.42,.11,-.12],['legFR',-2.0,.12,.55],['legBL',-1.35,-.04,-.48],['legBR',-1.35,.01,.28]]){B[n].rotation.x+=a*w;B[n].rotation.z+=roll*w;B[n].position.z+=z*w;}
      if(B.tail)B.tail.rotation.y-=.40*w;
    } else if (pose === 'lie' && w > 0) {
      B.body.position.y = lerp(B.body.position.y, meta.bodyR * 0.82, w);
      for (const n of ['legFL', 'legFR']) B[n].rotation.x += -1.38 * w;
      for (const n of ['legBL', 'legBR']) B[n].rotation.x += -1.25 * w;
      B.head.position.y -= meta.bodyR * 0.25 * w; B.head.rotation.x += 0.18 * w;
    } else if (pose === 'stretchPlay' && w > 0) {
      const stretch=(meta.poseProfile?.stretch ?? 1)*w;
      B.body.position.y -= meta.bodyR*.12*w;
      B.legFL.rotation.x -= 1.10*stretch; B.legFR.rotation.x -= 1.30*stretch;
      B.legBL.rotation.x += .72*stretch; B.legBR.rotation.x += 1.10*stretch;
      B.head.rotation.x -= .08*w;
    } else if (pose === 'playBow' && w > 0) {
      const bw=w*w*w, bow=(meta.poseProfile?.bow || .55)*bw, pr=meta.pawR, L=meta.legTop;
      B.body.rotation.x += bow;
      // Rear paws remain vertical; solve the foreleg angle against the same
      // ground plane, including the ellipsoidal paw's projected support radius.
      const targetY = L+pr*.02+meta.bodyR*.25*Math.cos(bow)-meta.bodyLen*.33*Math.sin(bow);
      B.body.position.y=lerp(B.body.position.y,targetY,bw);
      const frontY=B.body.position.y-meta.bodyR*.25*Math.cos(bow)-meta.bodyLen*.33*Math.sin(bow);
      const sole=(a)=>frontY+(-L+pr*.6)*Math.cos(a)-pr*.35*Math.sin(a)-Math.hypot(pr*.62*Math.cos(a),pr*1.3*Math.sin(a));
      let lo=-Math.PI/2,hi=0;
      for(let i=0;i<12;i++){const mid=(lo+hi)/2;if(sole(mid)>0)lo=mid;else hi=mid;}
      const reach=(lo+hi)/2;
      B.head.rotation.x -= .45*bw;
      for(const n of ['legFL','legFR']) B[n].rotation.x += reach-bow;
      for(const n of ['legBL','legBR']) B[n].rotation.x -= bow;
    } else if (pose === 'sit' && w > 0) {
      B.body.rotation.x += -0.5 * w;
      B.body.position.y = lerp(B.body.position.y, meta.legTop * 0.62 + meta.bodyR * 0.35, w);
      for (const n of ['legBL', 'legBR']) { B[n].rotation.x += -1.15 * w; }
      for (const n of ['legFL', 'legFR']) B[n].rotation.x += 0.5 * w;
      B.head.rotation.x += 0.42 * w;
      if (B.tail) B.tail.rotation.x += 0.6 * w;
    }
  },
  waddle(B, s, m, k, meta) {
    const ph = s.phase * TAU;
    B.body.rotation.z += Math.sin(ph) * 0.13 * m * k.amp + Math.sin(s.t * 1.4) * 0.025 * k.idle;
    if (B.footL) { B.footL.position.z += Math.sin(ph) * 0.07 * m * k.amp; B.footL.position.y += Math.max(0, Math.sin(ph)) * 0.04 * m * k.amp; B.footR.position.z -= Math.sin(ph) * 0.07 * m * k.amp; B.footR.position.y += Math.max(0, -Math.sin(ph)) * 0.04 * m * k.amp; }
    const flap = s.expr.body.bounce * Math.abs(Math.sin(s.t * 9)) * 0.7 * k.idle + Math.abs(Math.sin(ph)) * 0.18 * m;
    if (B.wingL) { B.wingL.rotation.z -= flap; B.wingR.rotation.z += flap; }
    if (meta.idlePose === 'sit') B.body.position.y -= 0.02 * (1 - m);
  },
  swimHover(B, s, m, k, meta, R) {
    R.position.y += meta.hover + Math.sin(s.t * 2.1) * 0.035 * k.idle;
    const ph = s.phase * TAU;
    B.body.rotation.y += Math.sin(ph) * (0.06 + 0.06 * m) * k.amp;
    swimAppendages(B,s,m,k);
    if(meta.swimSubrigs)for(const sub of meta.swimSubrigs)swimAppendages(B,s,m,k,sub.prefix,sub.phase);
  },
  humanWalk(B, s, m, k, meta) {
    const ph = s.phase * TAU, sw = 0.55 * m * k.amp;
    if(meta.poseProfile?.armSpread){const a=meta.poseProfile.armSpread*(1-m);B.armL.rotation.z-=a;B.armR.rotation.z+=a;}
    B.legL.rotation.x += Math.sin(ph) * sw; B.legR.rotation.x -= Math.sin(ph) * sw;
    if(meta.hold !== 'backpack' && meta.hold !== 'shoulderBag')B.armL.rotation.x -= Math.sin(ph)*sw*.8; if(meta.hold !== 'cane')B.armR.rotation.x += Math.sin(ph)*sw*.8;
    B.body.position.y += Math.abs(Math.sin(ph)) * 0.025 * m * k.amp;
    B.body.scale.y *= 1 + Math.sin(s.t * 2.2) * 0.008 * k.idle;
    if (meta.stoop) { B.body.rotation.x += meta.stoop; B.head.rotation.x -= meta.stoop * 0.7; }
    if (B.cane) B.armR.rotation.x += Math.sin(ph) * .10 * m * k.amp;
  },
  crawl(B, s, m, k, meta) {
    const ph = s.phase * TAU;
    B.body.rotation.x += 1.12; B.body.position.y = meta.hipY * 0.95 + 0.05; B.body.position.z -= 0.12;
    B.head.rotation.x -= 0.95;
    B.armL.rotation.x += -1.12 + Math.sin(ph) * 0.35 * m * k.amp; B.armR.rotation.x += -1.12 - Math.sin(ph) * 0.35 * m * k.amp;
    B.legL.rotation.x += 0.42 - Math.sin(ph) * 0.25 * m * k.amp; B.legR.rotation.x += 0.42 + Math.sin(ph) * 0.25 * m * k.amp;
  },
  inchCrawl(B, s, m, k, meta) {
    const ph = s.phase * TAU;
    // しゃくとり: うしろ → まえ へ もちあがりが はしる + 体が のびちぢみ
    for (let i = 0; i < meta.segs; i++) { const b = B['seg' + i]; b.position.y += Math.max(0, Math.sin(ph - i * 1.4)) * 0.08 * m * k.amp; b.position.z += Math.sin(ph - i * 1.4) * 0.03 * m * k.amp; b.scale.y *= 1 + Math.sin(s.t * 2 + i * 0.6) * 0.03 * k.idle; }
    B.head.position.y += Math.max(0, Math.sin(ph - meta.segs * 1.4)) * 0.05 * m * k.amp + Math.sin(s.t * 1.6) * 0.02 * k.idle;
    B.head.rotation.z += Math.sin(s.t * 1.1) * 0.06 * k.idle;
  },
  hangSway(B, s, m, k, meta) {
    const a = Math.sin(s.t * 1.2) * 0.05 * k.idle + Math.sin(s.phase * TAU) * 0.08 * m;
    for (let i = 0; i < meta.segs; i++) { const b = B['seg' + i]; b.position.x += a * (meta.top - b.userData.rest.p.y); b.rotation.z += a * 0.5; }
    B.head.position.x += a * (meta.top - B.head.userData.rest.p.y); B.head.rotation.z += a * 0.6;
  },
  hopSway(B, s, m, k, meta, R) {
    const ph = s.phase * TAU, h = Math.abs(Math.sin(ph));
    if (meta.idlePose === 'hang') { const a=Math.sin(s.t*1.1)*.06*k.idle+Math.sin(ph)*.12*m; B.body.rotation.z+=a; return; }
    R.position.y += h * 0.13 * m * k.amp;
    B.body.scale.y *= 1 - (1 - h) * 0.08 * m * k.amp; B.body.rotation.z += Math.sin(s.t * 1.3) * 0.05 * k.idle;
    if (B.pappus) B.pappus.rotation.z += Math.sin(s.t * 1.7) * 0.08 * k.idle;
  },
  flutter(B, s, m, k, meta, R) {
    R.position.y += meta.hover + Math.sin(s.t * 2.6) * 0.06 * Math.max(k.idle, 0.3);
    const hz = 7 * s.expr.body.tempo * (k.idle ? 1 : 0.35), f = .12 + (k.idle ? .42 : .2*m) * (0.5 + 0.5 * Math.sin(s.t * hz * TAU / 3));
    B.wingL.rotation.y -= f; B.wingR.rotation.y += f;
    B.body.rotation.x += 0.15 + Math.sin(s.phase * TAU) * 0.05 * m;
  },
  plantSway(B, s, m, k, meta, R) {
    R.position.y += Math.abs(Math.sin(s.phase * TAU)) * 0.1 * m * k.amp;
    B.leavesA.rotation.z += Math.sin(s.t * 1.4) * 0.05 * k.idle; B.leavesB.rotation.z -= Math.sin(s.t * 1.4 + 0.5) * 0.05 * k.idle;
    if (B.stem) { B.stem.rotation.z += Math.sin(s.t * 1.1) * 0.06 * k.idle; B.stem.rotation.x += Math.sin(s.phase * TAU) * 0.05 * m; }
    if (B.body) B.body.scale.y *= 1 + Math.sin(s.t * 1.8) * 0.02 * k.idle;
  },
  squashHop(B, s, m, k, meta, R) {
    const h = Math.abs(Math.sin(s.phase * TAU));
    R.position.y += h * 0.16 * m * k.amp;
    const sq = 1 - (1 - h) * 0.12 * m * k.amp + Math.sin(s.t * 2) * 0.012 * k.idle;
    B.body.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    if (B.cap) B.cap.rotation.z += Math.sin(s.t * 1.2) * 0.04 * k.idle;
    if (B.child) B.child.rotation.z += Math.sin(s.t * 1.5 + 1) * 0.06 * k.idle;
  },
  clusterBob(B, s, m, k, meta, R) {
    R.position.y += meta.hover + Math.abs(Math.sin(s.phase * TAU)) * 0.08 * m * k.amp;
    for (let i = 0; i < meta.units; i++) { const b = B['u' + i]; b.position.y += Math.sin(s.t * 2 + i * 1.3) * 0.035 * k.idle; b.rotation.z += Math.sin(s.t * 1.3 + i) * 0.07 * k.idle; }
  },
  radialShuffle(B, s, m, k, meta, R) {
    const ph = s.phase * TAU;
    B.body.rotation.z += Math.sin(ph) * 0.16 * m * k.amp + Math.sin(s.t * 1.2) * 0.035 * k.idle;
    R.position.y += Math.abs(Math.sin(ph)) * 0.05 * m * k.amp;
  },
  blobFloat(B, s, m, k, meta, R) {
    R.position.y += meta.hover + Math.sin(s.t * 2) * 0.05 * Math.max(k.idle, 0.3);
    const q = 1 + Math.sin(s.t * 2) * 0.035 * k.idle; B.body.scale.set(1 / Math.sqrt(q), q, 1 / Math.sqrt(q));
    B.body.rotation.z += Math.sin(s.phase * TAU) * 0.08 * m;
  },
};

// ---------------- 1 frame ぶん
// input: { moving(0..1), dt(秒), animLv(0..2) }
export function animate(inst, input) {
  const s = inst.anim, B = inst.bones, R = B.root, meta = inst.meta, dt = Math.min(0.1, Math.max(0, input.dt || 0));
  const reduced = (input.animLv != null ? input.animLv : 2) === 0;
  const k = { amp: reduced ? 0.5 : 1, idle: reduced ? 0 : 1 };
  const e = s.expr.body;
  s.t += dt;
  s.move = approach(s.move, input.moving ? 1 : 0, dt * 4);
  s.phase += dt * (GAIT_HZ[inst.locomotion] || 1.5) * (0.25 + 0.75 * s.move) * e.tempo;
  restore(B);
  (LOCO[inst.locomotion] || LOCO.hopSway)(B, s, s.move, k, meta, R);
  // ---- emotion posture
  const head = B.head || B.cap || B.body;
  if (head && head !== R) { head.rotation.x += e.droop * 0.32; head.rotation.y += e.turn; }
  if (B.body && inst.archetype !== 'radial') B.body.rotation.x -= e.lean * 0.5;
  if (inst.archetype === 'radial' || inst.archetype === 'blob' || inst.archetype === 'pod' || inst.archetype === 'cluster') R.rotation.y += e.turn * 0.6;
  R.scale.y *= 1 - e.squash; R.position.y -= e.droop * 0.02;
  if (e.bounce > 0) R.position.y += Math.abs(Math.sin(s.t * 5.2)) * 0.07 * e.bounce * k.idle * (1 - s.move * 0.5);
  if (e.shiver > 0) R.position.x += Math.sin(s.t * 47) * 0.01 * e.shiver * k.idle;
  if (B.earL && meta.earType) { const d = Math.max(0, e.droop); if (meta.earType === 'pointy') { B.earL.rotation.x -= d * 0.8; B.earR.rotation.x -= d * 0.8; } else { B.earL.rotation.z -= d * 0.25; B.earR.rotation.z += d * 0.25; } if (e.bounce > 0) { B.earL.rotation.z += Math.sin(s.t * 10) * 0.08 * k.idle; B.earR.rotation.z -= Math.sin(s.t * 10) * 0.08 * k.idle; } }
  if (B.wingL && inst.archetype === 'avian') { B.wingL.rotation.z += e.droop * 0.1; B.wingR.rotation.z -= e.droop * 0.1; }
  // ---- temporary reaction
  if (s.reaction) {
    const el = (s.t - s.reaction.t0) * 1000, dur = REACTION_MS[s.reaction.kind];
    if (el > dur || el < 0) s.reaction = null;
    else if (!reduced) {
      const u = el / dur;
      switch (s.reaction.kind) {
        case 'hop': R.position.y += Math.sin(Math.PI * u) * 0.28; R.scale.y *= 1 + Math.sin(Math.PI * u) * 0.06; break;
        case 'huff': if (head && head !== R) head.rotation.y += Math.sin(u * TAU * 2) * 0.25 * (1 - u); R.scale.x *= 1 + Math.sin(Math.PI * u) * 0.05; break;
        case 'yawn': if (head && head !== R) head.rotation.x -= Math.sin(Math.PI * u) * 0.35; break;
        case 'wobble': R.rotation.z += Math.sin(u * TAU * 2.5) * 0.12 * (1 - u); break;
        default: break;
      }
    }
  }
  // Preserve the suspension after locomotion, emotion posture and reactions.
  if(meta.hangY != null && B.body){hangingOffset.set(0,meta.hangY,0).multiply(B.body.scale).applyQuaternion(B.body.quaternion);B.body.position.set(-hangingOffset.x,meta.hangY-hangingOffset.y,-hangingOffset.z);}
  // ---- まばたき
  if (inst.face && !reduced) {
    s.blinkIn -= dt;
    if (s.blinkIn <= 0) { s.blinkT = 0; s.blinkIn = 2.4 + ((s.t * 7) % 3); }
    if (s.blinkT >= 0) { s.blinkT += dt; const a = s.blinkT < 0.07 ? s.blinkT / 0.07 : s.blinkT < 0.14 ? 1 - (s.blinkT - 0.07) / 0.07 : 0; blink(inst.face, a); if (s.blinkT >= 0.14) { s.blinkT = -1; blink(inst.face, 0); } }
  }
}
