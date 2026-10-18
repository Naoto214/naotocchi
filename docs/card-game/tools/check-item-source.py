#!/usr/bin/env python3
"""Validate the pinned item source and drafts, not gameplay or strength.

Optional --source-root verifies exported main blobs and actual catalog/arrays.
No game callbacks, network requests or file writes are performed.
"""
import argparse
import collections
import hashlib
import json
from pathlib import Path
import re
import subprocess

DOCS = Path(__file__).resolve().parents[1]


def audit(source_root=None, include_catalog=False):
    errors = []
    def check(ok, message):
        if not ok:
            errors.append(message)

    snapshot = json.loads((DOCS / "data/item-source-20260917.json").read_text())
    catalog, core, old = snapshot["catalog"], snapshot["core_ids"], snapshot["legacy_names"]
    current, retired, new = (snapshot[k] for k in ("registered_current_ids","retired_source_ids","unregistered_core_ids"))
    check(len(catalog)==27 and set(core)==set(catalog)-{"new_themed_pack"}, "Catalog/core boundary")
    check(len(core)==len(set(core))==26, "Core coverage")
    check(collections.Counter(catalog[i]["kind"] for i in core)=={"equipment":10,"consumable":12,"goal":4}, "Core source groups")
    check((len(old),len(current),len(retired),len(new))==(38,14,24,12), "Legacy/current split counts")
    check(set(current)==set(old)&set(core) and set(retired)==set(old)-set(core) and set(new)==set(core)-set(old), "Legacy/current split IDs")
    old_roles=dict(re.findall(r"^### I-([\w-]+) — (.+)$",(DOCS/"37-item-38-role-draft.md").read_text(),re.M))
    check(old_roles==old, "Historical 38 role IDs/names changed")
    extras={i["id"] for i in snapshot["unregistered_collections"]}
    check(extras=={"sticker_pack","new_themed_pack"} and not extras & set(core), "Collection/core boundary")
    check(all(re.fullmatch(r"[0-9a-f]{40}",s) for s in [snapshot["main_commit"],snapshot["design_base_commit"],*snapshot["source_blobs"].values()]), "Source SHA format")
    text=(DOCS/"77-current-items-card-text-draft.md").read_text()
    blocks=list(re.finditer(r"^### I-([\w-]+) — ([^\n]+)\n(.*?)(?=^### |^## |\Z)",text,re.M|re.S))
    records=[]
    for block in blocks:
        id,name,body=block.groups()
        quotes=re.findall(r"^> (.+)$",body,re.M)
        meta=re.search(r"^時: (\d+) / 使用方法: (.+?) / 構築区分: (.+?) / 登録: (.+)$",body,re.M)
        source=re.search(r"^source: (SHOP_ITEMS|NAOTO_ITEMS|CONSUMABLE_ITEMS) / id=([\w-]+)。",body,re.M)
        check(len(quotes)==1, f"I-{id}: exactly one body")
        check(meta is not None and source is not None, f"I-{id}: metadata/source")
        if meta is None or source is None or len(quotes)!=1 or id not in core:
            check(id in core, f"Unknown body I-{id}")
            continue
        cost,method,rarity,registration=meta.groups()
        group={"equipment":"SHOP_ITEMS","consumable":"CONSUMABLE_ITEMS","goal":"NAOTO_ITEMS"}[catalog[id]["kind"]]
        check(source.groups()==(group,id), f"I-{id}: source group")
        check(name==catalog[id]["label"], f"I-{id}: current display name")
        check(registration==("既存" if id in old else "未登録source"), f"I-{id}: registration")
        check(rarity==("レア" if catalog[id]["kind"]=="goal" else "通常"), f"I-{id}: card rarity")
        check(1<=int(cost)<=4 and method in {"みにつける","しかける","すぐつかう"}, f"I-{id}: cost/method")
        records.append(dict(id="I-"+id,source_id=id,name=name,time=int(cost),method=method,
            rarity={"通常":"normal","レア":"rare"}[rarity],registration="registered" if id in old else "source-only",text=quotes[0]))
    by_id={r["source_id"]:r for r in records}
    check(len(records)==len(by_id)==26 and set(by_id)==set(core), "26 body coverage")
    methods=collections.Counter(r["method"] for r in records)
    check(methods=={"みにつける":14,"しかける":1,"すぐつかう":11}, "Play-method counts")
    overview=[line.strip("|").split("|") for line in text.splitlines() if line.startswith("| I-")]
    check(len(overview)==26, "Overview count")
    for cells in overview:
        id,name,cost,method,rarity,registration=(c.strip() for c in cells)
        r=by_id.get(id[2:],{})
        check((name,cost,method,rarity,registration)==(
            r.get("name"),str(r.get("time")),r.get("method"),
            "レア" if r.get("rarity")=="rare" else "通常",
            "既存" if r.get("registration")=="registered" else "未登録source"), f"{id}: overview mismatch")
    a=(DOCS/"08-test-deck-a-card-drafts.md").read_text()
    paper=re.search(r"- トイレットペーパー — 時1・しかける【67改稿】: "+chr(96)+r"([^"+chr(96)+r"]+)",a)
    check(paper is not None and by_id.get("poop1",{}).get("text")==paper[1], "Paper 67 literal preservation")
    groups=collections.defaultdict(list)
    for r in records:
        groups[r["text"]].append(r["id"])
    duplicates=[v for v in groups.values() if len(v)>1]
    check(not duplicates, "Identical current item bodies")
    cases=re.findall(r"^\| ((?:I|X)\d{2}) \|",(DOCS/"78-current-items-text-audit.md").read_text(),re.M)
    check(cases==[f"I{i:02d}" for i in range(1,27)]+[f"X{i:02d}" for i in range(1,15)], "40 manual case IDs")
    if source_root:
        source_root=Path(source_root)
        for path,sha in snapshot["source_blobs"].items():
            data=(source_root/path).read_bytes()
            actual=hashlib.sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()
            check(actual==sha, f"Pinned source blob mismatch: {path}")
        actual_catalog=json.loads(subprocess.check_output(
            ["node","-e","console.log(JSON.stringify(require(process.argv[1]).CATALOG))",str((source_root/"item-system.js").resolve())],text=True))
        check(actual_catalog==catalog, "Actual CATALOG/snapshot mismatch")
        script=(source_root/"script.js").read_text()
        for group,kind in [("SHOP_ITEMS","equipment"),("NAOTO_ITEMS","goal"),("CONSUMABLE_ITEMS","consumable")]:
            section=script.split("  const "+group+" = [",1)[1]
            section=section.split("  ].map(item",1)[0] if group!="NAOTO_ITEMS" else section.split("\n  ];",1)[0]
            ids=re.findall(r"\bid:\s*'([^']+)'",section)
            if group=="CONSUMABLE_ITEMS":
                marker="...['normal','rare'].map(kind => ({ id:"+chr(96)+"c_egg_"+"$"+"{kind}"+chr(96)
                check(marker in section, "Actual egg source expansion")
                ids+=["c_egg_normal","c_egg_rare"]
            check(len(ids)==len(set(ids)) and set(ids)=={i for i in core if catalog[i]["kind"]==kind}, f"Actual {group}/snapshot mismatch")
    result=dict(main_commit=snapshot["main_commit"],core_source_entries=len(core),
        source_groups=dict(collections.Counter(catalog[i]["kind"] for i in core)),
        registered_current=len(current),retired_source=len(retired),unregistered_core=len(new),
        unregistered_collection_sources=len(extras),body_entries=len(records),
        method_counts=dict(methods),rarity_counts=dict(collections.Counter(r["rarity"] for r in records)),
        identical_body_groups=duplicates,manual_cases=len(cases),actual_source_verified=bool(source_root),errors=errors)
    if include_catalog:
        result["items_current_source"]=records
    return result


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root")
    parser.add_argument("--catalog",action="store_true")
    args=parser.parse_args()
    result=audit(args.source_root,args.catalog)
    print(json.dumps(result,ensure_ascii=False,indent=2))
    raise SystemExit(bool(result["errors"]))
