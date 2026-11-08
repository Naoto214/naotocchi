(function(root){
'use strict';
const music=typeof module==='object'?require('./songs.js'):root.THEME_V3;
// Pure event compiler: the browser, MIDI exporter and offline validation share this.
function events(song,accompanied=false,bpm=song.bpm){
  const f=music.flatten(song), beatSec=60/bpm, duration=f.beats*song.repeats*beatSec, notes=[];
  for(let rep=0;rep<song.repeats;rep++){
    const offset=rep*f.beats;
    for(const n of f.notes){
      // Original home delays odd sixteenth onsets by 0.08 sixteenths.
      const swing=song.id==='current'&&Math.round(n.beat*4)%2===1?(song.swing||0)/4:0;
      notes.push({midi:n.midi,time:(offset+n.beat+swing)*beatSec,dur:n.dur*.9*beatSec,amp:.7,role:'melody',beat:offset+n.beat+swing});
    }
    if(accompanied)for(const c of f.chords){
      const start=offset+c.beat;
      notes.push({midi:36+c.chord.bass,time:start*beatSec,dur:Math.min(c.dur*.85,1.5)*beatSec,amp:.24,role:'bass',beat:start});
      const step=song.signature[1]===8?1.5:1;
      for(let p=0;p<c.dur;p+=step){
        const pc=c.chord.pcs[Math.round(p/step)%c.chord.pcs.length];
        const pitch=48+pc;
        notes.push({midi:pitch,time:(start+p)*beatSec,dur:Math.min(.8*step,c.dur-p)*beatSec,amp:.19,role:'harmony',beat:start+p});
      }
    }
  }
  return{notes,duration,bpm,beats:f.beats*song.repeats};
}
function render(song,accompanied=false,bpm=song.bpm,sampleRate=22050){
  const seq=events(song,accompanied,bpm), samples=new Float32Array(Math.round(seq.duration*sampleRate));
  for(const n of seq.notes){
    const hz=440*Math.pow(2,(n.midi-69)/12), start=Math.round(n.time*sampleRate), gate=Math.min(n.dur,3), len=Math.ceil((gate+.075)*sampleRate);
    for(let j=0;j<len;j++){
      const t=j/sampleRate, attack=Math.min(1,t/.006), release=t>gate?Math.max(0,1-(t-gate)/.075):1;
      const phase=2*Math.PI*hz*t;
      const signal=Math.sin(phase)*Math.exp(-1.45*t)+.24*Math.sin(2*phase)*Math.exp(-3.6*t)+.08*Math.sin(3*phase)*Math.exp(-6*t);
      samples[(start+j)%samples.length]+=signal*attack*release*n.amp;
    }
  }
  let energy=0,peak=0;for(const v of samples){energy+=v*v;peak=Math.max(peak,Math.abs(v));}
  const rms=Math.sqrt(energy/samples.length), gain=Math.min(.1/rms,.85/peak);
  for(let i=0;i<samples.length;i++)samples[i]*=gain;
  return {samples,sampleRate,duration:samples.length/sampleRate,rms:rms*gain,peak:peak*gain,gain};
}
function wav(rendered){
  const {samples,sampleRate}=rendered, buffer=new ArrayBuffer(44+samples.length*2), v=new DataView(buffer);
  function ascii(pos,s){for(let i=0;i<s.length;i++)v.setUint8(pos+i,s.charCodeAt(i));}
  ascii(0,'RIFF');v.setUint32(4,buffer.byteLength-8,true);ascii(8,'WAVE');ascii(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sampleRate,true);v.setUint32(28,sampleRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);ascii(36,'data');v.setUint32(40,samples.length*2,true);
  samples.forEach((s,i)=>v.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,s))*32767),true));return buffer;
}
const api={events,render,wav};if(typeof module==='object')module.exports=api;root.THEME_AUDIO=api;
})(globalThis);
