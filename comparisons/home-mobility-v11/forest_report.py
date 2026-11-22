"""Render the owner report from a certified, matched four-arm cohort."""

import argparse
import csv
import json
import re
from pathlib import Path


def table(names, rows):
    return "\n".join(
        [
            "| " + " | ".join(names) + " |",
            "| " + " | ".join("---" for _ in names) + " |",
        ]
        + ["| " + " | ".join(str(x) for x in row) + " |" for row in rows]
    )


def read(path):
    with path.open() as f:
        return list(csv.DictReader(f))


def report(directory, output):
    artwork = Path(__file__).resolve().parents[2] / "character-world-master.v1.js"
    names = dict(re.findall(r"id: '([\w]+)', label: '([^']+)'", artwork.read_text()))

    def resident(key):
        role, name = key.split(":")
        return {"pet": "主人公の", "partner": "恋人の"}.get(role, "") + names[name]

    roles = ["v9", "v10", "v11-foot", "v11"]
    titles = ["V9", "V10", "足元のみ", "V11最終"]
    cells = read(directory / "forest-cases.csv")
    people = read(directory / "forest-residents.csv")
    assert len(cells) == 32 and len(people) == 896
    total = lambda rows, k: sum(int(r[k]) for r in rows)
    opening = lambda r: (
        int(r["width"]),
        int(r["seed"]),
        int(r["order"]),
        r["layout"],
        int(r["repeat"]),
    )
    grouped = {
        op: {r["policy"]: r for r in cells if opening(r) == op}
        for op in sorted({opening(r) for r in cells})
    }
    label = lambda p: (
        f"{p[0]}px・{p[1]}"
        + ("・仲間順変更" if p[2] else "")
        + ("・旧調整配置" if p[3] == "reference" else "・従来配置")
        + (f"・再試行{p[4]}" if p[4] > 1 else "")
    )
    hdr = ["開始条件", "V9", "V10", "足元のみ", "V11最終"]
    cell_table = table(
        hdr,
        [
            [label(p)]
            + [
                f"{row[k]['own_once']}／{row[k]['own_twice']}／{row[k]['both_halves']}"
                for k in roles
            ]
            for p, row in grouped.items()
        ],
    )
    totals = []
    focus = []
    touch = []
    sh = []
    time = []
    for k, title in zip(roles, titles):
        subset = [c for c in cells if c["policy"] == k]
        a = [r for r in people if r["policy"] == k]
        worst = max(a, key=lambda r: float(r["longest_blocked_s"]))
        totals.append(
            [
                title,
                total(subset, "own_once"),
                total(subset, "own_twice"),
                total(subset, "both_halves"),
                total(subset, "walking_legs"),
                f"{sum(float(c['walk_distance_css']) for c in subset):,.1f}",
                f"{total(subset, 'plans'):,} / {total(subset, 'requests'):,}",
            ]
        )
        touch.append(
            [
                title,
                total(subset, "opening_trusted"),
                total(subset, "opening_reached"),
                total(subset, "aged_trusted"),
                total(subset, "aged_reached"),
                total(subset, "aged_near4"),
                total(subset, "drag_steps"),
                total(subset, "drag_unsafe_steps"),
                total(subset, "drag_swept_violations"),
                total(subset, "speed_bound_exceedances"),
            ]
        )
        sh.append(
            [
                title,
                total(subset, "changes_on_sync"),
                total(subset, "same_body_replacement_moves"),
                total(subset, "between_legs_shifts"),
                f"{max(float(c['max_between_legs_css']) for c in subset):.2f}",
            ]
        )
        time.append(
            [
                title,
                resident(worst["key"]),
                label(opening(worst)),
                worst["longest_blocked_s"],
            ]
        )
    waiting = []
    for k, title in zip(roles, titles):
        a = [r for r in people if r["policy"] == k]
        waiting.append(
            [
                title,
                total(a, "refused_episodes"),
                total(a, "episodes_over_60"),
                total(a, "episodes_over_180"),
                sum(float(r["longest_blocked_s"]) > 60 for r in a),
                total(a, "recovered"),
                round(sum(float(r["refused_seconds"]) for r in a)),
            ]
        )
    for p, row in grouped.items():
        f = row["v11"]
        focus.append(
            [
                label(p),
                f["focus_walks"],
                resident(f["longest_blocked_actor"]),
                f["longest_blocked_s"],
            ]
        )
    directly = [r for r in cells if r["policy"] == "v11"]
    run_links = " ／ ".join(
        f"[CI {n}](https://github.com/Naoto214/naotocchi/actions/runs/{n})"
        for n in sorted({c["workflow_run"] for c in cells})
    )
    width_results = []
    for w in sorted({int(c["width"]) for c in cells}):
        row = [str(w) + "px"]
        for k in roles:
            g = [c for c in cells if int(c["width"]) == w and c["policy"] == k]
            row.append(
                f"{total(g, 'both_halves')}／{len(g) * 28}・{100 * total(g, 'plans') / total(g, 'requests'):.1f}%"
            )
        width_results.append(row)
    refs = [r for r in cells if r["width"] == "320" and r["layout"] == "reference"]
    risk320 = []
    for k, title in zip(roles, titles):
        c = next(x for x in refs if x["policy"] == k)
        rr = [
            r
            for r in people
            if r["width"] == "320" and r["layout"] == "reference" and r["policy"] == k
        ]
        raccoon = next(r for r in rr if r["key"] == "companion:tanuki")
        no16 = sum(r["aged_16px_headings"] == "0" for r in rr)
        risk320.append(
            [
                title,
                c["focus_walks"],
                raccoon["longest_blocked_s"],
                sum(int(r["normal"]) == 0 for r in rr),
                sum(float(r["longest_blocked_s"]) > 60 for r in rr),
                f"{no16}／{sum(bool(r['aged_16px_headings']) for r in rr)}",
            ]
        )
    specific = []
    for rr in [
        r
        for r in people
        if r["width"] == "320"
        and r["layout"] == "reference"
        and r["policy"] == "v11"
        and r["key"]
        in ("companion:tanuki", "companion:box", "pet:dog", "companion:panda")
    ]:
        specific.append(
            [
                resident(rr["key"]),
                rr["normal"],
                rr["failed_requests"],
                rr["failures_with_initial_contact"],
                rr["failures_without_any_direct_step"],
                rr["failures_with_8px_safe_progress"],
                rr["longest_blocked_s"],
            ]
        )
    intents = []
    for change in json.loads((directory / "forest-goal-changes.json").read_bytes()):
        for arrived in change["arrivals"] or [None]:
            result = (
                f"{arrived['walked_css']:.2f}／{arrived['toward_original_css']:.2f}／{arrived['end_error_css']:.2f}"
                if arrived
                else "未到着"
            )
            intents.append(
                [
                    resident(change["resident"]),
                    change["game_s"],
                    f"{change['desired_css']:.2f}／{change['desired_deg']:.2f}°",
                    f"{change['chosen_css']:.2f}／{change['chosen_deg']:.2f}°",
                    result,
                ]
            )
    run_end = max(float(c["wall_s"]) for c in cells)
    run_start = min(float(c["wall_s"]) for c in cells)
    max_seconds = max(float(c["model_s"]) for c in cells)
    browsers = ", ".join(sorted({c["browser"] for c in cells}))
    docs = [
        "# 森28体の継続的な歩行と足元の安定性",
        f"実際の移動ホームを32回開き、毎回、画面を表示して28体が暮らす状態で実時間・ゲーム内時間ともに600秒を超えるまで再生した。実時間は{run_start:.1f}〜{run_end:.1f}秒、ゲーム内時間は600秒から最長{max_seconds:.1f}秒。歩行回数・距離・連続不成立は全版とも最初の600ゲーム内秒で比較する。歩行開始から終点までの直線変位が8 CSS px以上あり、目標までの直線距離が0.75 CSS pxを超えて縮み、通常歩行で到着した場合を1回とした。道譲りの歩行、閉塞時の短い脱出、通知による位置の変化はこの回数に含めない。",
        "## 初期配置・乱数をそろえた8組",
        "各欄は「1回以上歩いた人数／2回以上歩いた人数／前後半の両方で歩いた人数」。1組につき28体。旧調整配置はV9で検討したコウモリ・柴犬の初期席を各幅の当時の処理で再現する。通常ホームの時間進行、通知、会話、世話の時刻が実行中に異なり得る。開始時の28体の足、体格、行動、次の判断時刻、移動用乱数が4版で一致することを各組で照合した。",
        cell_table,
        "幅ごとの各欄は「前後半とも通常歩行した住民／延べ住民数・本人の自律要求に経路が成立した割合」。幅によって乱数・配置・反復数が異なり、幅だけの効果とは限らない。",
        table(["幅", *titles], width_results),
        "特に初期の2体を調整した320px・乱数214で、連続不成立と退路を比較した。最終列は、10分後の同じ28体の足位置から16px安全に直進できる方向が0だった人数／元の48方向検査と一致した検査人数。",
        table(
            [
                "版",
                "犬／タヌキ／パンダ／箱の通常歩行回数",
                "タヌキの最長不成立・秒",
                "一度も通常歩行しなかった人数",
                "60秒超の不成立を経験した人数",
                "10分後に16pxの退路なし",
            ],
            risk320,
        ),
        "320px・旧調整配置のV11について、経路が成立しなかった時点の全員の足位置を別のブラウザーへ読み込み、実際の地形・原画・接触規則で48方向×8距離を検査した。各不成立について、開始時の接触、3〜24pxのどの試験距離・方向にも安全に直進できなかった場合、逆に8px以上安全に進み元の指示方向への距離を0.75 CSS px超縮められた場合を数えた。直接の一歩があっても最終到着まで通れるとは限らない。",
        table(
            [
                "住民",
                "通常歩行",
                "不成立要求",
                "開始時に接触あり",
                "安全な一歩なし",
                "目標に近づく8px以上の一歩あり",
                "最長不成立・秒",
            ],
            specific,
        ),
        "## 延べ224体ずつの歩行と安全性",
        table(
            [
                "版",
                "1回以上",
                "2回以上",
                "前後半とも",
                "通常歩行回数",
                "通常歩行距離 CSS px",
                "経路成立／自律要求",
            ],
            totals,
        ),
        "連続不成立は、実際に拒否された自律要求から、本人の次の一歩、見回す・座る・休むなどの行動選択、歩行枠の待ちに切り替わるまでを計時した。病気や会話などでモデルが止まった実時間は含めない。各住民の復帰割合、道譲り後に自分の目標まで歩けた回数、開始時・終了時の安全な移動候補数も個体別CSVに記載した。V9・V10の対照群では同じ選択に至った歩行枠待ちと本人の休息の発生時刻を個別に記録していない。両者の合計で不成立期間を終了し、歩行枠待ちの回数は元の計数器から別に取得した。",
        table(
            [
                "版",
                "不成立区間",
                "60秒超の区間",
                "180秒超の区間",
                "60秒超を経験した住民・延べ224体中",
                "自分の歩行で復帰した区間",
                "不成立時間の合計（ゲーム内秒）",
            ],
            waiting,
        ),
        table(["版", "最長不成立の住民", "開始条件", "ゲーム内秒"], time),
        "## 主人公・タヌキ・パンダ・箱",
        table(
            [
                "開始条件",
                "V11での犬／タヌキ／パンダ／箱の通常歩行回数",
                "同じ試行の最長不成立住民",
                "ゲーム内秒",
            ],
            focus,
        ),
        "## タップからのドラッグと保存復帰",
        "各家庭の開始時と600秒経過後の足位置・同居者・歩行状態を取り出し、28体にそれぞれ初めて指示する状態へ復元した。Chromiumのタッチ入力を送り、対象本人が受けたかと、安全に補正された経路終点まで実際に歩いたかを区別した。操作を送る独立試験の間だけ新しい自律要求を止めた。10分連続再生では自律移動や会話を有効にし続けた。各家庭で本来のセーブデータを再読み込みし、住民・恋人・地域を照合した。",
        table(
            [
                "版",
                "開始時の実入力",
                "開始時到着",
                "10分後の実入力",
                "10分後到着",
                "10分後・指先4px以内",
                "ドラッグ中の歩行ステップ",
                "地形等の安全違反",
                "移動途中の接触違反",
                "自律歩行区間の速度上限超過",
            ],
            touch,
        ),
        "## 歩行以外の足元の移動",
        "ネイティブの同期処理前後で足位置を読み、同一原画・体格・地域・投影・画面幅のまま表示要素だけが入れ替わった場合を集計した。別に、全歩行区間の終点から次の区間の開始点までの位置差を算出した。最大値の単位はCSS px。同じ同期区間に複数の変化があると、個々の同期の件数と区間をまたぐ件数は一致しないことがある。",
        table(
            [
                "版",
                "同期中の位置変化",
                "同じ住民の表示要素差し替え",
                "歩行区間の間に位置差あり",
                "最大の位置差",
            ],
            sh,
        ),
        "## 同一の終了状態でパンダの足位置だけを比べた場合",
        "実時間の異なるホームでは途中の判断順も変わるため、別の320px・乱数214・旧調整配置のV10実測から、足位置の影響だけを取り出した。通知でパンダが2.323 CSS pxずれ、その後、自分で一歩も動かないまま到達した615.729ゲーム内秒の28体・行動・乱数を復元した。進行中の経路探索や手動指示はなかった。表示範囲を引き継いだ場合の元の足位置も歩ける地形内にあり、柴犬との接触が1件から0件になった。他の27体と全員の移動ルールは固定した。",
        "同じ状態から1/30秒刻みで300ゲーム内秒進めると、実測足位置とその再試行は、全要求、歩行、終点、乱数の最終値まで一致した。パンダの足位置を保った組では、自分の目標まで歩いた住民が4→4体、複数回歩いた住民が3→2体、通常歩行が12→10回、パンダ自身は6→5回、通常歩行距離は111.06→113.17 CSS pxだった。1つの通知・1体の足位置が、その後の移動機会に影響し得る。これは同じネイティブモデルを同一の時間刻みで進めた比較で、上の実時間で暮らした32試行には含めていない。[同一状態からの個体別結果](evidence/forest-foot-continuation.json)",
        "## 目的地を変更した時の到着",
        f"V11が記録した自由歩行の候補は{total(directly, 'proposals')}回。そのうち{total(directly, 'replaced_proposals')}回で安全な別の目標を選んだ。最終目標を基準とする通常歩行は{total(directly, 'walking_legs')}回、同じ実際の各歩行区間について、元々希望した方向への接近で数え直すと{total(directly, 'strict_original_direct_legs')}回。変更後の目標を保持したまま再探索した場合にも、その住民が選んだ直近の希望位置を照合した。",
        "角度は画面の右向きを0°として、下向きを正とした。距離と位置誤差はCSS px。ここでの到着は経路上を本人が歩き終えたもの。",
        table(
            [
                "住民",
                "ゲーム内秒",
                "当初の目標までの距離／方位",
                "選択した目標までの距離／方位",
                "歩いた距離／当初の目標への接近／選択目標との終点誤差",
            ],
            intents,
        ),
        "[本人限定・28体から選ぶ](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/v11/forest.html) ／ [32件の記録ZIPの照合情報](evidence/forest-receipts.json) ／ [32家庭の集計](evidence/forest-cases.csv) ／ [896件の個体記録](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v11/tables/forest-residents.csv) ／ [同期時の足位置・原画・表示要素](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v11/tables/forest-sync-changes.csv)"
        + " ／ "
        + run_links,
    ]
    arm_summary = {}
    for k in roles:
        g = [c for c in cells if c["policy"] == k]
        arm_summary[k] = (
            total(g, "both_halves"),
            sum(int(c["both_halves"]) == 28 for c in g),
        )
    repeats = sorted(
        (
            c
            for c in directly
            if c["width"] == "390" and c["seed"] == "937" and c["layout"] == "reference"
        ),
        key=lambda c: int(c["repeat"]),
    )
    docs.extend(
        [
            "## 採用判断に関わる点",
            f"同じ開始条件8組で、開始から5分と次の5分の両方で歩けた住民は、V10が延べ{arm_summary['v10'][0]}体、足元修正のみが{arm_summary['v11-foot'][0]}体、目的地の候補選択も含むV11が{arm_summary['v11'][0]}体だった。V11で28体全員が前後半に通常歩行できたのは{arm_summary['v11'][1]}/8試行。390px・乱数937・旧調整配置の同一条件再試行だけでも、両方の5分間に歩いた人数は{repeats[0]['both_halves']}体と{repeats[1]['both_halves']}体だった。",
            "表示要素の差し替えによる足位置の変化と、自発的な散歩の機会は別々に判断できる。320pxでは10分の間に一度も通常歩行できない住民が残り、同じ目的地選択で歩ける人数も再試行で変わる。新しい目的地の選択を全住民の公平性の解決策として標準採用する根拠は得られていない。",
            "## 再現と照合",
            f"CIは各家庭を専用のLinuxランナーのChrome {browsers}で1回ずつ再生した。iPhone Safari実機での10分再生・指の感触は未確認。版・乱数・画面幅・仲間順・配置ごとの記録ZIPは、GitHub Actionsが返したSHA-256に一致することを確認してから解凍した。別のブラウザーで16pxの退路を再検査し、同じ足元の3px・8pxの安全な全方位が元の記録と一致した個体だけを16pxの列に載せた。",
            "[10分試験の実行手順](../../.github/workflows/home-mobility-v11-fairness.yml) ／ [入力・足位置・描画元・個体記録の照合](forest_collect.py) ／ [3・8・16pxの同じ足元での検査](forest_distances.py) ／ [実際の表示要素の同期を記録する処理](forest_observe.py)",
        ]
    )
    output.write_text("\n\n".join(docs) + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    report(args.directory, args.output)
