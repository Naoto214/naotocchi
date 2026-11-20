"""Compare zero leaf count with skipping only the leaf draw call at a normal count."""
import argparse
import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

CHECK = """async scene=>{
 const [region,time]=scene, width=390,height=585,rect={left:0,top:0,width,height};
 const {composeNature}=await import('/game/beauty/paint.mjs');
 const {DAYPARTS}=await import('/game/home-dayparts.mjs');
 const image=new Image();image.src='/game/'+DAYPARTS[region][time];await image.decode();
 const effects=Object.fromEntries('water particles light contact motion canopy shafts depth gusts magic ground waves foam caustics reflections'
   .split(' ').map(k=>[k,true]));
 const s={region,time,season:'autumn',weather:'sunny',speed:1,effects,count:28,strength:1,split:.5,compareSplit:false,
   fall:{count:1,size:1,speed:1,wind:1},leafColor:'mixed'};
 window.HomeBeauty={settings:s,sampleClock:t=>t};
 const frame=(mode,t,count,skip,paint)=>{
   const c=document.createElement('canvas');c.width=width;c.height=height;
   const ctx=c.getContext('2d');ctx.drawImage(image,0,0,width,height);s.variant=mode;s.fall.count=count;window.skipGlyph=skip;
   if(paint)composeNature(ctx,rect,rect,{image,previous:null,alpha:1},t,false);
   return ctx.getImageData(0,0,width,height).data;
 };
 function changed(a,b){let diff=0;for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2]||a[i+3]!==b[i+3])diff++;return diff;}
 const rows=[];
 for(const mode of ['A','B','C'])for(const t of [24.5,39,55.25]){
   const zero=frame(mode,t,0,false,true);
   rows.push({mode,seconds:t,changedVsSkipGlyph:changed(zero,frame(mode,t,1,true,true)),
     changedVsBarePainting:changed(zero,frame(mode,t,0,false,false)),changedVsNormal:changed(zero,frame(mode,t,1,false,true))});
 }
 return rows;
}"""


def main(a):
    def probe(route):
        res=route.fetch()
        body=res.text()
        marker='export function drawAutumnLeaf('
        assert body.count(marker)==1
        pos=body.index('{',body.index(marker))+1
        route.fulfill(response=res,body=body[:pos]+'if(window.skipGlyph)return;'+body[pos:])

    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'))
        page=b.new_page(viewport={'width':390,'height':585});page.route('**/autumn-leaf.mjs*',probe)
        page.route('**/zero-leaf-check',lambda r:r.fulfill(content_type='text/html',body='<!doctype html><title>Leaf count</title>'))
        page.goto(a.url+'/zero-leaf-check')
        result={'browser':b.version,'pixels':[390,585],'rows':{}}
        for scene in [('forest','day'),('countryside','evening')]:
            rows=page.evaluate(CHECK,scene)
            assert all(r['changedVsSkipGlyph']==0 and r['changedVsBarePainting']>0 and r['changedVsNormal']>0 for r in rows),rows
            result['rows']['-'.join(scene)]=rows
        a.out.write_text(json.dumps(result,indent=1)+'\n');b.close()
        print('All 18 comparisons match the scene with only the leaf glyph skipped.')


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--url',default='http://127.0.0.1:8197')
    p.add_argument('--out',type=Path,required=True)
    main(p.parse_args())
