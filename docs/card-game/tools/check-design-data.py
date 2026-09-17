#!/usr/bin/env python3
"""Read-only source/ID/curve audit. Not a card-game simulator or rules validator.

Run from any directory with Python 3 and Node.js:
  python docs/card-game/tools/check-design-data.py
"""
import collections
from decimal import Decimal, ROUND_HALF_UP
import json
import hashlib
from pathlib import Path
import re
import runpy
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

# Historical registered 38: the unmerged branch's source baseline.
# Current main items are checked separately against the pinned 76 snapshot.
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

# 74 holds the partner bodies; 36 and 08 mirror the four existing A/B cards.
partner_records = {}
partner_vanilla = []
partner_source = {p["id"]: p for p in master["partners"]}
partner_text = doc(74)
for match in re.finditer(r"^### P-([\w_]+) — ([^\n]+)\n(.*?)(?=^### |^## |\Z)", partner_text, re.M | re.S):
    source_id, name, block = match.groups()
    key = "P-" + source_id
    check(key not in partner_records, f"Duplicate partner body ID: {key}")
    check(source_id in partner_source, f"Unknown partner source ID: {key}")
    if source_id not in partner_source:
        continue
    definition = partner_source[source_id]
    check(name == definition["label"], f"Partner display name: {key}")
    check(f"`partners / id={source_id}`" in block, f"Partner source path: {key}")
    check(f"firstRegion: `{definition['firstRegion']}`" in block, f"Partner source region: {key}")
    check(f"hook: {definition['hook']}。" in block, f"Partner source hook: {key}")
    bodies = re.findall(r"^> (.+)$", block, re.M)
    check(len(bodies) == 1 and bool(bodies[0]), f"Expected one partner body: {key}")
    value = bodies[0] if bodies else ""
    if value == "能力なし。":
        partner_vanilla.append(key)
    partner_records[key] = {"id": key, "source_id": source_id, "name": name,
                            "type": "こいびと", "normal_time": 0, "rarity": "normal",
                            "first_region": definition["firstRegion"], "text": value,
                            "path": str(next(DOCS.glob("74-*.md")).relative_to(ROOT))}
check(len(partner_records) == 18 and set(partner_records) == {"P-" + p for p in partner_source}, "18 partner body coverage mismatch")
check(not partner_vanilla, "74 partner draft expects 18 ability bodies")
check("全18体とも通常・各同名3枚" in doc(27), "27 explicit partner deck classification missing")
partner_rows = [r for r in rows(partner_text) if r[0].startswith("P-")]
check(len(partner_rows) == len({r[0] for r in partner_rows}) == 18, "74 partner source table coverage")
for r in partner_rows:
    rec = partner_records.get(r[0], {})
    check(r[1] == rec.get("name") and r[2] == rec.get("first_region") and r[3] == "通常", f"74 partner table name/region/rarity: {r[0]}")
for key in ("cat_ceo", "knitting_spider", "sea_mermaid", "snowman"):
    role_block = re.search(rf"^### P-{key} — [^\n]+\n(.*?)(?=^### |^## |\Z)", doc(36), re.M | re.S)
    role_body = re.search(r"`([^`]+)`", role_block[1]) if role_block else None
    name = partner_source[key]["label"]
    deck_line = re.search(rf"^- {re.escape(name)}[^\n]+", doc(8), re.M)
    deck_body = re.search(r"`([^`]+)`", deck_line[0]) if deck_line else None
    value = partner_records.get("P-" + key, {}).get("text")
    check(bool(role_body) and role_body[1] == value, f"36 partner mirror: P-{key}")
    check(bool(deck_body) and deck_body[1] == value, f"08 partner mirror: P-{key}")
all_character_texts = collections.defaultdict(list, {k: list(v) for k, v in combined_texts.items()})
for rec in partner_records.values():
    if rec["text"] and rec["text"] != "能力なし。":
        all_character_texts[rec["text"]].append(rec["id"])
