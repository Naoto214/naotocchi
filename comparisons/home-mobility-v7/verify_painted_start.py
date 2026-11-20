"""Hold the real daypart image and check the owner shell's first painted scene."""
import argparse
import asyncio
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
from playwright.async_api import async_playwright


TRACE_PAINT = """(() => {
  const draw = CanvasRenderingContext2D.prototype.drawImage;
  window.paintedSources = new Map();
  CanvasRenderingContext2D.prototype.drawImage = function(image, ...args) {
    const result = draw.call(this, image, ...args);
    if (image?.src && (image.src.includes('forest') || image.src.includes('/dayparts-')) && !paintedSources.has(image.src))
      paintedSources.set(image.src, performance.now());
    return result;
  };
})()"""

SAMPLE = """async () => {
  const canvas = document.querySelector('.home-art-canvas');
  const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  return {
    clock: HomeBeauty.clockSeconds, documentState: document.readyState,
    shellReady: parent.document.body.dataset.ready === 'true', castReady: HomeCastTrial.ready,
    painted: Array.from(paintedSources, ([url, ms]) => [new URL(url).pathname, ms]),
    announcedPicture: canvas.dataset.mobilityPainting,
    sha256: Array.from(bytes, v => v.toString(16).padStart(2, '0')).join(''),
    rect: HomeBeauty.paintRect,
  };
}"""


async def observe(args):
    started = datetime.now(timezone.utc).isoformat(timespec='seconds')
    async with async_playwright() as playwright:
        engine = getattr(playwright, args.engine)
        browser = await engine.launch(executable_path=args.executable)
        try:
            ctx = await browser.new_context(viewport={'width': 430, 'height': 812},
                                            device_scale_factor=2, has_touch=True, is_mobile=True)
            intercepted, release = asyncio.Event(), asyncio.Event()

            async def delayed(route):
                intercepted.set()
                await release.wait()
                await route.continue_()

            await ctx.route('**/forest-day.webp*', delayed)
            await ctx.add_init_script(TRACE_PAINT)
            page = await ctx.new_page()
            await page.goto(args.origin.rstrip('/')+'/v7/?arm=v7&region=forest&count=28&paused=1',
                            wait_until='commit')
            await asyncio.wait_for(intercepted.wait(), 60)
            frame = next(f for f in page.frames if 'mobility-v7.html' in f.url)
            await frame.wait_for_function(
                "Array.from(paintedSources.keys()).some(s => s.endsWith('/forest-waterfall.webp'))",
                timeout=120000)
            # Exceed the native fallback's 3.5s readiness threshold after the
            # legacy picture actually reaches a canvas.
            await asyncio.sleep(7)
            await frame.wait_for_function('window.HomeCastTrial?.ready', timeout=120000)
            held = await frame.evaluate(SAMPLE)
            release.set()
            await frame.wait_for_function(
                "parent.document.body.dataset.ready === 'true' && "
                "Array.from(paintedSources.keys()).some(s => s.endsWith('/forest-day.webp'))",
                timeout=120000)
            released = await frame.evaluate(SAMPLE)
            await asyncio.sleep(3.6)
            settled = await frame.evaluate(SAMPLE)
            output = {'startedUTC': started, 'engine': args.engine, 'version': browser.version,
                      'arm': 'v7', 'count': 28, 'width': 430, 'heldMinimumAfterFallbackSeconds': 7,
                      'held': held, 'released': released, 'settled': settled}
            world = await frame.evaluate("""performance.getEntriesByType('resource')
                .find(r => r.name.includes('home-production-world-mobility.mjs'))?.name""")
            if world:
                served = await ctx.request.get(world)
                assert served.ok
                output['servedWorldSHA256'] = hashlib.sha256(await served.body()).hexdigest()
            if args.switch:
                output['switches'] = []
                await page.locator('#settings-toggle').tap()
                for control,value,filename in [('region','city','city-day.webp'),('time','night','city-night.webp')]:
                    await page.locator('#'+control).select_option(value)
                    await page.wait_for_function("""name => {
                      const win = document.getElementById('home')?.contentWindow;
                      const canvas = win?.document.querySelector('.home-art-canvas');
                      return document.body.dataset.ready === 'true' &&
                        canvas?.dataset.mobilityPainting?.endsWith('/'+name);
                    }""", arg=filename, timeout=120000)
                    child = next(f for f in page.frames if 'mobility-v7.html' in f.url)
                    result = await child.evaluate(SAMPLE)
                    assert result['shellReady'] and result['announcedPicture'].endswith('/'+filename)
                    assert any(path.endswith('/'+filename) for path, _ in result['painted'])
                    output['switches'].append({'control':control, 'value':value, **result})
            args.out.write_text(json.dumps(output, ensure_ascii=False, indent=2)+'\n')
            assert held['clock'] == released['clock'] == settled['clock'] == 0
            assert all(not path.endswith('forest-day.webp') for path, _ in held['painted'])
            assert held['sha256'] != released['sha256'] == settled['sha256']
            assert released['shellReady'] and settled['shellReady']
            if args.expect_fixed:
                assert held['castReady'] and not held['shellReady'], 'Owner shell announced ready with only fallback paint'
        finally:
            await browser.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--engine', choices=['webkit','chromium'], required=True)
    parser.add_argument('--executable')
    parser.add_argument('--origin', default='http://127.0.0.1:8377')
    parser.add_argument('--expect-fixed', action='store_true')
    parser.add_argument('--switch', action='store_true')
    parser.add_argument('--out', required=True, type=Path)
    asyncio.run(observe(parser.parse_args()))
