// 実コードで「無操作だけ」で 遊んだ ときの 個性(こころ)の 変化を はかる。
// 1つの harness で、無操作 C/B の ゲームを 順に 本物の startMinigame → 放置 → finishMinigame → individualGameResult に とおす。
const {harness}=require(process.cwd()+'/tests/helpers/runtime-harness.cjs');
const P=__dirname;
function stubCtx(){return new Proxy({canvas:{width:300,height:300}},{get(o,k){if(k in o)return o[k];if(k==='measureText')return t=>({width:String(t||'').length*6});if(/Gradient|Pattern/.test(String(k)))return()=>({addColorStop(){}});if(k==='getImageData')return(x,y,w,h)=>({data:new Uint8ClampedArray((w||1)*(h||1)*4)});if(typeof k==='symbol')return undefined;return()=>{};},set(o,k,v){o[k]=v;return true;}});}
const order=(process.argv[2]||'mini-golf-physics,connect-four,gomoku-9,sugoroku-race,hang-glider-3d,submarine-3d,reversi-6,falling-block-puzzle,plane-landing,curling-ice,sky-shooter,tilt-maze-3d,ring-flight-3d,air-hockey,downhill-snow').split(',');
const h=harness({seed:+(process.argv[3]||3),canvasContext:stubCtx()});const api=h.api,I=api.INDIVIDUALITY;
const s=api.state();s.individuality=I.create('dog',api.REGIONS.map(r=>r.id),()=>.5,'life-sim');
const log=[];
for(const id of order){
  Object.assign(s,{isSleeping:false,isSick:false,energy:100,health:100,hunger:80,happiness:50});
  const game=api.games.find(g=>g.id===id);const before=s.lifetime.minigameRecords?.[id]?.plays;
  api.startMinigame(game);let t=0;while(t<240000){h.advance(500);t+=500;if(!h.get('minigameOverlay').classList.contains('hidden')){}if(s.lifetime.minigameRecords?.[id]&&s.lifetime.minigameRecords[id].plays!==before)break;}
  h.advance(8000);
  const rec=s.lifetime.minigameRecords?.[id];
  log.push({id,last:rec?.last??rec?.score??null,rank:rec?api.minigameRankOf(rec.last??rec.score):null,stars:I.summary(s.individuality).hearts,favoriteGenre:I.summary(s.individuality).game});
}
const nat=s.individuality.natural;
const res={order,log,natural:{courage:nat.courage,perseverance:nat.perseverance},points:{courage:I.points(s.individuality,'courage'),perseverance:I.points(s.individuality,'perseverance')},summary:I.summary(s.individuality)};
require('fs').writeFileSync(P+'/idle-life-sim.json',JSON.stringify(res,null,1));console.log(JSON.stringify(res,null,1));
