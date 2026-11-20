"""Compare rendered RGBA with an independently served #568 build using Chromium.

Usage: python verify_reference.py V6_URL V7_URL OUTPUT_JSON
Both origins must be localhost or HTTPS. Requires Playwright for Python.
"""
import argparse
from collections import Counter
from hashlib import sha256
import json
import os
from pathlib import Path
from urllib.request import urlopen

from playwright.sync_api import sync_playwright

PIN = "2935622edf9ccdc6f8a36f2297dd86b789022b87"
RENDER = """async ({region, prior}) => {
  const {composeNature} = await import('/game/beauty/paint.mjs');
  const {DAYPARTS} = await import('/game/home-dayparts.mjs');
  const width = innerWidth, height = width * 1.5;
  const rect = {left:0, top:0, width, height};
  const canvas = Object.assign(document.createElement('canvas'), {width, height});
  const ctx = canvas.getContext('2d', {willReadFrequently:true});
  const controls = {count:1, size:1, speed:1, wind:1};
  const extreme = {count:1.5, size:2, speed:.25, wind:2};
  const effects = Object.fromEntries('water particles light contact motion canopy shafts depth gusts magic ground waves foam reflections caustics'.split(' ').map(k=>[k,true]));
  window.HomeBeauty = {sampleClock:t=>t};
  const images = {};
  async function load(region, time) {
    const path = DAYPARTS[region][time];
    if (!images[path]) {
      const im = new Image(); im.src = '/game/' + path; await im.decode(); images[path] = im;
    }
    return images[path];
  }
  const rows = {}, checks = [], failures = [], midpoints = [];
  const check = (kind, name, condition) => {
    checks.push(kind); if (!condition) failures.push(kind + '/' + name);
  };
  async function digest(bytes) {
    const result = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(result), x=>x.toString(16).padStart(2,'0')).join('');
  }
  function draw(im, prev, options, settings={}) {
    const {time, season, weather, alpha, reduced, particles, seconds} = options;
    HomeBeauty.settings = {region, time, season, weather, strength:1, effects:{...effects, ...options.effects, particles},
      variant:'E3plus', fall:controls, leafColor:'mixed', compareSplit:false, split:.5, ...settings};
    ctx.globalAlpha = 1; ctx.drawImage(prev, 0, 0, width, height);
    ctx.globalAlpha = alpha; ctx.drawImage(im, 0, 0, width, height); ctx.globalAlpha = 1;
    composeNature(ctx, rect, rect, {previous:prev, image:im, alpha}, seconds, reduced);
    return ctx.getImageData(0, 0, width, height).data;
  }
  const times = Object.keys(DAYPARTS[region]);
  // Alpha below one exercises both paintings in the original crossfade order.
  const cases = [
    ['autumn','sunny',1,false], ['autumn','cloudy',.375,false],
    ['autumn','rain',1,false], ['autumn','snow',1,false],
    ['spring','sunny',1,false], ['summer','sunny',1,false], ['winter','snow',1,false],
    ['autumn','sunny',1,true],
  ];
  const leafPainting = (r,t)=>r==='forest' || (r==='countryside' && t!=='night');
  for (const [i,time] of times.entries()) {
    const prevTime = times[(i+times.length-1)%times.length];
    const im = await load(region,time), prev = await load(region,prevTime);
    for (const [season,weather,alpha,reduced] of cases) {
      const name = [region,time,season,weather,alpha,reduced].join('/');
      const o = {time,season,weather,alpha,reduced,particles:true,seconds:41.75};
      const reference = await digest(draw(im,prev,o));
      rows[name] = reference;
      if (prior) continue;
      check('referenceSliderLock', name, reference === await digest(draw(im,prev,o,{fall:extreme,leafColor:'red'})));
      const active = season==='autumn' && !reduced && ['sunny','cloudy'].includes(weather) &&
        (leafPainting(region,time) || (alpha<1 && leafPainting(region,prevTime)));
      for (const variant of ['A','B','C']) {
        const config = {variant,fall:extreme,leafColor:'red'};
        const pixels = await digest(draw(im,prev,o,config));
        if (!active) {
          check('protectedCandidate', name+'/'+variant, pixels===reference);
          if (reduced) {
            check('reducedTime', name+'/'+variant, pixels === await digest(draw(im,prev,{...o,seconds:180},config)));
            check('reducedFractionalSplit', name+'/'+variant,
              reference === await digest(draw(im,prev,o,{...config,compareSplit:true,split:.491})));
          }
        } else {
          check('activeCandidate', name+'/'+variant, pixels!==reference);
          check('splitReferenceEdge', name+'/'+variant, reference === await digest(draw(im,prev,o,{...config,compareSplit:true,split:1})));
          check('splitCandidateEdge', name+'/'+variant, pixels === await digest(draw(im,prev,o,{...config,compareSplit:true,split:0})));
          // At default wind the optimized split shares background and foreground passes.
          // Construct the expected wipe from two complete independently rendered frames.
          const left = draw(im,prev,o), right = draw(im,prev,o,{variant});
          const actual = draw(im,prev,o,{variant,compareSplit:true,split:.5});
          const middle = width/2;
          let pixelCount=0, maxDelta=0, maxDistance=0;
          for (let y=0;y<height;y++) for (let x=0;x<width;x++) {
            const offset=4*(y*width+x), source=x<middle ? left : right;
            let delta=0;
            for (let k=0;k<4;k++) delta=Math.max(delta,Math.abs(source[offset+k]-actual[offset+k]));
            if (delta) {
              pixelCount++; maxDelta=Math.max(maxDelta,delta);
              maxDistance=Math.max(maxDistance,Math.abs(x-middle));
            }
          }
          midpoints.push({pixelCount,maxDelta,maxDistance});
          // The visible divider has a one-pixel line, one-pixel spread and two-pixel blur.
          // A clipped leaf can sample differently within this three-pixel margin.
          check('defaultWindHalfWipeOutsideDivider',name+'/'+variant,maxDistance<=3);
        }
      }
    }
    if (!leafPainting(region,time)) continue;
    // Branches and grasses share the original E3+ wind even when particles are off.
    for (const wind of [1,2]) {
      const o = {time, season:'autumn', weather:'sunny', alpha:1, reduced:false, particles:false, seconds:12.34};
      for (const variant of ['A','B','C']) {
        rows[[region,time,'foliage',wind,variant].join('/')] = await digest(draw(im,prev,o,{
          variant:prior?'E3plus':variant, leafColor:'gold',fall:{...extreme,wind}}));
      }
    }
    if (region==='forest') for (const variant of ['A','B','C']) {
      // The original light shafts and ground light follow the same wind as the foliage.
      const o = {time, season:'autumn', weather:'sunny', alpha:1, reduced:false,
        effects:{motion:false}, particles:false, seconds:12.34};
      rows[[region,time,'lighting',variant].join('/')] = await digest(draw(im,prev,o,{
        variant:prior?'E3plus':variant, leafColor:'orange',fall:extreme}));
    }
  }
  // The destination is protected. An outgoing forest can still paint leaves at 37.5% fade.
  if (region==='sea') {
    const im = await load('sea','day'), prev = await load('forest','day');
    const o = {time:'day',season:'autumn',weather:'sunny',alpha:.375,reduced:false,particles:true,seconds:41.75};
    const ref = await digest(draw(im,prev,o)); rows['forest-to-sea/reference'] = ref;
    if (!prior) for (const variant of ['A','B','C']) {
      const config={variant,fall:extreme};
      const pixels=await digest(draw(im,prev,o,config));
      check('mixedRegionFade',variant,pixels!==ref);
      check('splitReferenceEdge','forest-to-sea/'+variant,ref===await digest(draw(im,prev,o,{...config,compareSplit:true,split:1})));
      check('splitCandidateEdge','forest-to-sea/'+variant,pixels===await digest(draw(im,prev,o,{...config,compareSplit:true,split:0})));
    }
  }
  return {rows, checks, failures, midpoints};
}"""


