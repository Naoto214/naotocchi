import {applyAction} from './session.mjs';
// Initial inventory is spent first. Track descendants of naturally earned eggs.
export function causalEggRewards(initial,actions){let s=initial,stock=[...initial.eggs],earned=[0,0,0,0],lineage=new Set(),rewards=0;
 for(const a of actions){if(a.type==='egg'){if(stock[a.rank])stock[a.rank]--;else{if(!earned[a.rank])throw Error('Missing earned egg');earned[a.rank]--;lineage.add(s.nextId);}}s=applyAction(s,a,false);for(const w of s.last.waves)for(const e of w.events){const carries=e.consumed.some(id=>lineage.has(id));for(const id of e.consumed)lineage.delete(id);if(carries){if(e.death)rewards+=e.eggCount;else lineage.add(e.anchor.id);}}earned=earned.map((n,i)=>n+s.last.eggs[i]);}return rewards;
}
