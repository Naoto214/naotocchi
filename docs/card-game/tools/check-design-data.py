#!/usr/bin/env python3
"""Read-only source/ID/curve audit. Not a card-game simulator or rules validator.

Run from any directory with Python 3 and Node.js:
  python docs/card-game/tools/check-design-data.py
"""
import collections
from decimal import Decimal, ROUND_HALF_UP
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
DOCS = ROOT / "docs/card-game"
errors = []


def check(ok, message):
    if not ok:
        errors.append(message)


def doc(number):
    matches = list(DOCS.glob(f"{number:02d}-*.md"))
    if len(matches) != 1:
        raise ValueError(f"Expected one document for {number}: {matches}")
    return matches[0].read_text()


def rows(text):
    return [[c.strip().strip("`") for c in line.strip("|").split("|")]
            for line in text.splitlines() if line.startswith("|")]


# Execute only the master/catalog constructors, never game callbacks or script.js.
source = json.loads(subprocess.check_output(["node", "-e", r"""
const fs=require('fs'),vm=require('vm');
const c={window:{}}; vm.createContext(c);
vm.runInContext(fs.readFileSync('character-world-master.v1.js','utf8'),c);
vm.runInContext(fs.readFileSync('games.js','utf8'),c);
const g=c.installNaotocchiMinigames({SEASON:{SPRING:'spring',SUMMER:'summer',AUTUMN:'autumn',WINTER:'winter'}});
const games=[...g.MINIGAMES.map(x=>({id:x.id,category:g.minigameCategoryOf.get(x),source:'general'})),
...Object.entries(g.REGION_MINIGAMES).flatMap(([context,a])=>a.map(x=>({id:x.game.id,category:x.category,source:'region',context}))),
...Object.entries(g.SEASONAL_MINIGAMES).flatMap(([context,a])=>a.map(x=>({id:x.game.id,category:x.category,source:'season',context})))];
console.log(JSON.stringify({master:c.window.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1,games}));
"""], cwd=ROOT, text=True))
master, games = source["master"], source["games"]
species = [s for rarity in ("normal", "rare", "secret") for s in master["playerSpecies"][rarity]]
check(len(species) == 31 and all(len(s["stages"]) == 8 for s in species), "Main source: expected 31 x 8")
check(master["playerSpecies"]["author"]["id"] == "naoto" and not master["playerSpecies"]["author"]["playable"], "Author source changed")

catalogs = {
    "C": master["companions"]["normal"] + master["companions"]["rare"],
    "P": master["partners"],
    "W": [master["regions"]["home"]] + master["regions"]["normal"] + master["regions"]["special"],
}
for prefix, number, count in (("C", 35, 26), ("P", 36, 18), ("W", 40, 13)):
    ids = re.findall(rf"^### {prefix}-([\w-]+)", doc(number), re.M)
    check(len(ids) == len(set(ids)) == count and set(ids) == {s["id"] for s in catalogs[prefix]}, f"{prefix} source/role mismatch")

script = (ROOT / "script.js").read_text()
item_ids = []
item_groups = {}
for name, count in (("SHOP_ITEMS", 15), ("NAOTO_ITEMS", 4), ("CONSUMABLE_ITEMS", 11), ("FUN_ITEMS", 7), ("RECOVERY_ITEMS", 1)):
    block = re.search(rf"  const {name} = \[\n(.*?)\n  \];", script, re.S)
    if not block:
        raise ValueError(f"Cannot find current array {name}")
    ids = re.findall(r"(?:\bid|\"id\"):\s*['\"]([^'\"]+)['\"]", block[1])
    check(len(ids) == count, f"{name}: expected {count}, got {len(ids)}")
    item_groups[name] = ids
    item_ids.extend(ids)
item_role_ids = re.findall(r"^### I-([\w-]+)", doc(37), re.M)
check(len(item_role_ids) == len(set(item_role_ids)) == len(set(item_ids)) == 38 and set(item_ids) == set(item_role_ids), "Item role/source mismatch")
held_items = re.findall(r"^### I-([\w-]+)", doc(37).split("## E. RECOVERY_ITEMS 1 — HOLD")[1].split("## F.")[0], re.M)
check(set(held_items) == set(item_groups["RECOVERY_ITEMS"]), "Item HOLD/source mismatch")

