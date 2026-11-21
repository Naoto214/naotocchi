"""Measure per-resident native safe bearings, contacts, visibility and corridor in a fresh forest."""
import argparse
import csv
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

from forest_layout import fixture_script, forest_url

HERE=Path(__file__).resolve().parent
seed_spec = importlib.util.spec_from_file_location('forest_seat_seed', HERE.parent / 'home-mobility-v8' / 'forest_observe.py')
seed_module=importlib.util.module_from_spec(seed_spec)
seed_spec.loader.exec_module(seed_module)
PROBE="""
    if(next.auditDirectionOpening)globalThis.seatSurvey=({sectors,distances,adjust})=>{
      const nav=scene.navigation,s=nav.intentScale;
      const list=actors.map(a=>({...a}));
      if(adjust){
        const a=list[adjust.slot];
        a.x+=adjust.dx/s.x;a.y+=adjust.dy/s.y;
      }
      const unit=Array.from({length:sectors},(_,i)=>[Math.cos(2*Math.PI*i/sectors)/s.x,Math.sin(2*Math.PI*i/sectors)/s.y]);
      const boundsFor=a=>bounds(a,scene);
      const inkFor=a=>scene.planVisibility?.(a)||(p=>visible(a,p));
      const residents=list.map(a=>{
        const box=boundsFor(a), ink=inkFor(a);
        const inside=p=>p.x>=box.left&&p.x<=box.right&&p.y>=box.top&&p.y<=box.bottom;
        const peers=list.filter(b=>a!==b).map(b=>({b,rx:(a.w+b.w)*.5+10,ry:(a.h+b.h)*.38+10,prior:clearance(a,a,b)}));
        // Incorporate the planner's swept ellipse and the strict first native foot increment.
        const headings=distances.map(d=>{
          const possible=[];
          for(let n=0;n<unit.length;n++) {
            const [u,v]=unit[n], dx=u*d,dy=v*d, to={x:a.x+dx,y:a.y+dy};
            if(!inside(to))continue;
            const f=Math.min(1,.35/Math.hypot(dx,dy)),first={x:a.x+dx*f,y:a.y+dy*f};
            if(peers.every(({b,rx,ry,prior})=>contactSegmentSafe(a,to,b,rx,ry)&&
                (prior>=1||clearance(a,first,b)>=1||clearance(a,first,b)>prior+1e-6))&&nav.segmentSafe(a,to,ink))possible.push(n);
          }
          return possible;
        });
        return {key:a.key,kind:a.kind,x:a.x,y:a.y,w:a.w,h:a.h,headings,ground:nav.valid(a),inside:inside(a),ink:ink(a),
          contacts:peers.filter(b=>b.prior<1).map(({b,prior})=>[b.key,prior])};
      });
      return {scale:s,residents,corridor:exit};
    };
"""


def capture(browser,args,arm,width,order,seed,adjust=None):
    ctx=browser.new_context(viewport={'width':width,'height':792},device_scale_factor=2,is_mobile=True,
                            has_touch=True,timezone_id='Asia/Tokyo',locale='ja-JP')
    try:
        ctx.add_init_script(seed_module.SEED.replace('let seed=214;',f'let seed={seed};'))
        page=ctx.new_page()
        errors=[];sources={}
        def instrument(route):
            resp=route.fetch()
            source=resp.text()
            name=Path(route.request.url.split('?')[0]).name
            sources[name]=hashlib.sha256(source.encode()).hexdigest()
            if 'production-model' in name:
                anchor='      if(arrange){clearRelief();'
                assert source.count(anchor)==1
                result=source.replace(anchor,PROBE+anchor)
            elif name=='fixture.js':
                result=fixture_script(source,order,seed)
            elif 'drag-trial-hooks' in name:
                anchor='let seed = 214;'
                assert source.count(anchor)==1
                result=source.replace(anchor,f'let seed = {seed};')
                fixed='        sync(rows,scene);\n        controller.repaint();'
                marked='        sync(rows,{...scene,compareFreshSeats:true});\n        controller.repaint();'
                seat=source.count(marked)==1
                match=marked if seat else fixed
                assert source.count(match)==1
                result=result.replace(match,match.replace('rows,{...scene,','rows,{...scene,auditDirectionOpening:true,') if seat else match.replace('rows,scene','rows,{...scene,auditDirectionOpening:true}'))
            else:
                anchor='let actorSeed=214;'
                assert source.count(anchor)==1
                result=source.replace(anchor,f'let actorSeed={seed};')
            route.fulfill(response=resp,body=result)
        for pattern in ('*production-model*.js*','drag-trial-hooks*.js*','beauty/fixture.js*','population-beauty.js*'):
            ctx.route('**/'+pattern,instrument)
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(forest_url(args.url,arm),wait_until='domcontentloaded',timeout=120000)
        page.wait_for_function('window.HomeCastTrial?.ready && HomeDragTrial.opening() && typeof seatSurvey==="function"', timeout=120000)
        actual=page.evaluate('HomeDragTrial.opening()')
        data=page.evaluate('p=>seatSurvey(p)',dict(sectors=args.sectors,distances=args.distances,adjust=adjust))
        assert len(data['residents'])==len(actual['actors'])==28 and actual['width']==width and len(sources)==4 and not errors
        return dict(**data,sources=sources,opening=actual,browser=browser.version)
    finally:
        ctx.close()


