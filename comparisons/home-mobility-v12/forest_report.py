"""Report observed fairness, including helper costs and censored outcomes."""

from collections import Counter
import argparse
import csv
import json
from pathlib import Path
import re

from forest_results import ARMS, V11


def table(cols, rows):
    return "\n".join(
        "| " + " | ".join(map(str, row)) + " |"
        for row in [cols, ["---"] * len(cols), *rows]
    )


def produce(tables, output):
    read_csv = lambda name: list(
        csv.DictReader((tables / ("forest-" + name + ".csv")).open())
    )
    cells, people = read_csv("cases"), read_csv("residents")
    assert len(cells) == 32 and len(people) == 896
    curves = json.loads((tables / "forest-curve-searches.json").read_bytes())
    names = dict(
        re.findall(
            r"id: '([\w]+)', label: '([^']+)'",
            (V11.parents[1] / "character-world-master.v1.js").read_text(),
        )
    )

    def actor(k):
        role, id = k.split(":")
        return {"pet": "主人公の", "partner": "恋人の"}.get(role, "") + names[id]

    titles = ("V10・前回", "V11足元・前回", "V11足元・今回", "V12")
    profile = lambda c: (
        f"{c['width']}px・{c['seed']}・"
        + ("旧調整席" if c["layout"] == "reference" else "従来席")
        + ("・仲間順変更" if c["order"] != "0" else "")
        + ("・再試行" if c["repeat"] != "1" else "")
    )
    cases = {
        arm: {c["profile"]: c for c in cells if c["cohort"] == arm} for arm in ARMS
    }
    by_person = {(r["profile"], r["cohort"], r["key"]): r for r in people}
    keys = sorted(cases["v12"])
    gsum = lambda group, k: sum(int(row[k]) for row in group)
    counts = lambda r: "／".join(r[k] for k in ("own_once", "own_twice", "both_halves"))
    fraction = lambda n, d: f"{n}／{d}" + (f" ({100 * n / d:.1f}%)" if d else "")
    summary = []
    risks = []
    safety = []
    help_stats = []
    comparison = []
    for arm, title in zip(ARMS, titles):
        rows = list(cases[arm].values())
        prs = [r for r in people if r["cohort"] == arm]
        summary.append(
            [
                title,
                *[
                    gsum(rows, k)
                    for k in ("own_once", "own_twice", "both_halves", "walking_legs")
                ],
                f"{sum(float(r['walk_distance_css']) for r in rows):,.1f}",
                fraction(gsum(rows, "plans"), gsum(rows, "requests")),
            ]
        )
        worst = max(prs, key=lambda r: float(r["longest_blocked_s"]))
        risks.append(
            [
                title,
                gsum(prs, "episodes_over_60"),
                gsum(prs, "episodes_over_180"),
                round(sum(float(r["refused_seconds"]) for r in prs)),
                actor(worst["key"]),
                profile(worst),
                worst["longest_blocked_s"],
            ]
        )
        yields = [r for r in prs if int(r["yields_performed"]) > 0]
        maxh = max(prs, key=lambda r: int(r["yields_performed"]))
        help_stats.append(
            [
                title,
                len(yields),
                gsum(prs, "yields_performed"),
                gsum(prs, "normal_after_receiving_help"),
                gsum(prs, "self_normal_after_yield"),
                sum(int(r["normal"]) == 0 for r in yields),
                f"{actor(maxh['key'])}・{maxh['yields_performed']}回",
            ]
        )
        safety.append(
            [
                title,
                gsum(rows, "same_body_replacement_moves"),
                gsum(rows, "between_legs_shifts"),
                gsum(rows, "speed_bound_exceedances"),
                gsum(rows, "drag_unsafe_steps"),
                gsum(rows, "drag_swept_violations"),
                fraction(gsum(rows, "opening_reached"), gsum(rows, "opening_trusted")),
                fraction(gsum(rows, "aged_reached"), gsum(rows, "aged_trusted")),
            ]
        )
    for key in keys:
        r = cases["v12"][key]
        hrs = [p for p in people if p["profile"] == key and p["cohort"] == "v12"]
        old = cases["fresh-foot"][key]
        more = sum(
            int(p["normal"]) > int(by_person[key, "fresh-foot", p["key"]]["normal"])
            for p in hrs
        )
        less = sum(
            int(p["normal"]) < int(by_person[key, "fresh-foot", p["key"]]["normal"])
            for p in hrs
        )
        comparison.append(
            [
                profile(r),
                r["focus_walks"],
                f"{more}／{less}／{28 - more - less}",
                old["both_halves"] + "→" + r["both_halves"],
                actor(r["longest_blocked_actor"]),
                r["longest_blocked_s"],
            ]
        )
    rr = list(cases["v12"].values())
    ff = list(cases["fresh-foot"].values())
    outcomes = []
    for group in [
        ("V12全体", rr),
        ("320px", [r for r in rr if r["width"] == "320"]),
        ("375px", [r for r in rr if r["width"] == "375"]),
        ("390px", [r for r in rr if r["width"] == "390"]),
        ("430px", [r for r in rr if r["width"] == "430"]),
    ]:
        name, cs = group
        outcomes.append(
            [
                name,
                *[
                    gsum(cs, k)
                    for k in (
                        "curve_searches",
                        "finished_searches",
                        "curve_one_stage",
                        "curve_two_stages",
                        "assistants_physically_walked",
                        "assisted_owner_normals",
                        "helper_moved_without_owner_normal",
                    )
                ],
            ]
        )
    per_search = []
    for q in curves:
        if not q["found"]:
            continue
        helps = ", ".join(
            f"{actor(h['key'])} {h['walked_css']:.2f}px・次の自分の通常歩行 "
            + (
                f"{h['next_own_normal_after_s']:.1f}秒後"
                if h["next_own_normal_after_s"] is not None
                else f"残り{h['observed_remaining_s'] or 0:.1f}秒で未完了"
            )
            for h in q["helpers"]
        )
        per_search.append(
            [
                profile(cases["v12"][q["profile"]]),
                actor(q["owner"]),
                f"{q['s']:.2f}",
                helps or "助け手の歩行なし",
                str(q["owner_steps"]),
                f"{q['owner_walked_css']:.2f}",
                "完了" if q["owner_strict_normal"] else "未完了",
            ]
        )
    groups = [c for c in cells if c["cohort"] in ("fresh-foot", "v12")]
    newly = f"{min(float(c['wall_s']) for c in groups):.1f}〜{max(float(c['wall_s']) for c in groups):.1f}"
    docs = [
        "# 森28体の実生活と道譲り",
        f"同じ住民・初期位置・体格・次の行動時刻・乱数で、V11足元修正のみとV12を各8回、新しく再生した。各家庭の実時間は{newly}秒で、全試行のゲーム内時間も600秒を超える。375pxと430pxも別々に測り、390pxでは同一条件を2回繰り返した。V10と前回のV11足元の各8回は、元のGitHub ActionsのSHA-256で照合したVERSION 11の実測記録を使った。",
        "通常歩行は、本人が自分の目標の方へ0.75 CSS pxを超えて近づき、8 CSS px以上の直線変位を伴って通常の経路を歩き終えた場合。すべての歩行について初めの600ゲーム内秒で比較し、道を譲る歩行、短い脱出と同期による座標変化を分けた。世話・病気・会話によるゲーム内時計の停止と、本人が座ったり休息した時間は経路不成立に加えていない。",
        "## 前後半に繰り返し歩けたか",
        "各欄は「1回以上／2回以上／前後半5分にそれぞれ1回以上」の人数。分母は各行28体。",
        table(
            ["幅・乱数・配置", *titles],
            [
                [profile(cases["v12"][k]), *[counts(cases[a][k]) for a in ARMS]]
                for k in keys
            ],
        ),
        table(
            [
                "版（各224体）",
                "1回以上",
                "2回以上",
                "前後半とも",
                "通常歩行回数",
                "通常歩行距離 CSS px",
                "本人の要求に経路が成立",
            ],
            summary,
        ),
        f"V12で28体全員が前後半に通常歩行できたのは{sum(c['both_halves'] == '28' for c in rr)}/8試行。前後半に歩いた住民は、同じ初期状態の今回のV11では延べ{gsum(ff, 'both_halves')}体、V12では延べ{gsum(rr, 'both_halves')}体だった。同じ移動乱数で開始しても、実時間での通知や世話、その後の行動と経路は分岐する。",
        "## 誰が取り残されたか",
        table(
            [
                "開始条件",
                "主人公の犬／タヌキ／パンダ／箱のV12通常歩行",
                "今回のV11より回数が増／減／同じ人数",
                "前後半とも歩行 V11→V12",
                "V12で最長の不成立",
                "ゲーム内秒",
            ],
            comparison,
        ),
        table(
            [
                "版",
                "60秒超の連続不成立",
                "180秒超",
                "延べ不成立時間（秒）",
                "最長の住民",
                "その試行",
                "最長（秒）",
            ],
            risks,
        ),
        "## 曲がる道譲りが実生活で使われたか",
        "直線の既存処理が解けなかった場面で、対象候補があり、曲がる探索を開始したものを数える。本人が歩いた結果は、協力者の開始・到着、本人に出した指示、本人の実際の歩行区間を時刻と住民IDで突き合わせた。探索開始、計画、実際の歩行は別に集計した。左右に回転するだけの動作やテスト用に再現した場面は含まない。",
        table(
            [
                "幅",
                "探索開始",
                "探索完了",
                "1体で成立",
                "2体で成立",
                "助け手が実歩行した計画",
                "本人が通常歩行完了",
                "助け手だけ歩いて本人未完了",
            ],
            outcomes,
        ),
    ]
    if per_search:
        docs.append(
            table(
                [
                    "開始条件",
                    "本人",
                    "開始ゲーム内秒",
                    "助け手の移動距離とその後の歩行",
                    "本人の歩行ステップ",
                    "本人の距離 CSS px",
                    "通常歩行",
                ],
                per_search,
            )
        )
    docs.extend(
        [
            "## 助け手の負担",
            "各家庭で誰が道を譲ったか、本人が受けた道譲り後の通常歩行と、助け手が次に道を譲るまで自分の目標に向けて歩き終えた回数を調べた。この集計には従来の直線の道譲りも含む。観測終了までに次の歩行がなかった住民には、終了直前に協力した人も含む。各住民の変化から特定の道譲りとの因果関係を断定することはできない。",
            table(
                [
                    "版",
                    "道を譲って到着した人数・延べ",
                    "道を譲って到着した回数",
                    "本人が助けを受けた通常歩行",
                    "次の道譲りまでに自分で通常歩行した回数",
                    "道を譲り本人通常歩行0の人数",
                    "1家庭で最も多く道を譲った住民",
                ],
                help_stats,
            ),
            "## 足元とドラッグ",
            "開幕・10分後に28体それぞれの最初のタッチ操作を独立に再生した。到着は実際に安全な経路終点へ歩いた件数。移動速度、地形、動いている区間の他住民とのすり抜けも確認した。足の位置変化は同期処理の前後と、連続する実歩行区間の間の両方で検査した。",
            table(
                [
                    "版",
                    "同一条件の表示要素再作成による足元変化",
                    "歩行区間外で足位置が変化",
                    "速度違反",
                    "ドラッグの地形等の違反",
                    "移動途中の接触違反",
                    "開幕到着／実入力",
                    "10分後到着／実入力",
                ],
                safety,
            ),
            "歩行や世話を止めずに過ごした10分間と、終了時の切り出した状態に最初のタッチを送る検査を分けた。ブラウザーのタッチイベント・画面幅はLinuxのChromeで実測した。iPhone Safari実機の長時間の体感・発熱・指での操作は未検証。",
            "[本人限定の個体別診断](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/v12/forest.html) ／ [32家庭の集計](evidence/forest-cases.csv) ／ [各記録ZIPの照合情報](evidence/forest-receipts.json) ／ [本人限定の個体別表](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v12/tables/forest-residents.csv)",
            "・".join(
                f"[CI {run}](https://github.com/Naoto214/naotocchi/actions/runs/{run})"
                for run in sorted({c["workflow_run"] for c in cells})
            ),
        ]
    )
    output.write_text("\n\n".join(docs) + "\n")


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("tables", type=Path)
    p.add_argument("output", type=Path)
    a = p.parse_args()
    produce(a.tables, a.output)