all_character_duplicates = [ids for ids in all_character_texts.values() if len(ids) > 1]
check(not all_character_duplicates, f"Identical character ability bodies: {all_character_duplicates}")

item_audit = runpy.run_path(str(DOCS / "tools/check-item-source.py"))["audit"](include_catalog=True)
errors.extend(item_audit["errors"])
item_records = item_audit.pop("items_current_source")
all_texts = collections.defaultdict(list, {k: list(v) for k, v in all_character_texts.items()})
for rec in item_records:
    all_texts[rec["text"]].append(rec["id"])
all_draft_duplicates = [ids for ids in all_texts.values() if len(ids) > 1]
check(not all_draft_duplicates, f"Identical character/item ability bodies: {all_draft_duplicates}")

# Registered play batch: current-main source snapshot and canonical prose.
# The default run stays offline; --play-source-root additionally checks exported
# files against their pinned git blobs and executes only games.js constructors.
play_snapshot = json.loads((DOCS / "data/play-source-20260917.json").read_text())
pinned_games = play_snapshot["games"]
check(sorted(pinned_games, key=lambda g: g["id"]) == sorted(games, key=lambda g: g["id"]),
      "Pinned main play IDs/categories/source contexts differ from registered baseline")
play_records = []
play_batch_counts = []
for batch, draft_number in ((1, 79), (2, 81), (3, 83), (4, 85), (5, 87)):
    batch_start = len(play_records)
    for m in re.finditer(r"^### (G-[\w-]+) — ([^\n]+)\n(.*?)(?=^### |^## |\Z)", doc(draft_number), re.M | re.S):
        card_id, name, section = m.groups()
        body = re.findall(r"^> (.+)$", section, re.M)
        time = re.findall(r"^- 時：(\d+)$", section, re.M)
        method = re.findall(r"^- プレイ方法：(すぐつかう|しかける|みにつける)$", section, re.M)
        category = re.findall(r"^- source category：([\w]+)（(一般|地域|季節)）$", section, re.M)
        context = re.findall(r"^- source context：([\w]+)$", section, re.M)
        order = re.findall(r"^- 登録順：(\d+)$", section, re.M)
        check(len(body) == len(time) == len(method) == len(category) == len(order) == 1,
              f"Play body/metadata missing or ambiguous: {card_id}")
        if not (len(body) == len(time) == len(method) == len(category) == len(order) == 1):
            continue
        check("- 構築区分：通常（同名3枚）" in section, f"Play rarity missing: {card_id}")
        source_game = game_map.get(card_id[2:], {})
        check(category[0][0] == source_game.get("category"), f"Play category mismatch: {card_id}")
        check(category[0][1] == {"general": "一般", "region": "地域", "season": "季節"}.get(source_game.get("source")),
              f"Play source type mismatch: {card_id}")
        check(context == ([source_game["context"]] if "context" in source_game else []),
              f"Play source context mismatch: {card_id}")
        check(int(order[0]) == len(play_records) + 1, f"Play order mismatch: {card_id}")
        play_records.append({"id": card_id, "name": name, "time": int(time[0]),
                             "method": method[0], "rarity": "normal", "text": body[0],
                             "source": source_game.get("source"), "context": source_game.get("context"),
                             "source_file": str(next(DOCS.glob(f"{draft_number:02d}-*.md")).relative_to(ROOT))})
    batch_records = play_records[batch_start:]
    batch_ids = [r["id"] for r in batch_records]
    check(len(batch_ids) == len(set(batch_ids)) == 20, f"Expected 20 unique play bodies in batch {batch}")
    check(batch_ids == ["G-" + sid for sid in role_games[batch_start:batch_start + 20]] == play_snapshot[f"draft_batch_{batch}"],
          f"Play batch {batch} differs from canonical roles")
    expected_methods = {1: {"すぐつかう": 18, "しかける": 2}, 2: {"すぐつかう": 17, "しかける": 3}, 3: {"すぐつかう": 18, "しかける": 2}, 4: {"すぐつかう": 17, "しかける": 3}, 5: {"すぐつかう": 18, "しかける": 2}}
    expected_times = {1: {1: 7, 2: 13}, 2: {1: 11, 2: 8, 3: 1}, 3: {1: 9, 2: 10, 3: 1}, 4: {1: 12, 2: 7, 3: 1}, 5: {1: 12, 2: 8}}
    methods = dict(collections.Counter(r["method"] for r in batch_records))
    times = dict(collections.Counter(r["time"] for r in batch_records))
    check(methods == expected_methods[batch], f"Play method distribution batch {batch}")
    check(times == expected_times[batch], f"Play time distribution batch {batch}")
    case_ids = re.findall(r"^\| ([PX]\d{2}) \|", doc(draft_number + 1), re.M)
    check(len(case_ids) == len(set(case_ids)) == 40 and set(case_ids) ==
          {f"{p}{n:02d}" for p in ("P", "X") for n in range(1, 21)}, f"Play manual case IDs batch {batch}")
    play_batch_counts.append({"batch": batch, "bodies": len(batch_ids), "methods": methods,
                              "times": times, "manual_case_entries": len(case_ids)})
