"""Compare the V4 source and delivered game to the pinned V3 trial."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys

# Use V3's original manifest format so its published digest stays comparable.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "home-cast-size-v3"))
from verify_protection_package import inventory, manifest_hash

V3_COMMIT = "a6e257fef32ea2f0664b8c9fbed761f60ab63cb0"
V3_MANIFEST = "c98b1de105f27b97fe5c2fd0e9f83b5ce1621d248e0c315c45c59c299c9ecc2c"
EXCEPTIONS = "tools/work/storage-exceptions.json"
ARCHIVES = {
    "comparisons/home-cast-size-v3/evidence/geometry-fixtures.tar.gz":
        "ffad2ba54a08e5c0363886af22a11e7641b7a9ac69a19b55f7f64345e5429b0b",
    "comparisons/home-cast-size-v3/evidence/perf-grid-raw.tar.gz":
        "207083fec9444126166acf4406f667da9637917a8c2510337f85d67095ff610e",
}
WORKFLOWS = {".github/workflows/home-cast-size-v4.yml", ".github/workflows/home-cast-size-v4-matrix.yml"}
PACKAGE_ADDITIONS = {
    "v4/index.html", "v4/style.css", "v4/controls.mjs", "v4/shell-model.mjs",
    "game/population.html", "game/population-policy.js", "game/population-seating.js",
    "game/population-beauty.js", "game/cast-population.js",
    "game/home-production-world-population.mjs", "game/home-production-diorama-population.js",
}


def git(repo, *arguments):
    return subprocess.check_output(["git", "-C", str(repo), *arguments])


def tree(repo, revision):
    paths = {}
    for entry in git(repo, "ls-tree", "-rz", revision).split(b"\0"):
        if entry:
            mode_type_blob, path = entry.split(b"\t", 1)
            paths[path.decode()] = mode_type_blob
    return paths


def verify_paths(before, after, additions):
    changed = sorted(key for key, value in before.items() if value != after.get(key))
    if changed:
        raise ValueError(f"Missing or modified prior paths: {changed}")
    differences = (after.keys() - before.keys()) ^ additions
    if differences:
        raise ValueError(f"Unexpected or missing additions: {sorted(differences)}")


def verify_source(repo, reference, head):
    before, after = tree(reference, V3_COMMIT), tree(repo, head)
    additions = {name for name in after if name.startswith("comparisons/home-cast-size-v4/")} | WORKFLOWS
    before.pop(EXCEPTIONS)
    after.pop(EXCEPTIONS)
    verify_paths(before, after, additions)
    previous = json.loads(git(reference, "show", f"{V3_COMMIT}:{EXCEPTIONS}"))
    current = json.loads(git(repo, "show", f"{head}:{EXCEPTIONS}"))
    verify_paths(previous, current, set(ARCHIVES))
    for path, expected_hash in ARCHIVES.items():
        entry = current[path]
        actual_hash = hashlib.sha256(git(repo, "show", f"{head}:{path}")).hexdigest()
        if (actual_hash != expected_hash or entry["sha256"] != expected_hash
                or not isinstance(entry["reason"], str) or not entry["reason"].strip()):
            raise ValueError(f"Incorrect evidence declaration for {path}")
    return {"reference": V3_COMMIT, "candidate": git(repo, "rev-parse", "--verify", head).decode().strip(),
            "preservedSourcePaths": len(before),
            "addedSourcePaths": len(additions), "evidenceSHA256": ARCHIVES}


V4_GAME_BEFORE_FIT = "5ba0ca7a051eefba377f54dd0bc05c1e7b90ca3f5cc00cea0ad26ef841bc71d3"
CONTROLLER = "home-production-diorama-population.js"
FIT_SHA256 = "805d7bfdf0bb5c70109c1efd6def649cd1cdc7babc52735bfc832a2ae0abceaa"


def reviewed_fit_insertion(controller):
    prefix = "    const retainOpeningFit = ("
    suffix = (")(() => { stage.dataset.populationFitRecoveries=String(Number(stage.dataset.populationFitRecoveries||0)+1); });\n"
              "    let residentEnvelopeKey='';")
    text = controller.read_text()
    if text.count(prefix) != 1 or text.count(suffix) != 1:
        raise ValueError("Expected exactly one startup-fit closure in the V4 controller")
    body = text.split(prefix)[1].split(suffix)[0]
    if hashlib.sha256(body.encode()).hexdigest() != FIT_SHA256:
        raise ValueError("Unreviewed startup-fit closure")
    return prefix + body + suffix


def undo_reviewed(data, edits, filename):
    for new, old in edits:
        needle = new.encode()
        if data.count(needle) != 1:
            raise ValueError(f"Expected exactly one reviewed edit in {filename}")
        data = data.replace(needle, old.encode())
    return data


def restore_controller_before_fit(controller):
    edits = [
        (reviewed_fit_insertion(controller), "    let residentEnvelopeKey='';"),
        ("if(retainOpeningFit(stage.__homeResidentEnvelope,value,[scene.region,env.innerWidth,env.innerHeight,...rows.keys()].join('/'),env.NaotocchiHomeViewport?.residentPresentation?.()))return;",
         "if(JSON.stringify(value)===JSON.stringify(stage.__homeResidentEnvelope))return;"),
        ("        if([...rows.values()].some(row=>!row.shadow.isConnected||!row.shadow.style.left||!row.shadow.style.top||!(parseFloat(row.shadow.style.width)>0)))return null;\n"
         "        const metrics=JSON.parse(stage.dataset.livingMetrics||'{}');",
         "        const metrics=JSON.parse(stage.dataset.livingMetrics||'{}');"),
    ]
    return undo_reviewed(controller.read_bytes(), edits, controller.name)


def verify_native(baseline, trial):
    # Reverse only the reviewed substitutions, then compare the complete game
    # entry and active scripts, including input, navigation and camera logic.
    replacements = {
        ("limit.html", "population.html"): [
            ('<script src="population-policy.js"></script><script src="population-beauty.js"></script>',
             '<script src="beauty/bridge.js"></script>'),
            ("population-seating.js", "limit-seating.js"),
            ("cast-population.js", "cast-limit.js"),
            ("home-production-diorama-population.js", "home-production-diorama-limit.js"),
        ],
        ("beauty/bridge.js", "population-beauty.js"): [
            ("api.settings?.count ?? window.HomePopulationPolicy.normalizeCount(s.count)",
             "[1,4,10,20,28].includes(Number(s.count)) ? Number(s.count) : 28"),
        ],
        ("home-production-world-limit.mjs", "home-production-world-population.mjs"): [
            ("win.HomePopulationSeats.withOpeningSeats", "win.HomeLimitSeats.withOpeningSeats"),
        ],
        ("home-production-diorama-limit.js", "home-production-diorama-population.js"): [
            ("import('./home-production-world-population.mjs?", "import('./home-production-world-limit.mjs?"),
            ("roleScale=env.HomeCastTrial.scale(a.kind),depthScale=(scene.navigation?.depthScale?.(a)||1)*roleScale",
             "depthScale=(scene.navigation?.depthScale?.(a)||1)*env.HomeCastTrial.scale(a.kind)"),
            ("bod,roleScale,depthScale.toFixed(4),dx", "bod,depthScale.toFixed(4),dx"),
            ("bod,roleScale,depthScale.toFixed(4),cacheKey", "bod,depthScale.toFixed(4),cacheKey"),
        ],
    }
    for (prior, sibling), edits in replacements.items():
        file = trial / sibling
        data = restore_controller_before_fit(file) if sibling == CONTROLLER else file.read_bytes()
        data = undo_reviewed(data, edits, sibling)
        if data != (baseline / prior).read_bytes():
            raise ValueError(f"Unreviewed game changes in {sibling}")
    return [sibling for prior, sibling in replacements]


def verify_package(baseline, trial):
    before_trace = inventory(baseline)
    before_sha = manifest_hash(before_trace)
    if len(before_trace) != 3909 or before_sha != V3_MANIFEST:
        raise ValueError(f"Unexpected V3 package: {len(before_trace)} files, SHA-256 {before_sha}")
    if any(path.is_symlink() for root in (baseline, trial) for path in root.rglob("*")):
        raise ValueError("Unexpected symlink in the game package")
    candidate = inventory(trial)
    verify_paths(before_trace, candidate, PACKAGE_ADDITIONS)
    # The seven V4 game files were present in the pre-repair build.
    # Restore only the fit edit and compare the entire 3,904-file game directory.
    game = {path.removeprefix("game/"): digest for path, digest in candidate.items() if path.startswith("game/")}
    before_controller = restore_controller_before_fit(trial / "game" / CONTROLLER)
    game[CONTROLLER] = hashlib.sha256(before_controller).digest()
    if manifest_hash(game) != V4_GAME_BEFORE_FIT:
        raise ValueError("Another game byte changed since the V4 startup baseline")
    return {"identicalV3Files": len(before_trace), "v3SHA256": before_sha,
            "nativeScriptsCompared": verify_native(baseline / "game", trial / "game"),
            "startupFit": {"priorV4Commit": "e9cbfd3dc714179356ab81db838a52e209708689",
                           "reviewedFunctionSHA256": FIT_SHA256, "restoredV4GameSHA256": V4_GAME_BEFORE_FIT,
                           "changedGameFile": CONTROLLER, "unchangedGameFiles": len(game) - 1,
                           "restoredControllerSHA256": game[CONTROLLER].hex()},
            "v4Files": len(candidate), "v4SHA256": manifest_hash(candidate),
            "addedSHA256": {path: candidate[path].hex() for path in sorted(PACKAGE_ADDITIONS)}}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("baseline", type=Path, help="Built V3 distribution")
    parser.add_argument("trial", type=Path, help="Built V4 distribution")
    parser.add_argument("--repo", type=Path, default=Path("."))
    parser.add_argument("--reference", type=Path, default=Path("."), help="Checkout containing the pinned V3 commit")
    parser.add_argument("--head", default="HEAD")
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    report = {"source": verify_source(args.repo, args.reference, args.head),
              "package": verify_package(args.baseline, args.trial)}
    result = json.dumps(report, indent=2) + "\n"
    if args.out:
        args.out.write_text(result)
    print(result, end="")
