"""Build an owner-readable excursion table with links to the exact original native captures."""

import argparse
import csv
import json
from pathlib import Path
import re
from urllib.parse import quote

ARMS = ["v9", "v10", "v11-foot", "v11"]
TITLES = ["V9", "V10", "足元修正のみ", "V11最終"]
FIELDS = [
    ("first_half", "前半5分の通常歩行（回）", "number"),
    ("second_half", "後半5分の通常歩行（回）", "number"),
    ("normal", "10分の通常歩行（回）", "number"),
    ("normal_distance_css", "通常歩行の距離（CSS px）", "number"),
    ("actual_walk_distance_css", "全歩行の距離（試験終了までのCSS px）", "number"),
    ("requests", "本人の経路要求（回）", "number"),
    ("plans", "成立した経路（回）", "number"),
    ("plan_rate", "経路成立率", "rate"),
    ("longest_to_plan_s", "再び経路が成立するまでの最長時間（ゲーム内秒）", "number"),
    ("longest_blocked_s", "再び自分で歩くまでの最長不成立（ゲーム内秒）", "number"),
    ("peer_change_retries", "近くの住民が動いた時の早期再探索（回）", "number"),
    ("long_wait_reopens", "長く動けなかった時の追加再探索（回）", "number"),
    (
        "after_first_longest_blocked_s",
        "初めて歩いた後の最長不成立（ゲーム内秒）",
        "number",
    ),
    ("recovery_rate", "歩行機会を待ち続けた場合の復帰率", "rate"),
    ("episodes_over_60", "60秒を超えた不成立区間（回）", "number"),
    ("help_offers_received", "ほかの住民から道譲りを提案された回数", "number"),
    ("yields_performed", "ほかの住民に道を譲った歩行（回）", "number"),
    ("normal_after_receiving_help", "道を譲ってもらった後の通常歩行（回）", "number"),
    ("opening_safe_candidates", "開幕の安全な方向・距離（384候補中）", "number"),
    ("aged_safe_candidates", "10分後の安全な方向・距離（384候補中）", "number"),
    ("opening_3px_headings", "開幕に3px進めた方角（48方向中）", "number"),
    ("opening_8px_headings", "開幕に8px進めた方角（48方向中）", "number"),
    ("opening_16px_headings", "開幕に16px進めた方角（48方向中）", "number"),
    ("aged_3px_headings", "10分後に3px進めた方角（48方向中）", "number"),
    ("aged_8px_headings", "10分後に8px進めた方角（48方向中）", "number"),
    ("aged_16px_headings", "10分後に16px進めた方角（48方向中）", "number"),
    ("sync_foot_changes", "同期時に足位置が変わった回数", "number"),
    (
        "stable_replacement_shifts",
        "同じ住民の表示要素差し替えで足位置が変わった回数",
        "number",
    ),
    ("max_between_legs_css", "歩行区間の間の最大の座標差（CSS px）", "number"),
    ("opening_arrived", "開始時のドラッグ", "touch"),
    ("aged_arrived", "10分後のドラッグ", "touch"),
]


def read(path):
    with path.open() as f:
        return list(csv.DictReader(f))


def profile(r):
    return tuple(r[k] for k in ("width", "seed", "order", "layout", "repeat"))


def value(row, key, unit):
    if unit == "touch" and row[key.split("_")[0] + "_trusted"] == "0":
        return None
    if row[key] == "":
        return None
    n = float(row[key])
    return int(n) if n.is_integer() else round(n, 5)