play_ids = [r["id"] for r in play_records]
check(len(play_ids) == len(set(play_ids)) == 100, "Expected 100 unique registered play bodies")
legacy_2048 = re.search(r"^- 2048 — 時1・\*\*すぐつかう\*\*: (.+)$", doc(8), re.M)
check(bool(legacy_2048), "Existing 2048 body missing")
existing_play = [r for r in play_records if r["id"] == "G-puzzle-2048"]
check(len(existing_play) == 1, "Existing 2048 must occur exactly once")
if legacy_2048 and len(existing_play) == 1:
    check(existing_play[0]["text"] == legacy_2048[1], "2048 body differs between 08 and 83")
    existing_play[0]["status"] = "legacy_body_linked_to_registered_source"
    existing_play[0]["canonical_body_file"] = "docs/card-game/08-test-deck-a-card-drafts.md"
new_play_records = [r for r in play_records if r["id"] != "G-puzzle-2048"]
check(len(play_records) == 100 and len(new_play_records) == 99, "Play coverage should be 99 new + 1 existing = 100/100")
check(set(play_ids) == {"G-" + g["id"] for g in pinned_games}, "Complete play coverage differs from registered 100")
check(dict(collections.Counter(r["source"] for r in play_records)) == {"general": 86, "region": 10, "season": 4},
      "Complete play source distribution differs from 86/10/4")
all_with_play = collections.defaultdict(list, {k: list(v) for k, v in all_texts.items()})
for r in play_records:
    all_with_play[r["text"]].append(r["id"])
play_duplicates = [ids for ids in all_with_play.values() if len(ids) > 1]
check(not play_duplicates, f"Identical character/item/play bodies: {play_duplicates}")
play_source_verified = False
if "--play-source-root" in sys.argv:
    source_dir = Path(sys.argv[sys.argv.index("--play-source-root") + 1]).resolve()
    for name, expected in play_snapshot["source_blobs"].items():
        raw = (source_dir / name).read_bytes()
        actual = hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()
        check(actual == expected, f"Play source blob differs: {name}")
    actual_games = json.loads(subprocess.check_output(["node", "-e", r"""
const fs=require('fs'),vm=require('vm'),c={};vm.createContext(c);
vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),c);
const g=c.installNaotocchiMinigames({SEASON:{SPRING:'spring',SUMMER:'summer',AUTUMN:'autumn',WINTER:'winter'}});
console.log(JSON.stringify([...g.MINIGAMES.map(x=>({id:x.id,category:g.minigameCategoryOf.get(x),source:'general'})),
...Object.entries(g.REGION_MINIGAMES).flatMap(([context,a])=>a.map(x=>({id:x.game.id,category:x.category,source:'region',context}))),
...Object.entries(g.SEASONAL_MINIGAMES).flatMap(([context,a])=>a.map(x=>({id:x.game.id,category:x.category,source:'season',context})))]));
""", str(source_dir / "games.js")], text=True))
    check(actual_games == pinned_games, "Actual pinned games catalog differs from snapshot")
    play_source_verified = actual_games == pinned_games and all(
        hashlib.sha1(b"blob " + str(len((source_dir / n).read_bytes())).encode() + b"\0" + (source_dir / n).read_bytes()).hexdigest() == h
        for n, h in play_snapshot["source_blobs"].items())
