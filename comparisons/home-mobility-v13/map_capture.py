"""Survey official V12 recorded poses in the original browser scene, without modifying model behavior."""
import argparse, gzip, hashlib, json, re, sys, zipfile
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright

HERE=Path(__file__).resolve().parent
REGIONS='forest home river_lake city countryside mountain snow sea jungle desert deepsea star_stop memory_lake'.split()
HEIGHT={320:516,375:760,390:792,430:880}

def hash_bytes(value): return hashlib.sha256(value).hexdigest()

def matrix_frames(region,width,count,archives):
    receipt=json.loads((HERE.parent/'home-mobility-v12/evidence/matrix-receipt.json').read_text())['regions'][region]
    archive=next((archives/str(receipt['run'])).glob(f'*-{region}.zip'))
    if hash_bytes(archive.read_bytes())!=receipt['sha256']: raise ValueError('Matrix archive digest')
    with zipfile.ZipFile(archive) as z:
        key=f'{region}-{count}-{width}.json.gz'; compressed=z.read(key)
        manifest=json.loads(z.read('region.json'))
        if not manifest['complete'] or hash_bytes(compressed)!=manifest['cells'][key]: raise ValueError('Household digest')
    raw=json.loads(gzip.decompress(compressed)); a=raw['arms']['v12']
    if raw['height']!=HEIGHT[width] or raw['width']!=width or raw['count']!=count or raw['region']!=region: raise ValueError('Household capture conditions')
    return [{'phase':'opening','time':0,'feet':[r[:5] for r in a['opening']], 'screen':[r[5:7] for r in a['opening']]},
            {'phase':'300','time':a['aged']['final']['modelSeconds'],'feet':[r[:5] for r in a['aged']['opening']], 'screen':[r[5:7] for r in a['aged']['opening']]}],hash_bytes(compressed)

def study(args):
    probe=(HERE/'map-probe.js').read_text()
    args.out.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=args.chromium,args=['--disable-dev-shm-usage','--disk-cache-size=1048576'])
        for region in args.regions:
          for width in args.widths:
            for count in args.counts:
              output=args.out/f'{region}-{width}-{count}{args.suffix}.json.gz'
              if output.exists():continue
              if args.input:
                data=json.loads(args.input.read_text());frames,sha=data['frames'],data['source']; height=data['height']
              else: frames,sha=matrix_frames(region,width,count,args.archives);height=HEIGHT[width]
              page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=2,is_mobile=True,has_touch=True,timezone_id='Asia/Tokyo')
              digests={};errors=[]
              def intercept(route):
                res=route.fetch();source=res.text();marker='      if(arrange){clearRelief();'
                if source.count(marker)!=1:raise ValueError('Model patch anchor')
                digests['model']=hash_bytes(source.encode());route.fulfill(response=res,body=source.replace(marker,'      if(scene.navigation){'+probe+'}\n'+marker))
              page.route('**/home-production-model-*.js*',intercept);page.on('pageerror',lambda e:errors.append(str(e)))
              try:
                query=dict(region=region,time='day',count=count,paused=1,clock=0,ground='on',paired=1,variant='B',season='autumn',weather='sunny')
                page.goto(args.base.rstrip('/')+'/game/mobility-'+args.arm+'.html?'+urlencode(query),wait_until='domcontentloaded',timeout=90000)
                page.wait_for_function('window.HomeCastTrial?.ready && HomeDragTrial.opening() && window.spaceAtlas && HomeBeauty.paintRect?.width',timeout=95000)
                read=page.evaluate('''() => {const b=document.getElementById('castStage').getBoundingClientRect();return {origin:[b.x,b.y],paint:HomeBeauty.paintRect,people:HomeCastTrial.inspect().map(a=>{const n=document.querySelector('[data-diorama-actor="'+a.key+'"] img.character-asset'),r=n?.getBoundingClientRect();return {key:a.key,label:a.label,asset:a.asset,rect:r?[r.x,r.y,r.width,r.height]:null,flip:getComputedStyle(n||document.body).scale,origin:getComputedStyle(n||document.body).transformOrigin,src:n?.currentSrc,x:a.x,y:a.y,w:a.w,h:a.h,foot:a.foot};})};}''')
                if args.live:frames=[{'phase':'opening','time':0,'feet':[[p[k] for k in ('key','x','y','w','h')] for p in read['people']]}]
                result=page.evaluate('p=>spaceAtlas(p)',{'frames':frames})
                geometry=read;geometry['region']=region
                for f,observed in zip(frames,result['frames']):
                    if 'screen' in f:
                        # Reproject the raw (not rounded) feet directly into the same native CSS camera.
                        sx,sy=result['scale']['x'],result['scale']['y'];ox,oy=geometry['origin']
                        observed['archivedScreenMaxError']=max(((sx*r[1]+ox-g[0])**2+(sy*r[2]+oy-g[1])**2)**.5 for r,g in zip(f['feet'],f['screen']))
                if errors:raise RuntimeError(errors)
                result.update(region=region,width=width,height=height,count=count,poseDigest=sha,geometry=geometry,source=digests['model'],engine=browser.version,errors=errors)
                with gzip.open(output,'wt') as f:json.dump(result,f,separators=(',',':'))
                print(region,width,count,args.suffix,flush=True)
              finally:page.close()
        browser.close()

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--regions',nargs='+',default=REGIONS);p.add_argument('--widths',nargs='+',type=int,default=list(HEIGHT));p.add_argument('--counts',nargs='+',type=int,default=[28,1,4,10,20]);p.add_argument('--base',required=True);p.add_argument('--archives',type=Path,required=True);p.add_argument('--out',type=Path,required=True);p.add_argument('--chromium',default='/usr/bin/chromium');p.add_argument('--arm',default='v12');p.add_argument('--input',type=Path);p.add_argument('--suffix',default='');p.add_argument('--live',action='store_true');study(p.parse_args())
