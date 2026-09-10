const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');

// Web IDL enum attribute setters ignore invalid values; they do not throw.
// This boundary model checks the product's actual waveform requests and
// scheduler, not audible output or browser autoplay support.
function audioHarness(scene) {
  const handlers = new Map(), queue = [], invalidTypes = [], oscillators = [];
  const param = () => ({value:1, setValueAtTime(v) {this.value=v;},
    linearRampToValueAtTime(){}, exponentialRampToValueAtTime(){}, cancelScheduledValues(){}});
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
  const sandbox={window:{AudioContext},document,performance:{now:()=>10000},Math,Float32Array};
  vm.createContext(sandbox);vm.runInContext(fs.readFileSync('audio.js','utf8'),sandbox);
  const api=sandbox.installNaotocchiAudio({nativeSetTimeout:(fn,ms)=>{queue.push({fn,ms});return queue.length;},
    getState:()=>({stage:scene==='farewell'?'farewell':'growing',isSleeping:scene==='night',lifetime:{}}),
    STAGE:{DEAD:'dead',FAREWELL:'farewell'},el:{},isGameActive:()=>gameScenes.includes(scene),
    getActiveMinigame:()=>({}),minigameGenreId:()=>({race:'drive3d',puzzle:'puzzle',sports:'sports'})[scene]||'action',
    isDateOpen:()=>scene==='movie'});
  return {api,handlers,queue,invalidTypes,oscillators};
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