def build(tables, raw, master, output, prefix):
    names = dict(re.findall(r"id: '([\w]+)', label: '([^']+)'", master.read_text()))
    cells = read(tables / "forest-cases.csv")
    residents = read(tables / "forest-residents.csv")
    changes = read(tables / "forest-sync-changes.csv")
    cases = {}
    for c in cells:
        key = profile(c)
        sources = cases.setdefault(key, {})
        assert c["policy"] not in sources
        sources[c["policy"]] = c
    assert len(cases) == 8 and len(residents) == 896
    resident_rows = {(profile(r), r["policy"], r["key"]): r for r in residents}
    payload = []
    for key, arms in sorted(
        cases.items(),
        key=lambda item: (item[0][0] != "320", item[0][3] != "reference", item[0]),
    ):
        width, seed, order, layout, repeat = key
        assert (
            set(arms) == set(ARMS)
            and len({a["initial_sha256"] for a in arms.values()}) == 1
        )
        actors = [
            r["key"] for r in residents if profile(r) == key and r["policy"] == "v9"
        ]
        assert len(set(actors)) == 28
        observations = []
        for actor in actors:
            role, id = actor.split(":")
            rows = [resident_rows[key, k, actor] for k in ARMS]
            label = {"pet": "主人公の", "partner": "恋人の"}.get(role, "") + names[id]
            observations.append(
                dict(
                    key=actor,
                    label=label,
                    changes=[
                        [
                            TITLES[ARMS.index(s["policy"])],
                            float(s["clock"]),
                            float(s["css"]),
                            [float(s["from_x"]), float(s["from_y"])],
                            [float(s["to_x"]), float(s["to_y"])],
                            int(s["replacement_only"]),
                        ]
                        for s in changes
                        if s["key"] == actor and profile(s) == key
                    ],
                    arms=[[value(r, k, unit) for k, t, unit in FIELDS] for r in rows],
                )
            )
        links = []
        for k, title in zip(ARMS, TITLES):
            case = "-".join(key) + "-" + k
            hits = list(
                raw.glob(str(arms[k]["workflow_run"]) + "/" + case + "/receipt.json")
            )
            assert len(hits) == 1, (case, hits)
            receipt = json.loads(hits[0].read_bytes())
            assert receipt["case"] == case and receipt["complete"]
            links.append(
                [
                    title,
                    prefix.rstrip("/")
                    + "/"
                    + str(receipt["run"])
                    + "/"
                    + quote(case)
                    + "/runner.zip",
                ]
            )
        label = f"{width}px・乱数{seed}・" + (
            "旧調整配置" if layout == "reference" else "従来配置"
        )
        if order != "0":
            label += "・仲間の順番を変更"
        if int(repeat) > 1:
            label += "・同じ条件の再試行"
        payload.append(dict(label=label, people=observations, archives=links))
    data = {"fields": [[t, u] for k, t, u in FIELDS], "cases": payload}
    template = Path(__file__).with_suffix(".html").read_text()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        template.replace(
            "/*OBSERVATIONS*/null",
            json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace(
                "<", r"\u003c"
            ),
        )
    )


def verify(output):
    from playwright.sync_api import sync_playwright

    summary = []
    with sync_playwright() as runtime:
        browser = runtime.chromium.launch(executable_path="/usr/bin/chromium")
        for width in (320, 375, 390, 430):
            page = browser.new_page(
                viewport={"width": width, "height": 792},
                is_mobile=True,
                has_touch=True,
                device_scale_factor=2,
            )
            messages = []
            page.on("pageerror", lambda error: messages.append(str(error)))
            # The managed browser blocks file: navigation. Serve the exact generated
            # response body on a loopback origin without contacting owner hosting.
            url = "http://127.0.0.1/forest.html"
            page.route(
                url,
                lambda route: route.fulfill(
                    path=str(output.resolve()), content_type="text/html; charset=utf-8"
                ),
            )
            page.goto(url)
            checked = 0
            for condition in range(8):
                page.locator("#case").select_option(index=condition)
                assert page.locator("#resident option").count() == 28
                assert (
                    len(
                        set(
                            page.locator("#raw a").evaluate_all(
                                "(links)=>links.map(a=>a.href)"
                            )
                        )
                    )
                    == 4
                )
                keys = page.locator("#resident option").evaluate_all(
                    "(options)=>options.map(o=>o.value)"
                )
                for key in (
                    keys
                    if width == 320
                    else [
                        "pet:dog",
                        "companion:tanuki",
                        "companion:panda",
                        "companion:box",
                    ]
                ):
                    page.locator("#resident").select_option(key)
                    assert page.locator("#measurements tr").count() == len(FIELDS)
                    values = page.locator("#measurements td").all_inner_texts()
                    assert len(values) == 4 * len(FIELDS) and all(
                        v not in ("", "undefined", "NaN") for v in values
                    )
                    changes = page.locator("#changes tr").count()
                    assert (changes > 0) == page.locator("#change-table").is_visible()
                    assert (changes == 0) == page.locator("#unchanged").is_visible()
                    checked += 1
            assert (
                page.evaluate("document.documentElement.scrollWidth<=innerWidth")
                and not messages
            )
            summary.append(
                dict(
                    width=width,
                    measuredCases=8,
                    residents=28,
                    verifiedSelections=checked,
                    errors=messages,
                    horizontalOverflow=False,
                )
            )
            page.close()
        browser.close()
    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("tables", "raw", "master", "out"):
        parser.add_argument(name, type=Path)
    parser.add_argument("--archive-prefix", default="../evidence/mobility-v11/forest")
    parser.add_argument(
        "--verify",
        type=Path,
        help="write a local Chromium mobile-width browser receipt",
    )
    args = parser.parse_args()
    build(args.tables, args.raw, args.master, args.out, args.archive_prefix)
    if args.verify:
        args.verify.write_text(json.dumps(verify(args.out), indent=2) + "\n")
