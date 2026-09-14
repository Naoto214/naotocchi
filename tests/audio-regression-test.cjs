const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');

// Web IDL enum attribute setters ignore invalid values; they do not throw.
// This boundary model checks the product's actual waveform requests and
// scheduler, not audible output or browser autoplay support.
function audioHarness(scene, {quickVoice = 'pico', speech = false} = {}) {
  const handlers = new Map(), queue = [], invalidTypes = [], oscillators = [], params = [];
  const utterances = [];
  const param = () => { const p = {value:1, events:[], setValueAtTime(v, t) {this.value=v; this.events.push(['set', v, t]);},
    linearRampToValueAtTime(v, t) {this.value=v; this.events.push(['ramp', v, t]);}, exponentialRampToValueAtTime(v, t) {this.value=v; this.events.push(['exp', v, t]);}, cancelScheduledValues(t) {this.events.push(['cancel', t]);}}; params.push(p); return p; };
  const node = () => ({connect(){}, disconnect(){}, start(){}, stop(){},
    gain:param(), frequency:param(), detune:param(), Q:param()});
  class AudioContext {
    constructor() {this.state='running';this.currentTime=0;this.sampleRate=8000;this.destination={};}
    createGain() {return node();}
    createBuffer(c,n) {return {getChannelData:()=>new Float32Array(n)};}
    createBufferSource() {return node();}
    createBiquadFilter() {return node();}
    createOscillator() {
      const osc=node();let type='sine';
      Object.defineProperty(osc,'type',{get:()=>type,set(value) {
        const s=String(value);
        if (!['sine','square','sawtooth','triangle'].includes(s)) {invalidTypes.push(s);return;}
        type=s;
      }});
      oscillators.push(osc);return osc;
    }
  }
  const gameScenes=['game','race','puzzle','sports'];
  const document={hidden:false,getElementById:()=>({classList:{contains:()=>scene!=='movie'}}),
    addEventListener:(t,f)=>handlers.set(t,f),removeEventListener:t=>handlers.delete(t)};
  let timerId = 0;
  const schedule = (fn, ms) => { const id = ++timerId; queue.push({id,fn,ms,cancelled:false}); return id; };
  const cancel = id => { const job = queue.find(job => job.id === id); if (job) job.cancelled = true; };
  const sandbox={window:{AudioContext},document,performance:{now:()=>10000},Math,Float32Array,setTimeout:schedule,clearTimeout:cancel};
  if (speech) {
    sandbox.SpeechSynthesisUtterance = class {constructor(text) {this.text = text;}};
    sandbox.speechSynthesis = {paused:false, getVoices:()=>[{lang:'ja-JP', name:'日本語'}], cancel(){}, resume(){}, speak: utterance => utterances.push(utterance)};
  }
  vm.createContext(sandbox);vm.runInContext(fs.readFileSync('audio.js','utf8'),sandbox);
  const api=sandbox.installNaotocchiAudio({nativeSetTimeout:schedule,
    getState:()=>({stage:scene==='farewell'?'farewell':'growing',isSleeping:scene==='night',lifetime:{quickVoice}}),
    STAGE:{DEAD:'dead',FAREWELL:'farewell'},el:{},isGameActive:()=>gameScenes.includes(scene),
    getActiveMinigame:()=>({}),minigameGenreId:()=>({race:'drive3d',puzzle:'puzzle',sports:'sports'})[scene]||'action',
    isDateOpen:()=>scene==='movie'});
  return {api,handlers,queue,invalidTypes,oscillators,utterances,params};
}

test('all eight BGM scenes request valid waveforms and schedule two complete loops', () => {
  for (const scene of ['home','night','game','movie','puzzle','race','sports','farewell']) {
    const h=audioHarness(scene);
    h.handlers.get('pointerdown')();
    assert.equal(h.api._debug().track,scene);
    for (let i=0;h.api._debug().step<256 && i<1000;i++) {
      const next=h.queue.shift();assert.ok(next,scene+' keeps scheduling');
      h.api._debug().ctx.currentTime+=next.ms/1000;next.fn();
    }
    assert.ok(h.api._debug().step>=256,scene+' completes two loops');
    assert.equal(h.invalidTypes.length,0,scene+' must not send a melody array as its waveform');
    if (scene==='home') assert.equal(h.oscillators.find(o=>Math.abs(o.frequency.value-523.251)<.01).type,'triangle');
    if (scene==='game') assert.equal(h.oscillators.find(o=>Math.abs(o.frequency.value-783.991)<.01).type,'square');
  }
});

