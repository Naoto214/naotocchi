/* Preview-only transport. Original score and synthesis live in the pinned V2 engine. */
(function(root){
 'use strict';
 class AuditionPlayer{
  constructor({context=null,render,onend=()=>{},onstate=()=>{},onstart=()=>{}}){
   this.ctx=context;this.render=render;this.onend=onend;this.onstate=onstate;this.onstart=onstart;
   this.active=new Set;this.cache=new Map;this.serial=0;this.volume=.65;this.current=null;this.playing=false;this.loading=false;this.master=null;
  }
  unlock(){
   if(!this.ctx){const AC=root.AudioContext||root.webkitAudioContext;if(!AC)throw Error('このブラウザーでは音声を再生できません。Safariで開いてください。');this.ctx=new AC();}
   if(!this.master){this.master=this.ctx.createGain();this.master.gain.value=this.volume;this.master.connect(this.ctx.destination);this.ctx.onstatechange=()=>this.onstate(this.ctx.state);}
   try{if(root.navigator?.audioSession)root.navigator.audioSession.type='playback';}catch{}
   // Retain the established iPhone media-unlock fallback without changing its engine.
   if(root.document){
    if(!this.silent){const n=4410,b=new Uint8Array(44+n*2),v=new DataView(b.buffer),w=(o,s)=>{for(let i=0;i<s.length;i++)b[o+i]=s.charCodeAt(i)};
     w(0,'RIFF');v.setUint32(4,36+n*2,true);w(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,44100,true);v.setUint32(28,88200,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*2,true);
     this.silent=root.document.createElement('audio');this.silent.setAttribute('playsinline','');this.silent.loop=true;this.silent.volume=.01;this.silent.src='data:audio/wav;base64,'+btoa(String.fromCharCode(...b));
    }
    const promise=this.silent.play();promise?.catch(()=>{});
   }
   return this.ctx.resume();
  }
  setVolume(value){this.volume=Math.max(0,Math.min(1,Number(value)||0));if(this.master){const p=this.master.gain,t=this.ctx.currentTime;p.cancelScheduledValues(t);p.setValueAtTime(p.value,t);p.linearRampToValueAtTime(this.volume,t+.05);}}
  buffer(theme,mode){const key=theme.id+':'+mode;if(!this.cache.has(key)){const work=Promise.resolve().then(()=>this.render(theme,mode)).catch(e=>{this.cache.delete(key);throw e});this.cache.set(key,work);}return this.cache.get(key);}
  async play(theme,mode,{fade=4}={}){
   const token=++this.serial;this.loading=true;
   try{
    // Called synchronously from the tap handler, before offline rendering.
    await this.unlock();const buffer=await this.buffer(theme,mode);
    if(token!==this.serial)return false;
    if(this.ctx.state!=='running')throw Error('音声が一時中断されています。「再生」をもう一度押してください。');
    const t=this.ctx.currentTime,start=t+.025,source=this.ctx.createBufferSource(),gain=this.ctx.createGain();
    const previous=this.current;const seconds=previous?fade:.08;
    for(const old of this.active){old.source.onended=null;const p=old.gain.gain;
     if(p.cancelAndHoldAtTime)p.cancelAndHoldAtTime(t);else{p.cancelScheduledValues(t);p.setValueAtTime(p.value,t);}
     p.linearRampToValueAtTime(0,start+seconds);old.source.stop(start+seconds+.02);
     if(old.timer)clearTimeout(old.timer);old.timer=setTimeout(()=>this.release(old),Math.ceil((seconds+.1)*1000));
    }
    source.buffer=buffer;source.connect(gain);gain.connect(this.master);gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(1,start+seconds);
    const item={source,gain,theme,mode,start,duration:buffer.duration,timer:null};this.active.add(item);this.current=item;this.playing=true;this.loading=false;
    source.onended=()=>{if(this.current!==item)return;this.release(item);this.current=null;this.playing=false;if(token===this.serial&&!this.loading)this.onend(theme)};
    source.start(start);this.onstart(theme);this.onstate('running');return true;
   }catch(error){if(token===this.serial){this.loading=false;this.stop();throw error;}return false;}
  }
  release(item){if(item.timer)clearTimeout(item.timer);item.source.onended=null;item.source.disconnect();item.gain.disconnect();this.active.delete(item);}
  stop(){this.silent?.pause();++this.serial;this.loading=false;this.playing=false;this.current=null;for(const item of [...this.active]){item.source.onended=null;try{item.source.stop()}catch{}this.release(item)}this.onstate('stopped');}
  position(){return this.current?{seconds:Math.max(0,this.ctx.currentTime-this.current.start),duration:this.current.duration}:null;}
 }
 if(typeof module==='object'&&module.exports)module.exports=AuditionPlayer;root.AuditionPlayer=AuditionPlayer;
})(globalThis);
