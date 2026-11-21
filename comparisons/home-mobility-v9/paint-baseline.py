"""Inspect actual repeated V8 attribute writes and foreground candidate work."""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright
from performance_common import WPE, clock, native_page, save


def count(name,script):
    if "production-diorama" not in name:
        return script
    script=clock.replace(script,"const near=polygons.filter",
                         "if(mobilityPerf.active)mobilityPerf.hit('polygons.'+polygons.length);const near=polygons.filter")
    return clock.replace(script,"const m=spriteBasis(n);",
                         "if(mobilityPerf.active)mobilityPerf.hit('near');const m=spriteBasis(n);")


if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--base",default="http://127.0.0.1:8377/game")
    p.add_argument("--out",type=Path,required=True)
    args=p.parse_args()
    with sync_playwright() as pw:
        b=pw.webkit.launch(executable_path=WPE)
        page,errors,src=native_page(b,args.base,"v8",traced=True,transform=count)
        page.evaluate("""()=>{
          HomeCastTrial.apply({paused:false});mobilityPerf.reset(214);mobilityPerf.active=true;
          window.mutationCounts={};new MutationObserver(records=>{
            for(const r of records){const key=r.attributeName+(r.oldValue===r.target.getAttribute(r.attributeName)?'.same':'.different');
              mutationCounts[key]=(mutationCounts[key]||0)+1;}
          }).observe(document.getElementById('castStage'),{subtree:true,attributes:true,attributeOldValue:true});
        }""")
        page.wait_for_timeout(25000)
        data=page.evaluate("""()=>({native:mobilityPerf.count,nativePhases:Object.fromEntries(
          Object.entries(mobilityPerf.parts).filter(([k])=>!k.includes(' '))),
          attributeMutations:mutationCounts,moves:mobilityPerf.live.metrics().moves})""")
        assert not errors,errors
        save(args.out,dict(browser=b.version,seconds=25,source=src,**data))
        b.close()
