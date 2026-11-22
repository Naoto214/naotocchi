import argparse
import importlib.util
import json
import os
import subprocess
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parent/'home-mobility-v11'))
from space_capture import forest_url

def run(args):
    width=args.width
    data=json.loads((args.scenes/f'{width}-v10-reference.json').read_text())
    feet=data['phases'][0]['feet'];out=[]
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path='/usr/bin/chromium')
        p=b.new_page(viewport={'width':width,'height':792},device_scale_factor=2,is_mobile=True,has_touch=True)
        def add(route):
            resp=route.fetch();source=resp.text()
            if args.baseline:
                applied=source
            else:
                applied=subprocess.run(['node','-e',"process.stdout.write(require('./curve.cjs').patchCurve(require('fs').readFileSync(0,'utf8')))"],cwd=HERE,input=source,text=True,capture_output=True,check=True).stdout
            marker="      if(arrange){clearRelief();"
            probe=(HERE/'curve-probe.js').read_text()
            assert applied.count(marker)==1
            route.fulfill(response=resp,body=applied.replace(marker,"if(scene.navigation?.intentScale){"+probe+"}\n"+marker))
        p.route('**/home-production-model-mobility-*.js*',add)
        p.goto(forest_url(args.url,'v11-foot-reference'),wait_until='domcontentloaded',timeout=120000)
        p.wait_for_function("HomeCastTrial.ready && HomeDragTrial.opening() && typeof window.curveProbe==='function'",timeout=120000)
        for k in args.keys:
            for deg in args.degrees:
                row=p.evaluate('([feet,key,deg,mode])=>curveProbe(feet,key,deg,mode)',[feet,k,deg,args.mode])
                out.append({'key':k,'degrees':deg,**row});args.out.write_text(json.dumps(out,separators=(',',':'))+'\n')
                print(k,deg,row['found'],row.get('actual'),[(s['key'],bool(s.get('via')))for s in row.get('pair',{}).get('stages',[])],row['iters'],round(row['total'],2),flush=True)
        b.close()
if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--url',default='http://127.0.0.1:18539');ap.add_argument('--scenes',type=Path,default=Path('/tmp/m12-space'));ap.add_argument('--width',type=int,default=375);ap.add_argument('--baseline',action='store_true');ap.add_argument('--degrees',nargs='+',type=float,default=[101.25,105,277.5,285,288.75,292.5,300,307.5,315,330]);ap.add_argument('--keys',nargs='+',default=['companion:tanuki']);ap.add_argument('--mode',choices=['native','isolated'],default='isolated');ap.add_argument('--out',type=Path,required=True);run(ap.parse_args())
