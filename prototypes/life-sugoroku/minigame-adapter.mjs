// Isolated V3 short modes. Never imports the main minigame lifecycle or storage.
// Rules provenance and deliberate deviations: docs/life-sugoroku/V3-MINIGAME-AUDIT.md.
export const MINIGAME_SOURCE = Object.freeze({
  commit:'851cf09a80c7ed41ba7293888084272917e4582c',
  gamesBlob:'fdcf8c5ce6ee7211a28d729bd08af7e1e7a20548',
});
export const MINI_RULES = Object.freeze([
  Object.freeze({kind:0,name:'ひかりをキャッチ',label:'なおころ独自・反射ミニ',officialId:null,duration:0}),
  Object.freeze({kind:1,name:'しんけいすいじゃく',label:'本編ルールの短縮版・4ペア',officialId:'memory-cards',duration:30000,pairs:4,columns:4}),
  Object.freeze({kind:2,name:'まどあかりパズル',label:'ライツアウトの短縮版・3×3',officialId:'lights-out',duration:30000,maxMoves:20}),
]);
const need = (ok,message='ミニゲームの状態が不正です') => { if(!ok)throw Error(message); };
const int = (n,min,max) => Number.isInteger(n)&&n>=min&&n<=max;
const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
const cellsOK = cells => Array.isArray(cells)&&cells.length===9&&cells.every(v=>v===0||v===1);
const clone = value => JSON.parse(JSON.stringify(value));
function kindOK(kind) { need(int(kind,0,2)); }
function challengeOK(kind,c) {
  kindOK(kind);need(c&&typeof c==='object');
  if(kind===0)need(int(c.delay,1200,3400));
  if(kind===1)need(Array.isArray(c.deck)&&c.deck.length===8&&c.deck.every(v=>int(v,0,3))&&[0,1,2,3].every(v=>c.deck.filter(n=>n===v).length===2));
  if(kind===2)need(cellsOK(c.cells)&&c.cells.some(Boolean)&&int(c.par,1,9)&&solveShortLights(c.cells).length===c.par);
}

export function toggleShortLights(cells,index) {
  need(cellsOK(cells)&&int(index,0,8));
  const out=[...cells],x=index%3,y=Math.floor(index/3);
  for(const [dx,dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]) {
    const nx=x+dx,ny=y+dy;if(nx>=0&&nx<3&&ny>=0&&ny<3)out[ny*3+nx]^=1;
  }
  return out;
}
// Enumerate 2^9 press sets. The official 5×5 null-space constants DO NOT apply.
export function solveShortLights(cells) {
  need(cellsOK(cells));let best=null;
  const target=cells.reduce((mask,v,i)=>mask|(v<<i),0);
  const masks=Array.from({length:9},(_,i)=>toggleShortLights(Array(9).fill(0),i).reduce((mask,v,j)=>mask|(v<<j),0));
  for(let set=0;set<512;set++) {
    let board=0;const presses=[];
    for(let i=0;i<9;i++)if(set&(1<<i)){board^=masks[i];presses.push(i);}
    if(board===target&&(!best||presses.length<best.length))best=presses;
  }
  need(best!==null,'解けない盤面です');return best;
}
export function makeMiniChallenge(kind,nextInt) {
  kindOK(kind);need(typeof nextInt==='function');
  const draw=n=>{const value=nextInt(n);need(int(value,0,n-1),'乱数が不正です');return value;};
  if(kind===0)return {delay:1200+draw(2201)};
  if(kind===1) {
    const deck=[0,0,1,1,2,2,3,3];
    for(let i=deck.length-1;i>0;i--){const j=draw(i+1);[deck[i],deck[j]]=[deck[j],deck[i]];}
    return {deck};
  }
  // Sampling without replacement terminates even for constant seeded RNGs.
  const pool=Array.from({length:9},(_,i)=>i);let cells=Array(9).fill(0);
  for(let i=0;i<3;i++)cells=toggleShortLights(cells,pool.splice(draw(pool.length),1)[0]);
  return {cells,par:solveShortLights(cells).length};
}

