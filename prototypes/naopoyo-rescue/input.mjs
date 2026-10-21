// Expand missing pointer samples into orthogonal cell transitions, never teleport.
export function trace(from,to){let {x,y}=from;const out=[];for(let i=0;i<128&&(x!==to.x||y!==to.y);i++){if(Math.abs(to.x-x)>=Math.abs(to.y-y)&&to.x!==x)x+=Math.sign(to.x-x);else y+=Math.sign(to.y-y);out.push([x,y])}return out}
