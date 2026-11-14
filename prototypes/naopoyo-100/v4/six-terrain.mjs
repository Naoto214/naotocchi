import{natureTerrain}from './nature-terrain.mjs';import{ground}from './worlds.mjs';import{terrainTopology,debugTerrain}from './six-geometry.mjs';import{regionPainters}from './six-regions.mjs';
export const sixWorlds={
 sea:{name:'海',subtitle:'砂底の水路と、昆布の岩礁',legend:'平らな水路／厚みのある岩礁',rules:'水中移動・水流・浮力は既存ルール。背景の水そのものは装飾。'},
 snow:{name:'雪山',subtitle:'積もる雪壁、凍結した通路',legend:'青い氷道／白い雪壁',rules:'滑る氷・崩れる床は既存ルール。積雪量・雪崩は未実装候補。'},
 forest:{name:'森',subtitle:'木漏れ日の小道と、重なる木立',legend:'明るい草地・土の道／密集する木立',rules:'木・茂み・根・倒木は固定壁の装飾。植物成長・倒木を動かす仕組みは未実装候補。'}
};
export function sixTerrain(c,s,world,style='six'){
 if(!sixWorlds[world])throw Error('Unknown comparison world: '+world);
 const cells=terrainTopology(s);c.save();
 if(style==='six-old'){
  if(world==='sea'||world==='snow')natureTerrain(c,s,world);else for(const t of cells)ground(c,world,t.wall,t.x,t.y);
 }else{
  if(world==='sea'||world==='snow')natureTerrain(c,s,world);else regionPainters[world](c,cells);
 }
 if(style==='six-debug')debugTerrain(c,s);c.restore();
}
