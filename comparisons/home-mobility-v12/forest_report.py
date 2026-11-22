"""Report observed fairness, including helper costs and censored outcomes."""

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
    trading = []
    for key in keys:
        actual = [r for r in people if r["profile"] == key and r["cohort"] == "v12"]

        def delta(row, field):
            return float(row[field]) - float(
                by_person[key, "fresh-foot", row["key"]][field]
            )

        helpers = [r for r in actual if delta(r, "yields_performed") > 0]
        fewer = sum(delta(r, "normal") < 0 for r in helpers)
        longer = sum(delta(r, "longest_blocked_s") > 0 for r in helpers)
        affected = sum(
            delta(r, "normal") < 0 and delta(r, "longest_blocked_s") > 0
            for r in helpers
        )
        ns = sum(int(r["curve_helper_walked"]) > 0 for r in actual)
        trading.append(
            [profile(cases["v12"][key]), len(helpers), fewer, longer, affected, ns]
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
            "同じ住民・同じ開始条件の今回のV11とV12を個別に照合した。「協力が増えた人数」は曲がる・直線を合わせて、道を譲って終点まで歩いた回数がV12で多かった人を指す。",
            table(
                [
                    "開始条件",
                    "協力が増えた人数",
                    "うち本人の通常歩行が減少",
                    "うち最長不成立が延長",
                    "その両方",
                    "曲がる計画で実際に協力した人数",
                ],
                trading,
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
            "[本人限定の個体別診断](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/v12/forest.html) ／ [32家庭の集計](evidence/forest-cases.csv) ／ [各記録ZIPの照合情報](evidence/forest-receipts.json) ／ [本人限定の個体別表](https://naotocchi-home-v12-records.kerzion214.chatgpt.site/evidence/mobility-v12/tables/forest-residents.csv)",
            "・".join(
                f"[CI {run}](https://github.com/Naoto214/naotocchi/actions/runs/{run})"
                for run in sorted({c["workflow_run"] for c in cells})
            ),
        ]
    )
    intermediate_tables = [
        tables / "forest-first-cases.csv",
        tables / "forest-eight-cases.csv",
    ]
    if all(p.is_file() for p in intermediate_tables):
        earlier = []
        for p in intermediate_tables:
            with p.open() as source:
                earlier.append(
                    {
                        r["profile"]: r
                        for r in csv.DictReader(source)
                        if r["cohort"] == "v12"
                    }
                )
        assert all(set(r) == set(keys) for r in earlier)
        docs.extend(
            [
                "## 曲がる探索の優先順位と助け手の退路",
                "初回候補は曲がる探索の間、既存の道譲り枠を使った。低優先版では通常の道譲りがその更新内で枠を取り戻す。低優先の2版は、操作や地形が変わったとき、または元の不成立要求が消えたときに探索を取り消す。最終版は8pxの退路に加え、もともと8pxの退路がない第三者の最後の3pxの退路も保護する。",
                table(
                    [
                        "開始条件",
                        "V11足元・今回",
                        "初回V12",
                        "低優先・8px",
                        "最終・8＋3px",
                        "曲がる探索数（初回／低優先／最終）",
                        "曲がる道譲り後の本人通常歩行（同順）",
                    ],
                    [
                        [
                            profile(cases["v12"][k]),
                            counts(cases["fresh-foot"][k]),
                            counts(earlier[0][k]),
                            counts(earlier[1][k]),
                            counts(cases["v12"][k]),
                            "／".join(
                                r[k]["curve_searches"] for r in [*earlier, cases["v12"]]
                            ),
                            "／".join(
                                r[k]["assisted_owner_normals"]
                                for r in [*earlier, cases["v12"]]
                            ),
                        ]
                        for k in keys
                    ],
                ),
                "[初回の個体別実測](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/v12/forest-first.html) ／ [低優先・8pxの個体別実測](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/v12/forest-eight.html) ／ [初回CI](https://github.com/Naoto214/naotocchi/actions/runs/44992612660) ／ [低優先・8pxのCI](https://github.com/Naoto214/naotocchi/actions/runs/44994011396) ／ [最終CI](https://github.com/Naoto214/naotocchi/actions/runs/44994820432)",
            ]
        )
    controlled = tables / "forest-controlled.json"
    if controlled.is_file():
        records = json.loads(controlled.read_bytes())
        real = [r for r in records if r["kind"] == "whole-native-state"]
        poses = [r for r in records if r["kind"] != "whole-native-state"]
        docs.extend(
            [
                "## 状態と時間刻みを固定した再生",
                "記録済みの開始時の28体、足・体格、次の判断時刻、行動、目標・経路、乱数を復元し、通常の移動モデルを1/30秒刻みで600ゲーム内秒進めた。同じ候補を独立に再試行し、全要求、選ばれた動作、実際の歩行、最終状態と乱数まで照合した。ここでは通知や世話の実時間差を取り除いており、10分間の実時間の家庭試験とは別に数える。",
                table(
                    [
                        "開始条件",
                        "V11の通常歩行",
                        "初回V12の通常歩行",
                        "曲がる探索／成立／実行／本人完了",
                    ],
                    [
                        [
                            r["profile"],
                            r["before"]["normal"],
                            r["after"]["normal"],
                            "／".join(
                                str(r["after"][k])
                                for k in (
                                    "searches",
                                    "plans",
                                    "physicalPlans",
                                    "owners",
                                )
                            ),
                        ]
                        for r in real
                    ],
                ),
                "375pxの従来配置では、初回V12で18.300秒に始まったパンダの曲がる探索が19.633秒に不成立となった。両版で先頭20件の移動要求は時刻と内容まで一致したが、次のリスの同じ位置への要求は19.333秒から19.667秒へ遅れた。この家庭で実際に曲がる道譲りで移動した助け手は0体だった。",
                "## 実際に歩いた後の足位置がほかの住民に与える影響",
                "375pxの58.131ゲーム内秒の森で再生したネコと主人公の指定された道譲り、390pxの270.189秒の本来の自律要求404番で再生した石像の例を使った。それぞれ既存の歩行処理で実際に歩いた本人・助け手の終点だけを置き換えた。最後の足位置以外は同一の28体・体格・開幕時の通常行動と乱数・同じ初回V12を使い、その後の300ゲーム内秒を比較した。中間時点の全判断状態と乱数は原記録に残っていない。以下は足位置だけを変えた場合の比較である。",
                table(
                    [
                        "本人",
                        "歩いた後の足位置を使う前→後の全通常歩行",
                        "前後半とも歩いた人数",
                        "本人・助け手それぞれの後の通常歩行",
                        "増加／減少／変化なしの住民",
                    ],
                    [
                        [
                            actor(r["witness"]["owner"]),
                            f"{r['before']['normal']}→{r['after']['normal']}",
                            f"{r['before']['both']}→{r['after']['both']}",
                            "、".join(
                                actor(k) + " " + "→".join(map(str, r["pairs"][k]))
                                for k in [
                                    r["witness"]["owner"],
                                    *r["witness"]["helperKeys"],
                                ]
                            ),
                            f"{r['more']}／{r['less']}／{r['unchanged']}",
                        ]
                        for r in poses
                    ],
                ),
                "[同一状態と足位置の検証原簿](https://naotocchi-home-v12-records.kerzion214.chatgpt.site/evidence/mobility-v12/tables/forest-controlled.json)",
            ]
        )
    final_poses = tables / "forest-final-footprints.json"
    if final_poses.is_file():
        poses = json.loads(final_poses.read_bytes())
        docs.extend(
            [
                "## 最終候補で実際に歩けた2件の、その後の5分",
                "390pxの118.1454秒、375pxの178.2429秒に記録した28体の足位置から、それぞれ新たに8pxの指示を与えた。既存の歩行で本人と協力者が実際に着いた足位置を使い、移動前の足位置を使った場合と比較した。その後の5分は同じ28体・体格・開幕の行動・乱数・最終V12を使った。過去の中間時点の乱数や、ほかの住民が当時続けていた経路は完全には記録されていない。",
                table(
                    [
                        "本人",
                        "全通常歩行 前→後",
                        "前後半に歩いた人数",
                        "本人・助け手のその後の通常歩行",
                        "増／減／同じ住民",
                    ],
                    [
                        [
                            actor(r["witness"]["owner"]),
                            f"{r['before']['normal']}→{r['after']['normal']}",
                            f"{r['before']['both']}→{r['after']['both']}",
                            "、".join(
                                actor(k) + " " + "→".join(map(str, r["pairs"][k]))
                                for k in [
                                    r["witness"]["owner"],
                                    *r["witness"]["helperKeys"],
                                ]
                            ),
                            f"{r['more']}／{r['less']}／{r['unchanged']}",
                        ]
                        for r in poses
                    ],
                ),
                "[最終版の道譲り2件とその後の全28体](https://naotocchi-home-v12-records.kerzion214.chatgpt.site/evidence/mobility-v12/tables/forest-final-footprints.json)",
            ]
        )
        spontaneous = []
        for pose in poses:
            for arm, searches in pose["subsequentCurves"].items():
                for q in searches:
                    ls = []
                    for h in q["helpers"]:
                        if not h["native_steps"]:
                            continue
                        after = h["next_own_normal_after_s"]
                        later = (
                            f"{after:.1f}秒後に自分の通常歩行"
                            if after is not None
                            else f"残り{h['observed_remaining_s']:.1f}秒に通常歩行なし"
                        )
                        ls.append(f"{actor(h['key'])} {h['walked_css']:.2f}px、{later}")
                    spontaneous.append(
                        [
                            pose["profile"],
                            "元の足" if arm == "before" else "道譲り後の足",
                            f"{q['s']:.2f}",
                            actor(q["owner"]),
                            f"{q['owner_walked_css']:.2f}px",
                            "完了" if q["owner_strict_normal"] else "未完了",
                            "、".join(ls),
                        ]
                    )
        if spontaneous:
            docs.extend(
                [
                    "上の5分間の通常生活で、追加の曲がる道譲りが自律的に作動した場面を示す。最初に与えた8pxの指示はここに含めない。",
                    table(
                        [
                            "開始条件",
                            "足の条件",
                            "自律要求の秒",
                            "本人",
                            "歩行",
                            "本人の通常歩行",
                            "助け手のその後",
                        ],
                        spontaneous,
                    ),
                ]
            )
    angular = [
        tables / ("forest-fixed-curve-exits" + s + ".json")
        for s in ("", "96", "192", "360", "384")
    ]
    if all(p.is_file() for p in angular):
        rec = [json.loads(p.read_bytes()) for p in angular]
        key = "companion:hamster"
        row = rec[3]["observations"][0]
        foot = row["observedAfter"]
        assert foot["actor"] == key and all(
            x["observations"][0]["sha"] == row["sha"] for x in rec
        )
        distances = ("3", "8", "16")

        def exits(q, stage):
            return [
                len(q["nativeMeasurements"][stage][key]["degrees"][d])
                for d in distances
            ]

        def fmt(ns):
            return "／".join(map(str, ns))

        manual = row["shortNativeWalk"]["actual"]["drag"]
        ambient = row["shortNativeWalk"]["actual"]["service"]
        docs.extend(
            [
                "## 短い退路が1方向だけになったハムスター",
                "375pxの上記の固定時計で、ハリネズミが時計に道を譲った時の開幕と終点を調べた。ハムスターの3pxの退路は、粗い測定では全て消えたように見える。角度の間隔を変え、同じ地形・遮蔽・両軸の表示尺度・28体の接触範囲を使って測り直した。",
                table(
                    [
                        "方向数",
                        "助け手の出発直前（3／8／16px）",
                        "助け手の足のみを終点に移動",
                        "実際の全28足で再測定",
                        "残った3pxの方角",
                    ],
                    [
                        [
                            r.get("directions", 48),
                            fmt(exits(q, "before")),
                            fmt(exits(q, "isolated")),
                            fmt(exits(q, "actual")),
                            "、".join(
                                str(v) + "°"
                                for v in q["nativeMeasurements"]["actual"][key][
                                    "degrees"
                                ]["3"]
                            )
                            or "検出なし",
                        ]
                        for r in rec
                        for q in [r["observations"][0]]
                    ],
                ),
                f"実際の終点の28足を固定し、既存のドラッグ入口で146.25°へ3pxの指示を与えると{len(manual['history'])}歩・{manual['actual']:.2f}px、誤差{manual['goalError']:.2f}pxで到着した。地形・接触・速度の違反{manual['violations']}件。同じ3pxの目標を自律入口に渡した時の変位は{ambient['actual']:.2f}pxだった。ハリネズミの足だけを動かした場合も同じ方角が残る。",
                "その後の通常生活でのハムスターの実移動は "
                + "、".join(
                    f"{l['start']:.2f}秒 {l['css']:.2f}px（"
                    + ("道譲り" if l["source"] == "yield" else "自分の移動")
                    + "）"
                    for l in foot["legs"]
                )
                + f"。残り{foot['throughModelSeconds'] - row['at_s']:.1f}秒で8px以上の本人通常歩行は{sum(l['strictNormal'] for l in foot['legs'])}回。最後の3px方向を守るだけでは、実際に次の普通の散歩へ出やすい角度の余裕までは保証できない。",
                "[全28体の方向と3pxの実歩行](https://naotocchi-home-v12-records.kerzion214.chatgpt.site/evidence/mobility-v12/tables/forest-fixed-curve-exits360.json) ／ [384方向での全足の照合](https://naotocchi-home-v12-records.kerzion214.chatgpt.site/evidence/mobility-v12/tables/forest-fixed-curve-exits384.json) ／ [190〜205秒を1/30秒ごとに再収録した全28足](https://naotocchi-home-v12-records.kerzion214.chatgpt.site/evidence/mobility-v12/tables/forest-375-clock-190-205.json.gz)",
            ]
        )
    fixed = tables / "forest-background.json"
    if fixed.is_file():
        rec = json.loads(fixed.read_bytes())
        docs.extend(
            [
                "## 最終候補の探索が成立しない時の生活",
                "V11足元版と低優先の最終V12で、同じ初期状態と乱数から600ゲーム内秒を1/30秒刻みで再生した。本人の要求・目的地、全住民が選んだ動作と歩行区間、足位置・進行中の各処理・乱数の終了状態を照合した。",
                table(
                    [
                        "開始条件",
                        "V11の通常歩行",
                        "最終V12の通常歩行",
                        "探索／成立／実行",
                        "全状態・実移動と行動が一致",
                    ],
                    [
                        [
                            r["profile"],
                            r["v11"]["normal"],
                            r["v12"]["normal"],
                            "／".join(
                                str(r["v12"][k])
                                for k in ("searches", "plans", "physicalPlans")
                            ),
                            "一致" if r["identical"] else "差あり",
                        ]
                        for r in rec
                    ],
                ),
                "[最終版8条件の比較SHA-256](https://naotocchi-home-v12-records.kerzion214.chatgpt.site/evidence/mobility-v12/tables/forest-background.json) ／ [8px版の比較SHA-256](https://naotocchi-home-v12-records.kerzion214.chatgpt.site/evidence/mobility-v12/tables/forest-background-eight.json) ／ [固定時計でのネイティブ歩行・乱数・状態の原本ZIP](https://naotocchi-home-v12-records.kerzion214.chatgpt.site/evidence/mobility-v12/tables/forest-fixed-clock.zip)",
            ]
        )
    space = tables / "forest-observed-curve-exits.json"
    if space.is_file():
        rec = json.loads(space.read_bytes())
        if rec["observations"]:
            docs.extend(
                [
                    "## 実生活で曲がる道を譲った直後の退路",
                    "各家庭で実際に曲がる計画の助け手が歩き出した直前の全28足を読み込んだ。助け手の足だけをその実歩行の終点へ置いた場合と、本人の指示が実行された時点の実際の全28足で、3・8・16px×48方向の地形・遮蔽・接触を検査した。",
                    table(
                        [
                            "家庭",
                            "本人",
                            "開始秒",
                            "助け手の足だけ変えると8px全退路を失う住民",
                            "8px退路を新しく得た住民",
                        ],
                        [
                            [
                                r["receipt"],
                                actor(r["owner"]),
                                round(r["at_s"], 2),
                                "、".join(
                                    actor(k)
                                    for k in r["isolatedComparison"][
                                        "lostEvery8pxHeading"
                                    ]
                                )
                                or "0体",
                                "、".join(
                                    actor(k)
                                    for k in r["isolatedComparison"]["new8pxExit"]
                                )
                                or "0体",
                            ]
                            for r in rec["observations"]
                        ],
                    ),
                ]
            )
    high = tables / "forest-observed-curve-exits96.json"
    if high.is_file():
        tests = json.loads(high.read_bytes())["observations"]
        if tests:
            docs.extend(
                [
                    "実時間の各例で、助け手の各歩行ステップの終点と本人の実終点を使って96方向でも再検査した。各ステップでは、その時点で実際に移動した住民の足位置のみを反映して、ほかの住民の動きの影響を切り分けた。",
                    table(
                        [
                            "開始条件",
                            "本人／助け手",
                            "検査した局面数",
                            "途中の同時歩行（本人・助け手以外）",
                            "いずれかの局面で3／8／16pxの最後の退路を失った人数",
                        ],
                        [
                            [
                                r["receipt"],
                                actor(r["owner"])
                                + "／"
                                + "・".join(actor(k) for k in r["helpers"]),
                                len(r["perPhysicalStep"]),
                                "、".join(actor(k) for k in r["otherActiveLegs"])
                                or "0体",
                                "／".join(
                                    str(
                                        len(
                                            {
                                                k
                                                for leg in r["perPhysicalStep"].values()
                                                for k in leg["lastExits"][d]["lostLast"]
                                            }
                                        )
                                    )
                                    for d in ("3", "8", "16")
                                ),
                            ]
                            for r in tests
                        ],
                    ),
                    "[各実歩行の終点と96方向の原簿](https://naotocchi-home-v12-records.kerzion214.chatgpt.site/evidence/mobility-v12/tables/forest-observed-curve-exits96.json)",
                ]
            )
    if all(p.is_file() for p in intermediate_tables):
        docs.extend(
            [
                "## 記録の再現と範囲",
                "7種類の開始条件と390pxの同条件の再試行について、V10・前回のV11足元・今回のV11足元・初回V12・低優先8px・最終V12の各版で異なる実時間記録がある（合計48件）。各版は独立したブラウザーで再生し、原本ZIPをGitHub Actionsの配布SHA-256と照合した。比較ページの4列は、共通のV10、前回のV11、今回のV11と、そのページのV12候補を示す。",
                "最終V12の実機能を含むゲームモデルはコミット `d12f458346cc015e532499fd2adc7877c9fd27ce` からビルドした。最終・初回・低優先8pxの各原簿は、その版が実際に読み込んだモデルと投影コードのSHA-256、初期28体と乱数、歩行、タッチ前後の状態を照合した。固定時計の再生と、元の足位置を使った追加指示は48件の実時間記録に加えていない。",
                "再集計には `forest_results.py` の `--candidate-run` と `--game` で対象と同じ版の実行ID・ビルドを指定する。`forest_extra.py` は固定時計の各住民の歩行と終状態から、比較用のSHA-256を再生成する。",
            ]
        )
    output.write_text("\n\n".join(docs) + "\n")


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("tables", type=Path)
    p.add_argument("output", type=Path)
    a = p.parse_args()
    produce(a.tables, a.output)
