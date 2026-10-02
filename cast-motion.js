(function(root) {
  'use strict';
  // Every point of an image stays inside this displacement envelope. The home
  // layout reserves it for each actor, independently of the shared idle sway.
  const MOTION_RADIUS = 3;
  const motionRadiusFor = count => count > 18 ? 1 : MOTION_RADIUS;
  const REST = [0, 0, 0, 0];
  // A shared lift makes taps readable even with 26 friends. Everyone travels
  // together, so their existing collision gaps and image sizes stay intact.
  // layoutHomeCast reserves 16px above the entire cast for this response.
  const GROUP_LIFTS = {
    clean:[0,-1,-10,-2,0],
    bounce:[0,-2,-16,-2,-10,0], wiggle:[0,-4,-13,-3,-11,0],
    love:[0,-2,-12,-4,-14,0], shy:[0,-1,-10,-2,-6,0],
    munch:[0,-2,-6,-1,-4,0], stretch:[0,-2,-12,-12,-4,0],
    // A held recoil and one slow return make disappointment / fatigue visible
    // without the second, playful hop used by happy responses.
    droop:[0,-8,-8,-4,0], settle:[0,-7,-7,-3,0],
  };
  // x/y in CSS px, turn as corner displacement, inward squash in CSS px.
  // A short anticipation, response and settling beat keep movement soft.
  const MOVES = {
    bounce: [REST,[0,.6,0,.45],[0,-2.5,.25,0],[0,.35,0,.3],[0,-1.5,-.25,0],REST],
    wiggle: [REST,[-.9,.2,-1,.3],[.9,-.6,1,0],[-.8,-.3,-1,0],[.6,-.4,.8,0],REST],
    shy: [REST,[0,.5,-1.5,.2],[0,.5,-1.5,.2],[0,-1,1,0],[0,-.5,.4,0],REST],
    love: [REST,[.4,.3,-1,.2],[1,-1.8,-.6,0],[.4,.3,1,.2],[.7,-1.1,.6,0],REST],
    droop: [REST,[0,1.2,-.9,.4],[0,1.2,-.9,.4],[0,.6,-.4,.2],REST],
    settle: [REST,[0,.7,.5,.4],[0,.7,.5,.4],[0,.3,.2,.1],REST],
    shake: [REST,[-1,0,-.8,0],[1,0,.8,0],[-.7,0,-.5,0],[.5,0,.3,0],REST],
    munch: [REST,[0,.8,0,.8],[0,-.7,0,0],[0,.6,0,.6],[0,-.5,0,0],REST],
    hungry: [REST,[0,.9,-.6,.55],[.35,.7,.45,.7],[-.25,.9,-.35,.45],REST],
    sulk: [REST,[.4,.7,1.1,.35],[.6,.9,1.4,.45],[.3,.6,.8,.25],REST],
    doze: [REST,[0,.8,-.6,.5],[0,.8,-.6,.5],[0,.4,-.3,.3],REST],
    stretch: [REST,[0,.7,0,.65],[0,-2,0,0],[0,-2,.5,0],[0,-.7,.2,0],REST],
    // L3 recovery pilot: one anticipation, one relieved lift, then a soft landing.
    recover: [REST,[0,1.8,0,.9],[0,-14,.45,0],[0,1.2,-.2,.35],[0,-3,.15,0],REST],
    nod: [REST,[0,.8,.5,.25],[0,-.4,0,0],[0,.5,.3,.2],REST],
    curious: [REST,[0,0,1.8,0],[0,0,1.8,0],[0,-.5,-.6,0],REST],
    breathe: [REST,[0,-.35,0,.3],[0,-.6,0,.4],[0,-.2,0,.1],REST],
    sway: [REST,[-.3,0,-.5,0],[.35,0,.6,0],[.1,0,.2,0],REST],
    look: [REST,[.25,-.2,.9,0],[.25,-.2,.9,0],[0,0,-.2,0],REST],
    posture: [REST,[0,.3,0,.25],[0,-.8,.25,0],[0,-.25,0,0],REST],
    tick: [REST,[0,-.8,-1,0],[0,0,0,0],[0,-.8,1,0],REST],
  };
  // L2 recipes are event-owned. Legacy moods remain ambient/compatibility aliases.
  const RECIPES = {
    play: {duration:960, poses:[REST,[0,1,0,.8],[0,-8,.4,0],[0,.6,0,.5],[0,-1,0,0],REST]},
    ticklish: {duration:820, poses:[REST,[0,.7,0,.6],[-1,-5.5,-.8,.2],[1,-4.5,.8,.2],[-.5,-1,-.4,.2],REST]},
    wake: {duration:1400, poses:[REST,[0,.8,0,.7],[0,-7,0,0],[0,-7,0,0],[0,-2,0,0],REST]},
    meal: {duration:1000, poses:[REST,[0,.8,0,.8],[0,-1.2,0,0],[0,.6,0,.6],[0,-6.5,0,0],[0,-1,0,.2],REST]},
  };
  const SPECIAL = {evolve:['SELF','evolve'],transform:['SELF','transform'],companion_new:['SELF','welcome'],partner_new:['RELATIONSHIP','union'],marriage:['RELATIONSHIP','marriage']};
  Object.assign(RECIPES, {
    evolve:{duration:1550,poses:[REST,[0,1,0,.8],[0,1,0,.8],[0,-13,.4,0],[0,-2,-.2,.3],REST]},
    transform:{duration:1700,poses:[REST,[0,.8,-.5,.8],[0,.8,-.5,.8],[0,-14,.5,0],[0,-2,0,.25],REST]},
    welcome:{duration:1350,poses:[REST,[0,.7,0,.5],[0,.7,0,.5],[0,-11,.4,0],[0,-1,0,.2],REST]},
    union:{duration:1550,poses:[REST,[0,.6,-.4,.5],[0,.6,-.4,.5],[0,-11,.4,0],[0,-2,0,.2],REST]},
    marriage:{duration:1800,poses:[REST,[0,.7,-.4,.7],[0,.7,-.4,.7],[0,-14,.4,0],[0,-2,0,.3],REST]},
  });
  const EVENT_SCOPE = {
    feed:'SELF',overfeed:'SELF',play_with:'SELF',play_with_annoyed:'SELF',wake:'SELF',
    clean:'GROUP',court:'RELATIONSHIP',partner_new:'RELATIONSHIP',marriage:'RELATIONSHIP',
  };
  const EVENT_RECIPES = {feed:{munch:'meal'},play_with:{bounce:'play',wiggle:'ticklish'},wake:{stretch:'wake'}};
  const L2_BUDGET = 10;
  function reactionPlan(event, text, kind, primaryBeat) {
    const scope = SPECIAL[event]?.[0] || EVENT_SCOPE[event];
    const primary = primaryBeat && kind === 'pet';
    const mood = scope === 'SELF' && !primary ? 'nod' : reactionFor(event,text,kind);
    const recipe = primary ? EVENT_RECIPES[event]?.[mood] : null;
    return {scope,mood,recipe,budget:L2_BUDGET};
  }
  const IDLE_FAMILIES = ['breathe','sway','look','posture'];
  const actorPhase = id => [...(id || '')].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0);
  const DURATION = {breathe:2400,sway:2200,look:1900,posture:2300,clean:1100,wiggle:820,bounce:960,shy:1200,love:1150,droop:1300,settle:1200,shake:740,munch:1000,hungry:1250,sulk:1500,doze:1600,stretch:1400,recover:1450,nod:850,curious:1300,tick:1000};
  const PERSONALITY = {
    snail: [.8, 1], clock: [1, .85], koala: [1.25, .65],
    sekizou: [1.3, .4], watcher: [1.2, .5], box: [1.15, .6],
    forest_bear: [1.15, .9], grove_deer: [1.05, .8],
    robot_neighbor: [1, .8], cat_ceo: [.95, .8],
  };

  // tempo, lift, turn and inward squash; final corner budget always wins.
  const PERSONALITIES = Object.freeze({
    soft:{tempo:1,lift:1,turn:1,squash:1,idle:'breathe'},
    bouncy:{tempo:.95,lift:1.08,turn:1,squash:1.15,idle:'posture'},
    heavy:{tempo:1.2,lift:.72,turn:.45,squash:.4,idle:'posture'},
    float:{tempo:1.18,lift:1,turn:.45,squash:.15,idle:'sway'},
    quick:{tempo:.8,lift:.9,turn:.8,squash:.8,idle:'look'},
    slow:{tempo:1.3,lift:.8,turn:.65,squash:.7,idle:'breathe'},
    rigid:{tempo:1.05,lift:.85,turn:.35,squash:0,idle:'look'},
  });
  function personalityFor(id, stage=0, metadata=root.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1?.motionPersonality) {
    const stageClass=metadata?.stageOverrides?.[id]?.[stage];
    if(PERSONALITIES[stageClass])return stageClass;
    for(const [name,ids] of Object.entries(metadata?.families || {}))if(ids.includes(id))return name;
    return metadata?.default || 'soft';
  }

  function reactionFor(event, text = '', kind = 'pet') {
    // Outcome wins over happy words in a consolation or an exhausted reply.
    if (['court_fail','breakup','devolve','minigame_bad'].includes(event)) return kind === 'pet' ? 'droop' : 'nod';
    // The pet's explicit care action is the first beat. Random dialogue tone
    // still controls partner/companion delivery below.
    if (kind === 'pet') {
      if (event === 'feed') return 'munch';
      if (event === 'play_with') {
        if (/疲れ|つかれ|休憩|休み|休も|やすも|ねむ|眠|置き物|置物/.test(text)) return 'settle';
        return /くすぐ|笑いすぎ|わらいすぎ/.test(text) ? 'wiggle' : 'bounce';
      }
      if (event === 'play_with_annoyed') return 'settle';
      if (event === 'medicine_cure') return 'recover';
      if (event === 'medicine_wrong') return 'shake';
      if (event === 'sleep') return 'doze';
      if (event === 'wake') return 'stretch';
    }
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
    if (event === 'medicine_cure') return 'recover';
    if (['play_with','clean','minigame_great','age','evolve','transform','companion_new'].includes(event)) return 'bounce';
    if (/はね|跳ね|ぴょこ|拍手|うれしい|嬉しい/.test(text)) return 'bounce';
    if (/[?？]/.test(text)) return 'curious';
    return 'nod';
  }

  function motionFrames(mood, size = 104, {id = '', direction = 1, gentle = false, maxDisplacement = MOTION_RADIUS, recipe = null, personality = null} = {}) {
    size = Math.max(1, Number(size) || 104);
    const selected = RECIPES[recipe];
    // Recovery retains its exact approved legacy shape, including per-id tuning.
    const profile=mood==='recover' ? null : PERSONALITIES[personality];
    const [tempo, energy] = profile ? [profile.tempo,1] : selected ? [1,1] : PERSONALITY[id] || [1, 1];
    const move = !selected && !profile && mood === 'bounce' && ['clock','robot_neighbor'].includes(id) ? 'tick' : mood;
    const poses = (selected?.poses || MOVES[move] || MOVES.nod).map(([x,y,turn,squash]) => {
      const strength = energy * (gentle ? .55 : 1);
      x *= strength * direction; y *= strength * (profile?.lift ?? 1); turn *= strength * direction * (profile?.turn ?? 1); squash *= strength * (profile?.squash ?? 1);
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
      duration: Math.round((selected?.duration || DURATION[move] || DURATION.nod) * tempo),
    };
  }

  function createController({getActors, getGroup = () => null, canAnimate = () => true, isResting = () => false, getMotionRadius = () => MOTION_RADIUS, getRelationshipTargets = () => [], canSpecial = () => true, env = root}) {
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
      if (!node || !node.isConnected || typeof node.animate !== 'function' || !allowed()) return false;
      const start = from || (active.has(node) ? currentTransform(node) : null);
      stop(node);
      const frames = motion.frames.map(frame => ({...frame}));
      if (start && start !== 'none') frames[0].transform = start;
      const animation = node.animate(frames, {duration:motion.duration, delay, easing:'ease-in-out', fill:'both'});
      if (!animation) return false;
      node.dataset.reaction = mood;
      active.set(node, animation);
      animation.onfinish = () => { if (active.get(node) === animation) stop(node); };
      return true;
    }
    function play(actor, mood, {delay = 0, gentle = false, maxDisplacement = null, recipe = null} = {}) {
      if (!actor?.node) return 0;
      const size = parseFloat(actor.node.style.width) || actor.size || 104;
      const motion = motionFrames(mood, size, {id:actor.id, direction:actor.direction || 1,
        recipe, personality:actor.personality, gentle:gentle || isResting(), maxDisplacement:maxDisplacement ?? (mood === 'recover' ? 16 : getMotionRadius())});
      const from = active.has(actor.node) ? currentTransform(actor.node) : null;
      const started = run(actor.node, motion, mood, delay, from);
      // The equipment shares the exact frames, timing and current pose of its pet.
      if (started && actor.kind === 'pet') {
        const accessory = getActors().find(a=>a.kind === 'accessory');
        if (accessory) run(accessory.node, motion, mood, delay, from);
      }
      // Ring layout remains owned by the cast solver; only carry its owner's translation.
      if(started && actor.attachment)run(actor.attachment,{duration:motion.duration,frames:motion.poses.map(p=>({transform:`translate(${p.x}px, ${p.y}px)`}))},mood,delay);
      if(started && mood==='recover')active.get(actor.node).motionLevel=3;
      return started ? motion.duration + delay : 0;
    }
    function playGroup(mood) {
      const node = getGroup(), lifts = GROUP_LIFTS[mood];
      if (!node) return;
      if (!lifts) {
        // A disappointed or tired reply must not inherit a happy hop.
        stop(node);
        return;
      }
      const strength = isResting() ? .35 : 1;
      run(node, {frames:lifts.map(y=>({transform:`translateY(${y*strength}px)`})),
        duration:DURATION[mood]}, mood);
    }
    function clear(immediate = true) {
      clearSpeaker();
      for (const node of [...active.keys()]) {
        if(!immediate && node.dataset.reaction==='positive' && getRelationshipTargets().some(t=>find(t)?.node===node))continue;
        const from = !immediate && allowed() ? currentTransform(node) : null;
        stop(node);
        if (from && from !== 'none') {
          run(node, {frames:[{transform:from},{transform:'translate(0px, 0px) rotate(0rad) scale(1)'}],duration:140}, '', 0, from);
          delete node.dataset.reaction;
        }
      }
    }
    function speak({event = 'idle', text, speaker, listener, target, primaryBeat = true}) {
      clearSpeaker();
      const actor = find(speaker);
      if (!actor || !canAnimate()) return;
      speaking = actor.node;
      speaking.classList.add('cast-speaking');
      if (SPECIAL[event]) {
        if (primaryBeat) special(event,target);
        return; // The same conversation cannot replay the event on later lines.
      }
      // A cure is one physical recovery, not one recovery per conversation line.
      const cure = event === 'medicine_cure';
      const plan = reactionPlan(event,text,speaker.kind,primaryBeat);
      const mood = cure && (!primaryBeat || actor.kind !== 'pet') ? 'nod' : plan.mood;
      const relationshipEvent=event === 'play_with' || plan.scope === 'RELATIONSHIP';
      if (plan.scope !== 'GROUP' && (!relationshipEvent || actor.kind==='pet')) play(actor, mood, {recipe:plan.recipe,maxDisplacement:plan.recipe ? plan.budget : null});
      // Recovery belongs to the cured pet throughout the conversation, even
      // when a later reply's wording resolves to a group-capable mood.
      if (event === 'medicine_cure') {
        const group=getGroup(); if (group) stop(group);
      } else if (plan.scope === 'SELF') {
        // clear(false) already owns a short return on a new care action.
        // Do not cancel that unnamed return and snap the entire cast to rest.
        const group=getGroup();
        if (group?.dataset.reaction) {
          const from=currentTransform(group);
          if (from !== 'none') {
            run(group,{frames:[{transform:from},{transform:'translate(0px, 0px) rotate(0rad) scale(1)'}],duration:140},'',0,from);
            delete group.dataset.reaction;
          } else stop(group);
        }
      } else if (plan.scope === 'GROUP') {
        if (primaryBeat) playGroup('clean');
      } else if (event !== 'idle' && !relationshipEvent && !getRelationshipTargets().length) playGroup(mood);
      // A quiet listening gesture precedes the next character's spoken reply.
      // All motion is bounded, and all responses use the existing speech clock.
      const friend = find(listener);
      if (plan.scope !== 'GROUP' && !relationshipEvent && friend && friend.node !== actor.node) {
        const quietEvent = cure || plan.scope === 'SELF' || ['court_fail','breakup','devolve','minigame_bad','medicine_wrong','overfeed','play_with_annoyed','sleep'].includes(event);
        const response = quietEvent || ['settle','droop','doze','shake','nod','curious'].includes(mood)
          ? 'nod' : mood === 'love' || mood === 'shy' ? 'shy' : 'bounce';
        play(friend, response, {delay:220, gentle:true});
      }

    }
    function special(event,target) {
      const spec=SPECIAL[event];
      if (!spec || !allowed() || !canSpecial()) return 0;
      const owners=event==='companion_new' ? [find(target)]
        : spec[0]==='RELATIONSHIP' ? [find({kind:'pet'}),find({kind:'partner'})] : [find({kind:'pet'})];
      if (!owners.some(Boolean)) return 0;
      const speakerNode=speaking;
      clear(false);
      speaking=speakerNode;
      speaking?.classList.add('cast-speaking');
      let duration=0;
      for(const actor of owners.filter(Boolean)) {
        duration=Math.max(duration,play(actor,event,{recipe:spec[1],maxDisplacement:16}));
        const a=active.get(actor.node);if(a)a.motionLevel=3;
      }
      return duration;
    }
    function relationship(speaker, elapsed=0) {
      const actor=find(speaker);if(!actor || elapsed>=900 || active.get(actor.node)?.motionLevel===3)return 0;
      const group=getGroup();if(group && group.dataset.reaction !== 'clean')stop(group);
      const lift=Math.min(2,getMotionRadius());
      const motion={duration:900,frames:[{transform:'scale(1)'},{transform:'scale(.84)'},
        {transform:`translateY(${-lift}px) scale(1)`},{transform:'scale(.94)'},{transform:'scale(1)'}]};
      return run(actor.node,motion,'positive',-elapsed)?900:0;
    }
    function emote(mood) { if (allowed()) { play(find({kind:'pet'}),mood); if(!getRelationshipTargets().length) playGroup(mood); } }
    function pet(mood, options = {}) {
      if (!allowed()) return 0;
      const actor=find({kind:'pet'});
      if(active.get(actor?.node)?.motionLevel===3)return 0;
      return play(actor, mood, options) || 0;
    }
    function isActive(speaker = {kind:'pet'}) {
      const actor = find(speaker);
      return !!actor && active.has(actor.node);
    }
    function idle({excludePet = false} = {}) {
      if (!allowed() || isResting() || active.size || speaking) return 0;
      const actors = getActors().filter(a=>a.kind !== 'accessory' && !(excludePet && a.kind === 'pet'));
      if (!actors.length) return 0;
      const turn=idleTurn++, actor=actors[turn % actors.length];
      const phase=(actorPhase(actor.id)+Math.floor(turn/actors.length)) % IDLE_FAMILIES.length;
      const family=phase===0 && actor.personality ? PERSONALITIES[actor.personality]?.idle || 'breathe' : IDLE_FAMILIES[phase];
      return play(actor, family, {gentle:true}) || 0;
    }
    media?.addEventListener?.('change', () => {
      if (media.matches) for (const node of [...active.keys()]) stop(node);
    });
    return {special,relationship,speak,emote,pet,isActive,idle,clear,clearSpeaker};
  }
  const api = {PERSONALITIES,personalityFor,MOTION_RADIUS,motionRadiusFor,reactionPlan,reactionFor,motionFrames,createController};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NaotocchiCastMotion = api;
})(typeof window !== 'undefined' ? window : globalThis);
