/* Phase-aligned comparison transport; source scores remain immutable. */
(function(root){
'use strict';
function filter(data,b,a){const out=new Float64Array(data.length);let x1=0,x2=0,y1=0,y2=0;for(let i=0;i<data.length;i++){const x=data[i],y=b[0]*x+b[1]*x1+b[2]*x2-a[1]*y1-a[2]*y2;out[i]=y;x2=x1;x1=x;y2=y1;y1=y;}return out;}
function loopBuffer(ctx,raw,period){const n=Math.round(period*raw.sampleRate),out=ctx.createBuffer(raw.numberOfChannels,n,raw.sampleRate);for(let c=0;c<raw.numberOfChannels;c++){const src=raw.getChannelData(c),dst=out.getChannelData(c);for(let i=0;i<src.length;i++)dst[i%n]+=src[i];}return out;}
function loudness(buffer,seconds=buffer.duration){
 const rate=buffer.sampleRate,n=Math.min(buffer.length,Math.round(seconds*rate)),energy=new Float64Array(n);let peak=0;
 const K=Math.tan(Math.PI*1681.974450955533/rate),Q=.7071752369554196,Vh=10**(3.999843853973347/20),Vb=Vh**.4996667741545416,d=1+K/Q+K*K;
 const b=[(Vh+Vb*K/Q+K*K)/d,2*(K*K-Vh)/d,(Vh-Vb*K/Q+K*K)/d],a=[1,2*(K*K-1)/d,(1-K/Q+K*K)/d];
 const k=Math.tan(Math.PI*38.13547087602444/rate),q=.5003270373238773,den=1+k/q+k*k,aa=[1,2*(k*k-1)/den,(1-k/q+k*k)/den];
 for(let c=0;c<buffer.numberOfChannels;c++){const raw=buffer.getChannelData(c);for(let i=0;i<n;i++)peak=Math.max(peak,Math.abs(raw[i]));const y=filter(filter(raw.subarray(0,n),b,a),[1,-2,1],aa);for(let i=0;i<n;i++)energy[i]+=y[i]*y[i];}
 const win=Math.round(rate*.4),hop=Math.round(rate*.1),blocks=[];let sum=0;for(let i=0;i<n;i++){sum+=energy[i];if(i>=win)sum-=energy[i-win];if(i>=win-1&&(i-win+1)%hop===0){const e=sum/win;if(-.691+10*Math.log10(Math.max(e,1e-20))>-70)blocks.push(e);}}
 if(!blocks.length)return {lufs:-70,gain:1,peak};const avg=blocks.reduce((a,b)=>a+b,0)/blocks.length,threshold=avg*.1,kept=blocks.filter(x=>x>=threshold),lufs=-.691+10*Math.log10(kept.reduce((a,b)=>a+b,0)/kept.length);
 return {lufs,gain:Math.min(10**((-23-lufs)/20),.79/Math.max(peak,1e-8)),peak};
}
class ComparisonTransport{
 constructor({ctx=null,load,onstatus=()=>{}}){Object.assign(this,{ctx,load,onstatus,bus:null,current:null,serial:0,playing:false,volume:.65,nodes:new Set,cache:new Map});}
 unlock(){if(!this.ctx){const AC=root.AudioContext||root.webkitAudioContext;this.ctx=new AC();}if(!this.bus){this.bus=this.ctx.createGain();this.bus.gain.value=this.volume;this.bus.connect(this.ctx.destination);}try{if(root.navigator?.audioSession)root.navigator.audioSession.type='playback';}catch{}return this.ctx.resume();}
 async prepare(theme){if(this.cache.has(theme.id))return this.cache.get(theme.id);const p=this.load(theme,this.ctx).then(buffers=>{const group={};for(const [version,buffer] of Object.entries(buffers))group[version]={buffer,level:loudness(buffer,theme.period)};return group;}).catch(e=>{this.cache.delete(theme.id);throw e});this.cache.set(theme.id,p);if(this.cache.size>2){const first=this.cache.keys().next().value;if(first!==theme.id)this.cache.delete(first);}return p;}
 async play(theme,version,{preserve=false,loop=true}={}){const token=++this.serial;await this.unlock();if(token!==this.serial)return false;this.onstatus('loading');const group=await this.prepare(theme);if(token!==this.serial)return false;const time=this.ctx.currentTime,old=this.current,offset=preserve&&old?.theme.id===theme.id?this.position().seconds:0;const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=group[version].buffer;source.loop=loop;source.loopStart=0;source.loopEnd=theme.period;source.connect(gain);gain.connect(this.bus);gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(group[version].level.gain,time+.06);
 const item={source,gain,theme,version,start:time,offset,loop,level:group[version].level};this.nodes.add(item);this.current=item;this.playing=true;
 source.onended=()=>{this.release(item);if(this.current===item){this.playing=false;this.current=null;if(token===this.serial)this.onstatus('ended');}};
 source.start(time,offset);if(!loop)source.stop(time+theme.period-offset);
 for(const previous of [...this.nodes])if(previous!==item){previous.source.onended=null;const p=previous.gain.gain;p.cancelScheduledValues(time);p.setValueAtTime(p.value,time);p.linearRampToValueAtTime(0,time+.06);try{previous.source.stop(time+.07);}catch{}previous.timer=setTimeout(()=>this.release(previous),100);}
 this.onstatus('playing',item);return true;}
 release(item){if(item.timer)clearTimeout(item.timer);item.source.onended=null;item.source.disconnect();item.gain.disconnect();this.nodes.delete(item);}
 stop(){++this.serial;for(const item of [...this.nodes]){item.source.onended=null;try{item.source.stop();}catch{}this.release(item);}this.current=null;this.playing=false;this.onstatus('stopped');}
 position(){if(!this.current)return {seconds:0,duration:0};const i=this.current,t=Math.max(0,this.ctx.currentTime-i.start+i.offset);return {seconds:i.loop?t%i.theme.period:Math.min(t,i.theme.period),duration:i.theme.period};}
 setVolume(v){this.volume=Math.max(0,Math.min(1,v));if(this.bus)this.bus.gain.setTargetAtTime(this.volume,this.ctx.currentTime,.02);}
}
const api={loudness,loopBuffer,ComparisonTransport};if(typeof module==='object'&&module.exports)module.exports=api;Object.assign(root,api);
})(globalThis);
