"""Apply the four-file adoption diff to a disposable release checkout and run its native checks."""
import argparse
import functools
import hashlib
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
from tempfile import TemporaryDirectory
import threading

from playwright.sync_api import sync_playwright


HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
ADOPTION=HERE/"foot-only.patch"
PINS={
    "home-production-model.js":"812fad81ddc5f157ad57bd71930dd925af4c91e680ba927d56346e838dec8856",
    "home-production-diorama.js":"ecac051a6f903dab5ee2f266d70b879686e15a035fbcefd1e6a84fa5a2db783a",
    "home-production-world.mjs":"d824c818c676353898afb052b43f8e88db9a14a7add55c3986af0104dbdc9ca6",
    "index.html":"a087464bce1de49934bbab652fa20e3c656b6cfa48f85e8d31d42e6a9ac10bb4",
}
SUITES=["home-production-v18-release","home-production-v18","home-production-save",
        "home-production-birth","home-movement-bounds","home-movement-v2","home-movement-v3",
        "home-movement-v4","home-social-approach","home-terrain-conversation"]
digest=lambda file: hashlib.sha256(file.read_bytes()).hexdigest()


class Silent(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def run(source,assets):
    with TemporaryDirectory(prefix="foot-candidate-") as temp:
        project=Path(temp)
        for name,pin in PINS.items():
            assert digest(source/name)==pin,name
            shutil.copy2(source/name,project/name)
        subprocess.run(["git","apply","--check",str(ADOPTION)],check=True,cwd=project)
        subprocess.run(["git","apply",str(ADOPTION)],check=True,cwd=project)
        for item in source.iterdir():
            dest=project/item.name
            if not item.name.startswith(".") and item.name!="tests" and not dest.exists():
                dest.symlink_to(item.resolve(),target_is_directory=item.is_dir())
        if not (project/"assets").exists():
            (project/"assets").symlink_to(assets.resolve(),target_is_directory=True)
        shutil.copytree(source/"tests",project/"tests")
        git_dir=subprocess.check_output(["git","rev-parse","--absolute-git-dir"],cwd=source,text=True).strip()
        result=subprocess.run(["node","--test","--test-reporter=tap","--test-concurrency=1",
            *["tests/"+suite+"-test.cjs" for suite in SUITES]],cwd=project,text=True,stdout=subprocess.PIPE,env={**os.environ,"GIT_DIR":git_dir})
        if result.returncode:
            raise RuntimeError(result.stdout)
        counts=dict((k,int(v)) for k,v in re.findall(r"^# (tests|pass|fail|skipped) (\d+)$",result.stdout,re.M))
        assert counts["tests"]==counts["pass"] and not counts["skipped"]
        server=ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Silent,directory=project))
        threading.Thread(target=server.serve_forever,daemon=True).start()
        try:
            with sync_playwright() as pw:
                browser=pw.chromium.launch(executable_path="/usr/bin/chromium")
                page=browser.new_page(viewport={"width":390,"height":792},is_mobile=True,has_touch=True,device_scale_factor=2)
                page.set_default_timeout(90000)
                errors=[]
                page.on("pageerror",lambda e: errors.append(str(e)))
                seed=json.loads((source/"tests/fixtures/saves/real/v5-pre-items-v2.json").read_bytes())
                seed["regionId"]="forest"
                seed["companions"]=[dict(id="panda",bond=85)]
                page.add_init_script("const seed="+json.dumps(seed)+";seed.savedAt=Date.now();localStorage.setItem('naotocchi-save-v1',JSON.stringify(seed));")
                # Only this browser response exposes observations. Ship no test or diagnostic globals.
                painter=(project/"home-production-diorama.js").read_text()
                anchor="    function sync(){"
                assert painter.count(anchor)==1
                probe="""
    globalThis.footReleaseProbe=()=>{
      const panda=rows.get('companion:panda'),nav=scene?.navigation;
      if(!panda?.owner || !nav?.intentAware || !model.snapshot().every(a=>a.reflowInk))return null;
      const snapshot=()=>model.snapshot().map(a=>[a.key,a.x,a.y]);
      const before=snapshot();
      panda.owner.replaceWith(panda.owner.cloneNode(true));sync();
      const after=snapshot();
      model.sync(model.snapshot(),{...scene,navigation:{...nav}});
      return {before,after,renewed:snapshot(),decision:globalThis.footReleaseDecision,
        painted:stage.querySelectorAll('.character-asset').length,version:doc.body.dataset.homeDisplayVersion};
    };
"""
                page.route("**/home-production-diorama.js*",lambda r:r.fulfill(content_type="text/javascript",body=painter.replace(anchor,probe+anchor)))
                model=(project/"home-production-model.js").read_text()
                marker="      const changed=next.region!==scene.region"
                assert model.count(marker)==1
                page.route("**/home-production-model.js*",lambda r:r.fulfill(content_type="text/javascript",body=model.replace(marker,"      globalThis.footReleaseDecision=reflowChoice;\n"+marker)))
                page.goto("http://127.0.0.1:"+str(server.server_port),wait_until="domcontentloaded")
                handle=page.wait_for_function("window.footReleaseProbe?.()")
                smoke=handle.json_value()
                assert not errors and smoke["painted"]>=2 and smoke["version"]=="18", (errors,smoke)
                assert smoke["decision"]["held"] and smoke["before"]==smoke["after"]==smoke["renewed"],smoke
                version=browser.version
                browser.close()
        finally:
            server.shutdown()
        return dict(patchSHA256=digest(ADOPTION),before=PINS,after={name:digest(project/name) for name in PINS},
            suites=SUITES,counts=counts,engine="Chromium",version=version,officialEntry=smoke,pageErrors=errors)


if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("out",type=Path)
    p.add_argument("--source",type=Path,default=ROOT)
    p.add_argument("--assets",type=Path,default=ROOT/"assets",help="Artwork directory for a sparse source checkout")
    args=p.parse_args()
    args.out.write_text(json.dumps(run(args.source,args.assets),ensure_ascii=False,indent=2)+"\n")
