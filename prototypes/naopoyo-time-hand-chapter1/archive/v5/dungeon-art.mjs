// Scenery only. Never changes a cell, actor, collision or exit condition.
const palettes={
 cell:{floor:['#ccd2d3','#c2cacd'],seam:'#7b8b9550',edge:'#e7e5da88',moss:'#788c7860',iron:'#405362',light:'#e7c58b'},
 moss:{floor:['#cbd0c5','#c1c9c0'],seam:'#76877d50',edge:'#e9e6d788',moss:'#748c6860',iron:'#455751',light:'#e7c58b'},
 hall:{floor:['#cbd5d6','#bfccd0'],seam:'#718c9850',edge:'#e0ece688',moss:'#638d8060',iron:'#3d5965',light:'#d1e6df'},
 dawn:{floor:['#e2dfcf','#d4d6c9'],seam:'#8f978750',edge:'#fff4d788',moss:'#819a7160',iron:'#56686b',light:'#fff0bd'}
};
export function drawDungeonFloor(c,s,scene='cell'){
 const p=palettes[scene]||palettes.cell;
 for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++){
  c.fillStyle=p.floor[(x+y)%2];c.fillRect(x,y,1,1);
  c.strokeStyle=p.seam;c.lineWidth=.015;c.strokeRect(x,y,1,1);
  c.fillStyle=p.edge;c.fillRect(x+.06,y+.045,.88,.025);
  // A few faint stone flecks; never outline a fake obstacle.
  c.fillStyle='#667d8612';c.fillRect(x+.16+((x*3+y)%4)*.12,y+.72,.17,.018);
  if((x*5+y*3)%11===0){c.fillStyle=p.moss;c.fillRect(x+.04,y+.9,.2,.025);}
 }
}
export function drawDungeonWallDetails(c,s,scene='cell'){
 const p=palettes[scene]||palettes.cell;
 for(const [x,y]of s.walls){
  // Grilles are strictly on already-solid wall cells: no new collision semantics.
  if((x+2*y)%7!==0)continue;
  c.save();c.fillStyle='#203544aa';c.fillRect(x+.24,y+.2,.52,.58);
  c.strokeStyle=p.iron;c.lineWidth=.055;c.beginPath();
  for(const dx of [.3,.5,.7]){c.moveTo(x+dx,y+.2);c.lineTo(x+dx,y+.78);}
  c.moveTo(x+.22,y+.37);c.lineTo(x+.78,y+.37);c.moveTo(x+.22,y+.65);c.lineTo(x+.78,y+.65);c.stroke();
  c.fillStyle=p.light;c.globalAlpha=.35;c.fillRect(x+.26,y+.23,.025,.45);c.restore();
 }
}