check(collections.Counter(g["source"] for g in games) == {"general": 86, "region": 10, "season": 4}, "Game source counts changed")
game_map = {g["id"]: g for g in games}
check(len(game_map) == 100, "Duplicate/missing game source ID")
mapped = [r for r in rows(doc(32)) if r[0].startswith("G-")]
check(len(mapped) == 100 and {r[0][2:] for r in mapped} == set(game_map), "32 game ID coverage")
for r in mapped:
    g = game_map.get(r[1], {})
    check(r[0] == "G-" + r[1] and r[2] == g.get("category"), f"32 category mismatch: {r[0]}")
    kind = "region" if r[3].startswith("地域:") else "season" if r[3].startswith("季節:") else "general"
    check(kind == g.get("source"), f"32 source mismatch: {r[0]}")
role_games = [r[1][2:] for r in rows(doc(39)) if len(r) > 1 and r[0].isdigit()]
check(len(role_games) == 100 and set(role_games) == set(game_map), "39 game role coverage")
inventory_games = re.findall(r"^\d+\. ([\w-]+)$", doc(28), re.M)
check(len(inventory_games) == 100 and set(inventory_games) == set(game_map), "28 game inventory coverage")

event_rows = [r for r in rows(doc(30).split("## 5.")[1].split("## 6.")[0]) if r[0].startswith("E-")]
check(len({r[0] for r in event_rows}) == 34 and collections.Counter(r[1] for r in event_rows) == {"CARD": 21, "HOLD": 13}, "Event count/status mismatch")
event_roles = re.findall(r"^(?:### |- )(E-[\w-]+)", doc(38), re.M)
check(set(event_roles) == {r[0] for r in event_rows}, "38 event role coverage")
event_status = collections.Counter(r[1] for r in event_rows)
check(any(r[0] == "E-naoto" and r[1] == "CARD" for r in event_rows), "E-naoto CARD missing")
inventory = {
    "メイン": (sum(len(s["stages"]) for s in species), 0),
    "なかま": (len(catalogs["C"]), 0), "こいびと": (len(catalogs["P"]), 0),
    "セカイ（場所）": (len(catalogs["W"]), 0), "あそび": (len(games), 0),
    "あいてむ": (len(item_ids) - len(held_items), len(held_items)),
    "できごと": (event_status["CARD"], event_status["HOLD"]),
}
totals = [sum(counts[i] for counts in inventory.values()) for i in (0, 1)]
inventory_rows = [r for r in rows(doc(30).split("## 6.")[1].split("## 7.")[0]) if r[0] in inventory or r[0] == "**合計**"]
check(len(inventory_rows) == 8, "30 inventory summary row count")
for r in inventory_rows:
    counts = inventory.get(r[0], totals)
    check([int(c.strip("*")) for c in r[1:]] == [*counts, sum(counts)], f"30 inventory arithmetic: {r[0]}")
check(totals == [463, 14], f"Registered pool changed: {totals}")

order = {42: ["man", "woman", "ren"], 43: ["cat"], 44: ["penguin", "turtle", "frog", "salmon"],
         45: ["clownfish", "hermit_crab", "jellyfish", "starfish", "coral"],
         46: ["butterfly", "beetle", "stagbeetle", "cicada", "antlion"],
         47: ["dandelion", "sakura", "venus_flytrap", "mushroom", "world_tree"],
         48: ["dragon", "phoenix", "god", "ghost"], 49: ["star", "plush", "unknown"]}
curves = {}
for number, ids in order.items():
    found = [tuple((int(a), int(b)) for a, b in re.findall(r"(\d+)/(\d+)", s))
             for s in re.findall(r"`([^`]*→[^`]*)`", doc(number))]
    found = [c for c in found if len(c) == 8]
    check(len(found) == len(ids), f"{number}: curve extraction changed; inspect document")
    curves.update(zip(ids, found))
