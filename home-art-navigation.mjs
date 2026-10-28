import {createTerrainNavigation} from './home-terrain-navigation.mjs';
export function insidePolygon(x,y,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
export function artTransform(host,stage){
 // Full artwork width is always retained. Bottom ground is pinned to the stage,
 // not the browser's dynamic address bar. Uniform scale prevents stretching.
 const width=host.width,height=width*1.5,left=0,top=stage.top+stage.height-height*.94;
 return {width,height,left,top,project:p=>({x:left+p.x*width-stage.left,y:top+p.z*height-stage.top}),unproject:p=>({x:(p.x+stage.left-left)/width,z:(p.y+stage.top-top)/height,y:0})};
}
export function createArtNavigation(spec,host,stage){
 const t=artTransform(host,stage),walkable=p=>insidePolygon(p.x,p.z,spec.ground)&&!spec.exclude.some(poly=>insidePolygon(p.x,p.z,poly));
 const nav=createTerrainNavigation({width:stage.width,height:stage.height,project:t.project,unproject:t.unproject,walkable,cell:8});
 return {...nav,transform:t,depthScale:p=>Math.max(.82,Math.min(1,.82+(t.unproject(p).z-.4)/.54*.18)),
  initialPoint(index,count){if(index===0)return t.project({x:.55,z:.76});if(count<=6){const seats=[[.37,.64],[.63,.58],[.42,.84],[.73,.86],[.3,.52]];const p=seats[(index-1)%seats.length];return t.project({x:p[0],z:p[1]});}
   const col=(index-1)%6,row=Math.floor((index-1)/6);return t.project({x:.16+col*.13,z:.42+row*.115});}};
}
