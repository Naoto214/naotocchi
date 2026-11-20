"""Inspect recorded request geometry using a stationary real 390px forest game."""
import argparse
import gzip
import hashlib
import re
import json
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright
from forest_observe import FOCUS

HERE=Path(__file__).resolve().parent
def read(p):return json.loads(gzip.decompress(p.read_bytes()))
def save(p,v):
    p.write_bytes(gzip.compress(json.dumps(v,ensure_ascii=False,separators=(',',':'),allow_nan=False).encode(),mtime=0))
def actor_pose(record):
    return [[a[k] for k in ('key','x','y','w','h')] for a in record]

def examine(args):
    src=(HERE/'forest_geometry.mjs').read_text()
    claims={'probeSHA256':hashlib.sha256(src.encode()).hexdigest(), 'lengthsCss':[3,4,5,6,8,12,18,24], 'directions':48,'helperDirections':24,'helperLengthsCss':[4,8,12,16,20,24]}
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path='/usr/bin/chromium');pg=browser.new_page(viewport={'width':390,'height':792},device_scale_factor=2,is_mobile=True,has_touch=True)
        def hook(route):
            resp=route.fetch();native=resp.text();claims['nativeModelSHA256']=hashlib.sha256(native.encode()).hexdigest()
            anchor='    return {metrics:';assert native.count(anchor)==1
            route.fulfill(response=resp,body=native.replace(anchor,src+'\n'+anchor))
        pg.route(re.compile(r'/home-production-model-mobility-v7\.js(?:\?|$)'),hook)
        pg.on('pageerror',lambda e:print('page error:',e,flush=True))
        q=urlencode(dict(region='forest',time='day',count=28,paused=1,clock=0,ground='on',paired=1,variant='B',season='autumn',weather='sunny'))
        pg.goto(args.url.rstrip('/')+'/game/mobility-v7.html?'+q,wait_until='domcontentloaded')
        pg.wait_for_function('window.HomeCastTrial?.ready&&window.HomeDragTrial?.opening()&&typeof window.forestDirections==="function"',timeout=120000)
        op=pg.evaluate('HomeDragTrial.opening()')
        cache={};check=hashlib.sha256(json.dumps([claims,op],sort_keys=True).encode()).hexdigest()
        if args.cache and args.cache.exists():
            previous=read(args.cache)
            if previous['check']==check:cache=previous['entries']
        def flush_cache():
            if args.cache:save(args.cache,{'check':check,'entries':cache})
        def query(data):
            identity=hashlib.sha256(json.dumps(data,sort_keys=True,separators=(',',':')).encode()).hexdigest()
            if identity not in cache:
                cache[identity]=pg.evaluate('(p)=>forestDirections(p)',data)
            return cache[identity]
        result={'source':claims,'opening':op,'sourceInputs':{},'records':{}}
        for f in args.paths:
            d=read(f);label=f.parent.name+'-'+d['arm'];assert op['actors']==d['opening']['actors'],label
            result['sourceInputs'][label]=hashlib.sha256(f.read_bytes()).hexdigest()
            rows=[]
            def scan(k,pose,phase,**more):
                spec=dict(key=k,peers=pose,clock=0,**{k:v for k,v in more.items() if k!='clock'})
                spec['clock']=more.get('clock',0);outer={k:v for k,v in more.items() if k!='selected'}
                rows.append(dict(phase=phase,**outer,geometry=query(spec)))
            for key in ['companion:'+s for s in FOCUS]:
                opening=[[a[0],a[2],a[3],a[4],a[5]] for a in op['actors']]
                scan(key,opening,'opening')
                scan(key,actor_pose(d['baseline']['residents']),'endpoint',clock=d['baseline']['modelSeconds'])
            for i,event in enumerate(d.get('decisions',[])):
                if event['source']=='ambient' and event['clock']>d['baseline']['modelSeconds']:continue
                if event['key'].split(':')[-1] not in FOCUS or event['accepted']:continue
                if i>=d.get('baselineDecisions',len(d['decisions'])) and event['source']!='drag':continue
                scan(event['key'],event['peers'],'request',index=i,clock=event['clock'],source=event['source'],retry=event['retry'],
                    selected=event['selected'],goal=event['goal'],directional=event['source']=='drag')
                if len(rows)%40==0: print(label,len(rows),'rows',flush=True)
            result['records'][label]=rows;save(args.out,result);flush_cache()
            print(label,len(rows),flush=True)
        browser.close()

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--url',default='http://127.0.0.1:8377');p.add_argument('--out',type=Path,required=True)
    p.add_argument('--cache',type=Path);p.add_argument('paths',nargs='+',type=Path);examine(p.parse_args())
