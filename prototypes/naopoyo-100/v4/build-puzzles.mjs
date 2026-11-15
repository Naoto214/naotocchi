import fs from'node:fs';import{stages}from'../stages.mjs';import{search}from'../v3/search.mjs';import{replay}from'../solver.mjs';import{createHash}from'node:crypto';
const based=(id,key,title,world,idea)=>{const s=structuredClone(stages.find(s=>s.id===id));return{...s,id:key,title,world,idea,text:idea,source:{id,number:s.number},board:{...s.board,id:'v4-'+key,title},solution:[]}};
const wind=based('74','air','気流の前で、姿を分ける','sky','上へ運ばれる3と、下へ落ちる二人の1を作る場所を考える。段階条件付き気流の比較で、飛行能力ではありません。');
// Raising the original total changes when a split may be useful: 5 -> 3 + 1 + 1.
wind.board.actors[0].level=5;wind.board.spikes[0].power=2;
const water=based('74','water','泡に乗る前の分かれ道','sea','4を3と1へ分け、3を泡で上へ、1を下の出口へ。水中で移動できる魚と、泡の段階条件を区別します。');
water.board.actors.forEach(a=>a.species='fish');water.board.exits.forEach(e=>e.species='fish');water.board.tiles=water.board.tiles.map(t=>t.catalogId==='field.updraft'?{...t,catalogId:'field.bubble'}:t);for(let y=1;y<=5;y++)water.board.tiles.push({x:3,y,catalogId:'terrain.water',params:{}});
const earth=based('59','earth','細道へ送る順番','earth','先に1を分け、入口の向きを合わせる。2は別の出口へ。地中通路の配置条件であり、犬の穴掘り能力ではありません。');
earth.board.tiles.push({x:5,y:3,catalogId:'terrain.tunnel',params:{exact:1}});earth.board.gates.push({x:1,y:4,exact:2});
const warp=based('99','warp','環をふさいで、先に鍵へ','cave','相棒が環をふさぐ間に1を鍵へ通す。その後に環を空け、二人を渡す。先に相棒を救出するとどうなる？');
warp.board.tiles=warp.board.tiles.map(t=>t.catalogId==='fixture.burrow'?{...t,catalogId:'fixture.warp',params:{pairId:'B',exact:t.params.role==='exit'?8:1,species:'dog'}}:t);
const crate=based('51','crates','二つの箱、奥から手前へ','forest','重2の箱を上の板、重1の箱を下の板へ。右の箱を先に下へ。左の箱を先に押すと、右の箱の上に回れなくなる。');
crate.board.tiles.find(t=>t.params.id==='B').y=3;crate.board.tiles.find(t=>t.params.id==='Q').x=4;
crate.board.walls.push([1,4],[2,4],[3,4]);
const puzzles=[wind,water,earth,warp,crate],rows=[];
for(const p of puzzles){const r=search(p.board,{limit:100000,maxDepth:70});console.log(p.id,r.status,r.solution?.length,r.expanded);if(r.status!=='shortest')throw Error('unsolved '+p.id);p.solution=r.solution;const replayed=replay(p.board,p.solution);const ids=[...new Set(p.board.tiles.map(t=>t.catalogId))].filter(id=>['field.updraft','field.bubble','terrain.water','fixture.burrow','terrain.tunnel','fixture.warp','object.crate'].includes(id));const probes=[];
for(const id of ids){const tiles=p.board.tiles.filter(t=>t.catalogId===id);const forbid=id==='object.crate'?(_s,_n,e)=>e.some(v=>v.type==='push'):['terrain.water','terrain.tunnel'].includes(id)?(s,n,e,a)=>tiles.some(t=>t.x===a.x+a.dx&&t.y===a.y+a.dy)||n.actors.some(a=>tiles.some(t=>t.x===a.x&&t.y===a.y)&&!s.actors.some(b=>b.id===a.id&&b.x===a.x&&b.y===a.y)):(_s,_n,e)=>e.some(v=>v.catalogId===id);const probe=search(p.board,{forbid,limit:100000,maxDepth:70});probes.push({id,...probe});console.log(' ban',id,probe.status,probe.expanded)}
rows.push({id:p.id,boardHash:createHash('sha256').update(JSON.stringify(p.board)).digest('hex'),legal:true,shortest:r,probes,events:replayed.events});}
fs.writeFileSync(new URL('./puzzles.mjs',import.meta.url),'// Independent comparison variants; V3 source boards are never mutated.\nexport const puzzles = '+JSON.stringify(puzzles,null,2)+';\n');fs.writeFileSync(new URL('../../../docs/naopoyo-100-v4/puzzles.json',import.meta.url),JSON.stringify(rows,null,2));
