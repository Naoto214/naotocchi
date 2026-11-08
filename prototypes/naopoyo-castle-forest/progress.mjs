import {ChapterSession,sequential} from './session.mjs';
export class ChapterProgress {
 constructor(){this.sessions=Array.from({length:10},(_,i)=>new ChapterSession(i));this.completed=Array(10).fill(false);this.index=0;}
 unlocked(i){return Number.isInteger(i)&&i>=0&&i<10&&(!sequential||i===0||this.completed.slice(0,i).every(Boolean));}
 record(){this.sessions.forEach((q,i)=>{if(q.cleared)this.completed[i]=true;});}
 serialize(){return JSON.stringify({version:6,chapter:'castle-forest-v2',index:this.index,completed:this.completed,sessions:this.sessions.map(q=>q.serialize())});}
 restore(raw){try{const d=JSON.parse(raw);if(d.version!==6||d.chapter!=='castle-forest-v2'||!Array.isArray(d.sessions)||d.sessions.length!==10||!Array.isArray(d.completed)||d.completed.length!==10||d.completed.some(v=>typeof v!=='boolean'))return false;const q=new ChapterProgress();for(let i=0;i<10;i++)if(!q.sessions[i].restore(d.sessions[i]))return false;q.completed=d.completed;q.record();q.index=q.unlocked(d.index)?d.index:0;Object.assign(this,q);return true;}catch{return false;}}
}
