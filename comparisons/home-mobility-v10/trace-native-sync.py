"""Observe native model sync and renderer DOM ownership without altering their decisions."""

import argparse, asyncio, functools, hashlib, http.server, io, json, sys, threading, time
from pathlib import Path
from urllib.parse import urlsplit

p = argparse.ArgumentParser()
p.add_argument("comparison", type=Path)
p.add_argument("dist", type=Path)
p.add_argument("output", type=Path)
p.add_argument("--arm", default="v10")
p.add_argument("--seconds", type=int, default=310)
a = p.parse_args()
sys.path.insert(0, str(a.comparison.resolve()))
import forest_live as forest

rep = forest.replace_once
observe = forest.observe_model
outputs = a.output
outputs.mkdir(parents=True, exist_ok=True)


def observe_model(s):
    s = observe(s)
    s = rep(
        s,
        "    const forestRecords = {requests:[], motions:[], choices:[]};",
        "    const forestRecords = {requests:[], motions:[], choices:[],syncShifts:[]};",
    )
    s = rep(
        s,
        "      if(arrange){clearRelief();",
        """
      if(clock>0 && previousScene.region===scene.region){
        for(const a of actors){
          const before=previousActors.find(b=>b.key===a.key);
          if(!before||Math.hypot(before.x-a.x,before.y-a.y)<1e-4)continue;
          const info=globalThis.traceRow?.(a.key);
          const b=bounds(a,scene),limited=limit(a,before,scene),nav=scene.navigation;
          const nearest=nav?.nearest(limited,b);
          const physical=stats.distance;
          forestRecords.syncShifts.push({clock,key:a.key,before:[before.x,before.y,before.w,before.h,before.activity],after:[a.x,a.y,a.w,a.h,a.activity],
            changed,arrange,scene:[scene.region,scene.width,scene.height],oldScene:[previousScene.region,previousScene.width,previousScene.height],
            sameNavigation:scene.navigation===previousScene.navigation,initialNav:!!previousScene.navigation,scale:nav?.intentScale,
            box:b,reference:scene.referenceBounds?.(a),limited,limitedTerrain:nav?.valid(limited),limitedVisible:visible(a,limited),nearest,
            directWalkDistance:physical,gate:globalThis.HomeMobilityDiagnostics?.read()?.currentGateReasons,info,stack:new Error().stack});
        }
      }
      if(arrange){clearRelief();""",
    )
    return s


forest.observe_model = observe_model


def observer_renderer(s):
    s = rep(
        s,
        "      const list=getActors(),next=new Map();",
        """      const list=getActors(),next=new Map();
      const auditOld=new Map([...rows].map(([key,row])=>[key,{owner:row.owner,ink:!!row.paintExtent,asset:row.asset,w:row.w,h:row.h}]));
      globalThis.traceRow=key=>{
        const previous=auditOld.get(key),current=rows.get(key);
        const presentation=env.NaotocchiHomeViewport?.residentPresentation?.();
        return {oldOwnerRecorded:!!previous,currentOwnerRecorded:!!current,sameNode:previous?.owner===current?.owner,
          oldInk:previous?.ink,newInk:!!current?.paintExtent,sameAsset:previous?.asset===current?.asset,
          sameSize:previous?.w===current?.w&&previous?.h===current?.h,
          frame:!!stage.closest?.('.screen-frame'),presentation:!!presentation,landscape:presentation?.landscape,
          pending:pendingResidentPresentation,bodyVersion:doc.body?.dataset.homeDisplayVersion,
          nativeBlocked:blocked(),clockUTC:Date.now(),pageMs:env.performance.now(),
          viewport:[env.innerWidth,env.innerHeight], projection:world?.stats().projectionRevision};
      };""",
    )
    return s


class Local(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def send_head(self):
        url = urlsplit(self.path)
        if url.path == "/game/home-production-diorama-mobility-" + a.arm + ".js":
            src = (a.dist / url.path.lstrip("/")).read_bytes()
            out = observer_renderer(src.decode()).encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/javascript")
            self.send_header("Content-Length", str(len(out)))
            self.end_headers()
            (outputs / "renderer-sha.json").write_text(
                json.dumps(
                    {
                        "original": hashlib.sha256(src).hexdigest(),
                        "observed": hashlib.sha256(out).hexdigest(),
                    }
                )
            )
            return io.BytesIO(out)
        return super().send_head()


server = http.server.ThreadingHTTPServer(
    ("127.0.0.1", 0), functools.partial(Local, directory=a.dist)
)
threading.Thread(target=server.serve_forever, daemon=True).start()


async def finish_without_save(*args):
    return {"supplementalSyncTrace": True}


forest.reload_save = finish_without_save
args = argparse.Namespace(
    out=outputs,
    url="http://127.0.0.1:" + str(server.server_port),
    arm=a.arm,
    seed=214,
    width=320,
    order=0,
    seconds=a.seconds,
    attended=True,
    chromium="/usr/bin/chromium",
)
try:
    asyncio.run(forest.run(args))
finally:
    server.shutdown()
