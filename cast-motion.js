(function(root) {
  'use strict';
  // Every point of an image stays inside this displacement envelope. The home
  // layout reserves it for each actor, independently of the shared idle sway.
  const MOTION_RADIUS = 3;
  const motionRadiusFor = count => count > 18 ? 1 : MOTION_RADIUS;
  const REST = [0, 0, 0, 0];
  // x/y in CSS px, turn as corner displacement, inward squash in CSS px.
  // A short anticipation, response and settling beat keep movement soft.
  const MOVES = {
    bounce: [REST,[0,.6,0,.45],[0,-2.5,.25,0],[0,.35,0,.3],[0,-1.5,-.25,0],REST],
    wiggle: [REST,[-.9,.2,-1,.3],[.9,-.6,1,0],[-.8,-.3,-1,0],[.6,-.4,.8,0],REST],
    shy: [REST,[0,.5,-1.5,.2],[0,.5,-1.5,.2],[0,-1,1,0],[0,-.5,.4,0],REST],
    love: [REST,[0,.3,-1,.2],[0,-1.8,-.6,0],[0,.3,1,.2],[0,-1.1,.6,0],REST],
    droop: [REST,[0,1.2,-.9,.4],[0,1.2,-.9,.4],[0,.6,-.4,.2],REST],
    settle: [REST,[0,.7,.5,.4],[0,.7,.5,.4],[0,.3,.2,.1],REST],
    shake: [REST,[-1,0,-.8,0],[1,0,.8,0],[-.7,0,-.5,0],[.5,0,.3,0],REST],
    munch: [REST,[0,.8,0,.8],[0,-.7,0,0],[0,.6,0,.6],[0,-.5,0,0],REST],
    doze: [REST,[0,.8,-.6,.5],[0,.8,-.6,.5],[0,.4,-.3,.3],REST],
    stretch: [REST,[0,.7,0,.65],[0,-2,0,0],[0,-2,.5,0],[0,-.7,.2,0],REST],
    nod: [REST,[0,.8,.5,.25],[0,-.4,0,0],[0,.5,.3,.2],REST],
    curious: [REST,[0,0,1.8,0],[0,0,1.8,0],[0,-.5,-.6,0],REST],
    tick: [REST,[0,-.8,-1,0],[0,0,0,0],[0,-.8,1,0],REST],
  };
  const DURATION = {wiggle:820,bounce:960,shy:1200,love:1150,droop:1300,settle:1200,shake:740,munch:1000,doze:1600,stretch:1400,nod:850,curious:1300,tick:1000};
  const PERSONALITY = {
    snail: [.8, 1], clock: [1, .85], koala: [1.25, .65],
    sekizou: [1.3, .4], watcher: [1.2, .5], box: [1.15, .6],
    forest_bear: [1.15, .9], grove_deer: [1.05, .8],
    robot_neighbor: [1, .8], cat_ceo: [.95, .8],
  };

  function reactionFor(event, text = '', kind = 'pet') {
    // Outcome wins over happy words in a consolation or an exhausted reply.
    if (['court_fail','breakup','devolve','minigame_bad'].includes(event)) return kind === 'pet' ? 'droop' : 'nod';
    if (event === 'play_with_annoyed') return 'settle';
    if (event === 'medicine_wrong') return kind === 'pet' ? 'shake' : 'curious';
    if (event === 'overfeed') return kind === 'pet' ? 'settle' : 'nod';
    if (event === 'sleep') return 'doze';
    if (/休憩|休も|やすも|おやすみ|ねむ|眠|ゆっくり|おちつ|置き物|置物|動くまで/.test(text)) return 'settle';
    if (/くすぐ|笑いすぎ|わらいすぎ/.test(text)) return 'wiggle';
    if (/照れ|てれ|どきどき|ドキドキ|聞こえてた/.test(text)) return 'shy';
    if (event === 'court' || event === 'partner_new' || event === 'marriage') return kind === 'companion' ? 'bounce' : 'love';
    if (event === 'feed') return kind === 'pet' ? 'munch' : 'nod';
    if (event === 'wake') return 'stretch';
    if (event === 'medicine_cure' && /まず|苦|にが/.test(text)) return 'shake';
    if (['play_with','clean','medicine_cure','minigame_great','age','evolve','transform','companion_new'].includes(event)) return 'bounce';
    if (/はね|跳ね|ぴょこ|拍手|うれしい|嬉しい/.test(text)) return 'bounce';
    if (/[?？]/.test(text)) return 'curious';
    return 'nod';
  }

  function motionFrames(mood, size = 104, {id = '', direction = 1, gentle = false, maxDisplacement = MOTION_RADIUS} = {}) {
    size = Math.max(1, Number(size) || 104);
    const [tempo, energy] = PERSONALITY[id] || [1, 1];
    const move = mood === 'bounce' && ['clock','robot_neighbor'].includes(id) ? 'tick' : mood;
    const poses = (MOVES[move] || MOVES.nod).map(([x,y,turn,squash]) => {
      const strength = energy * (gentle ? .55 : 1);
      x *= strength; y *= strength; turn *= strength * direction; squash *= strength;
      const radius = size / Math.SQRT2;
      let angle = turn / radius, scale = 1 - squash / size;
      // Triangle inequality also bounds interpolated frames, not only the keys.
      const budget = Math.hypot(x,y) + radius * Math.abs(angle) + radius * Math.abs(1-scale);
      const factor = Math.min(1, (maxDisplacement - .02) / (budget || 1));
      x *= factor; y *= factor; angle *= factor; scale = 1 - (1-scale)*factor;
      return {x,y,angle,scale};
    });
    return {
      poses,
      frames: poses.map(p => ({transform:`translate(${p.x}px, ${p.y}px) rotate(${p.angle}rad) scale(${p.scale})`})),
      duration: Math.round((DURATION[move] || DURATION.nod) * tempo),
    };
  }

  function createController({getActors, canAnimate = () => true, isResting = () => false, getMotionRadius = () => MOTION_RADIUS, env = root}) {
    const active = new Map();
    const media = typeof env.matchMedia === 'function' ? env.matchMedia('(prefers-reduced-motion: reduce)') : null;
    let speaking = null, idleTurn = 0;
    const allowed = () => !media?.matches && canAnimate();
    const find = speaker => getActors().find(a => a.kind === speaker?.kind && (!speaker.id || a.id === speaker.id));
    const currentTransform = node => env.getComputedStyle?.(node)?.transform || 'none';

    function stop(node) {
      const animation = active.get(node);
      active.delete(node);
      if (animation) animation.cancel();
      delete node.dataset.reaction;
    }
    function clearSpeaker() {
      speaking?.classList.remove('cast-speaking');
      speaking = null;
    }
    function run(node, motion, mood, delay = 0, from = null) {
      if (!node || !node.isConnected || typeof node.animate !== 'function' || !allowed()) return;
      const start = from || (active.has(node) ? currentTransform(node) : null);
      stop(node);
      const frames = motion.frames.map(frame => ({...frame}));
      if (start && start !== 'none') frames[0].transform = start;
      const animation = node.animate(frames, {duration:motion.duration, delay, easing:'ease-in-out', fill:'both'});
      if (!animation) return;
      node.dataset.reaction = mood;
      active.set(node, animation);
      animation.onfinish = () => { if (active.get(node) === animation) stop(node); };
    }
    function play(actor, mood, {delay = 0, gentle = false} = {}) {
      if (!actor) return;
      const size = parseFloat(actor.node.style.width) || actor.size || 104;
      const motion = motionFrames(mood, size, {id:actor.id, direction:actor.direction || 1,
        gentle:gentle || isResting(), maxDisplacement:getMotionRadius()});
      const from = active.has(actor.node) ? currentTransform(actor.node) : null;
      run(actor.node, motion, mood, delay, from);
      // The equipment shares the exact frames, timing and current pose of its pet.
      if (actor.kind === 'pet') {
        const accessory = getActors().find(a=>a.kind === 'accessory');
        if (accessory) run(accessory.node, motion, mood, delay, from);
      }
    }
    function clear(immediate = true) {
      clearSpeaker();
      for (const node of [...active.keys()]) {
        const from = !immediate && allowed() ? currentTransform(node) : null;
        stop(node);
        if (from && from !== 'none') {
          run(node, {frames:[{transform:from},{transform:'translate(0px, 0px) rotate(0rad) scale(1)'}],duration:140}, '', 0, from);
          delete node.dataset.reaction;
        }
      }
    }
    function speak({event = 'idle', text, speaker, listener}) {
      clearSpeaker();
      const actor = find(speaker);
      if (!actor || !canAnimate()) return;
      speaking = actor.node;
      speaking.classList.add('cast-speaking');
      const mood = reactionFor(event, text, speaker.kind);
      play(actor, mood);
      // A quiet listening gesture precedes the next character's spoken reply.
      // All motion is bounded, and all responses use the existing speech clock.
      const friend = find(listener);
      if (friend && friend.node !== actor.node) {
        const quietEvent = ['court_fail','breakup','devolve','minigame_bad','medicine_wrong','overfeed','play_with_annoyed','sleep'].includes(event);
        const response = quietEvent || ['settle','droop','doze','shake','nod','curious'].includes(mood)
          ? 'nod' : mood === 'love' || mood === 'shy' ? 'shy' : 'bounce';
        play(friend, response, {delay:220, gentle:true});
      }
      // A group invitation is the only trigger for everyone joining the wave.
      if (event === 'play_with' && /全員|みんな/.test(text)) {
        getActors().filter(a=>a.kind === 'companion' && a.node !== actor.node && a.node !== friend?.node)
          .forEach((a,i)=>play(a,'bounce',{delay:100+Math.min(i,25)*22,gentle:true}));
      }
    }
    function emote(mood) { if (allowed()) play(find({kind:'pet'}),mood); }
    function idle() {
      if (!allowed() || active.size || speaking) return;
      const actors = getActors().filter(a=>a.kind !== 'accessory');
      if (!actors.length) return;
      const actor = actors[idleTurn++ % actors.length];
      play(actor, idleTurn % 2 ? 'curious' : 'nod', {gentle:true});
    }
    media?.addEventListener?.('change', () => {
      if (media.matches) for (const node of [...active.keys()]) stop(node);
    });
    return {speak,emote,idle,clear,clearSpeaker};
  }
  const api = {MOTION_RADIUS,motionRadiusFor,reactionFor,motionFrames,createController};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NaotocchiCastMotion = api;
})(typeof window !== 'undefined' ? window : globalThis);
