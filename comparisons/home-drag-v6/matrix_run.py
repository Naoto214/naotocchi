"""Collect independent paired native touch cells, checkpointing only comparable real observations."""
import argparse
from datetime import datetime,timezone
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import subprocess
import tempfile
from time import monotonic
from urllib.request import urlopen

from playwright.sync_api import Error as BrowserError, sync_playwright

from matrix_contract import COUNTS, REGIONS, WIDTHS, validate_cell

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]


def utc():
    return datetime.now(timezone.utc).isoformat()


def write_json(path,data):
    temp=path.with_suffix('.tmp')
    temp.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'),allow_nan=False)+'\n')
    temp.replace(path)


def signature(origin):
    tracked={}
    for path in HERE.rglob('*'):
        if path.is_file() and not any(x in path.parts for x in ('evidence','__pycache__')) and (
                path.suffix in ('.js','.cjs','.mjs','.patch','.css','.html','.json') or
                path.suffix=='.py' and path.name not in ('matrix_report.py',)):
            tracked[str(path.relative_to(HERE))]=hashlib.sha256(path.read_bytes()).hexdigest()
    entries={}
    for arm in ('v5','v6'):
        with urlopen(origin+'/game/drag-'+arm+'.html',timeout=30) as response:
            assert response.status==200
            entries[arm]=hashlib.sha256(response.read()).hexdigest()
    return {'git':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
            'entrySHA256':entries,'harnessAndSourceSHA256':tracked,
            'playwright':importlib.metadata.version('playwright')}


def collect(args):
    from measure_input import run_cell
    out=args.out
    out.mkdir(parents=True,exist_ok=True)
    context=signature(args.url)
    start=utc()
    manifest_path=out/'region.json'
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),
            args=['--disable-dev-shm-usage','--disable-background-timer-throttling',
                  '--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'])
        try:
            identity={**context,'browser':browser.version,'region':args.region}
            old=json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
            if old and old.get('runIdentity')!=identity:
                raise ValueError('Existing results have a different source, entry or browser; use a fresh output directory')
            manifest={'runIdentity':identity,'startedAt':old.get('startedAt',start),'cells':old.get('cells',{}),'retryLog':old.get('retryLog',[])}
            for count in args.counts:
                for width in args.widths:
                    key=f'{count}-{width}'
                    name=f'{args.region}-{count}-{width}-matrix.json'
                    target=out/name
                    if target.exists() and key in manifest['cells']:
                        data=target.read_bytes()
                        check=manifest['cells'].get(key,{})
                        if check.get('rawSHA256')!=hashlib.sha256(data).hexdigest():
                            raise ValueError(f'{key} checkpoint lacks a verified digest')
                        validate_cell(json.loads(data),args.region,count,width)
                        continue
                    started=monotonic()
                    for attempt in range(2):
                        try:
                            with tempfile.TemporaryDirectory(prefix='v6-touch-cell-') as scratch:
                                result=run_cell(browser,args.url,args.region,count,width,Path(scratch))
                                captured=Path(scratch)/name
                                data=captured.read_bytes()
                                observed=json.loads(data)
                                if observed!=result:
                                    raise ValueError('Returned native cell differs from its numeric file')
                                try:
                                    validate_cell(observed,args.region,count,width)
                                except (KeyError,TypeError,ValueError) as exc:
                                    (out/(name+'.invalid')).write_bytes(data)
                                    manifest['failedCell']={'count':count,'width':width,'error':str(exc),'at':utc()}
                                    write_json(manifest_path,manifest)
                                    raise
                                temp=target.with_suffix('.tmp')
                                temp.write_bytes(data)
                                temp.replace(target)
                            break
                        except BrowserError as exc:
                            if attempt or not browser.is_connected():
                                raise
                            manifest['retryLog'].append({'count':count,'width':width,'at':utc(),'error':str(exc)[:800]})
                            write_json(manifest_path,manifest)
                    manifest['cells'][key]={'count':count,'width':width,'file':name,
                        'rawSHA256':hashlib.sha256(data).hexdigest(),'elapsedSec':round(monotonic()-started,3)}
                    manifest['updatedAt']=utc()
                    write_json(manifest_path,manifest)
                    print(args.region,count,width,'paired',len(manifest['cells']),'cells',flush=True)
            manifest['complete']=all(f'{n}-{w}' in manifest['cells'] for n in COUNTS for w in WIDTHS)
            write_json(manifest_path,manifest)
        finally:
            browser.close()


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--url',required=True)
    p.add_argument('--region',required=True,choices=REGIONS)
    p.add_argument('--counts',nargs='+',type=int,choices=COUNTS,default=COUNTS)
    p.add_argument('--widths',nargs='+',type=int,choices=WIDTHS,default=WIDTHS)
    p.add_argument('--out',type=Path,required=True)
    a=p.parse_args()
    a.url=a.url.rstrip('/')
    collect(a)
