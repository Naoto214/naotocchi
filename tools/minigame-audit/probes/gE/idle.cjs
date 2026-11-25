const {play}=require('./common.cjs');
const ids=process.argv.slice(2).length?process.argv.slice(2):['sudoku-mini','mancala-kalah','plane-landing','dot-eater','missile-command','area-claim','solitaire-klondike','hit-blow','lunar-lander','shanghai-tiles','beach-volley','slide-puzzle','sugoroku-race','takoyaki-grill'];
for (const id of ids){ const out=[]; for (const seed of [1,2,3,4,5]){ try{ const r=play(id,{seed}); out.push(`${r.raw}@${(r.t/1000).toFixed(0)}s c${r.counted} ${JSON.stringify(r.detail)}`);}catch(e){out.push('ERR '+e.message.slice(0,80));} } console.log(id, out.join(' | ')); }
