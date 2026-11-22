"""Compare the native planner and separately its curved iterator at the same 375px forest feet."""
import argparse
import hashlib
import json
import os
import re
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
INITIAL = json.loads((HERE / 'evidence/yield-recording.json').read_text())
QUERY = dict(region='forest',time='day',count=28,paused=1,clock=0,ground='on',paired=1,
             variant='B',season='autumn',weather='sunny')


def run(args):
    probe = (HERE / 'curve-probe.js').read_text()
    # Include scheduler time separately. The native resume durations exclude all
    # the time between resumptions and the physical replay of the returned route.
    timed_resume=r'\.next\(\);times\.push\(performance\.now\(\)-\w+\);'
    assert len(re.findall(timed_resume,probe))==1
    probe=re.sub(timed_resume,lambda m:m[0]+"globalThis.perfCandidateSteps.push(times[times.length-1]);",probe)
    data = {'kind': 'chromium' if args.chromium else 'webkit', 'width':375, 'source':INITIAL['source'], 'rows':[]}
    arms = ['v10', 'v11-foot'] if args.controls else ['v10','v11-foot','v12']
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=args.chromium) if args.chromium else pw.webkit.launch(executable_path=os.getenv('WEBKIT_PATH'))
        data['browser'] = browser.version
        try:
            for order,sequence in [('forward',arms),('reverse',arms[::-1])]:
                for arm in sequence:
                    page = browser.new_page(viewport={'width':375,'height':792},device_scale_factor=2,is_mobile=True,has_touch=True)
                    hashes,errors={},[]
                    page.on('pageerror',lambda e:errors.append(str(e)))
                    def attach(route):
                        response=route.fetch(); source=response.text()
                        digest=hashlib.sha256(source.encode()).hexdigest()
                        hashes[route.request.url.split('/')[-1].split('?')[0]]=digest
                        marker='function sync(list,next){'
                        assert source.count(marker)==1
                        route.fulfill(response=response,body=source.replace(marker,marker+probe))
                    try:
                        page.route('**/*production-model*.js*',attach)
                        page.goto(args.base+'/mobility-'+arm+'-reference.html?'+urlencode(QUERY),wait_until='domcontentloaded',timeout=120000)
                        page.wait_for_function('window.HomeCastTrial?.ready && window.HomeDragTrial?.opening() && !!window.curveProbe',timeout=120000)
                        for mode in (['native','isolated'] if arm=='v12' else ['native']):
                            for angle in (101.25,105,288.75):
                                row=page.evaluate('''([feet,key,angle,mode])=>{
                                  globalThis.perfCandidateSteps=[];
                                  const start=performance.now(),answer=curveProbe(feet,key,angle,mode);
                                  return {...answer,elapsedWithReplay:performance.now()-start,resumes:globalThis.perfCandidateSteps};
                                }''',[INITIAL['feet'],INITIAL['key'],angle,mode]);
                                assert len(row['resumes'])==row['iters'] and not row.get('violations',0) and not errors
                                data['rows'].append({'arm':arm,'order':order,'mode':mode,'angle':angle,'sources':dict(hashes),**row})
                                args.out.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
                                print(order,arm,mode,angle,row['found'],row['iters'],row['total'],row['max'],flush=True)
                    finally:
                        page.close()
        finally:
            browser.close()


if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--base',default='http://127.0.0.1:8377/game')
    ap.add_argument('--out',type=Path,required=True)
    ap.add_argument('--chromium',help='Local smoke check')
    ap.add_argument('--controls',action='store_true')
    run(ap.parse_args())
