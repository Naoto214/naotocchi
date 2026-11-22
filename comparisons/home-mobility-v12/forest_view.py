"""Build the private V12 resident viewer using the tested V11 table and mobile verifier."""

import argparse
import csv
import importlib.util
import json
from pathlib import Path
import re

from forest_results import ARMS, PROFILES, V11

spec = importlib.util.spec_from_file_location("forest_view_v11", V11 / "forest-view.py")
v11 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v11)

TITLES = ("V10・前回", "V11足元・前回", "V11足元・今回", "V12・今回")
FIELDS = [
    f for f in v11.FIELDS if f[0] not in ("long_wait_reopens", "peer_change_retries")
] + [
    (
        "self_normal_after_yield",
        "道譲り後、次の道譲りまでに自分で通常歩行した回数",
        "number",
    ),
    ("curve_searches", "本人のために曲がる道譲りを探した回数", "number"),
    ("curve_plans", "本人のために曲がる道譲りが成立した計画数", "number"),
    ("curve_owner_normal", "曲がる道譲りの直後に本人が完了した通常歩行", "number"),
    ("curve_helper_walked", "助け手として実際に歩いた曲がる道譲りの段階数", "number"),
    ("curve_helper_reached", "助け手として終点に到着した段階数", "number"),
    (
        "curve_helper_own_after",
        "助け手がその後の観測内で通常歩行を完了した段階数",
        "number",
    ),
    (
        "curve_helper_no_own_60",
        "道譲り後の60秒に自分で通常歩行しなかった段階数",
        "number",
    ),
]


def build(tables, output):
    read_csv = lambda k: list(
        csv.DictReader((tables / ("forest-" + k + ".csv")).open())
    )
    cases, people, shifts = map(read_csv, ("cases", "residents", "foot-changes"))
    receipts = {
        (r["profile"], r["cohort"]): r
        for r in json.loads((tables / "forest-receipts.json").read_bytes())
    }
    names = dict(
        re.findall(
            r"id: '([\w]+)', label: '([^']+)'",
            (V11.parents[1] / "character-world-master.v1.js").read_text(),
        )
    )
    observations = []
    profiles = {c["profile"]: c for c in cases}
    assert len(profiles) == 8 and len(people) == 896
    for profile, c in sorted(
        profiles.items(),
        key=lambda it: (it[1]["width"] != "320", it[1]["layout"] != "reference", it[0]),
    ):
        keys = [
            r["key"] for r in people if r["profile"] == profile and r["cohort"] == "v12"
        ]
        rows = {(r["key"], r["cohort"]): r for r in people if r["profile"] == profile}
        assert len(keys) == 28 and len(rows) == 112
        members = []
        for key in keys:
            role, id = key.split(":")
            changes = []
            for s in shifts:
                if s["key"] == key and s["profile"] == profile:
                    changes.append(
                        [
                            TITLES[ARMS.index(s["cohort"])],
                            float(s["clock"]),
                            float(s["css"]),
                            [float(s["from_x"]), float(s["from_y"])],
                            [float(s["to_x"]), float(s["to_y"])],
                            int(s["replacement_only"]),
                            s.get("reason", ""),
                        ]
                    )
            members.append(
                dict(
                    key=key,
                    label={"pet": "主人公の", "partner": "恋人の"}.get(role, "")
                    + names[id],
                    changes=changes,
                    arms=[
                        [
                            v11.value(rows[key, arm], k, kind)
                            for k, title, kind in FIELDS
                        ]
                        for arm in ARMS
                    ],
                )
            )
        links = []
        for arm, label in zip(ARMS, TITLES):
            rc = receipts[profile, arm]
            old = arm in ("v10", "archived-foot")
            version = "v11" if old else "v12"
            links.append(
                [
                    label,
                    f"../evidence/mobility-{version}/forest/{rc['workflow_run']}/{rc['case']}/runner.zip",
                ]
            )
        width, seed, order, layout, repeat = (c[k] for k in PROFILES)
        label = f"{width}px・乱数{seed}・" + (
            "旧調整配置" if layout == "reference" else "従来配置"
        )
        if order != "0":
            label += "・仲間順変更"
        if repeat != "1":
            label += "・同条件の2回目"
        observations.append(dict(label=label, people=members, archives=links))
    data = dict(fields=[[title, unit] for k, title, unit in FIELDS], cases=observations)
    page = (V11 / "forest-view.html").read_text()
    subst = {
        "森の28体・10分間の実測": "森の28体・道譲り後の歩行",
        "同じ28体、同じ足位置・乱数から始めた4版を比較できます。「足元」はV11の足元修正のみ、「V11」は目的地選択も含む候補です。": "同じ28体・初期位置・移動乱数で10分間暮らした記録です。V11は足元修正のみ。前回と今回のV11を並べ、同じ条件で再試行した際の幅も確認できます。",
        '<th scope="col">V9</th><th scope="col">V10</th><th scope="col">足元</th><th scope="col">V11</th>': '<th scope="col">V10<br>前回</th><th scope="col">V11<br>前回</th><th scope="col">V11<br>今回</th><th scope="col">V12<br>今回</th>',
        "[version,when,distance,from,to,replaced]": "[version,when,distance,from,to,replaced,reason]",
        "'表示同期'); tr.append(note);": "'表示同期')+(reason?'（'+reason+'）':''); tr.append(note);",
        "/*OBSERVATIONS*/null": json.dumps(
            data, ensure_ascii=False, separators=(",", ":")
        ).replace("<", r"\u003c"),
    }
    for source, dest in subst.items():
        assert source in page, source
        page = page.replace(source, dest)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(page)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("tables", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--verify", type=Path)
    args = parser.parse_args()
    build(args.tables, args.output)
    if args.verify:
        v11.FIELDS = FIELDS
        args.verify.write_text(json.dumps(v11.verify(args.output), indent=2) + "\n")
