"""Evaluate the original native terrain, visibility, bounds and contact checks on recorded feet."""
import argparse, gzip, hashlib, json, math
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright

SCAN="""
    globalThis.mobilityLocalProbe=(pose)=>{
      const n=scene.navigation,scale=n.intentScale,coords=pose&&new Map(pose.map(a=>[a.key,a]));
      const group=actors.map(a=>{const p=coords?.get(a.key);return p?{...a,x:p.x,y:p.y,w:p.w,h:p.h}:a;});
      const maximumGap=normals=>{
        if(normals.length<2)return Math.PI*2;
        const angles=normals.map(([x,y])=>Math.atan2(y,x)).sort((a,b)=>a-b);
        return Math.max(...angles.map((v,i)=>(angles[(i+1)%angles.length]+(i===angles.length-1?Math.PI*2:0))-v));
      };
      return group.map(a=>{
        const b=bounds(a,scene),others=group.filter(o=>o!==a),crossings={},oneAlone={},pairAlone={},normals=[],originPeers=[];
        for(const o of others){
          const rx=(a.w+o.w)/2+10,ry=(a.h+o.h)*.38+10,score=clearance(a,a,o);
          if(score<1-1e-8){originPeers.push(o.key);const gx=(a.x-o.x)/rx**2,gy=(a.y-o.y)/ry**2;
            if(Math.hypot(gx,gy)>1e-10)normals.push([gx,gy]);}
        }
        const edgeNormals=[];
        if(Math.abs(a.x-b.left)<1e-7)edgeNormals.push([1,0]);if(Math.abs(a.x-b.right)<1e-7)edgeNormals.push([-1,0]);
        if(Math.abs(a.y-b.top)<1e-7)edgeNormals.push([0,1]);if(Math.abs(a.y-b.bottom)<1e-7)edgeNormals.push([0,-1]);
        const freeByLength={},count={examined:0,bounds:0,terrain:0,ink:0,free:0,escapeOnly:0,separated:0};
        for(const r of [3,6,12,24])for(let angle=0;angle<360;angle+=10){
          count.examined++;const theta=angle*Math.PI/180,p={x:a.x+Math.cos(theta)*r/scale.x,y:a.y+Math.sin(theta)*r/scale.y};
          if(p.x<b.left||p.x>b.right||p.y<b.top||p.y>b.bottom)continue;count.bounds++;
          if(!n.segmentSafe(a,p))continue;count.terrain++;
          if(!n.segmentSafe(a,p,q=>visible(a,q)))continue;count.ink++;
          const hits=others.filter(o=>{
            const rx=(a.w+o.w)/2+10,ry=(a.h+o.h)*.38+10,c0=clearance(a,a,o),c1=clearance(a,p,o);
            return !contactSegmentSafe(a,p,o,rx,ry)||c1<1&&!(c0<1&&c1>c0+1e-6);
          }).map(o=>o.key).sort();
          if(!hits.length){freeByLength[r]=(freeByLength[r]||0)+1;count.free++;if(others.some(o=>clearance(a,p,o)<1))count.escapeOnly++;else count.separated++;}
          else{hits.forEach(k=>crossings[k]=(crossings[k]||0)+1);
            if(hits.length===1)oneAlone[hits[0]]=(oneAlone[hits[0]]||0)+1;
            if(hits.length===2){const pair=hits.join('|');pairAlone[pair]=(pairAlone[pair]||0)+1;}}
        }
        return {key:a.key,x:a.x,y:a.y,bounds:b,originPeers,edgeNormals,contactLocksAllDirections:maximumGap(normals)<Math.PI-1e-6,
          contactAndBoundsLockAllDirections:maximumGap([...normals,...edgeNormals])<Math.PI-1e-6,
          count,freeByLength,crossings,onePeerOnly:oneAlone,twoPeersOnly:pairAlone};
      });
    };
"""
def examine(args):
    with sync_playwright() as p:
        b=p.chromium.launch(executable_path='/usr/bin/chromium')
        try:
            pg=b.new_page(viewport={'width':390,'height':792},has_touch=True,is_mobile=True,device_scale_factor=2)
            ha={}
            def hook(route):
                resp=route.fetch();s=resp.text();ha['nativeModelSHA256']=hashlib.sha256(s.encode()).hexdigest()
                anchor='    return {metrics:';assert s.count(anchor)==1;s=s.replace(anchor,SCAN+anchor);route.fulfill(response=resp,body=s)
            pg.route('**/home-production-model-mobility-v6.js*',hook)
            params=urlencode(dict(region='forest',time='day',count=28,paused=1,clock=0,ground='on',paired=1,variant='B',season='autumn',weather='sunny'))
            pg.goto(args.url.rstrip('/')+'/game/mobility-v6.html?'+params,wait_until='domcontentloaded',timeout=120000)
            pg.wait_for_function('HomeCastTrial.ready&&HomeDragTrial.opening()&&window.mobilityLocalProbe',timeout=90000)
            opening=pg.evaluate('HomeDragTrial.opening()')
            out={'browser':b.version,'environment':opening,'source':ha,'lengthsCssPx':[3,6,12,24],'degreesStep':10,
                 'opening':pg.evaluate('mobilityLocalProbe(null)'),'aged':{}}
            for file in args.study:
                d=json.loads(gzip.decompress(file.read_bytes()))
                assert opening['actors']==d['opening']['actors'],file
                out['aged'][d['arm']]=pg.evaluate('(p)=>mobilityLocalProbe(p)',d['baseline']['residents'])
            args.out.parent.mkdir(parents=True,exist_ok=True)
            args.out.write_bytes(gzip.compress(json.dumps(out,ensure_ascii=False,separators=(',',':')).encode(),mtime=0))
        finally:b.close()

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--url',required=True);p.add_argument('--study',type=Path,nargs='*',default=[])
    p.add_argument('--out',type=Path,required=True);examine(p.parse_args())
