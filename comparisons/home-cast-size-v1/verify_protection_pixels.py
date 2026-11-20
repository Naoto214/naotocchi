"""Check pinned #569 B against a built size comparison, with no resident overlay."""
import argparse
import hashlib
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

SCENE_SCRIPT = """async region => {
  const {DAYPARTS} = await import('/game/home-dayparts.mjs');
  const {composeNature} = await import('/game/beauty/paint.mjs');
  const effects = Object.fromEntries('water particles light contact motion canopy shafts depth gusts magic ground waves foam caustics reflections'.split(' ').map(k=>[k,true]));
  const sameClock = s => s;
  const w = 250, h = 375, rect = {left:0,top:0,width:w,height:h};
  const c = document.createElement('canvas'); c.width=w; c.height=h;
  const ctx = c.getContext('2d',{willReadFrequently:true});
  const pictures = await Promise.all(Object.entries(DAYPARTS[region]).map(async ([time, path]) => {
    const im = new Image(); im.src='/game/'+path; await im.decode(); return [time,im];
  }));
  const scenes = [['autumn','sunny',false,1,0],['autumn','cloudy',false,0.375,12.5],['spring','sunny',false,1,31.3],
                  ['summer','rain',false,1,42],['winter','snow',false,1,53],['autumn','sunny',true,1,60]];
  const result = {};
  for (let index=0; index<pictures.length; index++) {
    const [time,im] = pictures[index];
    const prev = pictures[(index+pictures.length-1)%pictures.length][1];
    for (const [season,weather,reduced,alpha,t] of scenes) {
      window.HomeBeauty = {settings:{region,time,season,weather,variant:'B',compareSplit:false,split:.5,
        leafColor:'mixed',fall:{count:1,size:1,speed:1,wind:1},strength:1,effects}, sampleClock:sameClock};
      ctx.save(); ctx.globalAlpha=1; ctx.drawImage(prev,0,0,w,h);
      ctx.globalAlpha=alpha; ctx.drawImage(im,0,0,w,h); ctx.restore();
      composeNature(ctx,rect,rect,{image:im,previous:prev,alpha},t,reduced);
      const bytes = ctx.getImageData(0,0,w,h).data;
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
      result[[region,time,season,weather,reduced,alpha,t].join('/')] = [...digest].map(v=>v.toString(16).padStart(2,'0')).join('');
    }
  }
  return result;
}"""


def capture(browser, url):
    page = browser.new_page(viewport={'width': 250, 'height': 375})
    page.route('**/cast-scene-qa', lambda r: r.fulfill(content_type='text/html', body='<title>Scene pixels</title>'))
    page.goto(url.rstrip('/') + '/cast-scene-qa')
    regions = page.evaluate("async()=>Object.keys((await import('/game/home-dayparts.mjs')).DAYPARTS)")
    assert len(regions) == 13
    rows = {}
    for region in regions:
        rows.update(page.evaluate(SCENE_SCRIPT, region))
    assert len(rows) == 13*4*6
    page.close()
    return rows


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('reference')
    cli.add_argument('trial')
    cli.add_argument('--out', type=Path, required=True)
    args = cli.parse_args()
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'))
        original = capture(browser, args.reference)
        current = capture(browser, args.trial)
        diff = sorted(key for key in original if current.get(key) != original[key])
        report = dict(reference='28628cf336a8ed92efe4e9e197ca03298b798a1e', chromium=browser.version,
                      dimensions=[250,375], sceneCases=len(original), mismatches=diff,
                      aggregateSHA256=hashlib.sha256(json.dumps(original,sort_keys=True).encode()).hexdigest())
        args.out.write_text(json.dumps(report, indent=2) + '\n')
        print(report)
        assert not diff
        browser.close()


if __name__ == '__main__':
    main()
