"""Render official daypart originals through the comparison's real Canvas module."""
import argparse
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

RENDER = """async ({generation})=>{
  const {composeNature}=await import('/game/beauty/paint.mjs');
  const {DAYPARTS}=await import('/game/home-dayparts.mjs');
  const effects=Object.fromEntries('water particles light contact motion canopy shafts depth gusts magic ground waves foam reflections caustics'.split(' ').map(k=>[k,true]));
  const canvas=document.createElement('canvas');canvas.width=208;canvas.height=312;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const rect={left:0,top:0,width:208,height:312}, data={},reference={};
  window.HomeBeauty={sampleClock:t=>t};
  const previous5=['sea','forest','city','snow','memory_lake'];
  function draw(im,old,env,t,red=false,alpha=1){
    ctx.globalAlpha=1;ctx.drawImage(old,0,0,208,312);ctx.globalAlpha=alpha;ctx.drawImage(im,0,0,208,312);
    ctx.globalAlpha=1;HomeBeauty.settings={effects,split:.5,...env};
    if(env.variant)composeNature(ctx,rect,rect,{image:im,previous:old,alpha},t,red);
    return ctx.getImageData(0,0,208,312).data;
  }
  function delta(a,b){
    let n=0;for(let i=0;i<a.length;i+=4)if(Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]))>=4)n++;
    return n;
  }
  const hash=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),x=>x.toString(16).padStart(2,'0')).join('');
  for(const [region,parts] of Object.entries(DAYPARTS)){
    if(generation===3 && !previous5.includes(region))continue;
    if(generation===4 && !['forest','sea'].includes(region))continue;
    const entries=Object.entries(parts);
    const images=await Promise.all(entries.map(async ([time,name])=>{const im=new Image();im.src='/game/'+name;await im.decode();return im;}));
    for(const [i,[time]] of entries.entries()){
      const im=images[i],old=images[(i+3)%4];
      const preset={region,time,season:'summer',weather:'sunny',strength:1};
      const oldVariant=generation===3?'D3':'previous';
      if(previous5.includes(region) && generation!==4) {
        for(const a of [1,.375])reference[region+'/'+time+'/D3/'+a]=await hash(draw(im,old,{...preset,variant:oldVariant},59.25,false,a));
      }
      if(['sea','forest'].includes(region) && generation!==3) {
        for(const a of [1,.375])reference[region+'/'+time+'/E3/'+a]=await hash(draw(im,old,{...preset,variant:'E3'},59.25,false,a));
      }
      if(generation!==5)continue;
      const start={...preset,variant:'E3'};
      const base=draw(im,old,{...preset,variant:null},35),normal=draw(im,old,start,35);
      const zero=draw(im,old,{...start,strength:0},35);
      const disabled=delta(draw(im,old,start,35,true),draw(im,old,start,180,true));
      const changes={};
      for(const season of ['spring','summer','autumn','winter']){
        changes[season]={};
        for(const weather of ['sunny','cloudy','rain','snow']){
          changes[season][weather]=delta(normal,draw(im,old,{...start,season,weather},35));
        }
      }
      data[region+'/'+time]={zeroDiff:delta(base,zero),reducedTemporalDiff:disabled,changes};
    }
  }return {data,reference};
}"""

def read(browser,root,generation):
    page=browser.new_page(viewport=dict(width=208,height=312))
    try:
        page.route('**/paint-probe',lambda route:route.fulfill(content_type='text/html',body='<title>Paint comparisons</title>'))
        page.goto(root.rstrip('/')+'/paint-probe')
        return page.evaluate(RENDER,dict(generation=generation))
    finally:
        page.close()

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('v3');p.add_argument('v4');p.add_argument('v5');p.add_argument('out',type=Path)
    a=p.parse_args()
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
        expected={**read(b,a.v3,3)['reference'],**read(b,a.v4,4)['reference']}
        new=read(b,a.v5,5);b.close()
    matches={k:h==new['reference'][k] for k,h in expected.items()}
    a.out.write_text(json.dumps(dict(reference=matches,conditions=new['data']),indent=1)+'\n')
    assert len(matches)==56 and all(matches.values()),[k for k,v in matches.items() if not v]
    assert len(new['data'])==52 and all(r['zeroDiff']==0 and r['reducedTemporalDiff']==0 for r in new['data'].values())
    print('56 pinned comparisons and 832 environment settings across all 52 paintings passed.')