test('Quick voice routes pico, browser reading and silence through the saved mode', () => {
  const pico = audioHarness('home', {quickVoice:'pico'});
  pico.handlers.get('pointerdown')();
  const picoBefore = pico.oscillators.length;
  assert.equal(pico.api.voice('よけろ！'), true);
  assert.ok(pico.oscillators.length > picoBefore, 'pico mode makes kana tones');

  const tts = audioHarness('home', {quickVoice:'tts', speech:true});
  tts.handlers.get('pointerdown')();
  assert.equal(tts.api.voice('よけろ！'), true);
  assert.equal(tts.utterances.at(-1).text, 'よけろっ!');
  assert.equal(tts.utterances.at(-1).lang, 'ja-JP');
  assert.equal(tts.utterances.at(-1).rate, 1.22);
  assert.equal(tts.utterances.at(-1).pitch, 1.12);
  assert.equal(tts.api.voice('こいびとは', {question:true}), true);
  assert.equal(tts.utterances.at(-1).text, 'こいびとは?');
  assert.equal(tts.utterances.at(-1).rate, 1.28);
  assert.equal(tts.utterances.at(-1).pitch, 1.15);

  const off = audioHarness('home', {quickVoice:'off', speech:true});
  off.handlers.get('pointerdown')();
  const silentBefore = off.utterances.length;
  const toneBefore = off.oscillators.length;
  assert.equal(off.api.voice('よけろ！'), false);
  assert.equal(off.utterances.length, silentBefore);
  assert.equal(off.oscillators.length, toneBefore);
});

test('the actual TTS controller ducks both buses and replaces the scheduled recovery', () => {
  const h = audioHarness('home', {quickVoice:'tts', speech:true});
  h.handlers.get('pointerdown')();
  assert.equal(h.api.voice('よけろ'), true);
  const bgm = h.params.find(p => p.events.some(([kind,value]) => kind === 'ramp' && value === 0.04));
  const sfx = h.params.find(p => p.events.some(([kind,value]) => kind === 'ramp' && value === 0.45));
  assert.ok(bgm, 'TTS lowers the BGM bus');
  assert.ok(sfx, 'TTS lowers the effects bus');
  const firstRecovery = h.queue.find(job => job.ms === 450);
  assert.ok(firstRecovery, 'a three-mora cue holds the duck for 450ms');

  assert.equal(h.api.voice('あめがきたらかさ'), true);
  assert.equal(firstRecovery.cancelled, true, 'a later cue cancels the earlier recovery');
  const recovery = h.queue.find(job => job.ms === 1200 && !job.cancelled);
  assert.ok(recovery, 'the longer cue owns the replacement recovery');
  assert.equal(bgm.events.at(-1)[1], 0.04);
  assert.equal(sfx.events.at(-1)[1], 0.45);
  const bgmBefore = bgm.events.length, sfxBefore = sfx.events.length;

  h.api._debug().ctx.currentTime = 1.2;
  recovery.fn();

  assert.deepEqual(bgm.events.slice(bgmBefore).filter(([kind]) => kind === 'ramp'), [['ramp',0.28,1.45]]);
  assert.deepEqual(sfx.events.slice(sfxBefore).filter(([kind]) => kind === 'ramp'), [['ramp',0.9,1.4]]);
});

test('item tunes schedule different melodies through existing unlock and SFX mute bus',()=>{
 const h=audioHarness('home');assert.equal(h.api.playItemTune('season:spring'),false);
 h.handlers.get('pointerdown')();const start=h.oscillators.length;
 assert.equal(h.api.playItemTune('season:spring'),true);const spring=h.oscillators.slice(start).map(o=>o.frequency.value);
 const next=h.oscillators.length;assert.equal(h.api.playItemTune('season:winter'),true);const winter=h.oscillators.slice(next).map(o=>o.frequency.value);
 assert.ok(spring.length>=6);assert.notDeepEqual(spring,winter);assert.equal(h.api.playItemTune('bogus'),false);
 assert.equal(h.api.playItemTune('place:forest'),true);assert.equal(h.invalidTypes.length,0);
});

test('quick cues are shaped into short, punchy shouts: crisp stop, rising question, faster rate for longer words', () => {
  const h=audioHarness('game');
  const cue=h.api._shapeCue;
  assert.equal(JSON.stringify(cue('たべろ')),JSON.stringify({text:'たべろっ!',rate:1.22,pitch:1.12,morae:3}));
  assert.equal(cue('つかまえろ').rate,1.28);
  assert.equal(cue('とべ').rate,1.22,'very short words are not rushed');
  assert.equal(cue('あめがきたらかさ').rate,1.36,'long words speed up so the whole cue stays under a second');
  assert.equal(cue('こいびとは',{question:true}).text,'こいびとは?');
  assert.equal(cue('こいびとは',{question:true}).pitch,1.15);
  assert.equal(cue('じゅんばんに').text,'じゅんばんにっ!');
  assert.equal(cue('ためて、はなせ').text,'ためて、はなせっ!','the deliberate pause inside stays');
  assert.equal(cue('スワイプ！').text,'スワイプっ!','existing punctuation is replaced, not doubled');
  assert.equal(cue('れんだ').morae,3);
  assert.equal(cue('じゅんばんに').morae,5,'small kana do not count as morae');
});
