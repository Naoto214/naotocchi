"""Repeat the same native opening and try an 8, 12, and 18 CSS px clear direction when present."""
import argparse
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
import regional


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('runtime',type=Path)
    parser.add_argument('cases',nargs='+',help='region,count,width')
    parser.add_argument('--out',type=Path,required=True)
    args=parser.parse_args()
    args.out.mkdir(parents=True,exist_ok=True)
    regional.HOP=regional.once(regional.HOP,'m.hops++;',        "if(a.source==='drag')(m.dragPath??=[]).push({key:a.key,clock,from:[a.x,a.y],to:[p.x,p.y]});m.hops++;")
    url=regional.serve(args.runtime)
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'))
        for case in args.cases:
            region,n,w=case.split(',')
            receipt=[]
            for radius in (8,12,18):
                result=regional.run(browser,args.runtime,url,region,int(n),int(w),'candidate',30,True,radius)
                t=result['target'];trace=result['trace']
                receipt.append(dict(radius=radius,region=region,count=int(n),width=int(w),key=t['key'],fromScreen=t['from'],
                    originalGoal=t['originalGoal'],goal=t['goal'],clearance=t['clearance'],actualTap=result['tap'],
                    trusted=result['trusted'],dragPath=trace.get('dragPath',[]),dragHops=trace['sourceHops'].get('drag',0),commands=trace['commands'],
                    terrain=trace['terrain'],speed=trace['speed'],occlusion=trace['occlusion'],
                    contact=trace['contact'],errors=result['errors']))
            (args.out/(case.replace(',','-')+'.json')).write_text(json.dumps(receipt,indent=2)+'\n')
            print(case,[(r['radius'],r['clearance']['clear'],r['dragHops']) for r in receipt],flush=True)


if __name__=='__main__':
    main()
