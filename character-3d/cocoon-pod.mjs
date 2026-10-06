// Granular closed/open cocoon topology; one owned face follows its visible host.
import {ellipsoid,solid,xform,paint,mix,sweep,openedShellParts} from './geometry.mjs';
import {Rig} from './rig.mjs';
export function cocoonPod(sp,key){
 const r=new Rig(key,'pod','hopSway'),h=sp.h,w=sp.r,c=sp.colors;
 const outer=paint(xform(ellipsoid(w,h*.5,w*.74,24,16),{pos:[0,h*.5,0]}),(x,y,z,nx,ny,nz)=>mix(c.base,c.light,Math.max(0,nz)*.18+Math.max(0,ny)*.12));
 const profile=[[0,.01],[.12,w*.45],[.35,w*.92],[.58,w],[.84,w*.65],[1,.014]];
 const shellRadius=t=>{let j=0;while(j<profile.length-2&&profile[j+1][0]<t)j++;const [ta,ra]=profile[j],[tb,rb]=profile[j+1];return ra+(rb-ra)*(t-ta)/(tb-ta);};
 const grains=[];
 if(sp.granules!==false)for(let row=0;row<9;row++)for(let col=0;col<14;col++){
  const t=(row+.65)/10,a=(col+(row%2)*.45)/14*Math.PI*2,rad=sp.open?shellRadius(t):w*Math.sqrt(1-Math.pow(t*2-1,2)),x=Math.sin(a)*rad,z=Math.cos(a)*rad*(sp.open?1:.74),y=t*h;
  if(sp.open&&(a<.87||a>Math.PI*2-.87))continue;
  if(!sp.open&&z>0&&Math.abs(x)<w*.55&&Math.abs(y-h*.62)<h*.13)continue;
  const q=.034+((row*3+col*7)%5)*.004;
  grains.push(solid(xform(ellipsoid(q,q*.83,q*.68,7,5),{pos:[x,y,z],rot:[a*.3,row*.31,col*.17]}),[c.base,c.light,c.dark][(row+col)%3]));
 }
 let target,center,half,bone;
 if(!sp.open){r.add('body','root',[0,0,0],[outer.clone(),...grains]);target=outer;center=[0,h*.62,w*.70];half=w*.65;bone='body';}
 else{
  r.add('shell','root',[0,0,0],[...openedShellParts({h,r:w,colors:{base:c.base,inside:c.inside,dark:c.dark}}),...grains]);
  const p=sp.pupa,core=solid(xform(ellipsoid(p.width,p.height,p.depth,20,14),{pos:[0,p.y,.02]}),c.pupa),folds=[];
  for(let i=0;i<6;i++){const y=p.y-p.height*.72+i*p.height*.24,rr=p.width*Math.sqrt(Math.max(.1,1-Math.pow((y-p.y)/p.height,2)));
   for(const side of [-1,1])folds.push(solid(sweep([[side*rr*.90,y+.035,.04],[side*rr*.52,y+.014,p.depth*.92],[0,y-.025,p.depth+.025]],()=>.026,6,{steps:5}),i%2?c.pupaLight:c.pupa));
  }
  r.add('body','root',[0,0,0],[core,...folds]);
  const head=solid(ellipsoid(p.head.width,p.head.height,p.head.depth,18,12),c.pupaLight);r.add('head','body',p.head.at,[head.clone()]);target=head;center=[0,0,p.head.depth*.96];half=p.head.width*.72;bone='head';
 }
 r.faceSpec={bone,target,center,half,fwd:[0,0,1],eyeSize:.25,normalEye:sp.normalEye,layout:{eyeX:24,eyeY:54,mouthY:84,browY:34,cheekX:38,cheekY:72,mouthW:8},style:{blush:'#d88640'}};
 r.meta={idlePose:'stand',hover:0};return r;
}