# Aggregate the independently served, unmodified module files in filename order.
def renderer_digest(url, candidate):
    modules = ['deepsea-stars.mjs', 'fall-motion.mjs', 'forest-e.mjs', 'full-motion.mjs', 'mountain-jungle-desert.mjs', 'nature.mjs', 'other-regions.mjs', 'paint.mjs', 'regional-fall.mjs', 'river-home-country.mjs', 'sea-e.mjs', 'snow-city-lake.mjs']
    if candidate:
        modules = sorted([*modules, "autumn-leaf.mjs", "leaf-comparison.mjs"])
    aggregate = sha256()
    for name in modules:
        with urlopen(url.rstrip("/") + "/game/beauty/" + name, timeout=20) as response:
            digest = sha256(response.read()).hexdigest()
        aggregate.update((name + " " + digest + "\n").encode())
    return aggregate.hexdigest()


def capture(browser, url, prior):
    page = browser.new_page(viewport={"width": 300, "height": 450})
    try:
        page.route("**/pixel-proof", lambda route: route.fulfill(content_type="text/html", body="<title>Pixel proof</title>"))
        page.goto(url.rstrip("/") + "/pixel-proof")
        regions = page.evaluate("async()=>Object.keys((await import('/game/home-dayparts.mjs')).DAYPARTS)")
        assert len(regions) == 13
        hashes, checks, failures, midpoints = {}, Counter(), [], []
        for region in regions:
            reading = page.evaluate(RENDER, {"region": region, "prior": prior})
            hashes.update(reading["rows"])
            checks.update(reading["checks"])
            failures.extend(reading["failures"])
            midpoints.extend(reading["midpoints"])
        return hashes, checks, failures, midpoints
    finally:
        page.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("v6")
    parser.add_argument("v7")
    parser.add_argument("out", type=Path)
    args = parser.parse_args()
    baseline_files = renderer_digest(args.v6, False)
    assert baseline_files == "523338eef6c87dc357e9b24a41f7b6943374ca2b3b6da7649069371c59cea379", "reference server differs from #568"
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH", "/usr/bin/chromium"))
        before, _, _, _ = capture(browser, args.v6, True)
        candidate_files = renderer_digest(args.v7, True)
        after, checks, failures, midpoints = capture(browser, args.v7, False)
        version = browser.version
        browser.close()
    mismatches = sorted(key for key in before.keys() | after.keys() if before.get(key) != after.get(key))
    digest = sha256(json.dumps(before, sort_keys=True).encode()).hexdigest()
    assert candidate_files == renderer_digest(args.v7, True), "V7 changed while the matrix was running"
    result = {"referenceRendererSHA256": baseline_files, "candidateRendererSHA256": candidate_files, "referencePR": 568, "referenceCommit": PIN, "chromium": version, "rgbaSize": [300, 450],
              "originalPaintings": 52, "regionDaypartWeatherCases": 52*8, "mixedRegionFades": 1,
              "matchingWindFoliageComparisons": 7*2*3, "matchingWindLightingComparisons": 4*3, "referenceAggregateSHA256": digest,
              "defaultWindHalfWipe": {
                  "scenesAndModes": len(midpoints),
                  "exactAcrossEntireFrame": sum(row["pixelCount"]==0 for row in midpoints),
                  "maxDifferingPixelsPerFrame": max(row["pixelCount"] for row in midpoints),
                  "maxChannelDeltaOf255": max(row["maxDelta"] for row in midpoints),
                  "maxDistanceFromDividerPx": max(row["maxDistance"] for row in midpoints)},
              "checks": dict(checks), "mismatchesWith568": mismatches, "failedChecks": failures}
    args.out.write_text(json.dumps(result, indent=2) + "\n")
    assert len(before) == 52*8 + 1 + 7*2*3 + 4*3 and not mismatches, mismatches
    assert not failures and all(n > 0 for n in checks.values()), failures
    print(f"{len(before)} reference comparisons, {sum(checks.values())} candidate/slider checks passed.")


if __name__ == "__main__":
    main()
