"""Check native resident replacement and its painted shadow in the formal home.

Run against a local static server serving the full release tree (including assets).
The response-only hook keeps inspection controls out of the shipped renderer.
"""
import argparse
import json
from pathlib import Path

from playwright.sync_api import sync_playwright


HERE = Path(__file__).resolve().parent
PROBE = """
    globalThis.observePandaReplacement = () => {
      const key = 'companion:panda', row = rows.get(key);
      if (scene?.navigation?.reflowGeometry && !model.snapshot().every(a => a.reflowInk)) return null;
      if (!row?.paintExtent || !scene?.navigation?.intentAware || pendingResidentPresentation) return null;
      for (const actor of rows.values()) {
        const image = actor.owner.querySelector('img.character-asset');
        if (!image?.complete || !image.naturalWidth) return null;
      }
      const feet = () => model.snapshot().map(a => [a.key, a.x, a.y]);
      const before = feet(), replacement = row.owner.cloneNode(true);
      row.owner.replaceWith(replacement);
      sync();
      const current = rows.get(key);
      if (current.owner !== replacement) throw Error('Renderer did not bind the replacement owner');
      const after = feet();
      let renewed, decision;
      if (scene.navigation.reflowGeometry) {
        model.sync(model.snapshot(), {...scene, navigation: {...scene.navigation}});
        renewed = feet();
        decision = globalThis.observedReflow;
      }
      return {before, after, renewed, decision, shadow: [parseFloat(current.shadow.style.left), parseFloat(current.shadow.style.top)]};
    };
"""


def run(origin, engine, executable, projection):
    with sync_playwright() as playwright:
        browser = getattr(playwright, engine).launch(executable_path=executable)
        page = browser.new_page(viewport={"width": 320, "height": 792}, has_touch=True,
                                is_mobile=True, device_scale_factor=2)
        seed = json.loads((HERE.parent / "fixtures/saves/real/v5-pre-items-v2.json").read_bytes())
        region = "mountain" if projection else "forest"
        seed.update(regionId=region, companions=[dict(id="panda", bond=85)])
        page.add_init_script("const seed=" + json.dumps(seed) +
                             ";seed.savedAt=Date.now();localStorage.setItem('naotocchi-save-v1', JSON.stringify(seed));")
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))

        def observe(route):
            response = route.fetch()
            source = response.text()
            anchor = "    function sync(){"
            assert source.count(anchor) == 1
            route.fulfill(response=response, body=source.replace(anchor, PROBE + anchor))

        if projection:
            def observe_projection(route):
                response = route.fetch()
                source = response.text()
                anchor = "      const changed=next.region!==scene.region"
                assert source.count(anchor) == 1 and "const reflowChoice=" in source
                route.fulfill(response=response, body=source.replace(anchor, "      globalThis.observedReflow=reflowChoice;\n" + anchor))
            page.route("**/home-production-model.js*", observe_projection)
        page.route("**/home-production-diorama.js*", observe)
        page.goto(origin, wait_until="domcontentloaded", timeout=120000)
        observation = page.wait_for_function("globalThis.observePandaReplacement?.()",
                                             polling=300, timeout=120000).json_value()
        assert not errors, errors
        assert len(observation["before"]) == 2 and observation["before"] == observation["after"], observation
        panda = next(foot[1:] for foot in observation["after"] if foot[0] == "companion:panda")
        assert max(abs(a - b) for a, b in zip(panda, observation["shadow"])) < .001, observation
        if projection:
            assert observation["decision"]["held"] and observation["renewed"] == observation["after"], observation
        return dict(engine=engine, version=browser.version, viewport=[320,792],
                    region=region, pageErrors=errors, **observation)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("origin")
    parser.add_argument("--engine", choices=["chromium", "webkit"], required=True)
    parser.add_argument("--executable")
    parser.add_argument("--projection", action="store_true", help="Requires a private V12-patched release tree")
    args = parser.parse_args()
    print(json.dumps(run(args.origin, args.engine, args.executable, args.projection), ensure_ascii=False, indent=2))
