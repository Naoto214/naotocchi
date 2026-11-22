"""Build a readable owner report from the complete native atlas, without extrapolating missing cases."""

import argparse, csv, json, math, statistics
from pathlib import Path

HERE = Path(__file__).resolve().parent
NAMES = {
    "home": "おうち",
    "forest": "森",
    "river_lake": "川と湖",
    "city": "街",
    "countryside": "田園",
    "mountain": "山",
    "snow": "雪",
    "sea": "海",
    "jungle": "ジャングル",
    "desert": "砂漠",
    "deepsea": "深海",
    "star_stop": "星の停留所",
    "memory_lake": "思い出の湖",
}
REVIEWS = {
    "home": "中央・右の床にかかる一方、左端はソファの前面に重なる。",
    "forest": "草地の上方に広がる樹冠と幹に足元が集まる。",
    "river_lake": "左の河原と右の川面を同じ帯が横切る。",
    "city": "道路より奥にある店の軒・欄干を横切る。",
    "countryside": "中央の道から両脇の畑まで帯が広がる。",
    "mountain": "前景の道より奥に重なり、右端は稜線外の遠景にかかる。",
    "snow": "手前の雪道より上方の木々・集落に重なる。",
    "sea": "手前の砂浜より上方の海面に足が並ぶ。",
    "jungle": "手前の乾いた土より上方の葉と水辺に重なる。",
    "desert": "帯にも砂は見えるが前景ポリゴンより奥の斜面で、奥行きの判断を要する。",
    "deepsea": "海底の上縁のほか背面の岩に重なる。",
    "star_stop": "手前の石床の上縁から奥の柱・縁の装飾にかかる。",
    "memory_lake": "手前の石畳より奥の湖面に重なる。",
}


