"""Repaint the same decoded, held pixels A/B/A including a visible shoreline mask."""
import argparse
from io import BytesIO
from pathlib import Path
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright
from performance_common import HERE, WPE, clock, digest, load, native_page, save

fixed=load("fixed_cast",HERE/"performance-fixed.py")
HOOK="""
const pixelPainters=PAINTERS;
window.pixelRender=arm=>{
 for(const row of rows.values())row.paintStamp=null;
 pixelPainters[arm]();
 return [...rows.values()].flatMap(row=>[...row.owner.querySelectorAll('.character-asset'),...(row.attachments||[])])
   .map(n=>n.style.maskImage);
};
window.placeVisibleMask=()=>{
 const a=model.snapshot()[0],row=rows.get(a.key),sprite=row.owner.querySelector('.character-asset');
 const p=env.NaotocchiHomeViewport.residentPresentation(),host=displayRect(worldHost),r=stage.getBoundingClientRect();
 const project=([x,y])=>[p.x+(host.left+x-p.x)*p.scaleX,p.y+(host.top+y-p.y)*p.scaleY];
 const edge=[];
 for(const poly of polygonsAt(a))for(let i=0;i<poly.length;i++){
   const b=project(poly[i]),c=project(poly[(i+1)%poly.length]);
   for(let f=0;f<1;f+=1/32){
     const x=b[0]+(c[0]-b[0])*f,y=b[1]+(c[1]-b[1])*f;
     if(x>Math.max(r.left,0)+2&&x<Math.min(r.right,innerWidth)-2&&y>Math.max(0,r.top)+2&&y<Math.min(innerHeight,r.bottom)-2)edge.push([x,y]);
   }
 }
 edge.sort((a,b)=>Math.hypot(a[0]-r.x-r.width/2,a[1]-r.y-r.height/2)-Math.hypot(b[0]-r.x-r.width/2,b[1]-r.y-r.height/2));
 if(!edge.length)return false;
 sprite.style.translate='0px 0px';
 const base=sprite.getBoundingClientRect();
 sprite.style.translate='80px 0px';const rx=sprite.getBoundingClientRect();
 sprite.style.translate='0px 80px';const ry=sprite.getBoundingClientRect();
 const basis=new env.DOMMatrix([(rx.left-base.left)/80,(rx.top-base.top)/80,(ry.left-base.left)/80,(ry.top-base.top)/80,0,0]);
 const d=new env.DOMPoint(edge[0][0]-base.left-base.width/2,edge[0][1]-base.top-base.height/2).matrixTransform(basis.inverse());
 sprite.style.translate=d.x+'px '+d.y+'px';
 pixelRender('v8');
 return {edge:edge[0],resident:a.key,applied:!!sprite.style.maskImage};
};
"""
if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--base",default="http://127.0.0.1:8377/game")
    p.add_argument("--out",type=Path,required=True)
    a=p.parse_args()
    painters,hashes=fixed.painters(a.base)
    def instrument(name,src):
        if "production-diorama" in name:
            return clock.replace(src,"    function stop(){",HOOK.replace("PAINTERS",painters)+"\n    function stop(){")
        return src
    result=dict(controllers=hashes,rows=[])
    with sync_playwright() as pw:
        b=pw.webkit.launch(executable_path=WPE)
        result["webkit"]=b.version
        for region,view in [("forest",(390,792)),("river_lake",(844,390))]:
            pg,errors,_=native_page(b,a.base,"v8",transform=instrument,init=fixed.HOLD,region=region,view=view)
            clip=pg.evaluate("""()=>{
              window.holdGameTasks=true;
              const style=document.createElement('style');
              style.textContent='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';
              document.head.appendChild(style);
              for(const a of document.getAnimations())a.pause();
              for(const s of document.querySelectorAll('svg'))s.pauseAnimations?.();
              const r=document.getElementById('castStage').getBoundingClientRect(),x=Math.max(0,Math.ceil(r.left)),y=Math.max(0,Math.ceil(r.top));
              return {x,y,width:Math.floor(Math.min(innerWidth,r.right)-x),height:Math.floor(Math.min(innerHeight,r.bottom)-y)};
            }""")
            challenge=pg.evaluate("placeVisibleMask()") if region=="river_lake" else None
            assert region!="river_lake" or (challenge and challenge["applied"]),challenge
            images,masks=[],[]
            for arm in ["v8","v9","v8"]:
                masks.append(pg.evaluate("arm=>pixelRender(arm)",arm))
                images.append(Image.open(BytesIO(pg.screenshot(clip=clip,timeout=60000))).convert("RGB"))
            boxes=[ImageChops.difference(images[0],i).getbbox() for i in images[1:]]
            row=dict(region=region,viewport=view,clip=clip,pixelSize=images[0].size,challenge=challenge,
                     masksEqual=masks[0]==masks[1]==masks[2],masked=sum(bool(m) for m in masks[0]),
                     hashes=[digest(i.tobytes()) for i in images],differences=boxes)
            result["rows"].append(row)
            save(a.out,result)
            assert not errors and not any(boxes) and row["masksEqual"],row
            pg.close()
        b.close()
