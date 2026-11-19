"""Measure where the protagonist can place a foot inside the rendered phone viewport."""
import argparse
from pathlib import Path
import json
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright

WIDTHS = {320:568, 375:812, 390:844, 430:932}
GROUND = '''() => {
  const scene = window.qaLastScene, model = window.qaNative;
  const hero = model.snapshot().find(a => a.kind === 'pet');
  const shown = HomeCastTrial.inspect().find(a => a.kind === 'pet');
  const bounds = model.bounds(hero), nav = scene.navigation;
  const projection = NaotocchiHomeViewport.residentPresentation();
  const step = 8;
  let inside = 0, total = 0, low = Infinity, high = -Infinity;
  const legal = [];
  for (let y = step/2; y < innerHeight; y += step) {
    let row = 0;
    for (let x = step/2; x < innerWidth; x += step) {
      total++;
      const p = {x:hero.x + (x-shown.foot.x)/projection.scaleX,
                 y:hero.y + (y-shown.foot.y)/projection.scaleY};
      if (p.x < bounds.left || p.x > bounds.right || p.y < bounds.top || p.y > bounds.bottom) continue;
      if (!nav.valid(p) || !scene.visible(p, hero)) continue;
      inside++; row++; low=Math.min(low,y); high=Math.max(high,y);
    }
    if (row) legal.push([y,row]);
  }
  return {total, legal:inside, minY:low, maxY:high, legalByRow:legal,
    foot:[shown.foot.x,shown.foot.y], sx:projection.scaleX, sy:projection.scaleY};
}'''


def run(args):
    base = Path(__file__).resolve().parent
    reports = json.loads(args.out.read_text())["rows"] if args.out.exists() else {}
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        version=browser.version
        for width in args.widths:
            height = WIDTHS[width]
            ctx=browser.new_context(viewport={'width':width,'height':height-52},device_scale_factor=2,is_mobile=True,has_touch=True)
            ctx.add_init_script(path=base/'geometry_capture.js')
            for region in args.regions:
                if f'{width}/{region}' in reports: continue
                page=ctx.new_page()
                query=dict(count=28,region=region,time='day',paused=1,clock=0,variant='B',compareSplit=0,layout='fixed',extra=0)
                page.goto(args.url.rstrip('/')+'/game/limit.html?'+urlencode(query),wait_until='commit',timeout=120000)
                page.wait_for_function('window.HomeCastTrial?.ready && window.qaLastScene?.navigation && HomeCastTrial.inspect().length===28',timeout=120000)
                reports[f'{width}/{region}']=page.evaluate(GROUND)
                page.close()
                args.out.write_text(json.dumps(dict(browser=version,gridCSSpx=8,rows=reports),separators=(',',':'))+'\n')
            ctx.close()
        browser.close()


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--url',default='http://127.0.0.1:8303')
    p.add_argument('--out',type=Path,required=True)
    p.add_argument('--widths',type=int,nargs='+',default=list(WIDTHS))
    p.add_argument('--regions',nargs='+',default='forest river_lake city home countryside mountain snow sea jungle desert deepsea star_stop memory_lake'.split())
    run(p.parse_args())
