import {random, draw as legacyDraw} from '../growth-chain/random.mjs';
export function shuffle(a,rng){for(let i=a.length-1;i>0;i--){const j=Math.floor(random(rng)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export const category=([a,b])=>(a.k===b.k?0:2)+(a.s===b.s?0:1);
function weighted(rng,values,weights){let p=random(rng),sum=0;for(let i=0;i<values.length;i++){sum+=weights[i];if(p<sum)return values[i];}return values.at(-1);}
export function makeBag(seed){
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw Error('seed must be uint32');
 const rng={state:seed},species=shuffle([0,1,2,3,4],rng),same=[],different=[],degrees=Array(5).fill(8);
 [3,3,2,2,2].forEach((n,i)=>{for(let j=0;j<n;j++)same.push([species[i],species[i]]);degrees[species[i]]-=n*2;});
 while(degrees.some(Boolean)){
  const max=Math.max(...degrees),a=shuffle(degrees.flatMap((n,k)=>n===max?[k]:[]),rng)[0];
  const candidates=degrees.flatMap((n,k)=>k!==a&&n>0?[k]:[]);
  const b=shuffle(candidates,rng).find(k=>{const d=degrees.map((n,i)=>n-(i===a||i===k?1:0));return Math.max(...d)<=d.reduce((v,n)=>v+n,0)/2;});
  if(b===undefined)throw Error('Exact species constraints infeasible');
  degrees[a]--;degrees[b]--;different.push(random(rng)<.5?[a,b]:[b,a]);
 }
 shuffle(same,rng);shuffle(different,rng);
 const pairs=[...same.map((ks,i)=>({ks,equal:i<7})),...different.map((ks,i)=>({ks,equal:i<5}))].map(({ks,equal})=>{
  let stages;
  if(equal){const s=weighted(rng,[1,2,3,4],[.4,.3,.2,.1]);stages=[s,s];}
  else {stages=[...weighted(rng,[[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]],[.44,.26,.10,.10,.06,.04])];if(random(rng)<.5)stages.reverse();}
  return ks.map((k,i)=>({k,s:stages[i]}));
 });
 return shuffle(pairs,rng);
}
export function createBag(seed){if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw Error('seed must be uint32');return {state:seed,index:0,items:[],cycle:0};}
export function drawPair(b){if(b.legacy)return [legacyDraw(b),legacyDraw(b)].map(k=>({k,s:1}));if(b.index>=b.items.length){const seed=Math.floor(random(b)*4294967296);b.items=makeBag(seed);b.index=0;b.cycle++;}return b.items[b.index++].map(c=>({...c}));}
