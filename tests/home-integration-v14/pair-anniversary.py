"""Exercise a naturally earned anniversary while the portrait viewport module is delayed."""
import argparse
import importlib.util
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

spec = importlib.util.spec_from_file_location('pair_lifecycle', Path(__file__).with_name('pair-lifecycle.py'))
lifecycle = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lifecycle)


def run(browser, base, out):
    context = browser.new_context(viewport={'width': 320, 'height': 516}, device_scale_factor=2,
                                  is_mobile=True, has_touch=True, locale='ja-JP', timezone_id='Asia/Tokyo')
    page = context.new_page()
    page.set_default_timeout(180000)
    errors, pending = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('**/home-production-touch.js*', lambda route: pending.append(route))
    page.goto(base)
    page.locator('[name=region]').select_option('forest')
    page.locator('[name=count]').select_option('10')
    page.locator('#scenario button').first.click(no_wait_after=True)
    page.wait_for_url('**/game/trial.html', wait_until='commit')
    movie = page.locator('#dateOverlay:not(.hidden) #dateMovie:not(.hidden)')
    movie.wait_for(state='visible')
    title = page.locator('#dateMoviePlace').inner_text()
    assert 'きねんび' in title, title
    assert len(pending) == 1
    def sample(label):
        return page.evaluate('label=>pairSample(label)', label)
    events = [sample('anniversary-before-viewport-script')]
    pending.pop().continue_()
    page.wait_for_function("document.readyState==='complete' && !!window.NaotocchiHomeViewport")
    page.evaluate('() => new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
    events.append(sample('viewport-loaded-while-anniversary-visible'))
    assert movie.is_visible()
    premature = page.evaluate("pairStages.filter(s=>s.label==='completed-pair-seating')")
    page.screenshot(path=out/'anniversary.jpg', type='jpeg', quality=76, scale='css')
    for button in ['#dateMovieSkipBtn', '#dateMovieCloseBtn']:
        control = page.locator(button)
        if control.is_visible():
            events.append({'label':button,'ms':page.evaluate('Math.round(performance.now())')})
            control.click()
    page.wait_for_function('window.pairReady && pairReady(10)')
    events.extend(page.evaluate("pairStages.filter(s=>s.label==='completed-pair-seating')"))
    events.append(sample('visible-home-after-anniversary'))
    page.wait_for_function("window.pairCanvas && pairSample('paint-check').projection===pairCanvas.revision")
    events.append(sample('home-after-current-camera-paint'))
    page.wait_for_timeout(1800)
    events.append(sample('home-after-1800ms'))
    history = page.evaluate("pairStages.filter(s=>(s.input||[]).length===2).slice(0,1)")
    page.screenshot(path=out/'home.jpg', type='jpeg', quality=76, scale='css')
    result = dict(browser=browser.version,title=title,errors=errors,events=events,
                  completedSeatingBeforeDismissal=premature, firstPairCast=history)
    (out/'anniversary.json').write_text(json.dumps(result,ensure_ascii=False)+'\n')
    assert not errors and not premature
    assert any(s.get('camera') and s['label']=='completed-pair-seating' for s in events)
    context.close()


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root',type=Path);parser.add_argument('out',type=Path)
    parser.add_argument('--executable',required=True);parser.add_argument('--assets',type=Path)
    args=parser.parse_args()
    args.out.mkdir(parents=True,exist_ok=True)
    server=lifecycle.serve(args.root,args.assets)
    try:
        with sync_playwright() as pw:
            browser=pw.webkit.launch(executable_path=args.executable)
            run(browser,f'http://127.0.0.1:{server.server_port}',args.out)
            browser.close()
    finally:
        server.shutdown()