dog = doc(4).split("## けもの代表: いぬ")[1].split("## みずべ代表:")[0]
curves["dog"] = tuple((int(a), int(b)) for a, b in re.findall(r"(\d+)/(\d+)", re.search(r"仮数値曲線: `([^`]+)`", dog)[1]))
check(set(curves) == {s["id"] for s in species}, "Curve/source species mismatch")
check(all(1 <= v <= 10 for c in curves.values() for pair in c for v in pair), "Printed value outside 1..10")
duplicates = [names for curve in set(curves.values()) if len(names := [s for s, c in curves.items() if c == curve]) > 1]
check(not duplicates, f"Duplicate eight-stage curves: {duplicates}")


def means(pairs):
    sums = [sum(v[i] for v in pairs) for i in (0, 1)]
    return [str((Decimal(s) / len(pairs)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)) for s in sums + [sum(sums)]]


attributes = {"ひと": ["man", "woman", "ren"], "けもの": ["dog", "cat"], "みずべ": order[44],
              "うみ": order[45], "むし": order[46], "くさ": order[47], "げんそう": order[48], "ふしぎ": order[49]}
averages = {a: means([p for s in ids for p in curves[s]]) for a, ids in attributes.items()}
stages = {label: means([c[i] for c in curves.values()]) for i, label in enumerate("①②③④⑤⑥⑦⑧")}
rarities = {label: means([p for s in master["playerSpecies"][key] for p in curves[s["id"]]])
            for label, key in (("通常", "normal"), ("レア", "rare"), ("シークレット（れんくん）", "secret"))}
for r in rows(doc(50)):
    expected = {**averages, **stages, **rarities}.get(r[0])
    if expected:
        check(r[1:] == expected, f"50 rounding/value mismatch: {r[0]} {r[1:]} -> {expected}")

body_records = {}
ability_texts = collections.defaultdict(list)
vanilla = []
species_map = {s["id"]: s for s in species}


def add_body(s, stage, label, power, wisdom, block, path):
    stage = int(stage)
    key = f"M-{s}-{stage:02}"
    check(s in curves and 1 <= stage <= 8, f"Unknown main ID: {key}")
    if s not in curves or not 1 <= stage <= 8:
        return
    check(curves[s][stage-1] == (int(power), int(wisdom)) and label == "①②③④⑤⑥⑦⑧"[stage-1], f"Body heading value/stage: {key}")
    check(key not in body_records, f"Duplicate canonical body ID: {key}")
    body = re.search(r"^`(.+)`$|^> (.+)$", block, re.M)
    is_vanilla = ("能力なし" in block.splitlines()[0]
                  or bool(re.search(r"^能力なし。?$", block, re.M))
                  or "- Bでは能力なしで試す。ちから10自体を個性とする。" in block.splitlines())
    value = "能力なし。" if is_vanilla else (body[1] or body[2]) if body else ""
    check(bool(value), f"Missing body: {key}")
    if is_vanilla:
        vanilla.append(key)
    elif value:
        ability_texts[value].append(key)
    body_records[key] = {"id": key, "species": s, "stage": stage,
                         "name": species_map[s]["label"] + label,
                         "form": species_map[s]["stages"][stage-1],
                         "power": int(power), "wisdom": int(wisdom),
                         "normal_time": stage, "text": value, "path": str(path.relative_to(ROOT))}


indexed_files = [next(DOCS.glob(f"{n:02}-*.md")) for n in (51, 52, 53, 54, 55, 57, 59, 68)]
representative_files = [DOCS / "representatives" / name for name in (
    "02-beast-dog.md", "03-waterside-frog.md", "04-ocean-clownfish.md",
    "06-plant-sakura.md", "07-fantasy-phoenix.md", "08-mystery-plush.md")]
for path in indexed_files + representative_files:
    text = path.read_text()
    matches = list(re.finditer(r"^#{1,2} M-([\w_]+)-(\d{2}) ([①-⑧]) (\d+)/(\d+)", text, re.M))
    for index, match in enumerate(matches):
        block = text[match.start():matches[index+1].start() if index+1 < len(matches) else len(text)]
        add_body(*match.groups(), block, path)
    # New source tables must keep the real form name distinct from display name.
    if path in representative_files or path.name.startswith("68-"):
        mapped_forms = [r for r in rows(text) if re.fullmatch(r"M-[\w_]+-\d{2}", r[0])]
        check(len(mapped_forms) == len(matches), f"Form table coverage: {path.name}")
        for r in mapped_forms:
            rec = body_records.get(r[0], {})
            check(r[1] == rec.get("name") and r[2] == rec.get("form"), f"Form name/source mismatch: {r[0]}")
