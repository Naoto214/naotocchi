"""Replay each actual rejection on the same version and viewport with exact actor geometry."""
import argparse
import gzip
import hashlib
import importlib.util
import json
import re
from pathlib import Path
from playwright.sync_api import sync_playwright
from forest_layout import forest_url

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('forest_rays_v9',HERE.parent/'home-mobility-v9/forest_rays.py')
v9=importlib.util.module_from_spec(spec)
spec.loader.exec_module(v9)
PROBE=v9.PROBE
read=v9.read

def scan(args,data):
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=args.chromium)
        try:
            page=browser.new_page(viewport={'width':data['width'],'height':792},is_mobile=True,has_touch=True,device_scale_factor=2,timezone_id='Asia/Tokyo',locale='ja-JP')
            sources={}
            def hook(route):
                resp=route.fetch();source=resp.text()
                sources['model']=hashlib.sha256(source.encode()).hexdigest()
                anchor='    return {metrics:'
                assert source.count(anchor)==1
                route.fulfill(response=resp,body=source.replace(anchor,PROBE+anchor))
            page.route(re.compile('/'+re.escape('home-production-model-mobility-'+data['arm']+'.js')+r'(?:\?|$)'),hook)
            page.goto(forest_url(args.url,data['arm']),wait_until='domcontentloaded')
            page.wait_for_function('window.HomeCastTrial?.ready&&window.HomeDragTrial?.opening()&&typeof window.forestRays==="function"',timeout=120000)
            assert sources['model']==data['sources']['home-production-model-mobility-'+data['arm']+'.js']['source']
            sources['scanner']=hashlib.sha256(PROBE.encode()).hexdigest()
            path=args.file; d=data; cases=[]; identities=[]
            opening=[[key,x,y,w,h] for key,_,x,y,w,h in d['opening']['actors']]
            final=[[a[k] for k in ('key','x','y','w','h')] for a in d['baseline']['residents']]
            for phase,feet in [('opening',opening),('endpoint',final)]:
                for key,*_ in feet:
                    cases.append(dict(key=key,feet=feet));identities.append([phase,key,None])
            # Never probe the live game or alter its order of RNG draws. All original
            # rejections remain in the source and have one geometry observation each.
            for i,r in enumerate(d['log']['requests']):
                if r['planned'] and not r['accepted'] and r['source']=='ambient':
                    cases.append(dict(key=r['key'],feet=[b[:5] for b in r['peers']],goal=r['goal']))
                    identities.append(['refusal',r['key'],i])
            observations=[]
            for offset in range(0,len(cases),12):
                batch=cases[offset:offset+12]
                findings=page.evaluate('cases=>forestRays(cases)',batch)
                observations.extend([dict(phase=phase,key=key,request=idx,geometry=row) for (phase,key,idx),row in zip(identities[offset:],findings)])
            out=path.parent/'directions.json.gz'
            with gzip.open(out,'wt',compresslevel=3) as f:json.dump(dict(sources=sources,input=hashlib.sha256(path.read_bytes()).hexdigest(),observations=observations),f,separators=(',',':'))
            print(d['arm'],d['seed'],len(observations),str(out),flush=True)
        finally:browser.close()
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--url',required=True);p.add_argument('--chromium',default='/usr/bin/chromium');p.add_argument('file',type=Path);args=p.parse_args();scan(args,read(args.file))