// Exact formula extracted from origin/main games.js makeLightsOutGame.finish.
export function scoreOfficialLights({solved,totalMoves,totalPar}) {
  need(int(solved,0,3)&&int(totalMoves,0,100000)&&int(totalPar,0,100000));
  const efficiency=solved?clamp(1-Math.max(0,totalMoves-totalPar)/Math.max(6,totalPar*2),0,1):0;
  return clamp(Math.round(10+solved*24+efficiency*18),10,100);
}
// Deliberate adaptation: solving the one short board fills the 3-round quota.
export function scoreShortLights({solved,moves,par}) {
  need(typeof solved==='boolean');
  return scoreOfficialLights({solved:solved?3:0,totalMoves:moves,totalPar:par});
}
// Official memory formula, parameterized PAIRS (official8; short4).
export function scoreMemoryPairs({matched,tries,elapsed,pairs=4}) {
  need(int(pairs,1,8)&&int(matched,0,pairs)&&int(tries,matched,100000)&&Number.isFinite(elapsed)&&elapsed>=0);
  const eff=clamp(1-Math.max(0,tries-pairs)/(pairs*1.6),0,1);
  return matched>=pairs?clamp(Math.round(42+eff*50+Math.max(0,60-elapsed/1000)*.13),42,100):clamp(Math.round(10+matched*7),10,45);
}
export function startMiniAttempt(kind,challenge) {
  challengeOK(kind,challenge);
  const base={phase:'play',elapsed:0,done:false,score:null};
  if(kind===0)return base;
  if(kind===1)return {...base,open:[],matched:[],tries:0,lockRemaining:0};
  return {...base,cells:[...challenge.cells],moves:0};
}
export function validateMiniAttempt(kind,challenge,a) {
  challengeOK(kind,challenge);if(a===null)return true;
  need(a&&a.phase==='play'&&Number.isFinite(a.elapsed)&&a.elapsed>=0&&typeof a.done==='boolean');
  need(a.done?int(a.score,0,100):a.score===null);
  if(kind===0)return true;
  need(a.elapsed<=30000);
  if(kind===1) {
    need(Array.isArray(a.open)&&a.open.length<=2&&a.open.every(i=>int(i,0,7))&&new Set(a.open).size===a.open.length);
    need(Array.isArray(a.matched)&&a.matched.length<=8&&a.matched.length%2===0&&a.matched.every(i=>int(i,0,7))&&new Set(a.matched).size===a.matched.length);
    need(!a.open.some(i=>a.matched.includes(i))&&[0,1,2,3].every(v=>[0,2].includes(a.matched.filter(i=>challenge.deck[i]===v).length)));
    need(int(a.tries,a.matched.length/2,100000)&&Number.isFinite(a.lockRemaining)&&a.lockRemaining>=0&&a.lockRemaining<=900);
    need(a.open.length===2?a.lockRemaining>0:a.lockRemaining===0);
    if(a.open.length===2)need(a.tries>=a.matched.length/2+1&&a.lockRemaining<=(challenge.deck[a.open[0]]===challenge.deck[a.open[1]]?350:900));
    need(a.done||a.matched.length<8);
    if(a.done)need(a.elapsed===30000||a.matched.length===8);
  } else {
    need(cellsOK(a.cells)&&int(a.moves,0,20));
    need(a.done||a.moves<20&&a.cells.some(Boolean));
    if(a.done)need(a.elapsed===30000||a.moves===20||a.cells.every(v=>!v));
  }
  return true;
}
// All time is active elapsed DELTA in ms, supplied by the host; no wall clock.
// Host owns pause, revision guards, UI timers, save, CPU and final rewards.
export function applyMiniInput(kind,challenge,attempt,command) {
  validateMiniAttempt(kind,challenge,attempt);need(attempt&&!attempt.done,'この挑戦は終了しています');
  need(command&&['input','settle','tick'].includes(command.type));
  const delta=command.elapsed??0;need(Number.isFinite(delta)&&delta>=0);
  const a=clone(attempt),finish=score=>{a.done=true;a.score=score;return {attempt:a,score};};
  if(kind===0) {
    need(command.type==='input'&&Number.isFinite(command.ms)&&command.ms>=-1);
    return finish(command.ms<0?0:clamp(Math.round(100-command.ms/10),0,100));
  }
  a.elapsed=Math.min(30000,a.elapsed+delta);
  if(a.elapsed>=30000)return finish(kind===1?scoreMemoryPairs({matched:a.matched.length/2,tries:a.tries,elapsed:a.elapsed}):scoreShortLights({solved:false,moves:a.moves,par:challenge.par}));
  if(kind===1) {
    if(command.type==='input') {
      need(a.open.length<2&&int(command.index,0,7)&&!a.open.includes(command.index)&&!a.matched.includes(command.index),'カードの判定を待ってください');
      a.open.push(command.index);
      if(a.open.length===2){a.tries++;a.lockRemaining=challenge.deck[a.open[0]]===challenge.deck[a.open[1]]?350:900;}
    } else if(a.open.length===2) {
      a.lockRemaining=Math.max(0,a.lockRemaining-delta);
      if(a.lockRemaining===0){if(challenge.deck[a.open[0]]===challenge.deck[a.open[1]])a.matched.push(...a.open);a.open=[];}
      if(a.matched.length===8)return finish(scoreMemoryPairs({matched:4,tries:a.tries,elapsed:a.elapsed}));
    }
  } else if(command.type==='input') {
    need(int(command.index,0,8));a.cells=toggleShortLights(a.cells,command.index);a.moves++;
    const solved=a.cells.every(v=>!v);
    if(solved||a.moves>=20)return finish(scoreShortLights({solved,moves:a.moves,par:challenge.par}));
  }
  return {attempt:a,score:null};
}
