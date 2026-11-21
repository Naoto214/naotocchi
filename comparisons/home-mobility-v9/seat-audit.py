"""Audit the native opening in Chromium. Install Python playwright and provide Chromium.

python seat-audit.py --base http://127.0.0.1:8369 --write
The base must serve both built V9 arms and their pinned #578 assets.
"""
import argparse
import csv
import hashlib
import json
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
BEFORE = '      if(arrange){clearRelief();'
BRIDGE = '        sync(rows,scene);\n        controller.repaint();'
BRIDGE_SEATS = BRIDGE.replace('rows,scene', 'rows,{...scene,compareFreshSeats:true}')
PROBE = r'''
    if(next.auditFreshOpening===true) window.seatAudit = () => {
      const nav=scene.navigation, s=nav.intentScale;
      const distances=[3,8,16], sectors=48;
      const rows=actors.map(a=>{
        const box=bounds(a,scene), ink=scene.planVisibility?.(a)||(p=>visible(a,p));
        const onScreen=p=>p.x>=box.left&&p.x<=box.right&&p.y>=box.top&&p.y<=box.bottom;
        const onGround=p=>onScreen(p)&&nav.segmentSafe(a,p,ink);
        const peers=actors.filter(b=>b!==a), contact=peers.filter(b=>!separated(a,a,b));
        const statistics=distances.map(d=>{
          let available=0,terrain=0;const headings=[];
          for(let i=0;i<sectors;i++){
            const t=2*Math.PI*i/sectors,end={x:a.x+Math.cos(t)*d/s.x,y:a.y+Math.sin(t)*d/s.y};
            if(!onGround(end))continue;
            terrain++;
            if(peers.every(b=>contactSegmentSafe(a,end,b,(a.w+b.w)*.5+10,(a.h+b.h)*.38+10))){available++;headings.push(i*360/sectors);}
          }
          return {d,available,terrain,headings};
        });
        return {key:a.key,kind:a.kind,x:a.x,y:a.y,w:a.w,h:a.h,
          bounds:box,edgeCss:Math.min((a.x-box.left)*s.x,(box.right-a.x)*s.x,(a.y-box.top)*s.y,(box.bottom-a.y)*s.y),
          inside:onScreen(a)&&nav.valid(a)&&ink(a),contacts:contact.map(b=>[b.key,clearance(a,a,b)]),statistics};
      });return {scale:s,rows,corridor:exit};
    };
'''


def seed_order(seed, seats):
    return '''const ordered=rows.slice();let state=%d;
        if(state!==0){for(let i=ordered.length-1;i>2;i--){state=(Math.imul(1664525,state)+1013904223)>>>0;const j=2+Math.floor(state/4294967296*(i-1));[ordered[i],ordered[j]]=[ordered[j],ordered[i]];}}
        sync(ordered,{...scene,auditFreshOpening:true%s});\n        controller.repaint();''' % (seed, ',compareFreshSeats:true' if seats else '')


def run(p, args, arm, arrangement):
    browser=p.chromium.launch(executable_path=args.chromium,args=['--disable-background-timer-throttling','--disable-renderer-backgrounding'])
    try:
        page=browser.new_page(viewport={'width':390,'height':792},device_scale_factor=2,is_mobile=True,has_touch=True,timezone_id='Asia/Tokyo',locale='ja-JP')
        page.add_init_script("""const now=Date;const elapsed=Date.UTC(2026,9,15,3)-now.now();window.Date=new Proxy(now,{construct(t,a,n){return Reflect.construct(t,a.length?a:[now.now()+elapsed],n)},apply(){return new now(now.now()+elapsed).toString()},get(t,k,r){return k==='now'?()=>now.now()+elapsed:Reflect.get(t,k,r)}});let seed=214;Math.random=()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/4294967296);""")
        game_arm='v9-seats' if arm=='comparison' else 'v9'
        hashes={}
        def model(route):
            response=route.fetch();src=response.text();hashes['model']=hashlib.sha256(src.encode()).hexdigest()
            assert src.count(BEFORE)==1
            sample=PROBE
            if args.measure_startup and arm=='comparison':
                marker='      if (!consideredFreshSeats && next.compareFreshSeats'
                assert src.count(marker)==1
                src=src.replace(marker, '      const seatAuditStart=performance.now();\n'+marker)
                sample='    if(next.compareFreshSeats)window.seatOpeningCost=performance.now()-seatAuditStart;\n'+sample
            route.fulfill(response=response,body=src.replace(BEFORE,sample+BEFORE))
        def bridge(route):
            response=route.fetch();src=response.text();anchor=BRIDGE_SEATS if arm=='comparison' else BRIDGE
            assert src.count(anchor)==1
            hashes['bridge']=hashlib.sha256(src.encode()).hexdigest()
            route.fulfill(response=response,body=src.replace(anchor,seed_order(arrangement,arm=='comparison')))
        page.route('**/home-production-model-mobility-'+game_arm+'.js*',model)
        page.route('**/drag-trial-hooks*.js*',bridge)
        query=urlencode(dict(region='forest',count=28,paused=1,clock=0,paired=1,compareSplit=0,ground='on',variant='B',time='day',season='autumn',weather='sunny',waitForPainting=1))
        page.goto(args.base.rstrip('/')+'/game/mobility-'+game_arm+'.html?'+query,wait_until='domcontentloaded',timeout=120000)
        page.wait_for_function('window.HomeCastTrial?.ready && window.HomeDragTrial?.opening()',timeout=120000)
        result=page.evaluate('seatAudit()');result['chromium']=browser.version;result['hashes']=hashes
        if args.measure_startup and arm=='comparison':result['openingCostMs']=page.evaluate('seatOpeningCost')
        return result
    finally:
        browser.close()


