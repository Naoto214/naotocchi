"""Replay a settled forest foot across the shipped native relationship-expression render."""

import argparse
import hashlib
import json
import os
import re
from pathlib import Path

from playwright.sync_api import sync_playwright
from regional import seed, serve, once


MODEL = """    window.placeTestPanda = p => Object.assign(actor('companion:panda'),p,{target:null,route:[]});
"""
GAME = """  window.reactWithCat = () => {
    const cat=state.companions.find(c=>c.id==='cat_friend');
    startRelationshipPositive('companion',cat);render();
  };
"""
RENDER = """
    window.companionRebuildTest = () => {
      const key='companion:panda', old=rows.get(key);
      if(!old?.paintExtent || !scene.navigation || pendingResidentPresentation || rows.size!==28)return null;
      const feet=()=>Object.fromEntries(model.snapshot().map(a=>[a.key,[a.x,a.y]]));
      const actor=model.snapshot().find(a=>a.key===key), bounds=model.bounds(actor);
      const p=env.NaotocchiHomeViewport.residentPresentation();
      if(!p || !world?.stats().loaded)return null;
      const scale=[p.scaleX,p.scaleY];
      // The archived V11 witness was at (113.7303,370.135). Use a legal foot
      // at the current camera's lower walking bound, with the native 28 shapes.
      const goal={x:113.76933759823137,y:Math.min(370.1350683886255,bounds.bottom)};
      if(!scene.navigation.valid(goal)||!visibleAt(goal,actor))throw Error('Forest foot unavailable');
      const opening=feet();
      placeTestPanda(goal);sync();
      const before=feet();sync();
      const control=feet();
      reactWithCat();
      const after=feet(),current=rows.get(key),cat=rows.get('companion:cat_friend');
      return {opening,before,control,after,goal,scale,replaced:current.owner!==old.owner,
        expression:cat.owner.querySelector('img').getAttribute('src'),
        boundBefore:bounds,boundAfter:model.bounds(actor),
        shadow:[parseFloat(current.shadow.style.left),parseFloat(current.shadow.style.top)]};
    };
"""


def observe(browser, root):
    page = browser.new_page(viewport=dict(width=320, height=792), device_scale_factor=2,
                            has_touch=True, is_mobile=True)
    save = json.dumps(seed('forest', 28))
    page.add_init_script(f"const s={save};s.savedAt=Date.now();localStorage.setItem('naotocchi-save-v1',JSON.stringify(s));"
                         "localStorage.setItem('naotocchi-save-v1:home-guide-v1','done');")
    hashes = {}
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))

    def hook(route):
        name = route.request.url.partition('?')[0].rsplit('/', 1)[-1]
        source = (root / name).read_text()
        hashes[name] = hashlib.sha256(source.encode()).hexdigest()
        if name == 'home-production-model.js':
            anchor = '    return {metrics:'
            source = once(source, anchor, MODEL + anchor)
            # Freeze spontaneous walking between load and replay.
            anchor = 'function step(dt,flags={}){'
            source = once(source, anchor, anchor + 'if(dt>0)return;')
        elif name == 'script.js':
            anchor = '  globalThis.__naotocchiBooted = true;'
            source = once(source, anchor, GAME + anchor)
        else:
            anchor = '    function sync(){'
            source = once(source, anchor, RENDER + anchor)
        route.fulfill(content_type='text/javascript', body=source)

    page.route(re.compile(r'/(?:home-production-(?:model|diorama)|script)\.js(?:\?|$)'), hook)
    page.goto(serve(root), wait_until='domcontentloaded', timeout=120000)
    result = page.wait_for_function('window.companionRebuildTest?.()', polling=300, timeout=120000).json_value()
    page.close()
    assert not errors, errors
    assert result['replaced'] and result['expression'].endswith('/cat_friend/positive.png'), result
    assert result['before'] == result['control'], 'Ordinary sync moved an established resident'
    assert len(result['before']) == 28 and result['before']['companion:panda'] == [result['goal']['x'], result['goal']['y']]
    result['hashes'] = hashes
    return result


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('production', type=Path)
    p.add_argument('candidate', type=Path)
    p.add_argument('output', type=Path)
    p.add_argument('--engine', choices=['chromium', 'webkit'], default='chromium')
    p.add_argument('--executable', default=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'))
    args = p.parse_args()
    with sync_playwright() as pw:
        browser = getattr(pw, args.engine).launch(executable_path=args.executable)
        data = {arm: observe(browser, path) for arm, path in [('production', args.production), ('candidate', args.candidate)]}
        old, new = data.values()
        key = 'companion:panda'
        assert old['opening'] == new['opening']
        assert old['control'][key] != old['after'][key]
        assert new['control'] == new['after']
        assert new['boundBefore'] == new['boundAfter']
        assert max(abs(a-b) for a,b in zip(new['shadow'],new['after'][key])) < .001
        args.output.write_text(json.dumps(dict(engine=args.engine, version=browser.version, **data), indent=2)+'\n')
        browser.close()


if __name__ == '__main__':
    main()
