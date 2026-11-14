import{natureTerrain}from './nature-terrain.mjs';import{ground}from './worlds.mjs';import{terrainTopology,debugTerrain}from './six-geometry.mjs';import{regionPainters}from './six-regions.mjs';
export const sixWorlds={
 earth:{name:'地中',subtitle:'地層と根のあいだ、明るい地下通路',legend:'明るい地下の空洞／茶色い土と灰色の岩盤',rules:'粒のある茶土＝掘れる土の素材候補、灰色の塊＝掘れない岩盤の素材候補。現時点では両方とも固定壁で、掘削はできません。地下通路の転送は既存ルール。'},
 sky:{name:'空',subtitle:'雲海の上をつなぐ、浮遊する足場',legend:'縁のある薄金色の足場／雲海・空白域（現状は通行不可）',rules:'今の盤面に自由飛行や新しい落下領域はありません。風・上昇気流は既存ギミックのみ。空白や飛行専用空間は別図の未実装候補。'},
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
