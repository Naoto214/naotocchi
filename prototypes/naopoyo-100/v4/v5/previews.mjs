import{byId,defaults}from './catalog.mjs';import{createDraft,paintTerrain,paintDecoration,paintGimmick}from './model.mjs';import{createGameState}from '../../engine.mjs';import{renderDraft}from './render.mjs';
export function sampleDraft(id,span=1){const e=byId.get(id);if(!e)throw Error('Unknown material');let d=createDraft({id:'v5-sample',w:8,h:8,gravity:false,walls:[],gates:[],spikes:[],tiles:[],actors:[{id:'a',species:'dog',level:1,x:7,y:7}],exits:[{x:6,y:7,exact:1}]});d.appearance.world=e.worlds.length===1?e.worlds[0]:'forest';
 const cells=span===1?[[1,1]]:[[1,1],[2,1],[1,2],[2,2],[3,2],[1,3],[3,3]];
 if(id.startsWith('v5.terrain.')){d.appearance.materials.fill(id==='v5.terrain.grass'?'v5.terrain.path':'v5.terrain.grass');for(const[x,y]of cells)d=paintTerrain(d,x,y,id)}
 else if(id.startsWith('v5.deco.'))d=paintDecoration(d,1,1,id);
 else if(e.category==='world'){for(const[x,y]of cells)d.board.walls.push([x,y]);}
 else if(id==='terrain.floor'||id==='terrain.wall')for(const[x,y]of cells)d=paintTerrain(d,x,y,id);
 else if(e.placeable)for(const[x,y]of e.autotile?cells:[[1,1]])d=paintGimmick(d,x,y,id,defaults[id]||{});
 else d.board.tiles.push({x:1,y:1,catalogId:id,params:{id:'candidate'}});
 return d;
}
export function drawPreview(canvas,id,px=36,span=1){const d=sampleDraft(id,span),full=document.createElement('canvas');full.getBoundingClientRect=()=>({width:px*8});renderDraft(full,d,createGameState(d.board),{reduced:true,now:1});const unit=full.width/8;canvas.width=canvas.height=unit*span;if(canvas.style){canvas.style.width=canvas.style.height=px*span+'px'}canvas.getContext('2d').drawImage(full,unit*(id==='sign.gravity'?0:1),unit*(id==='sign.gravity'?7:1),unit*span,unit*span,0,0,canvas.width,canvas.height);return d}
