// Pure presentation: no game state writes or randomness.
export const DIE_ROTATIONS={1:[0,0],2:[0,-90],3:[-90,0],4:[90,0],5:[0,90],6:[0,180]};
const PIPS={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
export function diceMarkup(value){
 const [x,y]=DIE_ROTATIONS[value];
 return `<div class="die-stage" role="img" aria-label="${value}の目" data-result="${value}"><div class="die-bounce"><div class="die-solid" style="--die-x:${x}deg;--die-y:${y}deg">${[1,2,3,4,5,6].map(n=>`<div class="die-face face-${n}" aria-hidden="true">${Array.from({length:9},(_,i)=>`<i class="${PIPS[n].includes(i+1)?'pip':''}"></i>`).join('')}</div>`).join('')}</div></div></div>`;
}
export const ITEM_IDS=['double','slow','charm','clock','seed','box'];
export function itemMarkup(id,name=''){return ITEM_IDS.includes(id)?`<img class="item-art" src="item-${id}.svg" alt="${name}">`:'';}
export function cpuDelay(phase,speed='normal',text=''){if(speed==='fast')return phase==='result'||phase==='mini-result'?900:450;if(phase==='result'||phase==='mini-result')return Math.min(9000,Math.max(3400,1800+Array.from(text).length*55));return phase==='event'||phase==='relationship'?Math.min(8000,Math.max(2200,1000+Array.from(text).length*40)):1500;}
function pointBack(path,distance){let at=path.at(-1);for(let j=path.length-1;j>0;j--){const a=path[j],b=path[j-1],length=Math.hypot(b.x-a.x,b.y-a.y);if(length>=distance)return {x:a.x+(b.x-a.x)*distance/length,y:a.y+(b.y-a.y)*distance/length};distance-=length;at=b;}return at;}
export function followerPositions(p,board){const path=(p.walkPath?.length?p.walkPath:[p.pos]).map(id=>board[id]).filter(Boolean);return ['friend','partner'].filter(slot=>p.following?.[slot]).map((slot,i)=>({slot,id:p.following[slot],...pointBack(path,32*(i+1))}));}
export function followerMotion(p,board,to){const path=[...(p.walkPath||[p.pos]),to].map(id=>board[id]),length=Math.hypot(board[to].x-board[p.pos].x,board[to].y-board[p.pos].y);return followerPositions(p,board).map((f,i)=>{const back=32*(i+1),times=[0,1];let distance=0;for(let j=path.length-1;j>0;j--){distance+=Math.hypot(path[j].x-path[j-1].x,path[j].y-path[j-1].y);const t=1-(distance-back)/length;if(t>0&&t<1)times.push(t);}return {slot:f.slot,frames:times.sort((a,b)=>a-b).map(t=>{const at=pointBack(path,back+length*(1-t));return {offset:t,transform:`translate(${at.x-f.x}px,${at.y-f.y}px)`};})};});}
