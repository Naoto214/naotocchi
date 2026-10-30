// Exact canonical answer identity avoids collisions and does not trust metadata.
// Stored separately from normal boards, Undo history, clearance and unlocks.
export const solutionIdentity=path=>JSON.stringify(['v1',path.map(({at,level,d})=>[at,level,d])]);
export class ExamplePosition {
 constructor(storage,stageId,path){
  this.storage=storage;this.key='naopoyo.example.position.v1.'+stageId;
  this.identity=solutionIdentity(path);this.length=path.length;this.index=0;
  try{const saved=JSON.parse(storage?.getItem(this.key)||'null');if(saved?.identity===this.identity&&this.valid(saved.index))this.index=saved.index;}catch{}
 }
 valid(index){return Number.isSafeInteger(index)&&index>=0&&index<=this.length;}
 save(index){
  if(!this.valid(index))return false;
  this.index=index;
  try{this.storage?.setItem(this.key,JSON.stringify({identity:this.identity,index}));}catch{}
  return true;
 }
}