play_audit = {"main_commit": play_snapshot["main_commit"], "registered_games": len(pinned_games),
              "new_body_entries": len(new_play_records), "existing_linked_bodies": int(bool(legacy_2048)),
              "total_body_entries": len(play_records), "unexpanded_entries": 100 - len(play_records),
              "body_source_counts": dict(collections.Counter(r["source"] for r in play_records)),
              "method_counts_new": dict(collections.Counter(r["method"] for r in new_play_records)),
              "time_counts_new": dict(collections.Counter(r["time"] for r in new_play_records)),
              "max_new_body_length": max((len(r["text"]) for r in new_play_records), default=0),
              "batches": play_batch_counts,
              "manual_case_entries": sum(b["manual_case_entries"] for b in play_batch_counts), "identical_body_groups": play_duplicates,
              "actual_source_verified": play_source_verified}


# Places keep the existing single world slot; runtime source groups are not rarity.
world_snapshot = json.loads((DOCS / "data/world-source-20260917.json").read_text())
world_sources = [{**master["regions"]["home"], "source": "home"}] + [
    {**r, "source": group} for group in ("normal", "special") for r in master["regions"][group]]
check(world_snapshot["regions"] == world_sources, "Pinned region sources differ from registered baseline")
world_followup = world_snapshot.get("followup_main_check")
if world_followup:
    check(world_followup["compare_base"] == world_snapshot["main_commit"] and
          world_followup["verified_source_blobs"] == world_snapshot["source_blobs"] and
          not set(world_followup["changed_paths"]) & set(world_snapshot["source_blobs"]),
          "World follow-up main evidence differs from pinned source")
world_source_map = {"W-" + r["id"]: r for r in world_sources}
world_records = {}
for m in re.finditer(r"^### (W-[\w-]+) — ([^\n]+)\n(.*?)(?=^### |^## |\Z)", doc(89), re.M | re.S):
    card_id, name, section = m.groups()
    body = re.findall(r"^> (.+)$", section, re.M)
    time = re.findall(r"^- 時：(\d+)$", section, re.M)
    group = re.findall(r"^- source group：(home|normal|special)$", section, re.M)
    check(len(body) == len(time) == len(group) == 1, f"World body/metadata missing: {card_id}")
    if not (len(body) == len(time) == len(group) == 1):
        continue
    check(card_id not in world_records, f"World ID repeated: {card_id}")
    definition = world_source_map.get(card_id, {})
    check(name == definition.get("label") and group[0] == definition.get("source"), f"World name/group: {card_id}")
    check("- 構築区分：通常（同名3枚）" in section, f"World rarity missing: {card_id}")
    expected_time = 3 if card_id in ("W-star_stop", "W-memory_lake") else 2
    check(int(time[0]) == expected_time, f"World time: {card_id}")
    check(body[0] != "能力なし。", f"World draft expects ability: {card_id}")
    world_records[card_id] = {"id": card_id, "name": name, "type": "セカイ", "time": int(time[0]),
                              "source_group": group[0], "rarity": "normal", "text": body[0],
                              "path": str(next(DOCS.glob("89-*.md")).relative_to(ROOT))}
