"""Verify V2 byte identity and the exact V3 differences in the native game entry."""
import argparse
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path

PIN = "7e0a8cd6a506142fbe65b9ca6fd4ff4f855d4e9a"
V2 = "41e3c1643927fda017d6dd16688129221bb80714a3bd89b86237a176e195b79c"
EXTRAS = {
    "v3/index.html", "v3/style.css", "v3/shell-model.mjs", "v3/controls.mjs",
    "game/cast-limit.js", "game/limit.html", "game/limit-seating.js",
    "game/home-production-world-limit.mjs", "game/home-production-diorama-limit.js",
}


def inventory(root):
    return {p.relative_to(root).as_posix(): hashlib.sha256(p.read_bytes()).digest()
            for p in root.rglob("*") if p.is_file()}

def manifest_hash(files):
    h = hashlib.sha256()
    for name in sorted(files, key=lambda s:s.encode()):
        h.update(name.encode() + b"\0" + files[name])
    return h.hexdigest()


class Viewport(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "meta" and values.get("name") == "viewport":
            self.meta.append(values["content"])


def viewport(html):
    parser = Viewport()
    parser.feed(html)
    assert len(parser.meta) == 1
    return parser.meta[0]


def verify(base, trial):
    before, after = inventory(base), inventory(trial)
    assert manifest_hash(before) == V2 and len(before) == 3900, "Unexpected V2 baseline"
    changed = [k for k in before if before[k] != after.get(k)]
    assert not changed, changed
    additions = set(after) - set(before)
    assert additions == EXTRAS, sorted(additions ^ EXTRAS)

    def read(name):
        return (trial / "game" / name).read_text()

    # All game markup, <meta>, fixture, render surface and save initialization
    # must remain identical apart from the three script tags loading the trial.
    prior_html = read("final.html")
    new_html = read("limit.html")
    restored_html = new_html.replace("home-production-diorama-limit.js", "home-production-diorama-v2.js")
    restored_html = restored_html.replace('<script src="limit-seating.js"></script>', "")
    restored_html = restored_html.replace('<script src="cast-limit.js"></script>', '<script src="cast-final.js"></script>')
    assert restored_html == prior_html
    assert viewport((trial / "v3/index.html").read_text()) == viewport((base / "index.html").read_text())

    # Keep the entire controller (pinch behavior, stage and resident extents,
    # selection, occupancy, conversation, input and simulation clock) byte exact
    # after undoing only which sibling world module is imported.
    controller = read("home-production-diorama-limit.js")
    assert controller.count("import('./home-production-world-limit.mjs?") == 1
    assert controller.replace("import('./home-production-world-limit.mjs?",
                              "import('./home-production-world-v2.mjs?") == read("home-production-diorama-v2.js")
    assert all(token not in controller for token in ("diorama-view", "いつもの表示", "みんなを見る", "args.overview"))
    extra = "   nav=win.HomeLimitSeats.withOpeningSeats(nav,spec,win.innerWidth,win.innerHeight);\n"
    world = read("home-production-world-limit.mjs")
    assert world.count(extra) == 1
    assert world.replace(extra, "") == read("home-production-world-v2.mjs")
    return {"reference":PIN, "baselineSHA256":V2, "trialSHA256":manifest_hash(after),
            "trialFiles":len(after), "identicalPublishedV2Files":len(before),
            "additions":{name:after[name].hex() for name in sorted(additions)}, "nativeGameEntryOnlySwitchesTrialScripts":True,
            "nativeControllerOnlyDifferentWorldImport":True, "nativeWorldOnlyAddsOpeningSeats":True,
            "parentViewportMeta":viewport((trial / "v3/index.html").read_text()),
            "gameViewportMeta":viewport(new_html), "overviewRemoved":True,
            "unchangedModelSHA256":before["game/home-production-model.js"].hex(),
            "unchangedNativeScriptSHA256":before["game/script-v2.js"].hex(),
            "approvedLeafAndEnvironmentModules":sum(k.startswith("game/beauty/") and k.endswith(".mjs") for k in before)}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("baseline", type=Path)
    parser.add_argument("trial", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    report = verify(args.baseline, args.trial)
    args.out.write_text(json.dumps(report, indent=2) + "\n")
    print(report)
