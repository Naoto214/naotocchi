"""Reuse V11's native care, rendering and save-record drivers against compiled V12 assets."""

import argparse
from pathlib import Path
import sys

HERE = Path(__file__).resolve().parent
OLD = HERE.parent / "home-mobility-v11"
sys.path.insert(0, str(OLD))
import foot_replacement as replace


def drive(suite, out, arguments):
    source = (OLD / (suite + ".py")).read_text()
    if suite == "foot_corridor_ui":
        source = source.replace("/v11/corridor.html", "/v12/corridor.html")
        old = """                    page.locator("#region").select_option(region)
                    page.locator("[data-mode=" + mode + "]").tap()"""
        new = """                    if page.locator("#region").input_value()!=region:
                        page.locator("#region").select_option(region)
                        page.wait_for_function("document.body.dataset.ready==='true'")
                    switch=page.locator("[data-mode=" + mode + "]")
                    if switch.get_attribute("aria-pressed")!="true":switch.tap()"""
        assert source.count(old) == 1
        source = source.replace(old, new)

    elif suite == "foot_save":
        source = source.replace(
            'renderer = (dist / "game" / RENDER).read_text()',
            'renderer = (dist / "game" / ("home-production-diorama-mobility-v12.js" if arm=="v11-foot" else "home-production-diorama-mobility-v11.js")).read_text()',
        )
        source = source.replace(
            '        renderer = patched(renderer, "patchFoot")', "        pass"
        )
        source = source.replace(
            "RENDER: replace_once(renderer",
            '("home-production-diorama-mobility-v12.js" if arm=="v11-foot" else "home-production-diorama-mobility-v11.js"): replace_once(renderer',
        )
        source = source.replace(
            '"/game/mobility-v10.html?"',
            '("/game/mobility-v12.html?" if arm=="v11-foot" else "/game/mobility-v11-foot.html?")',
        )
        source = source.replace(
            '("v10", "v11-foot")', '("v11-ref", "v11-foot")'
        ).replace('trials["v10"]', 'trials["v11-ref"]')
        source = source.replace(
            "trials[arm] = dict(", 'trials["v12" if arm=="v11-foot" else arm] = dict('
        ).replace('trials["v11-foot"]', 'trials["v12"]')
    elif suite == "foot_replacement":
        source = source.replace(
            "home-production-model-mobility-v10.js",
            "home-production-model-mobility-v12.js",
        ).replace(
            "home-production-diorama-mobility-v10.js",
            "home-production-diorama-mobility-v12.js",
        )
        source = source.replace(
            '"/game/mobility-v10.html?"', '"/game/mobility-v12.html?"'
        )
        source = source.replace('s = patched(s, "patchFoot")', "pass").replace(
            "    def hook(route):",
            "    page.set_default_timeout(120000)\n\n    def hook(route):",
        )
    else:
        replace.MODEL = "home-production-model-mobility-v12.js"
        replace.RENDER = "home-production-diorama-mobility-v12.js"
        original = replace.patched
        replace.patched = lambda s, kind: (
            s if kind == "patchFoot" else original(s, kind)
        )
        source = source.replace(
            '"/game/mobility-v10.html?"', '"/game/mobility-v12.html?"'
        )
    sys.argv = [
        suite,
        *arguments[:1],
        *(["--out"] if suite == "foot_replacement" else []),
        out,
        *arguments[1:],
    ]
    exec(
        compile(source, str(OLD / (suite + ".py")), "exec"),
        {"__name__": "__main__", "__file__": str(OLD / (suite + ".py"))},
    )


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "suite",
        choices=[
            "foot_transitions",
            "foot_save",
            "foot_replacement",
            "foot_corridor_ui",
        ],
    )
    p.add_argument("dist")
    p.add_argument("out")
    opts, other = p.parse_known_args()
    drive(opts.suite, opts.out, [opts.dist, *other])