check(len(world_records) == 13 and set(world_records) == set(world_source_map), "13 world body coverage mismatch")
for sid in ("city", "forest", "deepsea", "memory_lake"):
    rec = world_records.get("W-" + sid, {})
    role = re.search(rf"^### W-{sid} — [^\n]+\n(.*?)(?=^### |^## |\Z)", doc(40), re.M | re.S)
    role_body = re.search(r"本文: `([^`]+)`", role[1]) if role else None
    deck = re.search(rf"^- {re.escape(rec.get('name', ''))} — 時(\d+)[^\n]+", doc(8), re.M)
    deck_body = re.search(r"`([^`]+)`", deck[0]) if deck else None
    check(bool(role_body) and role_body[1] == rec.get("text"), f"40 world mirror: {sid}")
    check(bool(deck_body) and deck_body[1] == rec.get("text") and int(deck[1]) == rec.get("time"), f"08 world mirror: {sid}")
city_section = re.search(r"^### W-city — [^\n]+\n(.*?)(?=^### |^## |\Z)", doc(67), re.M | re.S)
city_body = re.search(r"^> (.+)$", city_section[1], re.M) if city_section else None
check(bool(city_body) and city_body[1] == world_records.get("W-city", {}).get("text"), "67 city exact body changed")
check("セカイ13は全て通常・各同名3枚" in doc(27), "27 explicit world deck classification missing")
world_cases = re.findall(r"^\| ([PX]\d{2}) \|", doc(90), re.M)
check(len(world_cases) == len(set(world_cases)) == 40 and set(world_cases) ==
      {f"P{n:02d}" for n in range(1, 14)} | {f"X{n:02d}" for n in range(1, 28)}, "90 world manual case IDs")
all_with_world = collections.defaultdict(list, {k: list(v) for k, v in all_with_play.items()})
for rec in world_records.values():
    all_with_world[rec["text"]].append(rec["id"])
world_duplicates = [ids for ids in all_with_world.values() if len(ids) > 1]
check(not world_duplicates, f"Identical character/item/play/world bodies: {world_duplicates}")
world_source_verified = False
if "--world-source-root" in sys.argv:
    source_dir = Path(sys.argv[sys.argv.index("--world-source-root") + 1]).resolve()
    hashes_match = True
    for name, expected in world_snapshot["source_blobs"].items():
        raw = (source_dir / name).read_bytes()
        actual = hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()
        check(actual == expected, f"World source blob differs: {name}")
        hashes_match = hashes_match and actual == expected
    actual_regions = json.loads(subprocess.check_output(["node", "-e", r"""
const fs=require('fs'),vm=require('vm'),c={window:{}};vm.createContext(c);
vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),c);
const r=c.window.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1.regions;
console.log(JSON.stringify([{...r.home,source:'home'},...['normal','special'].flatMap(k=>r[k].map(x=>({...x,source:k})))]));
""", str(source_dir / "character-world-master.v1.js")], text=True))
    check(actual_regions == world_snapshot["regions"], "Actual pinned region definitions differ from snapshot")
    world_source_verified = hashes_match and actual_regions == world_snapshot["regions"]
world_audit = {"main_commit": world_snapshot["main_commit"], "body_entries": len(world_records),
               "latest_main_checked": world_followup["main_commit"] if world_followup else world_snapshot["main_commit"],
               "rarity_counts": dict(collections.Counter(r["rarity"] for r in world_records.values())),
               "source_group_counts": dict(collections.Counter(r["source_group"] for r in world_records.values())),
               "time_counts": dict(collections.Counter(r["time"] for r in world_records.values())),
               "manual_case_entries": len(world_cases), "max_body_length": max((len(r["text"]) for r in world_records.values()), default=0),
               "identical_body_groups": world_duplicates, "actual_source_verified": world_source_verified}


# Events: CARD bodies and HOLD source families remain separate populations.
event_snapshot = json.loads((DOCS / "data/event-source-20260917.json").read_text())
event_expected = {r[0]: r[1] for r in event_rows}
event_pinned = {r["id"]: r for r in event_snapshot["events"]}
check(len(event_snapshot["events"]) == 34 and
      {k: v["status"] for k, v in event_pinned.items()} == event_expected, "Event source population/status")
