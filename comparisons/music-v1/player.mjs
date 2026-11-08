// Isolated audition controller. Not imported by production games.
export class AuditionBus {
  constructor({storage=globalThis.localStorage,onState=()=>{}}={}) {
    this.storage=storage;this.onState=onState;this.ctx=null;this.source=null;this.current=null;this.generation=0;this.abort=null;this.hidden=false;this.wanted=null;this.offset=0;this.started=0;
    this.settings={enabled:true,bgm:.65,sfx:.55};
    try{const s=JSON.parse(storage.getItem('naotocchi-music-v1:settings')||'{}');for(const k of ['bgm','sfx'])if(Number.isFinite(s[k]))this.settings[k]=Math.max(0,Math.min(1,s[k]));if(typeof s.enabled==='boolean')this.settings.enabled=s.enabled;}catch{}
  }
  save(){try{this.storage.setItem('naotocchi-music-v1:settings',JSON.stringify(this.settings));}catch{}}
  async unlock(){const AC=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AC)throw Error('このブラウザーでは試聴できません。MP3を直接開いてください。');if(!this.ctx){this.ctx=new AC();this.bgm=this.ctx.createGain();this.sfx=this.ctx.createGain();this.bgm.gain.value=0;this.sfx.gain.value=this.settings.sfx;this.bgm.connect(this.ctx.destination);this.sfx.connect(this.ctx.destination);}await this.ctx.resume();}
  setVolume(kind,value){this.settings[kind]=Math.max(0,Math.min(1,Number(value)||0));this.save();if(this.ctx){const p=this[kind].gain;p.cancelScheduledValues(this.ctx.currentTime);p.setTargetAtTime(this.settings[kind],this.ctx.currentTime,.04);}}
  cut(){if(this.source){try{this.source.stop();this.source.disconnect();}catch{}this.source=null;}this.current=null;}
  async stop({clear=true}={}){++this.generation;this.abort?.abort();if(clear){this.wanted=null;this.offset=0;}if(this.ctx&&this.source){const g=this.bgm.gain,t=this.ctx.currentTime;g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);g.linearRampToValueAtTime(0,t+.22);const token=this.generation;await new Promise(r=>setTimeout(r,240));if(token!==this.generation)return;}this.cut();this.onState('停止中');}
  async play(track,{offset=0}={}){
    this.wanted=track;if(!this.settings.enabled||this.hidden)return;
    if(this.current===track.id&&this.source)return;
    const request=++this.generation;await this.unlock();if(request!==this.generation)return;await this.stop({clear:false});if(this.generation!==request+1)return;const token=++this.generation;this.abort=new AbortController();this.onState('読み込み中…');
    try{const response=await fetch(track.file,{signal:this.abort.signal});if(!response.ok)throw Error('音源の読み込みに失敗しました');const data=await response.arrayBuffer();const buffer=await this.ctx.decodeAudioData(data);if(token!==this.generation||this.hidden||!this.settings.enabled)return;
      this.cut();const s=this.ctx.createBufferSource();s.buffer=buffer;s.loop=true;s.loopStart=0;s.loopEnd=Math.min(track.seconds,buffer.duration);s.connect(this.bgm);const t=this.ctx.currentTime;this.bgm.gain.cancelScheduledValues(t);this.bgm.gain.setValueAtTime(0,t);this.bgm.gain.linearRampToValueAtTime(this.settings.bgm,t+.55);this.offset=offset%s.loopEnd;this.started=t;this.source=s;this.current=track.id;s.start(t,this.offset);this.onState(track.title+' 再生中');
    }catch(e){if(token===this.generation&&e.name!=='AbortError'){this.cut();this.onState(e.message+'。MP3リンクでも試聴できます。');}}
  }
  async setEnabled(v){this.settings.enabled=v;this.save();if(!v)await this.stop({clear:false});else if(this.wanted)await this.play(this.wanted);}
  async visibility(hidden){this.hidden=hidden;if(hidden){if(this.ctx&&this.source){this.offset=(this.offset+this.ctx.currentTime-this.started)%this.source.loopEnd;}++this.generation;this.abort?.abort();this.cut();if(this.ctx)try{await this.ctx.suspend();}catch{}this.onState('バックグラウンドで停止');}else if(this.wanted&&this.settings.enabled){try{await this.play(this.wanted,{offset:this.offset});}catch{this.onState('再開には再生ボタンを押してください');}}}
  async testSfx(){await this.unlock();const o=this.ctx.createOscillator(),g=this.ctx.createGain(),t=this.ctx.currentTime;o.type='sine';o.frequency.value=660;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.12,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+.25);o.connect(g);g.connect(this.sfx);o.start();o.stop(t+.3);o.onended=()=>{o.disconnect();g.disconnect();};}
}