def compare(args,a,b,width,order,seed):
    assert a['scale']==b['scale']
    rows=[]
    for left,right in zip(a['residents'],b['residents']):
        assert all(left[k]==right[k] for k in ('key','kind','w','h'))
        assert all(right[k] for k in ('ground','ink','inside'))
        before,after=dict(left['contacts']),dict(right['contacts'])
        worsened=[k for k,v in after.items() if k not in before or v<before[k]-1e-8]
        assert not worsened
        shift=sum(((right[k]-left[k])*a['scale'][k])**2 for k in ('x','y'))**.5
        row=dict(width=width,order=order,seed=seed,key=left['key'],role=left['kind'],bodyW=left['w'],bodyH=left['h'],
                 xCSSChange=(right['x']-left['x'])*a['scale']['x'],yCSSChange=(right['y']-left['y'])*a['scale']['y'],
                 displacementCSS=shift,oldContactPeers=' '.join(before),newContactPeers=' '.join(after),worsenedContacts=len(worsened))
        for d,base,final in zip(args.distances,left['headings'],right['headings']):
            old,new=set(base),set(final)
            def degrees(indices):
                return ' '.join(f'{n*360/args.sectors:g}' for n in sorted(indices))
            rows.append(dict(**row,rangeCSS=d,before=degrees(old),after=degrees(new),
                             lost=degrees(old-new),gained=degrees(new-old),lostCount=len(old-new),gainedCount=len(new-old)))
    return rows


def run(args):
    out=args.out
    out.mkdir(parents=True,exist_ok=True)
    cases=[(w,order,seed) for w in args.widths for order,seed in ((0,214),(937,937))]
    if 390 in args.widths:
        cases.extend([(390,0,937),(390,937,214)])
    if args.squirrel:
        cases=[(375,0,214)]
    rows=[];metadata=[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=args.chromium)
        try:
            for width,order,seed in cases:
                left=capture(browser,args,args.baseline,width,order,seed)
                adjustment=None
                if args.squirrel:
                    slot=next(i for i,a in enumerate(left['residents']) if a['key']=='companion:squirrel')
                    adjustment=dict(slot=slot,dx=1,dy=0)
                right=capture(browser,args,args.candidate,width,order,seed,adjustment)
                batch=compare(args,left,right,width,order,seed)
                by_key={r['key']:r for r in batch}
                item=dict(width=width,order=order,seed=seed,sectors=args.sectors,ranges=args.distances,
                          changes={k:round(r['displacementCSS'],4) for k,r in by_key.items() if r['displacementCSS']>.00001},
                          lost=sum(r['lostCount'] for r in batch),gained=sum(r['gainedCount'] for r in batch),
                          lostResidents=sorted({r['key'] for r in batch if r['lostCount']}),
                          native={label:data['sources'] for label,data in [('baseline',left),('candidate',right)]},
                          browser=browser.version,corridorPreserved=left['corridor']==right['corridor'],
                          openingArtworkPreserved=[(a[0],a[1],a[4:]) for a in left['opening']['actors']]==
                                                  [(a[0],a[1],a[4:]) for a in right['opening']['actors']])
                assert item['corridorPreserved'] and item['openingArtworkPreserved'], item
                rows.extend(batch);metadata.append(item)
                print(width,order,seed,item['changes'],item['lost'],item['gained'],flush=True)
        finally:
            browser.close()
    with gzip.open(out/'directions.csv.gz','wt',newline='') as stream:
        writer=csv.DictWriter(stream,fieldnames=rows[0],lineterminator='\n')
        writer.writeheader();writer.writerows(rows)
    (out/'directions.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url',required=True)
    parser.add_argument('--baseline',default='v9')
    parser.add_argument('--candidate',default='v9-seats')
    parser.add_argument('--sectors',type=int,default=96)
    parser.add_argument('--distances',type=float,nargs='+',default=[3,4,5,6,8,12,16,18,24])
    parser.add_argument('--widths',type=int,nargs='+',default=[320,375,390,430])
    parser.add_argument('--chromium',default='/usr/bin/chromium')
    parser.add_argument('--out',type=Path,required=True)
    parser.add_argument('--squirrel',action='store_true',help='recheck the measured 375px one-pixel suggestion on a copy of native feet')
    run(parser.parse_args())
