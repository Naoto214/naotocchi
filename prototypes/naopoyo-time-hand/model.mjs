import {stage20Arrival} from './stage20-arrival.mjs';
import {createState,clone,externalSplit,mass} from './engine.mjs';
import {candidateDetails,compass,timeHandTrace} from './priorities.mjs';
export const scenarios=[['empty','障害物なし'],['one','仲間1マス'],['two','仲間2マス'],['three','仲間3マス'],['rock','岩で経路を塞ぐ'],['corner','斜めの角を塞ぐ'],['gate','魔法ゲート'],['narrow','トゲの周囲が狭い'],['edge','盤面端のトゲ'],['shaft','縦穴'],['double','2回続けて曲がる'],['three-only','3体で止まる通路'],['steer','仲間で道を変える'],['collect','分かれた時間を集める'],['stage20','正式20面・最初の分裂直前']];
export function fixture(name='empty',{gravity=false,level=8}={}){
 if(name==='stage20'){const s=clone(stage20Arrival.state);s.gravity=gravity;s.actors[0].level=level;return s;}
 const s=createState({id:'split-lab',w:8,h:8,gravity,gravityRules:'supported-v1',movementRules:'contact-v2',terrainRules:'magic-gate-v2',splitRules:'recombine-once-v1',actors:[{id:'parent',species:'dog',level,x:3,y:3}],walls:[],gates:[],exits:[],spikes:[{x:3,y:3,power:7}],water:[]});
 for(let i=0;i<({one:1,two:2,three:3}[name]||0);i++)edit(s,...[[3,2],[4,3],[2,3]][i],'friend');
 if(name==='rock')[[3,2],[4,2],[2,2]].forEach(p=>edit(s,...p,'wall'));
 if(name==='corner')[[4,3],[3,2]].forEach(p=>edit(s,...p,'wall'));
 if(name==='gate'){edit(s,3,2,'gate');edit(s,4,3,'gate');edit(s,4,2,'wall');}
 if(name==='narrow')[[2,2],[3,2],[4,2],[2,3],[4,3],[2,4]].forEach(p=>edit(s,...p,'wall'));
 if(name==='edge'){s.actors[0].x=0;s.spikes[0].x=0;}
 if(name==='shaft')for(let y=0;y<8;y++){edit(s,2,y,'wall');edit(s,4,y,'wall');}
 if(name==='double')[[3,2],[4,3]].forEach(p=>edit(s,...p,'wall'));
 if(name==='three-only')[[3,1],[4,1],[5,1],[2,2],[6,2],[4,3],[5,3]].forEach(p=>edit(s,...p,'wall'));
 if(name==='steer'){edit(s,3,1,'friend');edit(s,5,2,'wall');edit(s,4,4,'gate');}
 return s;
}
export function edit(s,x,y,kind){
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=8||y>=8||s.actors.some(a=>a.id==='parent'&&a.x===x&&a.y===y))return false;
 s.walls=s.walls.filter(p=>p[0]!==x||p[1]!==y);for(const name of ['actors','gates','exits','spikes'])s[name]=s[name].filter(p=>p.x!==x||p.y!==y);
 if(kind==='wall')s.walls.push([x,y]);
 if(kind==='friend')s.actors.push({id:`friend-${x}-${y}`,species:'frog',level:8,x,y});
 if(kind==='dog')s.actors.push({id:`dog-${x}-${y}`,species:'dog',level:8,x,y});
 if(kind==='gate')s.gates.push({x,y,exact:1});
 if(kind==='exit')s.exits.push({x,y,exact:1});
 if(kind==='spike')s.spikes.push({x,y,power:7});
 return true;
}
export function simulate(input,mode='A',heading=4){
 if(!compass[heading])throw new RangeError('heading');
 const initial=clone(input);initial.splitPriority=mode;const final=clone(initial),parent=final.actors.find(a=>a.id==='parent');
 const candidates=candidateDetails(final,parent.x,parent.y,...compass[heading],parent,{},mode),spawns=[];
 // Synthetic arrival state: observe generation only. Not a claim that all eight
 // physical approaches to this prepared position satisfy ascent/support rules.
 const power=initial.spikes.find(p=>p.x===parent.x&&p.y===parent.y)?.power||1;
 const trace=mode==='D'?timeHandTrace(initial,parent.x,parent.y,...compass[heading],parent):null;
 const result=externalSplit(final,parent.id,power,...compass[heading],{observeSplit:e=>spawns.push(e)});
 if(mass(initial)!==mass(final))throw Error('Mass changed');
 return {initial,candidates,trace,spawns,spawn:spawns[0]?.state||clone(initial),final,result};
}
export const cellName=(x,y)=>`${'ABCDEFGH'[x]}${y+1}`;
export const modeText={D:'後ろへ、まっすぐ。ふさがったら時計回りに90度。空いた道を最大7体まで。',A:'近くを全部。そのあと、空いた近くのマスから2歩先へ。',B:'後ろ・左右…の方向順に、1歩先→直線の2歩先。',C:'近くを全部。そのあと、外周を後ろから時計回り。通れる道があるマスだけ。'};
