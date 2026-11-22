"""Observe real care transitions and try an all-or-nothing preservation of a projected household."""

from pathlib import Path
import argparse, functools, http.server, json, threading
from playwright.sync_api import sync_playwright
import foot_transitions as transitions
from foot_replacement import Local, replace_once

# The optional branch can preserve the current projected positions only if all
# 28 remain geometrically legal and no pair is closer (in contact-ellipse
# coordinates) or loses a previously available 3, 8, or 16 CSS px direction.
# It never installs a foot, synthesizes a walk, or changes native input.
BEFORE = """
      const flowAudit=globalThis.reflowAudit;
      const stageEvent=flowAudit?.active && previousScene.region===scene.region && previousScene.navigation &&
        scene.navigation && previousActors.length===actors.length && arrange;
      let keepProjected=false, samples=null;
      if(stageEvent){
        const nav=scene.navigation,oldNav=previousScene.navigation;
        function facts(a,p){const b=bounds(a,scene);
          return {terrain:nav.valid(p),display:p.x>=b.left-1e-6 && p.x<=b.right+1e-6 && p.y>=b.top-1e-6 && p.y<=b.bottom+1e-6,
            visible:visible(a,p)};}
        samples=actors.map(a=>{
          const old=previousActors.find(e=>e.key===a.key);if(!old)return {key:a.key};
          const wanted=nav.project(oldNav.unproject(old));const p={x:a.x,y:a.y};
          const contact=actors.filter(b=>b!==a&&clearance(a,p,b)<1-1e-8).map(b=>b.key);
          const worsened=actors.filter(b=>{if(b===a)return false;const v=previousActors.find(o=>o.key===b.key);
            return !v || clearance(a,p,b)<Math.min(1,clearance(old,old,v))-1e-6;}).map(b=>b.key);
          return {key:a.key,previous:[old.x,old.y],projected:[wanted.x,wanted.y],preArrange:[a.x,a.y],
            projectedValidity:facts(a,wanted),preArrangeValidity:facts(a,p),bodyChanged:old.w!==a.w||old.h!==a.h,
            priorContacts:contact,worsened,hadToClamp:Math.hypot(a.x-wanted.x,a.y-wanted.y)>1e-5};
        });
        const valid=samples.every(s=>s.projectedValidity&&Object.values(s.projectedValidity).every(Boolean)&&
           Object.values(s.preArrangeValidity).every(Boolean)&&!s.hadToClamp&&!s.worsened.length);
        let lostRays=0,oldRays=0,newRays=0;const lostByResident=[];
        const began=performance.now();
        const match=!!(flowAudit.candidate && flowAudit.oldRays &&
           previousScene.navigation===flowAudit.oldRays.nav && previousActors.every(a=>{
             const o=flowAudit.oldRays.feet.get(a.key);
             return o&&o.x===a.x&&o.y===a.y&&o.w===a.w&&o.h===a.h;
           }));
        if(valid && match){
          for(const a of actors){
            const old=flowAudit.oldRays.feet.get(a.key),now=footExitMask(a,actors,scene);
            for(let i=0;i<now.length;i++){
              oldRays+=+old.mask[i];newRays+=+now[i];
              if(old.mask[i]&&!now[i]){lostRays++;lostByResident.push({key:a.key,dir:i%48,dist:[3,8,16][Math.floor(i/48)]});}
            }
          }
          keepProjected=!lostRays;
        }
        flowAudit.list.push({clock,newRegion:scene.region,oldSize:[previousScene.width,previousScene.height],newSize:[scene.width,scene.height],
          oldScale:oldNav.intentScale,newScale:nav.intentScale,valid,lostRays,oldRays,newRays,lostByResident,keepProjected,match,guardMs:performance.now()-began,samples});
      }
"""
AFTER = """
      if(samples)for(const s of samples){
        const final=actors.find(a=>a.key===s.key);s.final=[final.x,final.y];
        if(s.preArrange)s.arrangeShiftCSS=Math.hypot((final.x-s.preArrange[0])*scene.navigation.intentScale.x,
          (final.y-s.preArrange[1])*scene.navigation.intentScale.y);
      }
      if(samples && flowAudit?.candidate)globalThis.captureBeforeCare();
"""


