export const RULE='contact-v2';
export const comparisonStage=(stage,variant)=>({...structuredClone(stage),movementRules:variant==='B'?RULE:'contact-v1'});
export const saveKey=(stage,variant)=>`naopoyo.contact-experiment.20261030.${variant}.${variant==='B'?RULE:'contact-v1'}.${stage.id}`;
const actor=(id,x,y,level,species='dog')=>({id,x,y,level,species});
const base=(id,title,actors,extra={})=>({id:'komorebi-contact-'+id,title,w:8,h:8,gravity:false,gravityRules:'supported-v1',movementRules:'contact-v1',terrainRules:'magic-gate-v2',splitRules:'recombine-once-v1',walls:[],gates:[],spikes:[],exits:[],water:[],guests:[],events:[],actors,...extra});
export const directions=[['右',1,0],['左',-1,0],['上',0,-1],['下',0,1],['右上',1,-1],['右下',1,1],['左上',-1,-1],['左下',-1,1]];
export const scenes=[...[[3,4],[5,6],[4,8],[8,4],[8,8]].map(([a,b])=>({id:`${a}-${b}`,title:`${a} ＋ ${b}`,levels:[a,b]})),{id:'mixed',title:'異種族 8 ⇄ 4',levels:[8,4],mixed:true},{id:'gate-top',title:'魔法ゲートの上面',special:true},{id:'fall',title:'落下して合体',special:true},{id:'spike',title:'余剰分離 → トゲ',special:true}];
export function sceneStage(scene,direction=0){const [,dx,dy]=directions[direction];
 if(scene.id==='gate-top')return base(scene.id,scene.title,[actor('a',3,4,8),actor('b',4,4,8)],{gravity:true,gates:[{x:3,y:5,exact:8},{x:4,y:5,exact:8}]});
 if(scene.id==='fall')return base(scene.id,scene.title,[actor('a',3,4,8),actor('b',4,7,4)],{gravity:true,walls:[[3,5]]});
 if(scene.id==='spike')return base(scene.id,scene.title,[actor('a',3,6,8),actor('b',4,6,8)],{gravity:true,walls:[[3,7],[4,7]],spikes:[{x:4,y:6,power:2}]});
 return base(`${scene.id}-${direction}`,scene.title,[actor('a',3,3,scene.levels[0]),actor('b',3+dx,3+dy,scene.levels[1],scene.mixed?'fish':'dog')]);
}