event_names = dict(re.findall(r"^### (E-[\w-]+) — ([^\n]+)$", doc(38), re.M))
event_records = {}
for m in re.finditer(r"^### (E-[\w-]+) — ([^\n]+)\n(.*?)(?=^### |^## |\Z)", doc(91), re.M | re.S):
    card_id, name, section = m.groups()
    body = re.findall(r"^> (.+)$", section, re.M)
    times = re.findall(r"^- 時：(\d+)$", section, re.M)
    check(len(body) == len(times) == 1, f"Event body/metadata missing: {card_id}")
    if len(body) != 1 or len(times) != 1:
        continue
    check(card_id not in event_records, f"Event duplicate ID: {card_id}")
    check(event_expected.get(card_id) == "CARD" and name == event_names.get(card_id) == event_pinned.get(card_id, {}).get("name"), f"Event name/status: {card_id}")
    check(all(x in section for x in ("- 状態：CARD", "- 使用方法：すぐつかう", "- 構築区分：通常（同名3枚）")), f"Event classification: {card_id}")
    check(f'- source：{event_pinned.get(card_id, {}).get("anchor")}' in section, f"Event source anchor: {card_id}")
    check(1 <= int(times[0]) <= 3, f"Event time outside draft range: {card_id}")
    event_records[card_id] = {"id": card_id, "name": name, "type": "できごと", "time": int(times[0]),
                              "method": "すぐつかう", "rarity": "normal", "text": body[0],
                              "path": str(next(DOCS.glob("91-*.md")).relative_to(ROOT))}
check(set(event_records) == {k for k, v in event_expected.items() if v == "CARD"}, "21 event body coverage")
event_hold_ids = re.findall(r"^\| (E-[\w-]+) \|", doc(91), re.M)
check(len(event_hold_ids) == len(set(event_hold_ids)) == 13 and set(event_hold_ids) ==
      {k for k, v in event_expected.items() if v == "HOLD"}, "13 event HOLD coverage")
for short, time in {"big-illness": 3, "fateful-transform": 2, "new-encounter": 1,
                    "misunderstanding": 2, "sudden-trip": 2, "final-time": 2}.items():
    cid = "E-" + short
    rec = event_records.get(cid, {})
    check(rec.get("time") == time, f"Legacy event time: {cid}")
    role = re.search(rf"^### {cid} — [^\n]+\n(.*?)(?=^### |^## |\Z)", doc(38), re.M | re.S)
    rb = re.search(r"91本文: `([^`]+)`", role[1]) if role else None
    deck = re.search(rf"^- {re.escape(rec.get('name', ''))} — 時(\d+)[^\n]+", doc(8), re.M)
    db = re.search(r"`([^`]+)`", deck[0]) if deck else None
    check(bool(rb) and rb[1] == rec.get("text"), f"38 event mirror: {cid}")
    check(bool(db) and db[1] == rec.get("text") and int(deck[1]) == time, f"08 event mirror: {cid}")
check("できごとCARD21は全て通常・各同名3枚" in doc(27), "27 event classification missing")
event_cases = re.findall(r"^\| ([PX]\d{2}) \|", doc(92), re.M)
check(len(event_cases) == len(set(event_cases)) == 40 and set(event_cases) ==
      {f"P{n:02d}" for n in range(1, 22)} | {f"X{n:02d}" for n in range(1, 20)}, "92 event manual case IDs")
all_with_event = collections.defaultdict(list, {k: list(v) for k, v in all_with_world.items()})
for rec in event_records.values():
    all_with_event[rec["text"]].append(rec["id"])