def main(a):
    case = lambda key: json.loads((a.data / f"{key}.json").read_text())
    F = lambda key: case(key)["frames"][0]
    S = lambda key: F(key)["survey"]
    fmt = lambda x: (
        f"{x:,.2f}".rstrip("0").rstrip(".") if isinstance(x, float) else f"{x:,}"
    )
    lines = []
    wr = lines.append

    def table(headers, rows):
        wr("| " + " | ".join(headers) + " |")
        wr("| " + " | ".join("---" for k in headers) + " |")
        for r in rows:
            wr("| " + " | ".join(str(x) for x in r) + " |")
        wr("")

    fixed = "forest-320-28-long-fixed"
    ref = "forest-320-28-long-reference"
    d = case(fixed)
    s = d["frames"][0]["survey"]
    wset = (320, 375, 390, 430)
    ns = (1, 4, 10, 20, 28)
    wr("# 歩ける場所・表示原画・接触の実測")
    wr("")
    wr(
        f"森・320×792 CSS px・従来席では、開幕に単独で8px歩けるのは{s['solo8']}/28体。住民を取り除けば28/28体に8px以上の直線がある。タヌキも箱も3・8・16pxのすべてで地形だけなら96/96方向、周りを同じ席に戻すと0/96方向だった。両者の足は表示中の昼の原画では遠景の樹冠にある。地形計算上の混雑と、原画上の足の不自然さが同じ画面で起きている。[本人限定の地図](https://naotocchi-home-v13.kerzion214.chatgpt.site/v13/map.html) ／ [13地域の原画・地形・足](evidence/map-artwork-320.jpg)"
    )
    wr("")
    wr("## 森の人数と幅")
    wr("")
    wr(
        "画面高を792pxにそろえた新規のネイティブ開幕を比較した。28体は従来席。各セルは順に、2px格子で数えた歩行地形の面積 CSS px²、地形内の接触楕円の和集合の割合、単独8pxの出口を持つ人数。人数を変えるとサイズBと既存の画角も変わるため、地形そのものを別のポリゴンに替えていなくても画面上の面積が変わる。"
    )
    wr("")
    rows = []
    for n in ns:
        line = [f"{n}体"]
        for w in wset:
            t = S(f"forest-{w}-{n}" + ("-long-fixed" if n == 28 else "-matched"))
            line.append(
                f"{fmt(t['terrain_px2'])}・{fmt(t['foot_union_pct'])}%・{t['solo8']}/{n}"
            )
        rows.append(line)
    table(["人数"] + [f"{w}px" for w in wset], rows)
    wr(
        "4体では全幅で全員に8pxの出口があった。320pxは10体で70%、20体で30%となり、この2条件の間に40ポイント落ちた。同じ比較は375pxで70%→50%、390pxで80%→45%、430pxで70%→50%。28体の320pxは11/28（39%）で、20体の6/20（30%）から少し戻る。人数ごとに配席と表示倍率も変わるため、生の人数だけで段階的に悪くなるわけではない。"
    )
    wr("")

    wr(
        "森28体・同じ高さの4幅について、地形面積を人数で割った面積と、本人の表示・遮蔽・他住民を守って静止できる面積を区別した。すれ違いは中間体格2体が反対に24px歩く12px格子の試験。退避人数は16px先に重ならず着地し、左右の両方に3pxの余白がある住民数。"
    )
    wr("")
    rows = []
    for w in wset:
        t = S(f"forest-{w}-28-long-fixed")
        rows.append(
            [
                w,
                fmt(t["terrain_per_resident"]),
                fmt(t["median_individual_free_px2"]),
                t["contact_pairs"],
                f"{t['solo3']}/{t['solo8']}/{t['solo16']}",
                (
                    fmt(t["centreline_width_min_px"])
                    if t["centreline_width_min_px"] is not None
                    else "—"
                ),
                f"{t['passing_static']}→{t['passing_clear']}",
                t["retreat_people"],
            ]
        )
    table(
        [
            "幅",
            "面積/人 px²",
            "個別の空き面積中央値 px²",
            "開幕接触組",
            "3/8/16px人数",
            "端点付近を除く最小中心線幅 px",
            "地形のみ→26体ありのすれ違い地点",
            "退避人数",
        ],
        rows,
    )
    wr(
        "最小中心線幅は最大連結成分の2px格子中心線で、枝端の8px以内を除いた地点の「最寄りの縁までの距離×2」。地形の端を連続座標で極限まで追った幅は0にも近づく。分岐間だけの局所的な首と細い枝は別の印で表示した。袋小路は分岐から8px以上続く枝。2px格子は細い隙間を見落とすことがあり、単独の実際の退出はネイティブの線分判定を別に使った。"
    )
    wr("")
    wr("## 原画と歩ける地形を重ねた13地域")
    wr("")
    wr(
        "正式な5分試験の画面は320×516、375×760、390×792、430×880 CSS px。次の表は320×516・28体の開幕。ピンクの帯はモデルの足が歩ける地形、黒点は実測の足、黄色は原画の地形・除外輪郭、白枠は表示画面。地形は旧投影と実際の背景のカバー投影を合併している。比率は画面内の歩行地形のうち、現行の原画座標で検査した地形・除外域・高さ下限の外にある面積。比率は通過違反件数でも、異常と確定した画素割合でもない。[原画上に重ねた13地域](evidence/map-artwork-320.jpg)"
    )
    wr("")
    rows = []
    for region, label in NAMES.items():
        t = S(f"{region}-320-28")
        rows.append(
            [
                label,
                fmt(t["screen_terrain_px2"]),
                f"{100*t['legacy_only_visible_px2']/t['screen_terrain_px2']:.1f}%",
                f"{t['foot_union_pct']:.1f}%",
                t["solo8"],
                REVIEWS[region],
            ]
        )
    table(
        [
            "地域",
            "画面内地形 px²",
            "原画座標の地形外",
            "足の占有",
            "8px人数",
            "昼原画で確認したこと",
        ],
        rows,
    )
    wr(
        f"320×792の森では地形{fmt(s['terrain_px2'])} px²中、画面内{fmt(s['screen_terrain_px2'])} px²。そのうち{fmt(s['legacy_only_visible_px2'])} px²が原画座標の現行判定外。タヌキは画面(143.13, 323.80)、原画の横46.80%・縦40.88%。箱は原画の横50.45%・縦35.85%。森で表示原画に沿って追加される通常の明確な草地の下限は縦55%。A～Dはこの旧投影を削らず、B/Cの新しい草地は離れた前景にだけ加える。320pxの樹冠にいる2体に、そのまま新しい退路がつながるとはいえない。公式5分試験の320×516は、同じ320pxでも縦方向の表示倍率が大幅に異なる。幅だけで比較すると、この違いが混ざる。"
    )
    wr("")
    wr(
        "320×516・28体の昼の実測足位置を、同一投影の朝・昼・夕・夜の原画52枚に重ねて目視した。森は4時刻とも遠景の樹冠、海は4時刻とも砂浜より沖、思い出の湖は4時刻とも石畳より奥の水面に足が重なる。田園の道や砂漠の斜面には原画上も足を置けそうな地点が含まれる。地図の「照合する原画」で時刻を切り替えられる。夜などの画像を選んでも観察した足と地形条件は昼のまま。[森の夜原画に昼の足を重ねる](https://naotocchi-home-v13.kerzion214.chatgpt.site/v13/map.html?region=forest&width=320&count=28&study=record&view=art&painting=night)"
    )
    wr("")
    wr("## 住民が動くと開く道と閉じる道")
    wr("")
    wr(
        "森林のV12記録では開始からほぼ60ゲーム秒ごとに本人の足と全27体を復元した。各観察間隔について、本人を前時点に固定して他の住民だけを現在の足へ移した反実仮想の8px出口も保存した。本人・他者の両方が動く場合と区別する。実ゲームの移動操作や、間の全フレームの再現を意味しない。"
    )
    wr("")
    rows = []
    for key in ("companion:tanuki", "companion:panda", "companion:box"):
        person = next(p for p in d["people"] if p["key"] == key)
        series = [next(row for row in f["rows"] if row[0] == key) for f in d["frames"]]
        rows.append(
            [
                person["label"],
                series[0][5][1],
                series[-1][5][1],
                sum(r[5][1] == 0 for r in series),
                ",".join(str(r[5][1]) for r in series),
            ]
        )
    table(
        [
            "320px・従来席",
            "開幕8px方位数",
            "10分の8px方位数",
            "閉じた観察点/11",
            "各観察点の8px方位数",
        ],
        rows,
    )
    examples = []
    for prev, cur in zip(d["frames"], d["frames"][1:]):
        for left, right in zip(prev["rows"], cur["rows"]):
            if (
                left[5][1] == 0
                and right[13]
                and right[5][1] > 0
                or left[5][1] > 0
                and right[13] == 0
                and right[5][1] == 0
            ):
                examples.append(
                    f"{prev['time']:.0f}→{cur['time']:.0f}秒の{next(p['label'] for p in d['people'] if p['key']==right[0])}は、元の{left[5][1]}方向から、本人を元に置いても{right[13]}方向、全員の実測位置では{right[5][1]}方向"
                )
    if examples:
        wr("。".join(examples[:4]) + "。")
        wr("")
    wr(
        "占有率は地域全体に対する値で、個別の空き面積は全27体分の「本人＋相手」の接触半径で計算する。足を置ける空き領域が別の島にあれば、本人がそこへ歩ける保証はない。現在重なっているとき離れる方向に少し歩ける場合もある。休息や睡眠による待機と要求が通らない時間は、別の10分連続再生で判別した。[長時間の住民別結果](https://naotocchi-home-v13.kerzion214.chatgpt.site/v13/forest.html)"
    )
    wr("")
    wr("## 接触楕円と見える体")
    wr("")
    wr(
        "元のPNGでアルファ値32/255以上の画素を測り、CSS変形前の正方形の画像枠を確認して、実画面の横・縦別の倍率でCSS pxへ換算した。画像の下端15%に残る不透明画素の横幅も測定した。影・接地草・波紋・装備の飾りは体の原画に含めない。表は320×792、28体の従来席。接触は二人それぞれの横半径 (体幅/2＋5)、縦半径 (体高×0.38＋5) を足したモデル楕円に、画面への横・縦倍率を別々に掛ける。"
    )
    wr("")
    rows = []
    for key in (
        "pet:dog",
        "partner:forest_bear",
        "companion:tanuki",
        "companion:panda",
        "companion:box",
        "companion:bat",
        "companion:hamster",
    ):
        person = next(p for p in d["people"] if p["key"] == key)
        row = next(r for r in d["frames"][0]["rows"] if r[0] == key)
        rows.append(
            [
                person["label"],
                f"{2*row[3]:.2f} × {2*row[4]:.2f}",
                f"{person['ink'][0]:.2f} × {person['ink'][1]:.2f}",
                fmt(person["band"][0]),
                f"{2*row[3]/person['ink'][0]:.2f}倍",
            ]
        )
    table(
        [
            "住民",
            "接触直径 横×縦 px",
            "見える体 横×縦 px",
            "最下部15%の横幅 px",
            "接触直径/体の横幅",
        ],
        rows,
    )
    for width in (320, 390):
        pane = case(f"forest-{width}-28-long-fixed")
        fr = pane["frames"][0]
        p, q = [
            next(x for x in pane["people"] if x["key"] == k)
            for k in ("companion:tanuki", "companion:box")
        ]
        rp, rq = [
            next(x for x in fr["rows"] if x[0] == k)
            for k in ("companion:tanuki", "companion:box")
        ]
        h = rp[3] + rq[3]
        v = rp[4] + rq[4]
        gap = h + q["inkBounds"][0] - p["inkBounds"][2]
        front = v + q["inkBounds"][1] - p["inkBounds"][3]
        wr(
            f"{width}×792のタヌキ・箱を同じ開幕体格のまま境界に置いた比較では、左右の足間隔{h:.2f}px、原画の不透明外接枠間の横の空き{gap:.2f}px。前後の足間隔{v:.2f}px、箱を手前に置くと縦の空き{front:.2f}px。実際の二人の席を移さず比較図に再投影した値である。"
        )
    wr("")
    short_tanuki = next(
        person
        for person in case("forest-320-28")["people"]
        if person["key"] == "companion:tanuki"
    )
    wr(
        f"320×516のタヌキは横53.23pxのまま、接触の縦直径は7.06pxに圧縮され、見える体は{short_tanuki['ink'][0]:.2f}×{short_tanuki['ink'][1]:.2f}pxになる。同じ320幅でも320×792の縦45.60pxとは大きく違う。横方向の余裕だけを見ると、短い画面で前後の原画が既に近接・重なる条件を見落とす。接触が見た目の足より大きいことは高さ792pxの3役に共通する。横長・縦長の投影差、手前後の遮蔽と原画の違いがあるため、この差をそのまま許容接近距離に換算できない。本人地図の「2体の接触境界を原画と比べる」で全役・任意の組を切り替えられる。現行接触は全案で維持し、すり抜けを生む一律緩和は提案しない。"
    )
    wr("")
    if (HERE / "evidence/map-gait.json").is_file():
        gait = json.loads((HERE / "evidence/map-gait.json").read_text())
        wr(
            "実際に歩行を始めた住民のCSSアニメーションを0～500msの5時点で読み取った。同じ物理足で原画の歩行変形だけを進める。次の値は画像枠左上の最大変位。個々のPNGの足指が動いた距離とは別の量。"
        )
        wr("")
        table(
            ["幅", "歩行中の住民", "原画枠の左上変位 px", "接触軸の変位 px"],
            [
                [
                    g["width"],
                    g["key"],
                    f"{max(math.dist(x['relative'][:2],g['snapshots'][0]['relative'][:2]) for x in g['snapshots']):.3f}",
                    f"{max(math.dist(x['axes'],g['snapshots'][0]['axes']) for x in g['snapshots']):.3f}",
                ]
                for g in gait
            ],
        )
    wr("## A～Dの空間と初期配置")
    wr("")
    wr(
        "森の画面高792・従来席で、Aは旧地形、Bは小道の一部、Cはさらに局所的な退避場所を加えた。DはCの地形で、375px・28体などの条件でのみ、既存の退路を守る初期配置候補を適用する。ほか12地域は地形・接触・座席条件が共通。B/Cの5分画面はV12の同じ観察時点の足を新地形で再検査するため、地形だけの違いを確認できる。「V13の10分実測」を選ぶと同じ候補の連続試行で実際に観察した開幕・約5分・10分の足で、地形・接触・退路を確認できる。"
    )
    wr("")
    rows = []
    for w in wset:
        for arm in "abcd":
            ident = f"forest-{w}-28-long-fixed" + (
                "" if arm == "a" else "-" + ("c" if arm == "d" and w != 375 else arm)
            )
            t = S(ident)
            rows.append(
                [
                    w,
                    arm.upper(),
                    fmt(t["terrain_px2"]),
                    f"{t['native_gain_px2']}/{t['native_loss_px2']}",
                    f"{t['solo3']}/{t['solo8']}/{t['solo16']}",
                    t["contact_pairs"],
                    t["passing_clear"],
                    t["retreat_people"],
                ]
            )
    table(
        [
            "幅",
            "案",
            "歩行地形 px²",
            "Aからの増/減 px²",
            "3/8/16px人数",
            "開幕接触組",
            "すれ違い地点",
            "退避人数",
        ],
        rows,
    )
    wr(
        "すれ違いは出発点への進入までは証明していない。退避先は本人の実際の足から直接歩けるが、以後全員の退路を保つという採用判定は初期配置・長時間記録で別に検査した。道譲りは上表で実行していない。[地形・初期配置の個別検査](geometry-results.md)"
    )
    wr("")
    short = [S(f"forest-320-{n}-c") for n in ns]
    tall = S("forest-320-28-long-fixed-c")
    wr(
        f"同じ幅320pxでも高さ516pxの5分試験では、Cが実際のモデル領域内に追加した面積は1・4・10・20・28体の順に{'、'.join(str(row['native_gain_px2']) for row in short)} px²。28体の単独8pxはAの{S('forest-320-28')['solo8']}/28からCの{short[-1]['solo8']}/28。高さ792pxの従来席でCが{tall['native_gain_px2']:,} px²を追加した値を、低い画面に転用できない。"
    )
    wr("")
    if (HERE / "evidence/map-living-receipts.json").exists():
        wr("## 新しい連続再生の足位置で、いつ単独経路が残るか")
        wr("")
        wr(
            "各欄は、実際の開幕・5分付近・10分を超えた観察終了時の足に対し、単独8pxが1方位以上ある人数（28体中）。候補間で開幕後の足位置が違う場合も、各候補自身の記録を使った。5分付近の軌跡は足の座標を保存し、体格は開幕の寸法を使った。全28体について終了時の記録寸法と一致した。5・10分の2点の間に動いたか、希望した通常歩行を完了したかは住民別の連続記録で判定する。"
        )
        wr("")
        rows = []
        focal = []
        for width, seat in [
            (320, "fixed"),
            (320, "reference"),
            (375, "fixed"),
            (390, "fixed"),
            (430, "reference"),
        ]:
            seat_name = "従来席" if seat == "fixed" else "V9調整席"
            cells = []
            for arm in ("a", "b", "c", "d", "d-curve"):
                run = case(f"forest-{width}-28-living-{seat}-{arm}")
                assert run["traceVersion"] in ("a-control", "final")
                frames = run["frames"]
                cells.append(" → ".join(str(f["survey"]["solo8"]) for f in frames))
                seed = run["traceName"].split("-")[1]
                if width == 320:
                    last = frames[-1]
                    values = []
                    for key in ("companion:tanuki", "companion:panda", "companion:box"):
                        row = next(r for r in last["rows"] if r[0] == key)
                        values.append(f"{row[6][1]} / {row[5][1]}")
                    focal.append(
                        [
                            seat_name,
                            arm.upper().replace("D-CURVE", "D＋曲がる道譲り"),
                            f"{last['time']:.1f}",
                            *values,
                        ]
                    )
            rows.append([width, seat_name, seed, *cells])
        table(["幅", "座席", "乱数", "A", "B", "C", "D", "D＋曲がる道譲り"], rows)
        wr(
            "320pxの3体について、終了時の8px方向を「地形・表示を通る方位数 / 他者との接触も通る方位数」で示す（各96方位）。終了時刻は再生中の実経過モデル秒。地形条件だけで残る方位が多くても、現在の近隣の足に阻まれると個体が単独で進める方位は少なくなる。"
        )
        wr("")
        table(["座席", "案", "終了時刻（秒）", "タヌキ", "パンダ", "箱"], focal)
    saved = HERE / "evidence/map-guard-delta.json"
    if saved.exists():
        retest = json.loads(saved.read_bytes())
        t = retest["totals"]
        wr("## 通過線分を原画で再検査した版")
        wr("")
        wr(
            f"同じ初期席、同じ原画上の追加範囲、同じ居住者の足位置を維持して、候補で初めて通れる線分が原画の除外域・前景を横切っていないかを調べる修正前後を再測定した。対象{retest['cases']}条件、画面上の地形が一致した条件{retest['sameTerrain']}、各個体の静止可能マスクが一致した条件{retest['sameInkBounds']}。3・8・16pxの96方位を合わせると、同じ足で地形・表示{t['terrainBearingsTested']:,}方位、他者との接触も含む{t['clearBearingsTested']:,}方位を照合した。地形・表示は{t.get('terrainBearingsLost',0):,}方位減／{t.get('terrainBearingsGained',0):,}方位増、接触込みは{t.get('clearBearingsLost',0):,}方位減／{t.get('clearBearingsGained',0):,}方位増。1人・1時点・1距離で最後の接触込み方位を失った組は{t.get('lastExitLost',0)}。すれ違い地点は{t.get('passingSitesLost',0)}地点減／{t.get('passingSitesGained',0)}地点増だった。連続的な全方位での不変までは証明しない。[修正前後の同一条件比較](evidence/map-guard-delta.json)"
        )
        wr("")
    wr("## 原資料")
    wr("")
    wr(
        "各地図は既存の本人用ゲームのネイティブ地形・線分・原画遮蔽・役別の表示枠・厳密な接触を読み取る観察用スクリプトから生成した。写真の画面上の座標は実測のステージ左上＋モデル足×実際の表示倍率。原画は同じ配布物の当該地域の昼原画を、描画時に記録したカバーの左・上・幅・高さに重ねている。格子面積には境界セルの丸めがある。3・8・16pxの線分は各96方位を検査した。比較図の他者だけを置き換えた方位は保存小数点3桁のCSS座標から再計算した測定で、境界上では丸めの影響を受け得る。iPhone Safari実機の表示・タッチ・描画は未検証。[全条件・時点別面積](evidence/map-cases.csv) ／ [個体別面積と出口](evidence/map-residents.csv) ／ [元の5分試験と投影照合](evidence/map-receipts.json) ／ [ブラウザー操作結果](evidence/map-ui.json) ／ [実歩行の描画](evidence/map-gait.json) ／ [CSS変形前固有寸法と実画面の測定](evidence/map-ink-layout.json)"
    )
    wr("")
    receipt = json.loads((HERE / "evidence/map-receipts.json").read_text())
    wr(
        f"元のV12回帰記録と照合したのは{receipt['cells']}世帯・{receipt['snapshots']}時点、6,552個体地点。過去の5分操作に影響しないよう指を触れる直前の足を復元し、元の描画画面への再投影の最大誤差は{receipt['maximumScreenProjectionErrorCss'][0]:.5f} CSS pxだった。"
    )
    wr("")
    wr(
        "元のゲーム配布物、Actionsの地域別ZIP、保存したネイティブ空間記録を用意すると次のように再集計できる。元のプローブはモデルを観察する専用のブラウザーでだけ実行する。"
    )
    wr("")
    archive = json.loads((HERE / "evidence/map-archives.json").read_bytes())
    wr(
        f"公式の13個のZIPすべてをGitHub登録SHA-256と照合した。うち{archive['independentNativeReplays']}世帯は、公式Chromium 157と別実行のChromium 156で格子地形、個別許容域、個体の足・接触・96方位・退避先・すれ違い地点が一致した。照合した個体時点は{archive['independentlyReplayedActorSnapshots']:,}。[各ZIPのIDとSHA-256照合](evidence/map-archives.json)"
    )
    wr("")
    actual = HERE / "evidence/map-living-receipts.json"
    if actual.exists():
        live = json.loads(actual.read_bytes())
        wr(
            f"10分連続再生の地図では、Aは元の5本、B・C・D・D＋曲がる道譲りは強化後の20本に対応する。合計{live['cases']}世帯、{live['frames']}時点、個体位置{live['actorPoints']:,}点で元のテープとネイティブモデル・地形モジュールを照合した。保存時の丸めによる画面足位置の最大差は{live['maxRoundingCss']:.5f}px。[各連続再生と出典の対応](evidence/map-living-receipts.json) ／ [本人限定の元記録](https://naotocchi-home-v13-records.kerzion214.chatgpt.site/)"
        )
        wr("")
    wr("```sh")
    wr('node map-manifest.mjs "$V12/game" > map-data/art.json')
    wr(
        "node -p 'JSON.stringify(require(\"./geometry.cjs\").polygons)' > map-data/patches.json"
    )
    wr(
        'python map_receipts.py --raw "$ATLAS_RAW" --archives "$V12_ARCHIVES" --out evidence/map-receipts.json'
    )
    wr('python map_reduce.py --raw "$ATLAS_RAW" --game "$V12/game"')
    wr("python map_report.py")
    wr("```")
    wr("")
    a.out.write_text("\n".join(lines))


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--data", type=Path, default=HERE / "map-data")
    p.add_argument("--out", type=Path, default=HERE / "MAP.md")
    main(p.parse_args())