indexed_count = len(body_records)
check(indexed_count == 224, "Expected 224 M-ID body headings including the six existing A cards")

# 15 v2 + later individual revisions, and 23 v3 are the authoritative old 24.
for s, number, start, end in (
        ("man", 15, "# おとこのひと①〜⑧", "# カブトムシ①〜⑧"),
        ("beetle", 15, "# カブトムシ①〜⑧", "# 第2稿横断監査"),
        ("stagbeetle", 23, "# 8段階 第3稿", "# 第3稿 短期模擬")):
    text = doc(number).split(start, 1)[1].split(end, 1)[0]
    matches = list(re.finditer(r"^## ([①-⑧]) (\d+)/(\d+)", text, re.M))
    check(len(matches) == 8, f"Legacy main coverage: {s}")
    for index, match in enumerate(matches):
        label, power, wisdom = match.groups()
        block = text[match.start():matches[index+1].start() if index+1 < len(matches) else len(text)]
        add_body(s, "①②③④⑤⑥⑦⑧".index(label)+1, label, power, wisdom, block, next(DOCS.glob(f"{number:02}-*.md")))
expected_ids = {f"M-{s['id']}-{stage:02}" for s in species for stage in range(1, 9)}
check(set(body_records) == expected_ids, "248 canonical main ID coverage mismatch")
check(len(vanilla) == 6, "Expected six explicitly ability-free cards")

# 31 is a migration mirror, never a second set of 16 cards.
migrated = list(re.finditer(r"^## (M-(?:beetle|stagbeetle)-\d{2})\n(.*?)(?=^## M-|\Z)", doc(31), re.M | re.S))
check(len(migrated) == 16, "31 migration coverage")
for m in migrated:
    line = re.search(r"^- 本文：(.+)$", m[2], re.M)
    value = line[1].strip("`*") if line else ""
    check(value == body_records[m[1]]["text"], f"31 body mirror mismatch: {m[1]}")
for n, key in ((2, "M-dog-02"), (3, "M-frog-03"), (4, "M-clownfish-04"),
               (6, "M-phoenix-05"), (7, "M-sakura-06"), (8, "M-plush-07")):
    line = re.search(rf"^{n}\. .+$", doc(8), re.M)
    quoted = re.search(r"`(.+)`", line[0]) if line else None
    check(bool(quoted) and quoted[1] == body_records[key]["text"], f"08 representative mirror: {key}")
duplicate_bodies = [ids for ids in ability_texts.values() if len(ids) > 1]
check(not duplicate_bodies, f"Identical ability bodies: {duplicate_bodies}")

# 72 is the canonical companion draft; 35 and 08 retain the six A/B mirrors.
companion_records = {}
companion_vanilla = []
companion_source = {s["id"]: (rarity, s) for rarity in ("normal", "rare")
                    for s in master["companions"][rarity]}
companion_text = doc(72)
companion_matches = list(re.finditer(r"^### C-([\w_]+) — ([^\n]+)\n(.*?)(?=^### |^## |\Z)", companion_text, re.M | re.S))
for match in companion_matches:
    source_id, name, block = match.groups()
    key = "C-" + source_id
    check(key not in companion_records, f"Duplicate companion body ID: {key}")
    check(source_id in companion_source, f"Unknown companion source ID: {key}")
    if source_id not in companion_source:
        continue
    rarity, definition = companion_source[source_id]
    check(name == definition["label"], f"Companion display name: {key}")
    check(f"`companions.{rarity} / id={source_id}`" in block, f"Companion source path: {key}")
    bodies = re.findall(r"^> (.+)$", block, re.M)
    check(len(bodies) == 1 and bool(bodies[0]), f"Expected one companion body: {key}")
    value = bodies[0] if bodies else ""
    if value == "能力なし。":
        companion_vanilla.append(key)
    companion_records[key] = {"id": key, "source_id": source_id, "name": name,
                              "type": "なかま", "normal_time": 0, "rarity": rarity,
                              "text": value, "path": str(next(DOCS.glob("72-*.md")).relative_to(ROOT))}
