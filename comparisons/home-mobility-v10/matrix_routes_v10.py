"""Test the archived 16 V9 rejected aged drops with the native planner's own point and segment checks."""
import argparse
import json
import os
from pathlib import Path
from unittest.mock import patch
import zipfile

import matrix_worker_v10 as matrix
from matrix_report_v10 import V9_RUN, terminal

PROBE = """
qa.scanManualRays=()=>{
    const max={}, count={contact:0,bounds:0,safe:0};
    for(let degrees=0;degrees<360;degrees+=.5){
      const theta=degrees*Math.PI/180;
      for(let radius=2;radius<=12;radius++){
        const q={x:a.x+radius*Math.cos(theta)/sx,y:a.y+radius*Math.sin(theta)/sy};
        const miss=cost(q); if(!Number.isFinite(miss))continue;
        if(!peers.every(b=>contactSegmentSafe(a,q,b,b.rx,b.ry)))continue;
        const keep=label=>{count[label]++;if(!max[label]||max[label].gain<length-miss)
          max[label]={point:q,radius,degrees,gain:length-miss};};
        keep('contact');
        if(q.x<box.left||q.x>box.right||q.y<box.top||q.y>box.bottom)continue;
        keep('bounds');
        if(safe(a,q))keep('safe');
      }
    }
    return {max,count};
};
"""


def run(a):
    def observe(name,source):
        source=matrix.instrument_source(name,source)
        if 'production-model' in name:
            anchor='      function routeLength(path){'
            source=matrix.old.legacy.once(source,anchor,PROBE+anchor)
        return source
    result=[]
    with matrix.old.sync_playwright() as pw, patch.object(matrix.v9,'patched',observe):
        browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--disable-dev-shm-usage'])
        for region in a.regions:
            with zipfile.ZipFile(a.archives/f'mobility-v9-{V9_RUN}-{region}.zip') as z:
                for name in sorted(set(z.namelist())-{'region.json'}):
                    c=json.loads(z.read(name));d=c['arms']['v9'];aged=d['aged'];row=aged['drag']
                    if not row['issued'] or terminal(row) or row['accepted']:continue
                    with matrix.v9.native_page(browser,a.url,region,c['count'],c['width'],'v9',False) as (page,touch,meta):
                        matrix.old.require(meta['hashes']==d['hashes'],'unexpected V9 bytes')
                        page.evaluate('HomeCastTrial.apply({paused:false});touchQA.manual=false')
                        page.wait_for_function("""()=>{const g=touchQA.gates();if(g.blocked||g.trialPaused||g.pending||touchQA.matrixState().paused)return false;touchQA.manual=true;return true;}""")
                        out=page.evaluate("""({feet,target,index})=>{
                            const s=touchQA.matrixState();s.clock=300;
                            for(const a of s.actors){
                              const b=feet.find(r=>r[0]===a.key);
                              if(b[3]!==a.w||b[4]!==a.h)throw Error('fixture differs');
                              [a.x,a.y]=b.slice(1,3);a.target=null;a.route=[];
                            }
                            touchQA.matrixLoad(s);touchQA.paint();
                            const key=feet[index][0];
                            touchQA.model.select(key);
                            const accepted=touchQA.model.move(key,{x:target[0],y:target[1]},'drag',{pointerDrop:true});
                            return {accepted,scan:touchQA.scanManualRays(),feet:touchQA.opening()};
                        }""",{'feet':aged['opening'],'target':row['modelGoal'],'index':aged['index']})
                        matrix.old.require(out.pop('feet')==aged['opening'],'native restored pressure geometry mismatch')
                        result.append(dict(region=region,count=c['count'],width=c['width'],key=row['key'],**out))
                        a.out.parent.mkdir(exist_ok=True,parents=True)
                        a.out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
                        print(name,out['scan']['max'].get('safe'),flush=True)
        browser.close()


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--url',required=True)
    p.add_argument('--archives',required=True,type=Path)
    p.add_argument('--regions',choices=matrix.old.REGIONS,nargs='+',default=matrix.old.REGIONS)
    p.add_argument('--out',required=True,type=Path)
    run(p.parse_args())
