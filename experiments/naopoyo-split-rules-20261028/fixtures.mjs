export const actor=(id,x,y,level=1,species='dog')=>({id,x,y,level,species});
export const board=(extra={})=>({id:'experiment',w:7,h:7,actors:[],walls:[],gates:[],spikes:[],exits:[],gravity:true,gravityRules:'supported-v1',movementRules:'contact-v1',terrainRules:'magic-gate-v2',...extra});
// An unrelated move releases ordinary gravity. The lower actor is NOT active.
export const cycleWell=()=>board({w:5,h:5,actors:[actor('lower',1,3,2),actor('upper',1,2),actor('active',3,4)],walls:[[1,4],...[0,2].flatMap(x=>[0,1,2,3,4].map(y=>[x,y]))],spikes:[{x:1,y:3,power:1}]});
export const overflowBoard=()=>board({actors:[actor('a',3,4,5),actor('b',3,5,7)],walls:[[3,6]],spikes:[{x:3,y:5,power:1},{x:3,y:4,power:1}]});
export const multipleSpikes=()=>board({actors:[actor('a',3,0,8)],spikes:[{x:3,y:2,power:2},{x:3,y:4,power:2}]});
