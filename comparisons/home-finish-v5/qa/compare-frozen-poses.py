"""Repeat selected cold-load/resize sequences and separate foot, size and equipment differences."""
import argparse
import json
import os
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from regression_grid import HEIGHTS, measure, record

WIDTHS=[375,320,390,430]


def compare(a,b):
    columns={'nativeFeet':(5,6),'modelSize':(7,8),'depth':(9,),'projectedFeet':(10,11),'paintedImageBox':(12,13,14,15)}
    result={}
    for name,indices in columns.items():
        result[name]=round(max(abs(x[i]-y[i]) for x,y in zip(a['rows'],b['rows']) for i in indices),10)
    assert [g[0] for g in a['equipment']]==[g[0] for g in b['equipment']]
    result['equipmentBox']=round(max(abs(x[i]-y[i]) for x,y in zip(a['equipment'],b['equipment']) for i in (1,2,3,4)),10)
    return result


def run(args):
    results=[]
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),
            args=['--disable-dev-shm-usage','--disable-renderer-backgrounding'])
        for text in args.cases:
            region,count=text.split(',')
            count=int(count)
            old=measure(b,args.url,region,count,WIDTHS,False)
            new=measure(b,args.url,region,count,WIDTHS,True)
            controls={}
            if args.within_version:
                controls['v4']=measure(b,args.url,region,count,WIDTHS,False)
                controls['finish']=measure(b,args.url,region,count,WIDTHS,True)
            for w in WIDTHS:
                case={'region':region,'count':count,'width':w,'height':HEIGHTS[w]}
                record(case,old[w],new[w])
                result={**case,'maximumAbsoluteDelta':compare(old[w],new[w])}
                if controls:
                    result['V4Repeat']=compare(old[w],controls['v4'][w])
                    result['finishRepeat']=compare(new[w],controls['finish'][w])
                    result['crossVersionRepeat']=compare(controls['v4'][w],controls['finish'][w])
                results.append(result)
            print(region,count,results[-1]['maximumAbsoluteDelta'],flush=True)
        payload={'browser':b.version,'sameWidthOrderAsMatrix':True,'pairedReplays':results}
        args.out.write_text(json.dumps(payload,indent=2)+'\n')
        b.close()


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('url')
    p.add_argument('--cases',nargs='+',required=True,help='REGION,COUNT for each independent pair')
    p.add_argument('--within-version',action='store_true',help='Repeat the full V4-only and V5-only sequences')
    p.add_argument('--out',type=Path,required=True)
    run(p.parse_args())
