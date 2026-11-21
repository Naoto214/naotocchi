"""Native Linux WPE timing shared by the V9 comparison tools."""
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
from urllib.parse import urlencode, urlparse

HERE = Path(__file__).resolve().parent
ARMS = ["v7", "v8", "v9"]


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


trace = load("v8_trace", HERE.parent / "home-mobility-v8/performance-trace.py")
clock = trace.clock
intervals_summary = load("v7_summary", HERE.parent / "home-mobility-v7/performance-summary.py")
touch = load("finish_touch", HERE.parent / "home-finish-v5/verify_touch.py")
WPE = os.getenv("WEBKIT_PATH")
PARAMS = dict(region="forest", count=28, time="day", season="autumn", weather="sunny",
              paused=1, clock=0, variant="B", policy="B", layout="optimized", curve="linear",
              compareSplit=0, ground="on", diagnostics=0, waitForPainting=1)
DATE = """const RealDate=Date,offset=RealDate.UTC(2026,9,15,3)-RealDate.now();
globalThis.Date=new Proxy(RealDate,{construct(t,a,n){return Reflect.construct(t,a.length?a:[RealDate.now()+offset],n)},
apply(){return new RealDate(RealDate.now()+offset).toString()},get(t,k,r){return k==='now'?()=>RealDate.now()+offset:Reflect.get(t,k,r)}});
"""


def digest(content):
    return hashlib.sha256(content.encode() if isinstance(content, str) else content).hexdigest()


def save(path, result):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n")


def distribution(values):
    values = sorted(values)
    if not values:
        return None
    percentile = lambda p: values[math.ceil(len(values) * p) - 1]
    return dict(n=len(values), p50=percentile(.50), p95=percentile(.95), p99=percentile(.99),
                max=values[-1], over250=sum(x > 250 for x in values),
                over500=sum(x > 500 for x in values), over1000=sum(x > 1000 for x in values))


def native_page(browser, base, arm, *, traced=False, transform=None, init="", region="forest", view=(390,792)):
    page = browser.new_page(viewport=dict(width=view[0], height=view[1]), device_scale_factor=2,
                            is_mobile=True, has_touch=True)
    errors, hashes = [], {}
    def on_error(error):
        errors.append(str(error))
        print(f"{arm} page error: {error}", flush=True)
    page.on("pageerror", on_error)
    page.add_init_script("(()=>{" + DATE + clock.INIT + (clock.DOM if traced else "") + init + "})();")

    def route(r):
        response = r.fetch()
        name = Path(urlparse(r.request.url).path).name
        original = response.text()
        hashes[name] = digest(original)
        source = trace.native(name, original, traced) if "production-model" not in name else clock.native(name, original, traced)
        if traced and "production-model" in name:
            for fun in ["clearance", "contactSegmentSafe"]:
                source = clock.wrap(source, fun, threshold=8)
        if transform:
            source = transform(name, source)
        r.fulfill(response=response, body=source)

    for pattern in ["**/*production-model*.js*", "**/*production-diorama*.js*", "**/*production-world*.mjs*"]:
        page.route(pattern, route)
    page.goto(f"{base}/mobility-{arm}.html?" + urlencode({**PARAMS, "region":region}),
              wait_until="domcontentloaded", timeout=120000)
    page.wait_for_function("""region=>window.HomeCastTrial?.ready&&mobilityPerf.scene&&mobilityPerf.reset&&
        HomeCastTrial.inspect().length===28&&document.querySelector('canvas[data-mobility-painting]')?.dataset.mobilityPainting.includes('/'+region+'-day.webp')""",
        arg=region, timeout=150000)
    page.evaluate("Promise.all([...document.querySelectorAll('#castStage img.character-asset')].map(n=>n.decode()))")
    assert all(page.evaluate("mobilityPerf.nativeAtBoot").values())
    return page, errors, hashes