check(set(companion_records) == {"C-" + s for s in companion_source}, "26 companion body coverage mismatch")
check(companion_vanilla == ["C-box"], "Expected explicit companion vanilla: C-box")
companion_rows = [r for r in rows(companion_text) if r[0].startswith("C-")]
check(len(companion_rows) == len({r[0] for r in companion_rows}) == 26, "72 companion source table coverage")
for r in companion_rows:
    rec = companion_records.get(r[0], {})
    check(r[1] == rec.get("name") and r[2] == {"normal": "通常", "rare": "レア"}.get(rec.get("rarity")), f"72 companion table name/rarity: {r[0]}")
for key, short in (("otter", "カワウソ"), ("monkey", "サル"), ("owl", "ふくろう"),
                   ("hedgehog", "ハリネズミ"), ("snail", "カタツムリ"), ("tanuki", "たぬき")):
    role_block = re.search(rf"^### C-{key} — [^\n]+\n(.*?)(?=^### |^## |\Z)", doc(35), re.M | re.S)
    role_body = re.search(r"`([^`]+)`", role_block[1]) if role_block else None
    deck_line = re.search(rf"^- (?:\*\*)?{short}「[^\n]+", doc(8), re.M)
    deck_body = re.search(r"`([^`]+)`", deck_line[0]) if deck_line else None
    value = companion_records.get("C-" + key, {}).get("text")
    check(bool(role_body) and role_body[1] == value, f"35 companion mirror: C-{key}")
    check(bool(deck_body) and deck_body[1] == value, f"08 companion mirror: C-{key}")
combined_texts = collections.defaultdict(list, {k: list(v) for k, v in ability_texts.items()})
for rec in companion_records.values():
    if rec["text"] and rec["text"] != "能力なし。":
        combined_texts[rec["text"]].append(rec["id"])
combined_duplicates = [ids for ids in combined_texts.values() if len(ids) > 1]
check(not combined_duplicates, f"Identical main/companion ability bodies: {combined_duplicates}")

broken_links = []
for file in DOCS.rglob("*.md"):
    for target in re.findall(r"\]\(([^)]+)\)", file.read_text()):
        target = target.split("#")[0]
        if target and "://" not in target and not target.startswith("mailto:") and not (file.parent / target).exists():
            broken_links.append(f"{file.relative_to(ROOT)} -> {target}")
check(not broken_links, f"Broken local links: {broken_links}")

result = {"registered": {"CARD": totals[0], "HOLD": totals[1], "total": sum(totals)},
                  "games": dict(collections.Counter(g["source"] for g in games)), "main_curves": len(curves),
                  "value_10_cards": sum(10 in pair for c in curves.values() for pair in c),
                  "stage_7_to_8": dict(collections.Counter("up" if sum(c[7]) > sum(c[6]) else "down" if sum(c[7]) < sum(c[6]) else "same" for c in curves.values())),
                  "indexed_main_body_entries": indexed_count,
                  "legacy_main_body_entries": len(body_records) - indexed_count,
                  "total_main_body_entries": len(body_records), "vanilla_entries": vanilla,
                  "identical_ability_groups": duplicate_bodies,
                  "companion_body_entries": len(companion_records),
                  "companion_rarity_counts": dict(collections.Counter(r["rarity"] for r in companion_records.values())),
                  "companion_vanilla_entries": companion_vanilla,
                  "main_companion_identical_ability_groups": combined_duplicates, "errors": errors,
                  "scope": "Source, ID, numeric curves, complete body coverage, literal mirrors and local links; not a gameplay or semantic-equivalence validator."}
if "--catalog" in sys.argv:
    result["cards"] = sorted(body_records.values(), key=lambda r: r["id"])
    result["companions"] = sorted(companion_records.values(), key=lambda r: r["id"])
print(json.dumps(result, ensure_ascii=False, indent=2))
sys.exit(bool(errors))
