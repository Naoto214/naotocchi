(function(root){
 'use strict';
 class DecodeQueue{
  constructor(){this.tail=Promise.resolve();}
  run(signal,decode){const job=this.tail.then(()=>{if(signal.aborted)throw new DOMException('Aborted','AbortError');return decode();});this.tail=job.catch(()=>{});return job;}
 }
 class CompareTransport{
  constructor({context,load,onchange=()=>{},onended=()=>{}}){Object.assign(this,{context,load,onchange,onended});this.serial=0;this.node=null;this.nodeGain=null;this.tails=new Map();this.state='stopped';this.loop=true;this.output=context.createGain();this.monitor=context.createGain();this.monitor.channelCountMode="explicit";this.monitor.channelCount=2;this.highpass=context.createBiquadFilter();this.highpass.type="highpass";this.highpass.frequency.value=20;this.highpass.Q.value=.707;this.lowpass=context.createBiquadFilter();this.lowpass.type="lowpass";this.lowpass.frequency.value=Math.min(20000,context.sampleRate/2-100);this.lowpass.Q.value=.707;this.output.connect(this.monitor);this.monitor.connect(this.highpass);this.highpass.connect(this.lowpass);this.lowpass.connect(context.destination);this.output.gain.value=.65;}
  silence(fade=false){
   for(const [n,g] of this.tails){n.onended=null;try{n.stop();n.disconnect();g.disconnect();}catch{}}this.tails.clear();
   if(this.node){const n=this.node,g=this.nodeGain;n.onended=null;
    if(fade&&g.gain.linearRampToValueAtTime){const now=this.context.currentTime;g.gain.setValueAtTime(g.gain.value,now);g.gain.linearRampToValueAtTime(0,now+.012);this.tails.set(n,g);n.onended=()=>{n.disconnect();g.disconnect();this.tails.delete(n);};n.stop(now+.012);}
    else{try{n.stop();n.disconnect();g.disconnect();}catch{}}
   }this.node=null;this.nodeGain=null;
  }
  stop(){this.serial++;this.abort?.abort();this.silence();this.state='stopped';this.onchange(this);}
  position(){if(!this.node)return 0;const t=this.offset+this.context.currentTime-this.startedAt;return this.node.loop?t%this.track.versions[this.version].duration:Math.min(t,this.track.versions[this.version].duration);}
  async play(track,version){
   const serial=++this.serial;this.abort?.abort();this.abort=new AbortController();const same=this.node&&this.track?.id===track.id;
   if(!same)this.silence();this.state='loading';this.error=null;this.requestedVersion=version;this.onchange(this);
   try{
    // Called before the first await: iPhone Safari receives the user activation.
    const resumed=this.context.resume();const buffer=await this.load(track,version,this.abort.signal);await resumed;if(serial!==this.serial)return;
    let offset=same?this.position():0;const meta=track.versions[version];offset=offset>=meta.duration?(track.loop?offset%meta.duration:0):offset;
    this.silence(Boolean(same));const n=this.context.createBufferSource(),g=this.context.createGain();g.gain.value=10**(meta.gainDb/20);g.connect(this.output);
    n.buffer=buffer;n.loop=Boolean(this.loop&&track.loop);n.loopStart=0;n.loopEnd=meta.duration;n.connect(g);
    Object.assign(this,{node:n,nodeGain:g,track,version,offset,startedAt:this.context.currentTime,state:'playing'});
    n.onended=()=>{if(serial!==this.serial)return;this.silence();this.state='stopped';this.onchange(this);this.onended(track);};
    // A short onset ramp prevents a hard discontinuity at an A/B switch.
    if(g.gain.setValueAtTime){g.gain.setValueAtTime(0,this.context.currentTime);g.gain.linearRampToValueAtTime(10**(meta.gainDb/20),this.context.currentTime+.012);}
    n.start(0,offset);this.onchange(this);
   }catch(e){if(serial!==this.serial)return;this.silence();this.error=e;this.state='error';this.onchange(this);}
  }
  setLoop(value){const offset=this.position();this.loop=Boolean(value);if(this.node){this.offset=offset;this.startedAt=this.context.currentTime;this.node.loop=Boolean(this.loop&&this.track.loop);}}
  setListeningMode(mode){this.monitor.channelCount=mode==="stereo"?2:1;this.highpass.frequency.value=mode==="phone"?250:20;this.lowpass.frequency.value=mode==="phone"?7000:Math.min(20000,this.context.sampleRate/2-100);}
  setVolume(value){this.output.gain.setTargetAtTime(Math.max(0,Math.min(1,Number(value))),this.context.currentTime,.025);}
 }
 if(typeof module==='object')module.exports={CompareTransport,DecodeQueue};else Object.assign(root,{CompareTransport,DecodeQueue});
})(globalThis);