def compare(old,new):
    sx,sy=old['scale']['x'],old['scale']['y'];assert old['scale']==new['scale']
    before={a['key']:a for a in old['rows']};rows=[]
    for a in new['rows']:
        b=before[a['key']];dx=(a['x']-b['x'])*sx;dy=(a['y']-b['y'])*sy
        row={'key':a['key'],'role':a['kind'],'w':round(a['w'],3),'h':round(a['h'],3),'xBefore':round(b['x'],4),'yBefore':round(b['y'],4),'xAfter':round(a['x'],4),'yAfter':round(a['y'],4),'displacementCss':round((dx*dx+dy*dy)**.5,3)}
        for label,seat in [('Before',b),('After',a)]:
            row['valid'+label]=seat['inside'];row['boundsMarginCss'+label]=round(seat['edgeCss'],3)
            row['contacts'+label]=','.join(x[0] for x in seat['contacts'])
            for r in seat['statistics']:
                row['exits'+str(r['d'])+label]=r['available'];row['terrain'+str(r['d'])+label]=r['terrain']
        before_contacts=dict(b['contacts']);after_contacts=dict(a['contacts']);assert after_contacts.keys()<=before_contacts.keys()
        assert all(gap>=before_contacts[key]-1e-8 for key,gap in after_contacts.items())
        rows.append(row)
    return rows


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--base',required=True);parser.add_argument('--chromium',default='/usr/bin/chromium');parser.add_argument('--write',action='store_true');parser.add_argument('--measure-startup',action='store_true');parser.add_argument('--arrangements',type=int,nargs='+',default=[0,937,2129]);args=parser.parse_args()
    output=[];summary=[]
    with sync_playwright() as p:
        for seed in args.arrangements:
            baseline=run(p,args,'reference',seed)
            candidate=run(p,args,'comparison',seed)
            pair=compare(baseline,candidate);output += [{'arrangement':seed,**row} for row in pair]
            print('arrangement',seed,'changed',sum(r['displacementCss']>.001 for r in pair),'max',max(r['displacementCss'] for r in pair),'8px',[(stage,sum(r['exits8'+stage]>0 for r in pair)) for stage in ('Before','After')],flush=True)
            summary.append({'arrangement':seed,'baseline':baseline['hashes'],'candidate':candidate['hashes'],'browser':baseline['chromium'],
                            'before8':sum(r['exits8Before']>0 for r in pair),'after8':sum(r['exits8After']>0 for r in pair),
                            'changed':sum(r['displacementCss']>0 for r in pair),'largestDisplacementCss':max(r['displacementCss'] for r in pair)})
            if args.measure_startup:print('Initial seats scoring (ms)',candidate['openingCostMs'],flush=True)
            if args.write and seed==0:
                (HERE/'evidence'/'forest-initial-corridor.json').write_text(json.dumps(baseline['corridor'],separators=(',',':'))+'\n')
            # The comparison has one chance to score new seats. Every final body must be legal.
            assert all(r['validAfter'] and r['displacementCss']<=16.001 for r in pair)
            assert all(r['role']!='pet' or r['displacementCss']==0 for r in pair)
            assert all(not r[f'exits{d}Before'] or r[f'exits{d}After'] for r in pair for d in (3,8,16))
            if seed==0: assert sum(r['exits8After']>0 for r in pair)>sum(r['exits8Before']>0 for r in pair),'a previously enclosed resident should gain a normal exit'
    filename=HERE/'evidence'/'forest-initial-seats.csv'
    if args.write:
        (HERE/'evidence'/'forest-initial-seats.json').write_text(json.dumps(summary,indent=2)+'\n')
        with filename.open('w',newline='') as file:
            writer=csv.DictWriter(file,fieldnames=output[0]);writer.writeheader();writer.writerows(output)

if __name__=='__main__':main()
