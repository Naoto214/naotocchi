// Presentation only: never write a derived colour or label into canonical data.
const rgb=hex=>hex.slice(1).match(/../g).map(x=>parseInt(x,16));
export function bodyTint(color){
 const source=rgb(color),cream=rgb('#fffcf0');
 return '#'+source.map((v,i)=>Math.round(v*.16+cream[i]*.84).toString(16).padStart(2,'0')).join('');
}
export function contrast(a,b){
 const luminance=hex=>rgb(hex).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
 const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
export function opticalOffset({targetX,targetY,left,baseline,leftBearing,rightBearing,ascent,descent,fontSize}){
 if(![targetX,targetY,left,baseline,leftBearing,rightBearing,ascent,descent,fontSize].every(Number.isFinite)||fontSize<=0)return null;
 const bound=fontSize*.18,clamp=n=>Math.round(Math.max(-bound,Math.min(bound,n))*1000)/1000;
 return {x:clamp(targetX-(left+(rightBearing-leftBearing)/2)),y:clamp(targetY-(baseline+(descent-ascent)/2))};
}
