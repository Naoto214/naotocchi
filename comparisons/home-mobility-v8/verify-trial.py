"""Check the three authenticated-comparison entries through real mobile controls."""
import argparse
import hashlib
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = Path(__file__).resolve().parent

def observe(origin, width, count, engine, executable):
    with sync_playwright() as pw:
        browser = getattr(pw,engine).launch(executable_path=executable)
        ctx = browser.new_context(viewport={'width':width,'height':812},device_scale_factor=2,is_mobile=True,has_touch=True)
        page=ctx.new_page()
        page.set_default_timeout(180000)
        errors=[]
        page.on('pageerror',lambda err:errors.append(str(err)))
        def ready(arm):
            page.wait_for_function("arm=>document.body.dataset.ready==='true' && document.getElementById('home').contentWindow.location.pathname.endsWith('mobility-'+arm+'.html')",arg=arm,polling=250)
            return page.locator('#home').element_handle().content_frame()
        try:
            page.goto(f'{origin}/v8/?region=forest&arm=v6&count={count}&time=day&paused=1',wait_until='commit')
            ready('v6')
            positions=page.locator('.bar button').evaluate_all("""els=>els.map(b=>{const r=b.getBoundingClientRect();return [b.id||b.dataset.arm,r.x,r.right,r.width,r.height]})""")
            assert all(left>=0 and right<=width+.1 and w>=43.9 and h>=43.9 for _,left,right,w,h in positions),positions
            assert len(positions)==6
            snapshots=[]
            for arm in ['v6','v7','v8','v8']:
                if snapshots:page.locator('#restart' if arm=='v8' and len(snapshots)==3 else '[data-arm='+arm+']').tap()
                f=ready(arm)
                snap=f.evaluate("""async()=>{const c=document.querySelector('.home-art-canvas'), pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
                    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',pixels)),x=>x.toString(16).padStart(2,'0')).join('');
                    return {opening:HomeDragTrial.opening(),paint:hash,shadows:document.querySelectorAll('.diorama-shadow').length,size:HomeCastTrial.settings.policy,ground:HomeFinishGround.enabled(),diag:HomeMobilityDiagnostics.enabled};}""")
                snapshots.append(snap)
            assert snapshots[0]==snapshots[1]==snapshots[2]==snapshots[3]
            assert not snap['diag'] and snap['shadows']==count and snap['size']=='B' and snap['ground']
            page.locator('#settings-toggle').tap()
            page.locator('#diagnostics summary').tap()
            page.locator('#start-record').tap()
            page.wait_for_function("n=>document.getElementById('resident').options.length===n",arg=count)
            page.locator('#resident').select_option(index=count-1)
            assert page.locator('#record').is_visible() and page.locator('#blockers').inner_text()
            page.locator('#settings-close').tap()
            page.locator('#freeze').tap()
            f.wait_for_function("HomeMobilityDiagnostics.read().residents.some(a=>a.actualDistance>1)",timeout=120000,polling=600)
            page.locator('#settings-toggle').tap()
            baseline=f.evaluate('HomeMobilityDiagnostics.read().modelSeconds')
            page.wait_for_function("()=>document.getElementById('clock-note').textContent.includes('ホームの進行')")
            options=[page.locator('#'+s+' option').count() for s in ('region','time','count')]
            assert options==[13,4,28] and baseline>0 and not errors
            return {'engine':engine,'version':browser.version,'width':width,'count':count,'openingSHA256':hashlib.sha256(json.dumps(snap['opening'],sort_keys=True).encode()).hexdigest(),'paintSHA256':snap['paint'],'sameInV6V7V8AndRestart':True,'shadows':snap['shadows'],'ground':snap['ground'],'size':snap['size'],'loadedV8Scripts':f.evaluate("Array.from(document.scripts,s=>new URL(s.src || location.href).pathname.split('/').pop()+new URL(s.src || location.href).search).filter(s=>s.includes('-mobility-v8.js?'))"),'toolbar':positions,'regionTimeCountOptions':options,'diagnosticResidents':count,'advancedModelSeconds':baseline,'errors':errors}
        except Exception:
            frames=[(f.url,f.evaluate("document.readyState")) for f in page.frames]
            status=page.locator('#status').text_content(timeout=5000)
            print('Comparison status:',status,'frames:',frames,'errors:',errors,flush=True)
            raise
        finally:
            ctx.close();browser.close()

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--origin',default='http://127.0.0.1:8388')
    p.add_argument('--width',type=int,default=390)
    p.add_argument('--count',type=int,default=28)
    p.add_argument('--engine',default='chromium')
    p.add_argument('--executable',default='/usr/bin/chromium')
    p.add_argument('--out',type=Path,required=True)
    a=p.parse_args();r=observe(a.origin,a.width,a.count,a.engine,a.executable)
    a.out.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
    print('Verified',a.engine,a.width,a.count,r['advancedModelSeconds'])
