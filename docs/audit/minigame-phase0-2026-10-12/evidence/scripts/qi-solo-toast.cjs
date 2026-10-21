const { harness } = require('/home/user/naotocchi/tests/helpers/runtime-harness.cjs');
const h = harness(), s = h.api.state();
Object.assign(s, { stage: 'growing', isSleeping: false, isSick: false, energy: 100, health: 100, hunger: 80 });
h.api.render();
function playSolo(id, win){
  if(!h.api.startQuickRun(id)) throw new Error('no start '+id);
  h.advance(40);
  const run = h.api.quickSoloRun(id)._run;
  for (let n=0;n<12;n++){
    const cur=run.current; if(!cur) break;
    for(let i=0;i<300;i++){ const t=cur.game.target(); if(!win || t.ready!==false){ cur.game.onTap(t.x,t.y); break;} h.advance(16); }
    h.advance(700);
    if(run.current===cur) h.advance(700);
  }
  h.advance(3000);
  const toast=h.get('mgResultToast');
  return toast ? toast.textContent : '(no toast)';
}
console.log('button win  ->', playSolo('button', true), JSON.stringify(s.lifetime.minigameRecords['quick-solo']), JSON.stringify(s.lifetime.quick.single));
h.advance(7000);
console.log('color first(lose) ->', playSolo('stop', false), JSON.stringify(s.lifetime.minigameRecords['quick-solo']), JSON.stringify(s.lifetime.quick.single));
console.log('minigameCount', s.minigameCount, 'scoreSum', s.minigameScoreSum);
