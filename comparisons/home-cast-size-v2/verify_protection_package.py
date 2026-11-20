"""Verify a final private bundle against the pinned #570 game and old shell."""
import argparse
import hashlib
import json
from pathlib import Path
import re
from html.parser import HTMLParser

REF = "e7d881b825622efddac61857075c2c1658da706f"
REF_GAME = "39aae86b5961166f97eace2d9e3c9086d616c2bc4182e9beeb51167fef7a3484"
FINAL = {"final.html", "cast-final.js", "seating.js", "home-production-world-v2.mjs",
         "home-production-diorama-v2.js", "script-v2.js"}
SHELL = ["index.html", "style.css", "controls.mjs"]


class ScriptList(HTMLParser):
    def __init__(self):
        super().__init__()
        self.scripts = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "script" and "src" in attributes:
            self.scripts.append(attributes["src"].split("?")[0])


def digests(directory):
    return {p.relative_to(directory).as_posix(): hashlib.sha256(p.read_bytes()).digest()
            for p in sorted(directory.rglob("*")) if p.is_file()}


def proof(reference, trial):
    old = digests(reference / "game")
    new = digests(trial / "game")
    h = hashlib.sha256()
    for key in sorted(old, key=lambda s: s.encode()):
        h.update(key.encode() + b"\0" + old[key])
    assert h.hexdigest() == REF_GAME, "The provided old game does not match the checked #570 package"
    mismatch = [k for k, digest in old.items() if new.get(k) != digest]
    assert not mismatch, mismatch
    added = new.keys() - old.keys()
    assert added == FINAL, sorted(added)
    for name in SHELL:
        assert (reference / name).read_bytes() == (trial / "v1" / name).read_bytes(), name

    def load(name):
        return (trial / "game" / name).read_text()

    expected_script = load("script.js").replace("overview:homeDiorama?.overview()||false,", "")
    expected_script = expected_script.replace("      onViewChange:()=>{homeCastLayoutKey='';renderHomeCast();},\n", "")
    assert expected_script == load("script-v2.js"), "There are other main game-script changes"
    controller = load("home-production-diorama-v2.js")
    for marker in ("みんなを見る", "いつもの表示", "diorama-view", "onViewChange", "overview:", "args.overview"):
        assert marker not in controller, marker
    old_controller = load("home-production-diorama.js")
    # Input hit selection, drag issuance, walking, camera bounds, shared feet and
    # the model update loop were already integrated in #570. Compare these
    # sections directly, including their real rendered/picked size factors.
    spans = [("    function showGuide()", "    function ensureWorld()"),
             ("    function actorBounds(", "    function sync()"),
             ("    function paint()", "    function update("),
             ("    function point(", "    function presentationChanged()")]
    unchanged_spans = []
    for start, end in spans:
        for source in (controller,old_controller):
            assert source.count(start) == 1 and source.count(end) == 1, (start,end)
        before=old_controller[old_controller.index(start):old_controller.index(end,old_controller.index(start))]
        after=controller[controller.index(start):controller.index(end,controller.index(start))]
        assert before == after,start
        unchanged_spans.append(start.strip().split("(")[0].removeprefix("function "))
    native_world = load("home-production-world.mjs")
    final_world = load("home-production-world-v2.mjs")
    start, end = " function navigation(rect){", " function draw(dt,flags={})"
    assert final_world[:final_world.index(start)] == native_world[:native_world.index(start)]
    assert final_world[final_world.index(end):] == native_world[native_world.index(end):]
    old_scripts, scripts = ScriptList(), ScriptList()
    old_scripts.feed(load("index.html"))
    scripts.feed(load("final.html"))
    changed = {"script.js":"script-v2.js", "cast-trial.js":"cast-final.js",
               "home-production-diorama.js":"home-production-diorama-v2.js"}
    assert [s for s in scripts.scripts if s != "seating.js"] == [changed.get(s, s) for s in old_scripts.scripts]
    assert scripts.scripts.count("seating.js") == 1
    assert "home-diorama.js" not in scripts.scripts and "home-production-model.js" in scripts.scripts

    # Parse the exported curated list; do not count intermediate painting revisions.
    sources = set(re.findall(r'"(?:morning|day|evening|night)"\s*:\s*"([^"]+?)"', load("home-dayparts.mjs")))
    assert len(sources) == 52 and sources <= old.keys()
    art = sum(k.startswith("assets/characters/") for k in old)
    music = sum(k.startswith("assets/bgm/") and k.endswith((".m4a",".mp3",".ogg")) for k in old)
    assert music == 32
    return {"reference": REF, "referenceGameSHA256": h.hexdigest(),
            "byteIdenticalGameFiles": len(old), "newFinalGameFiles": sorted(added),
            "archivedShellByteIdentical": SHELL, "officialPaintings":len(sources), "characterAssetFiles":art,
            "bgmTracks":music, "cardGameFiles":sum(k.startswith("prototypes/card-game/") for k in old),
            "natureModules":sum(k.startswith("beauty/") and k.endswith(".mjs") for k in old),
            "residentModelSHA256":old["home-production-model.js"].hex(),
            "unchangedControllerSections":unchanged_spans,
            "unchangedWorldExceptNavigationFactory":True,
            "nativeCoreChanges":["remove overview from layout parameters", "remove overview callback"],
            "finalLoadsFormerOverview":False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("reference", type=Path)
    parser.add_argument("trial", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    info = proof(args.reference, args.trial)
    args.out.write_text(json.dumps(info, indent=2)+"\n")
    print(info)
