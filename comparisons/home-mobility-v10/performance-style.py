"""Audit the resident DOM and Chromium's real style/paint/layer events on active clips."""
import argparse,os,time
from pathlib import Path
from playwright.sync_api import sync_playwright
from performance_common import HERE,clock,load,native_page,save
fixed=load('v10_fixed',HERE/'performance-fixed.py')

def run(args):
    painters,hashes=fixed.painters(args.base,guard=True)
    script=(HERE/'performance-fixed.js').read_text().replace('PAINTERS',painters)
    def insert(name,src):return clock.replace(src,'    function stop(){',script+'\n    function stop(){') if 'production-diorama' in name else src
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH'));p,errors,_=native_page(b,args.base,'v9',transform=insert,init=fixed.HOLD)
        info=p.evaluate('a=>{const r=fixedCast.capture(a);return {clips:r.clips,sourceSeconds:r.sourceSeconds}}',dict(seed=214,clips=10,scan=args.scan,size=16))
        sess=p.context.new_cdp_session(p);sess.send('Performance.enable');p.expose_function('markSampling',lambda _:None)
        p.evaluate('''()=>{new MutationObserver(records=>{for(const r of records){const n=r.attributeName||'childList';
          window.writes[n]=(window.writes[n]||0)+1;}}).observe(document.getElementById('castStage'),{subtree:true,attributes:true,childList:true});window.writes={};}''');events=[]
        sess.on('Tracing.dataCollected',lambda msg:events.extend(msg['value']))
        def metrics():return {r['name']:r['value'] for r in sess.send('Performance.getMetrics')['metrics'] if r['name'] in ('LayoutCount','LayoutDuration','RecalcStyleCount','RecalcStyleDuration')}
        result=dict(browser=b.version,controllers=hashes,fixture=info,rows=[])
        for arm in args.order.split(','):
            events.clear();p.evaluate('window.writes={}');sess.send('Tracing.start',{'categories':'devtools.timeline,disabled-by-default-devtools.timeline.layers,disabled-by-default-devtools.timeline.frame','transferMode':'ReportEvents'})
            before=metrics();row=p.evaluate('arm=>fixedCast.run(arm,16)',arm);after=metrics()
            done=[];sess.once('Tracing.tracingComplete',lambda _:done.append(True));sess.send('Tracing.end');limit=time.monotonic()+60
            while not done and time.monotonic()<limit:p.wait_for_timeout(20)
            assert done and not errors;phases={};clips=[]
            for e in events:
                if e.get('ph')!='X' or e['name'] not in ('UpdateLayoutTree','Layout','Paint','PrePaint','RasterTask','Layerize','CompositeLayers'):continue
                label=e['name'];phase=phases.setdefault(label,dict(calls=0,ms=0));phase['calls']+=1;phase['ms']+=e.get('dur',0)/1000
                points=e.get('args',{}).get('data',{}).get('clip')
                if label=='Paint' and points and len(points)==8:clips.append(abs(sum(points[2*i]*points[(2*i+3)%8]-points[(2*i+2)%8]*points[2*i+1] for i in range(4)))/2)
            result['rows'].append(dict(arm=arm,metrics={k:after[k]-before[k] for k in before},phases=phases,paintClips=clips,writes=p.evaluate('window.writes'),frames=len(row['intervals'])));save(args.out,result)
        b.close()
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--base',default='http://127.0.0.1:8377/game');p.add_argument('--out',type=Path,required=True);p.add_argument('--order',default='v8,v9,guarded,v10,v10,guarded,v9,v8');p.add_argument('--scan',type=int,default=500);run(p.parse_args())
