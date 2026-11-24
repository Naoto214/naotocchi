"""Capture one real seeded trial per distinct opening-hint array. Widths with identical hints reuse fixed results."""
import argparse
import json
import hashlib
import subprocess
from pathlib import Path
from types import SimpleNamespace
from geometry_collect import BASE,REGIONS,HEIGHTS,collect


def modes(game,hints=False):
    command=['node',str(BASE/'geometry_seat_modes.cjs'),str((game/'limit-seating.js').resolve())]
    if hints:command.append('--hints')
    raw=subprocess.check_output(command)
    return json.loads(raw)


def main(a):
    table=modes(a.game)
    expected=modes(a.game,hints=True)
    failed=[]
    a.out.mkdir(parents=True,exist_ok=True)
    (a.out/'modes.json').write_text(json.dumps(table,separators=(',',':'))+'\n')
    for count in a.counts:
        for w in a.widths:
            for extra in (5,10,15,20):
                regions=[r for r in a.regions if extra in table[f'{w}-{r}-{count}'].values()]
                if not regions:continue
                dest=a.out/str(extra)
                for r in regions:
                    fn=dest/f'{w}-{r}-{count}.json'
                    if fn.exists() and json.loads(fn.read_text()).get('hints')!=expected[f'{w}-{r}-{count}'][str(extra)]:
                        old=hashlib.sha256(fn.read_bytes()).hexdigest()[:12]
                        archive=a.out/'superseded'/old
                        archive.mkdir(exist_ok=True,parents=True);fn.rename(archive/fn.name)
                collect(SimpleNamespace(url=a.url,out=dest,counts=[count],regions=regions,widths=[w],layout='optimized',extra=extra,all_phases=a.all_phases))
                for r in regions:
                    fn=dest/f'{w}-{r}-{count}.json'
                    if not fn.exists() or 'moved' not in json.loads(fn.read_text()) or json.loads(fn.read_text()).get('hints')!=expected[f'{w}-{r}-{count}'][str(extra)]:
                        failed.append(str(fn))
    if failed:raise RuntimeError('Missing matching native openings: '+', '.join(failed))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('url');p.add_argument('game',type=Path);p.add_argument('out',type=Path)
    p.add_argument('--all-phases',action='store_true')
    p.add_argument('--regions',nargs='+',default=REGIONS);p.add_argument('--widths',nargs='+',type=int,default=list(HEIGHTS));p.add_argument('--counts',nargs='+',type=int,default=[28,20,10,4,1]);main(p.parse_args())
