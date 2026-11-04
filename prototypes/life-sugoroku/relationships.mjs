import {NPCS} from './canonical.mjs';
import {PARTNER_PROFILES} from './profiles.mjs';
export const RELATION_LABELS={met:'出会った',interacting:'交流中',friend:'仲間',partner:'恋人'};
export const npcFor=id=>NPCS.find(n=>n.id===id);
export function canRomance(character,event){
 const npc=PARTNER_PROFILES[event.npc];if(!npc||character.id===event.npc)return false;
 const targets=c=>{if(!c.gender||!c.orientationId||['aro','questioning'].includes(c.orientationId))return [];if(Array.isArray(c.attractedTo))return c.attractedTo;if(['pan','bi'].includes(c.orientationId))return ['male','female','nonbinary'];if(c.orientationId==='gay')return [c.gender];return c.gender==='nonbinary'?['male','female']:[c.gender==='male'?'female':'male'];};
 return targets(character).includes(npc.gender)&&targets(npc).includes(character.gender);
}
export function meetNpc(p,id,round){if(!npcFor(id))return null;return p.relationships[id]??=( {status:'met',affinity:0,visits:0,firstRound:round,lastRound:round} );}
export function interactNpc(p,id,round){const r=meetNpc(p,id,round);if(!r)return null;r.visits++;r.affinity++;r.lastRound=round;if(r.status==='met')r.status='interacting';return r;}
export function romanceReady(p,id){const r=p.relationships[id];return !!r&&r.visits>=2&&r.affinity>=3&&p.stage>=5&&r.status!=='partner'&&!Object.values(p.relationships).some(r=>r.status==='partner')&&canRomance(p.character,{npc:id});}
export function relationshipChoices(p,id){const r=p.relationships[id],npc=npcFor(id);if(!r||!npc)return [];
 const choices=[{id:'talk',label:'旅の話を聞かせ合う'}];
 if(['met','interacting'].includes(r.status)&&npc.kind!=='special')choices.push({id:'invite',label:'旅の仲間になってくれる？'});
 if(romanceReady(p,id))choices.push({id:'romance',label:'恋人として一緒に歩きたいと伝える'});
 choices.push({id:'farewell',label:r.status==='friend'||r.status==='partner'?'今日は景色を静かに楽しむ':'また会えたら、話そうね'});return choices;
}
export function relationshipText(p,id){const npc=npcFor(id),r=p.relationships[id];if(!npc||!r)return '';const trait=npc.behavior||npc.hook||'ふと立ち止まって、こちらを見ている';return `${npc.label}と、道の途中でひと休み。${trait}。${r.status==='partner'?'二人で覚えた景色が、また一つ増えた。':r.visits>=2?'前に話したことを覚えていてくれた。':'まだ知らないことを、少しずつ話してみよう。'}`;}
export function applyRelationship(p,id,choice,round){if(!relationshipChoices(p,id).some(c=>c.id===choice))throw Error('今はその関係を選べません');const r=p.relationships[id],npc=npcFor(id),before=r.status;
 let text;
 if(choice==='invite'){r.status='friend';r.affinity++;if(!p.following.friend)p.following.friend=id;text=`${npc.label}が「うん」とうなずいた。旅の仲間になった。${p.following.friend===id?'これからは、そばを一緒に歩く。':'今の同行者はそのまま。みんなの画面から交代できる。'}`;}
 else if(choice==='romance'){r.status='partner';p.following.partner=id;if(p.following.friend===id)p.following.friend=null;text=`気持ちを確かめ合って、${npc.label}と恋人になった。これからも、お互いのペースで歩こう。`;}
 else if(choice==='talk'){r.affinity++;r.visits++;r.lastRound=round;if(r.status==='met')r.status='interacting';text=`${npc.label}と寄り道の話をした。「その景色、今度は見てみたいな」。急いで答えを出さず、また話す約束をした。`;}
 else text=`${npc.label}と、ゆっくり手を振り合った。言葉を急がない時間も、今日の思い出になった。`;
 const record={npc:id,choice,before,after:r.status,round,text};p.relationHistory.push(record);return record;
}
export function chooseFollower(p,id,slot){if(!['friend','partner'].includes(slot))throw Error('同行枠が不正です');if(id!==null&&p.relationships[id]?.status!==slot)throw Error('同行できる関係ではありません');p.following[slot]=id;}
export function validateRelationships(p,rounds){if(!p.relationships||Array.isArray(p.relationships)||!p.following||!Array.isArray(p.relationHistory)||p.relationHistory.length>200)return false;
 for(const [id,r] of Object.entries(p.relationships)){if(!npcFor(id)||!r||!RELATION_LABELS[r.status]||!['affinity','visits','firstRound','lastRound'].every(k=>Number.isInteger(r[k])&&r[k]>=0&&r[k]<=200)||r.firstRound<1||r.lastRound>rounds)return false;}
 if(Object.values(p.relationships).filter(r=>r.status==='partner').length>1)return false;
 for(const slot of ['friend','partner']){const id=p.following[slot];if(id!==null&&p.relationships[id]?.status!==slot)return false;}
 return p.relationHistory.every(r=>r&&npcFor(r.npc)&&['talk','invite','romance','farewell'].includes(r.choice)&&RELATION_LABELS[r.before]&&RELATION_LABELS[r.after]&&Number.isInteger(r.round)&&r.round>=1&&r.round<=rounds&&typeof r.text==='string');
}
