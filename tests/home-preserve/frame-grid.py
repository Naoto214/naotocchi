"""Record a brief, paired real-WebKit frame window for each household and phone width."""
import argparse
import json
from pathlib import Path
import subprocess

from playwright.sync_api import sync_playwright

from performance import serve, trial

REGIONS = 'home forest river_lake city countryside mountain snow sea jungle desert deepsea star_stop memory_lake'.split()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    for key in ['production','candidate','seed','output']:
        p.add_argument(key,type=Path)
    p.add_argument('--region',required=True,choices=REGIONS)
    p.add_argument('--seconds',type=int,default=3)
    p.add_argument('--counts',type=int,nargs='+',default=[1,4,10,20,28])
    p.add_argument('--widths',type=int,nargs='+',default=[320,375,390,430])
    p.add_argument('--executable')
    args=p.parse_args()
    roots={'production':args.production,'candidate':args.candidate}
    servers={arm:serve(root) for arm,root in roots.items()}
    def rev(root):return subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD'],text=True).strip()
    data={'seconds':args.seconds,'seed':214,'DPR':2,'revisions':{a:rev(root) for a,root in roots.items()},'rows':[]}
    try:
        with sync_playwright() as pw:
            browser=pw.webkit.launch(executable_path=args.executable)
            data['webkit']=browser.version
            for i,n in enumerate(args.counts):
                save=subprocess.check_output(['node',str(args.seed),args.region,str(n)],text=True)
                for j,w in enumerate(args.widths):
                    arms=list(roots)
                    if (REGIONS.index(args.region)+i+j)%2:arms.reverse()
                    pair={'region':args.region,'count':n,'width':w,'order':arms,'arms':{}}
                    for arm in arms:
                        result=trial(browser,servers[arm],roots[arm],save,args.region,n,args.seconds,frame_grid=True,width=w)
                        assert not result['errors'] and result['elapsed']>=args.seconds*1000 and result['metrics']['render']['n']>0, result
                        pair['arms'][arm]=result
                    data['rows'].append(pair)
                    args.output.write_text(json.dumps(data,separators=(',',':'))+'\n')
                    print(args.region,n,w,[pair['arms'][a]['metrics']['frame']['n'] for a in arms],flush=True)
            browser.close()
    finally:
        for server in servers.values():server.shutdown()


if __name__=='__main__':main()
