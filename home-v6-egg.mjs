import {artTransform} from './home-art-navigation.mjs';
export function eggPose(host,stage,box=[0,0,128,128]){
 const t=artTransform(host,stage),foot=t.project({x:.55,z:.74}),size=Math.min(140,host.width*.34);
 return {foot,size,left:foot.x-size*(box[0]+box[2])/256,top:foot.y-size*box[3]/128,transform:t};
}
// Background-only egg adapter. The original sprite, pointer handlers, warming,
// hatching and save state are owned exclusively by the unchanged game code.
export function createEggPresentation(doc){
 let host=null,img=null;
 return {update({active,stage,sprite,asset,time,weather}){
  if(!active){host?.remove();host=null;img=null;delete doc.body.dataset.homeV6Egg;return;}
  if(!host){host=doc.createElement('div');host.className='home-living-world home-v6-egg-world';host.setAttribute('aria-hidden','true');img=doc.createElement('img');img.src='assets/home-v6-20261029/runtime/home-interior-c.webp';img.decoding='async';host.append(img);doc.body.append(host);}
  doc.body.dataset.homeV6Egg='true';
  const h=host.getBoundingClientRect(),s=stage.getBoundingClientRect(),p=eggPose(h,{left:s.left-h.left,top:s.top-h.top,width:s.width,height:s.height},doc.defaultView.NaotocchiCastBounds?.[asset]?.box);
  Object.assign(img.style,{position:'absolute',width:p.transform.width+'px',height:p.transform.height+'px',left:p.transform.left+'px',top:p.transform.top+'px',filter:time==='night'?'brightness(.76) saturate(.85)':weather==='rain'?'brightness(.85)':'none'});
  Object.assign(sprite.style,{left:p.left+'px',top:p.top+'px',width:p.size+'px',height:p.size+'px'});
  sprite.style.setProperty('--cast-art-offset-y','0px');
 },destroy(){host?.remove();host=null;img=null;delete doc.body.dataset.homeV6Egg;}};
}
if(typeof window!=='undefined'){window.HomeV6Egg=createEggPresentation(document);window.dispatchEvent(new Event('home-v6-egg-ready'));}
