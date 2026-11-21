"""Uncontrolled native rAF with ordinary model, browser animations, and environment."""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright
from performance_common import ARMS, HERE, WPE, clock, distribution, intervals_summary, native_page, save

if __name__ == "__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--base", default="http://127.0.0.1:8377/game")
    p.add_argument("--seconds", type=float, default=120)
    p.add_argument("--warmup", type=float, default=8)
    p.add_argument("--trace", action="store_true")
    p.add_argument("--order", default=",".join(ARMS))
    p.add_argument("--out", type=Path, required=True)
    a=p.parse_args()
    window=(HERE.parent/"home-mobility-v7/performance-window.js").read_text()
    rows=[]
    with sync_playwright() as pw:
        b=pw.webkit.launch(executable_path=WPE)
        for arm in a.order.split(","):
            pg,errors,assets=native_page(b,a.base,arm,traced=a.trace)
            probe=clock.Scheduler(.1)
            try:
                pg.evaluate("HomeCastTrial.apply({paused:false});0")
                pg.wait_for_timeout(a.warmup*1000)
                pg.expose_function("markSampling",probe.begin)
                s=pg.evaluate(window,dict(seconds=a.seconds,trace=a.trace,osClock=True,seed=214))
                probe.end()
                assert probe.rows and not errors and s["retained"] and s["visibleAtEnd"]==28 and s["visibleAtOpen"]==28
                assert s["clock"]>0 and s["moves"]>0 and not s["diagnostics"]["enabled"]
                raw={"arm":arm,"sample":s,"os":probe.rows,"assets":assets}
                info=intervals_summary.summary(raw)
                rows.append({**raw,"distribution":distribution(s["intervals"]),"longest":max(info["gaps"],key=lambda gap:gap["duration"])})
                save(a.out,dict(browser=b.version,seconds=a.seconds,warmupSeconds=a.warmup,trace=a.trace,rows=rows))
                print(arm,rows[-1]["distribution"],s["moves"],flush=True)
            finally:
                probe.end()
                pg.close()
        b.close()
    assert len({str(row["sample"]["opening"]) for row in rows})==1