def tracer(source, arm):
    # Capture the before-mask while the old renderer, bounds and navigation
    # still own their closures. Applying the old nav to new display bounds is
    # insufficient to establish that a previously legal exit survived.
    marker = "    function sync(list,next){"
    source = replace_once(
        source,
        marker,
        """
    function footExitMask(actor,peers,sc){
      const nav=sc.navigation,scale=nav.intentScale,b=bounds(actor,sc),mask=[];
      for(const d of [3,8,16])for(let dir=0;dir<48;dir++){
        const angle=Math.PI*dir/24,p={x:actor.x+d*Math.cos(angle)/scale.x,y:actor.y+d*Math.sin(angle)/scale.y};
        const fits=p.x>=b.left&&p.x<=b.right&&p.y>=b.top&&p.y<=b.bottom&&
          nav.segmentSafe(actor,p,q=>visible(actor,q))&&peers.every(other=>other===actor||
            contactSegmentSafe(actor,p,other,(actor.w+other.w)*.5+10,(actor.h+other.h)*.38+10));
        mask.push(fits);
      }
      return mask;
    }
    globalThis.captureBeforeCare=()=>{
      const audit=globalThis.reflowAudit;
      if(!audit?.candidate || !scene.navigation)return;
      audit.oldRays={nav:scene.navigation,feet:new Map(actors.map(a=>[a.key,
        {x:a.x,y:a.y,w:a.w,h:a.h,mask:footExitMask(a,actors,scene)}]))};
    };
"""
        + marker,
    )
    source = replace_once(
        source,
        "      if(lead&&(actors.length>5",
        BEFORE + "      if(lead&&(actors.length>5",
    )
    source = replace_once(
        source,
        "        if(!fits(a)&&(arrange",
        "        if(!keepProjected && !fits(a)&&(arrange",
    )
    return replace_once(
        source,
        "      if(arrange){clearRelief();",
        AFTER + "      if(arrange){clearRelief();",
    )


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("dist", type=Path)
    p.add_argument("out", type=Path)
    p.add_argument("--width", type=int, default=320)
    p.add_argument("--arm", choices=["v10", "foot", "guard"], default="foot")
    p.add_argument("cases", nargs="*")
    a = p.parse_intermixed_args()
    orig = transitions.patched

    def build(source, part):
        if part == "patchFoot":
            return source if a.arm == "v10" else orig(source, part)
        return tracer(orig(source, part), a.arm)

    transitions.patched = build
    # Optional trace callback has no control over the baseline/foot arm.
    transitions.COMMANDS = transitions.COMMANDS.replace(
        "  let removedCompanion;",
        "  window.reflowAudit={active:false,candidate:"
        + str(a.arm == "guard").lower()
        + ",list:[]};\n  let removedCompanion;",
    )
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(Local, directory=a.dist)
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path="/usr/bin/chromium")
            rows = []
            for case in a.cases or ["growth", "gear-off"]:
                row = transitions.run(
                    browser,
                    "http://127.0.0.1:" + str(server.server_port),
                    a.dist,
                    case,
                    a.width,
                )
                rows.append(row)
                a.out.write_text(
                    json.dumps(
                        dict(
                            arm=a.arm,
                            width=a.width,
                            browser=browser.version,
                            cases=rows,
                        ),
                        separators=(",", ":"),
                    )
                    + "\n"
                )
                print(case, len(row["audit"]), len(row["screenChanges"]), flush=True)
            browser.close()
    finally:
        server.shutdown()


if __name__ == "__main__":
    main()