event_duplicates = [ids for ids in all_with_event.values() if len(ids) > 1]
check(not event_duplicates, f"Identical character/item/play/world/event bodies: {event_duplicates}")
event_source_verified = False
if "--event-source-root" in sys.argv:
    source_dir = Path(sys.argv[sys.argv.index("--event-source-root") + 1]).resolve()
    hashes_match = True
    for name, expected in event_snapshot["source_blobs"].items():
        raw = (source_dir / name).read_bytes()
        actual = hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()
        check(actual == expected, f"Event source blob differs: {name}")
        hashes_match = hashes_match and actual == expected
    runtime = (source_dir / "script.js").read_text()
    source_text = runtime + (source_dir / "character-world-master.v1.js").read_text()
    for rec in event_pinned.values():
        # author is a nested master path, other anchors are literal source tokens.
        anchors = rec["anchor"].split(" / ")
        for anchor in anchors:
            token = "author:" if anchor == "playerSpecies.author" else anchor
            check(token in source_text, f"Current event anchor missing: {rec['id']} / {anchor}")
    legend_part = runtime.split("const LEGEND_ENCOUNTERS = [", 1)[1].split("\n  ];", 1)[0]
    actual_legend_ids = re.findall(r"id: '([^']+)'", legend_part)
    check(actual_legend_ids == event_snapshot["legend_ids"], "Event legend ID snapshot")
    midlife_part = runtime.split("const MIDLIFE_EVENTS = [", 1)[1].split("\n  ];", 1)[0]
    check([int(x) for x in re.findall(r"age: (\d+)", midlife_part)] == event_snapshot["midlife_ages"], "Event midlife age snapshot")
    retired = event_snapshot["retired_anchors"]["E-special-trip-memory"]
    check(retired["old"] not in runtime and all(x in runtime for x in retired["current"]) and
          "const travelMemory = null;" in runtime, "Event retired travel reward evidence")
    movie_keys = json.loads(subprocess.check_output(["node", "-e",
        "console.log(JSON.stringify(Object.keys(require(process.argv[1]).legends)))",
        str(source_dir / "movie-dialogue.js")], text=True))
    check(movie_keys == event_snapshot["legend_ids"], "Event actual movie legend IDs")
    event_source_verified = hashes_match
event_audit = {"main_commit": event_snapshot["main_commit"], "body_entries": len(event_records),
               "hold_entries": len(event_hold_ids), "unexpanded_CARD_entries": 21-len(event_records),
               "time_counts": dict(collections.Counter(r["time"] for r in event_records.values())),
               "manual_case_entries": len(event_cases), "identical_body_groups": event_duplicates,
               "actual_source_verified": event_source_verified}

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
                  "main_companion_identical_ability_groups": combined_duplicates,
                  "partner_body_entries": len(partner_records),
                  "partner_rarity_counts": dict(collections.Counter(r["rarity"] for r in partner_records.values())),
                  "partner_vanilla_entries": partner_vanilla,
                  "all_character_identical_ability_groups": all_character_duplicates,
                  "current_item_source_followup": item_audit,
                  "character_item_identical_ability_groups": all_draft_duplicates, "play_draft_followup": play_audit, "world_draft_followup": world_audit, "event_draft_followup": event_audit, "errors": errors,
                  "scope": "Source, ID, numeric curves, complete body coverage, literal mirrors and local links; not a gameplay or semantic-equivalence validator."}
if "--catalog" in sys.argv:
    result["events"] = sorted(event_records.values(), key=lambda r: r["id"])
    result["worlds"] = sorted(world_records.values(), key=lambda r: r["id"])
    result["cards"] = sorted(body_records.values(), key=lambda r: r["id"])
    result["companions"] = sorted(companion_records.values(), key=lambda r: r["id"])
    result["partners"] = sorted(partner_records.values(), key=lambda r: r["id"])
    result["items_current_source"] = sorted(item_records, key=lambda r: r["id"])
    result["play_cards"] = sorted(play_records, key=lambda r: r["id"])
print(json.dumps(result, ensure_ascii=False, indent=2))
sys.exit(bool(errors))
