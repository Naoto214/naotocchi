import {piece,stage,species,key,shuffle} from './board.mjs';
import {hasReaction,immediateActions} from './resolve.mjs';
export {stage,species,piece} from './board.mjs';
export const VERSION='naopoyo-swap-v1';
export function config(input={}){const c={kinds:4,interval:4,distribution:'uniform',low:12,target:18,...input};if(![3,4,5].includes(c.kinds)||![3,4,5,6].includes(c.interval)||!['uniform','high','low'].includes(c.distribution)||!Number.isInteger(c.low)||c.low<0||c.low>16||!Number.isInteger(c.target)||c.target<13||c.target>24)throw Error('設定が不正です');return c;}
export function createGame(seed=1,options={}){
 if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff)throw Error('seedが不正です');
 const c=config(options),s={version:VERSION,seed,config:c,board:[],moves:0,eggProgress:0,supplyAvailable:true,pendingSupply:false,preview:[],kindBag:[],stageBag:[],rng:{initial:seed,kind:seed^0x12345678,stage:seed^0xabcdef01,position:seed^0x76543210},seenBoards:[],stagnation:0,status:'playing',revision:0,supplyIndex:0,shuffles:0,rescueUnresolved:0,actions:[],initialAttempts:0};
 let pool=Array.from({length:36},(_,i)=>piece(i%c.kinds,Math.floor(i/9)+1));
 // Ensure one triple of species0/stage1 while preserving both margins.
 while(pool.filter(v=>v===1).length<3){const a=pool.findIndex(v=>stage(v)===1&&species(v)!==0),b=pool.findIndex(v=>stage(v)!==1&&species(v)===0);const ak=species(pool[a]),bs=stage(pool[b]);pool[a]=1;pool[b]=piece(ak,bs);}
 for(let attempt=1;attempt<=2000;attempt++){const b=shuffle(pool,s,'initial');if(!hasReaction(b)&&immediateActions(b,true).length){s.board=b;s.initialAttempts=attempt;break;}}
 if(!s.board.length)throw Error('初期配置を生成できませんでした。別seedで開始してください');
 s.seenBoards=[key(s.board)];fillPreview(s);return s;
}
export function fillPreview(s){while(s.preview.length<12){if(!s.kindBag.length)s.kindBag=shuffle(Array.from({length:s.config.kinds},(_,i)=>i),s,'kind');if(!s.stageBag.length){const counts=s.config.distribution==='high'?[2,4,6,8]:s.config.distribution==='low'?[8,6,4,2]:[5,5,5,5];s.stageBag=shuffle(counts.flatMap((n,i)=>Array(n).fill(i+1)),s,'stage');}s.preview.push(piece(s.kindBag.pop(),s.stageBag.pop()));}}
export function validateState(s){
 if(!s||s.version!==VERSION)throw Error('保存形式が不正です');config(s.config);
 if(!Array.isArray(s.board)||s.board.length!==36||s.board.some(c=>!Number.isInteger(c)||c<0||c>s.config.kinds*8))throw Error('盤面が不正です');
 for(const n of ['moves','eggProgress','stagnation','revision','supplyIndex','shuffles','rescueUnresolved'])if(!Number.isSafeInteger(s[n])||s[n]<0)throw Error('記録が不正です');
 if(!['playing','clear','stalled'].includes(s.status)||typeof s.supplyAvailable!=='boolean'||typeof s.pendingSupply!=='boolean'||!Array.isArray(s.seenBoards)||s.seenBoards.some(k=>typeof k!=='string')||!Array.isArray(s.actions))throw Error('進行状態が不正です');
 if(!Array.isArray(s.preview)||s.preview.length!==12||s.preview.some(v=>!Number.isInteger(v)||v<1||species(v)>=s.config.kinds||stage(v)>4))throw Error('卵予告が不正です');
 for(const name of ['initial','kind','stage','position'])if(!Number.isInteger(s.rng?.[name]))throw Error('乱数が不正です');
 if(!Array.isArray(s.kindBag)||s.kindBag.some(k=>!Number.isInteger(k)||k<0||k>=s.config.kinds)||!Array.isArray(s.stageBag)||s.stageBag.some(v=>!Number.isInteger(v)||v<1||v>4))throw Error('卵の袋が不正です');return true;
}
