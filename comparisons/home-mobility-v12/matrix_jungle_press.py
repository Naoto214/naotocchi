"""Test cage for a delayed receiver refresh, using two genuine archived native jungle households."""
import argparse
import gzip
import json
from pathlib import Path
from unittest.mock import patch
import zipfile
import matrix_worker_v12 as matrix

old,prior=matrix.old,matrix.prior


def cell(path):
    with zipfile.ZipFile(path) as z:
        return json.loads(gzip.decompress(z.read('jungle-10-320.json.gz')))


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--url',required=True);p.add_argument('--donor',type=Path,required=True)
    p.add_argument('--other',type=Path,required=True);p.add_argument('--out',type=Path,required=True)
    args=p.parse_args();native=cell(args.donor);donor=native['shared'][matrix.REFERENCE];wrong=cell(args.other)['shared'][matrix.REFERENCE]
    age=native['arms'][matrix.REFERENCE]['aged'];old.require(donor['input']['foot']!=wrong['input']['foot'],'need distinct native feet')
    result={'validFoot':donor['input']['foot'],'otherRecordedFoot':wrong['input']['foot'],'cases':[]}
    with old.sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--disable-dev-shm-usage'])
        with patch.object(prior,'instrument',matrix.instrument),patch.object(old.legacy,'trial',matrix.observe_gesture):
            for mode in ('normal','one-delayed-refresh','persistent-wrong-home'):
                with prior.native_page(browser,args.url,('jungle',10,320),'v12',False) as (page,touch,_):
                    # Deliberately restore a second, real native 300s household for
                    # one prepare (or persistently) to challenge the observing code.
                    if mode!='normal':
                        page.evaluate("""({state,max})=>{
                          const q=touchQA,original=q.prepare;let attempts=0;
                          q.prepare=function(...args){
                            if(attempts++>=max)return original.apply(this,args);
                            const restore=q.restore;
                            q.restore=()=>{q.matrixLoad(state);q.paint();};
                            try{return original.apply(this,args);}finally{q.restore=restore;}
                          };
                        }""",{'state':wrong['snapshot'],'max':1 if mode=='one-delayed-refresh' else 200})
                    page.evaluate("""()=>{touchQA.testTouchDown=0;addEventListener('pointerdown',e=>{
                      if(e.isTrusted&&e.pointerType==='touch')touchQA.testTouchDown++;
                    },true);}""")
                    page.evaluate(matrix.CHECK_DONOR_BEFORE_TOUCH,{'opening':donor['opening'],'seed':donor['snapshot']['seed']})
                    errors=None;row=None
                    try:
                        row=prior.baseline.shared_drop(page,touch,age['index'],donor['snapshot'],age['drag'],donor['opening'])
                    except Exception as e:
                        if mode!='persistent-wrong-home' or 'Receiving household could not restore' not in str(e):raise
                        errors='receiver-foot-mismatch'
                    counts=page.evaluate("()=>({attempts:touchQA.beforePressResyncs.length,pointers:touchQA.testTouchDown})")
                    if mode=='persistent-wrong-home':
                        old.require(not row and counts['pointers']==0 and counts['attempts']==3,'mismatch allowed a physical input')
                    else:
                        old.require(counts['pointers']==1 and not prior.baseline.same_input(row,donor['input']),'delivered a different physical gesture')
                        old.require(counts['attempts']==(1 if mode=='one-delayed-refresh' else 0),'unexpected receiver refresh')
                    result['cases'].append({'mode':mode,**counts,'error':errors,'trusted':bool(row and row['trusted']),
                                            'foot':row['foot'] if row else None,'countsAsArrival':bool(row and row['terminalArrived'])})
        result['browser']=browser.version;browser.close()
    args.out.write_text(json.dumps(result,indent=2)+'\n');print([(c['mode'],c['pointers'],c['attempts']) for c in result['cases']])


if __name__=='__main__':main()
