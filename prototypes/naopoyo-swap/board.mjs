export const stage=c=>c?(c-1)%8+1:0;
export const species=c=>Math.floor((c-1)/8);
export const piece=(k,s)=>k*8+s;
export const count=b=>b.reduce((n,c)=>n+!!c,0);
export const key=b=>b.join(',');
export const adjacent=(a,b)=>Number.isInteger(a)&&Number.isInteger(b)&&a>=0&&b>=0&&a<36&&b<36&&Math.abs(a%6-b%6)+Math.abs(Math.floor(a/6)-Math.floor(b/6))===1;
export const PAIRS=Array.from({length:36},(_,i)=>[...(i%6<5?[[i,i+1],[i+1,i]]:[]),...(i<30?[[i,i+6],[i+6,i]]:[])]).flat();
export function swaps(b){return PAIRS.filter(([a,c])=>b[a]||b[c]);}
export function swapped(b,a,c){const n=b.slice();[n[a],n[c]]=[n[c],n[a]];return n;}
export const bottomLeft=(a,b)=>Math.floor(b/6)-Math.floor(a/6)||a%6-b%6;
export function gravity(b){const n=Array(36).fill(0);for(let x=0;x<6;x++){const col=[];for(let y=0;y<6;y++)if(b[y*6+x])col.push(b[y*6+x]);col.forEach((c,j)=>n[(6-col.length+j)*6+x]=c);}return n;}
export function random(s,name){let a=s.rng[name]>>>0;a=(a+0x6d2b79f5)>>>0;s.rng[name]=a;let t=Math.imul(a^(a>>>15),a|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}
export function shuffle(a,s,name){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(random(s,name)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function hashString(str){let h=2166136261;for(let i=0;i<str.length;i++)h=Math.imul(h^str.charCodeAt(i),16777619);return h>>>0;}
