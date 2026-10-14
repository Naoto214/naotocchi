// All writes are made by the Web Locks owner. Revision is a second stale-tab guard.
export const STORE_KEY='naopoyo-player-v1';
const empty=()=>({version:1,revision:0,snapshot:null,history:[],seen:{},totals:{},preferences:{selected:[],tutorialDone:false,reduced:false}});
export class PlayerStore{
 constructor(storage){this.storage=storage;this.revision=null;}
 read(){const raw=this.storage.getItem(STORE_KEY);if(!raw)return empty();const d=JSON.parse(raw);
  if(d?.version!==1||!Number.isSafeInteger(d.revision)||!Array.isArray(d.history)||!d.seen||!d.totals||!d.preferences)throw Error('保存データを読み込めません。上書きせず停止しました');return d;
 }
 load(){const d=this.read();this.revision=d.revision;return d;}
 save(snapshot,records=[],preferences=null){const d=this.read();if(this.revision!==d.revision)throw Error('別の画面で更新されました。この画面を再読み込みしてください');
  for(const r of records){if(!['clear','endless','post-clear'].includes(r.category)||d.seen[r.id])continue;d.seen[r.id]=true;d.history.unshift(structuredClone(r));
   const t=d.totals[r.category]??={plays:0,best:0,deaths:0,maxChain:0};t.plays++;t.best=Math.max(t.best,r.score);t.deaths+=r.deaths;t.maxChain=Math.max(t.maxChain,r.maxChain);
  }
  d.history=d.history.slice(0,100);d.snapshot=snapshot;if(preferences)d.preferences={...d.preferences,...preferences};d.revision++;
  this.storage.setItem(STORE_KEY,JSON.stringify(d));this.revision=d.revision;return d;
 }
}
export async function ownPlayer(locks,onAcquire){
 if(!locks?.request)throw Error('このブラウザでは安全な途中保存を利用できません。対応するSafariで開いてください');
 return locks.request('naopoyo-player-owner-v1',{ifAvailable:true},async lock=>{if(!lock)throw Error('別のタブでなおぽよを開いています。そちらを閉じて再読み込みしてください');await onAcquire();});
}
