// Shared helpers: deterministic seed derivation and exact-mirror initial orders.
import {createHash} from 'node:crypto';
export const MASTER='naotocchi-card-balance-20261020';
// uint32 seed from a labelled sha256; independent streams per purpose (order / policy per game+seat).
export const deriveSeed=(...parts)=>createHash('sha256').update([MASTER,...parts].join('|')).digest().readUInt32BE(0);
export const sha=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
// Same PRNG and Fisher-Yates as engine.createGame (A shuffled first, then B, one stream).
function random(seed){let n=seed>>>0;return ()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export function permutations(seed){const rng=random(seed),out=[];for(let k=0;k<2;k++){const d=[...Array(40).keys()];for(let i=d.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[d[i],d[j]]=[d[j],d[i]];}out.push(d);}return {A:out[0],B:out[1]};}
// Engine final order for a seat = list[perm[k]]. Build the input list so that seat gets `order`.
export function inputFor(order,perm){const list=Array(40);perm.forEach((src,k)=>{list[src]=order[k];});return list;}
export const apply=(list,perm)=>perm.map(i=>list[i]);
