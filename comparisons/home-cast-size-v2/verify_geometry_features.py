"""Check role-frame proportions and foot-relative equipment transforms in the real home."""
import argparse
import json
import os
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright


def capture(page, url, width, mode):
    page.goto(url+'/?'+urlencode(dict(region='forest',count=28,time='day',paused=1,mode=mode)),
              wait_until='domcontentloaded')
    page.wait_for_function("document.body.dataset.ready==='true'",polling=250,timeout=120000)
    frame=page.locator('#home').element_handle().content_frame()
    frame.evaluate("Promise.all([...document.querySelectorAll('#castStage img')].map(im=>im.decode().catch(()=>{})))")
    frame.evaluate("document.getAnimations().forEach(a=>{a.pause();a.currentTime=0})")
    return frame.evaluate("""()=>{
      const rows=HomeCastTrial.inspect(),byId=k=>document.querySelector('[data-diorama-actor="'+CSS.escape(k)+'"]');
      const sizes=Object.fromEntries(rows.map(a=>{
        const im=byId(a.key).querySelector('img.character-asset'),r=im.getBoundingClientRect();
        return [a.key,r.width/r.height*im.naturalHeight/im.naturalWidth];
      }));
      const gear={};
      for (const [kind,selector] of [['pet','#petAccessory'],['partner','.partner-ring']]) {
        const a=rows.find(a=>a.kind===kind),box=document.querySelector(selector)?.getBoundingClientRect();
        if(a && box?.width) gear[kind]={d:a.depth,box:[box.left-a.foot.x,box.top-a.foot.y,box.right-a.foot.x,box.bottom-a.foot.y]};
      }
      return {sizes,gear};
    }""")


def run(url,out,widths):
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
        result={'browser':browser.version,'widths':{}}
        for w,h in [(w,{320:568,390:844}[w]) for w in widths]:
            context=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=2,is_mobile=True,has_touch=True)
            page=context.new_page()
            data={m:capture(page,url,w,m) for m in ['current','adopted','final']}
            def compare(lhs,rhs):
                a,b=data[lhs],data[rhs]
                ar=max(abs(1-b['sizes'][k]/v) for k,v in a['sizes'].items())
                scale=(1.2 if lhs=='current' and rhs!='current' else 1)
                equipment={}
                for role in ('pet','partner'):
                    x,y=a['gear'][role],b['gear'][role]
                    ratio=scale*y['d']/x['d']
                    equipment[role]=round(max(abs(bb-aa*ratio)for aa,bb in zip(x['box'],y['box'])),3)
                return {'frameRatioVariationPct':round(100*ar,5),'maxGearEdgeDifferenceCssPx':equipment}
            result['widths'][str(w)]={'currentToAdopted':compare('current','adopted'),'adoptedToFinal':compare('adopted','final')}
            out.write_text(json.dumps(result,indent=1)+'\n')
            print(w,result['widths'][str(w)],flush=True)
            context.close()
        browser.close()


if __name__=='__main__':
    cli=argparse.ArgumentParser(description=__doc__);cli.add_argument('url');cli.add_argument('--out',required=True,type=Path)
    cli.add_argument('--widths',nargs='+',type=int,default=[320,390])
    a=cli.parse_args();run(a.url.rstrip('/'),a.out,a.widths)
