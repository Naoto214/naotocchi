(function(root){
 'use strict';
 class Transport{
  constructor({context,load,onchange=()=>{},onended=()=>{}}){this.context=context;this.load=load;this.onchange=onchange;this.onended=onended;this.serial=0;this.state='stopped';this.output=context.createGain();this.output.connect(context.destination);this.output.gain.value=.65;}
  stop(){this.serial++;if(this.abort)this.abort.abort();if(this.node){this.node.onended=null;try{this.node.stop();this.node.disconnect();}catch{}}this.node=null;this.state='stopped';this.onchange(this);}
  async play(track,loop=false){
   this.stop();const serial=this.serial;this.track=track;this.desiredLoop=Boolean(loop);this.state='loading';this.abort=new AbortController();this.onchange(this);
   // resume is called in the tap handler, before any network await.
   const resumed=this.context.resume();
   try{const buffer=await this.load(track,this.abort.signal);await resumed;if(serial!==this.serial)return;
    const n=this.context.createBufferSource();n.buffer=buffer;n.loop=Boolean(this.desiredLoop&&track.loop);n.loopStart=0;n.loopEnd=track.duration;n.connect(this.output);
    n.onended=()=>{if(serial!==this.serial)return;this.node=null;this.state='stopped';this.onchange(this);this.onended(track);};
    this.node=n;this.startedAt=this.context.currentTime;this.state='playing';n.start();this.onchange(this);
   }catch(e){if(serial!==this.serial)return;this.state='error';this.error=e;this.onchange(this);}
  }
  setVolume(value){this.output.gain.setTargetAtTime(Math.max(0,Math.min(1,value)),this.context.currentTime,.025);}
  setLoop(value){this.desiredLoop=Boolean(value);if(this.node)this.node.loop=Boolean(value&&this.track.loop);}
  position(){return this.state==='playing'?(this.context.currentTime-this.startedAt)%this.track.duration:0;}
 }
 if(typeof module==='object')module.exports={Transport};else root.BGMTransport=Transport;
})(typeof globalThis!=='undefined'?globalThis:this);
