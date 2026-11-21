"""Check native equipment/owner pose and mask values against all recorded feet."""
import argparse
import gzip
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from performance_common import HERE,WPE,clock,digest,load,native_page,save

fixed=load("fixed_cast",HERE/"performance-fixed.py")
AUDIT="""
const equipmentPainters=PAINTERS;
mobilityPerf.attachmentAudit=poses=>{
 window.holdGameTasks=true;
 const css=doc.createElement('style');
 css.textContent='*,*::before,*::after{animation-play-state:paused!important;transition:none!important}';
 doc.head.appendChild(css);
 for(const animation of doc.getAnimations())animation.pause();
 for(const svg of stage.querySelectorAll('svg'))svg.pauseAnimations?.();
 const active=mobilityPerf.reset(214),actors=active.snapshot();
 const items=[...rows.values()].filter(row=>row.attachments?.length);
 let current,count=0,mirrored=0;const unique=new Set(),errors=[];
 active.snapshot=()=>current;
 function read(arm){
   for(const row of rows.values())row.paintStamp=null;
   equipmentPainters[arm]();
   return items.flatMap(row=>row.attachments.map(n=>{
     const r=n.getBoundingClientRect(),owner=row.owner.style;
     return [row.key,n.id,n.style.translate,n.style.scale,n.style.transformOrigin,
       n.style.maskImage,r.x,r.y,r.width,r.height,owner.translate,owner.scale,owner.getPropertyValue('--diorama-facing')];
   }));
 }
 for(let i=0;i<poses.length;i++){
   current=poses[i].map(([x,y,direction,activity,tx,ty],j)=>({...actors[j],x,y,direction,activity,target:tx===null?null:{x:tx,y:ty}}));
   const before=read('v8'),after=read('v9');
   for(let j=0;j<before.length;j++){
     count++;const r=after[j];
     if(JSON.stringify(before[j])!==JSON.stringify(r)||r[2]!==r[10]||r[3]!==r[11])errors.push({pose:i,before:before[j],after:r});
     unique.add([r[0],r[2],r[3],r[4]].join('|'));if(r[12]==='-1')mirrored++;
   }
 }
 return {frames:poses.length,items:items.map(row=>[row.key,...row.attachments.map(n=>n.id)]),
   pairs:count,distinctAttachmentPoses:unique.size,mirrored,errors};
};
"""
if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--base",default="http://127.0.0.1:8377/game")
    p.add_argument("--poses",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    a=p.parse_args()
    poses=json.loads(gzip.decompress(a.poses.read_bytes()))
    painters,hashes=fixed.painters(a.base)
    def instrument(name,src):
        if "production-diorama" in name:
            return clock.replace(src,"    function stop(){",AUDIT.replace("PAINTERS",painters)+"\n    function stop(){")
        return src
    with sync_playwright() as pw:
        b=pw.webkit.launch(executable_path=WPE)
        pg,errors,_=native_page(b,a.base,"v8",init=fixed.HOLD,transform=instrument)
        r=pg.evaluate("p=>mobilityPerf.attachmentAudit(p)",poses)
        save(a.out,dict(browser=b.version,controllers=hashes,posesSHA256=digest(json.dumps(poses,separators=(",",":"))),**r))
        assert not errors and not r["errors"] and r["pairs"]>=r["frames"] and r["distinctAttachmentPoses"]>1,r
        b.close()
