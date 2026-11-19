"""Verify regional artifacts and compile comparable V4 performance / physical-input tables."""
import argparse
import collections
import csv
import gzip
import hashlib
import io
import json
import math
from pathlib import Path
import statistics
import tarfile
import zipfile

from measure_performance import HEIGHT, ROOT, scenes

EVIDENCE=ROOT/"evidence"
JP={"forest":"もり","river_lake":"みずべ","city":"とかい","home":"おうち","sea":"うみ","countryside":"いなか",
    "mountain":"やま","snow":"ゆきぐに","jungle":"ジャングル","desert":"さばく","deepsea":"しんかい",
    "star_stop":"ほしぞらのていりゅうじょ","memory_lake":"きおくのみずうみ"}
REGIONS=tuple(JP)
ROLES={"pet":"主人公","partner":"恋人","companion":"仲間"}

def quantile(nums,q):
    values=sorted(x for x in nums if x is not None)
    return values[max(0,math.ceil(q*len(values))-1)] if values else 0

def iter_raw(folder):
    for f in sorted(folder.rglob("*.json")):
        if f.name in ("input.json","region.json"):
            yield f.name,f.read_bytes()
    for f in sorted(folder.rglob("*.zip")):
        with zipfile.ZipFile(f) as z:
            for name in z.namelist():
                if Path(name).name in ("input.json","region.json"):
                    yield Path(name).name,z.read(name)

def compact_perf(r):
    region,w,n,policy,curve,layout,requested=r["scene"];s=r["sample"]
    phases=s["phases"]
    def ms(k):
        return phases.get(k,{}).get("ms",0)
    def calls(k):
        return phases.get(k,{}).get("calls",0)
    events=collections.Counter(e["type"] for e in s["reactions"])
    return dict(region=region,width=w,gameHeight=r.get("gameViewport",[w,HEIGHT[w]-52])[1],count=n,policy=policy,curve=curve,layout=layout,extra=r["settings"]["extra"],
        requestedSec=requested,seconds=s["seconds"],rAFHz=s["rafHz"],gapP50ms=s["p50"],gapP95ms=s["p95"],maxGapMs=s["max"],
        stalls250ms=len(s["long"]),stalls1s=sum(h["ms"]>=1000 for h in s["long"]),modelCalls=calls("model"),
        nativeUpdateHz=calls("model")/s["seconds"],residentPaintHz=calls("actors")/s["seconds"],worldDrawHz=calls("world")/s["seconds"],
        modelInclusiveMs=ms("model"),plannerCalls=calls("plan"),plannerMs=ms("plan"),modelWithoutPlannerMs=ms("model")-ms("plan"),
        residentPaintCalls=calls("actors"),residentPaintMs=ms("actors"),worldCalls=calls("world"),worldMs=ms("world"),natureMs=ms("nature"),
        walkModelSec=s["steps"]["walk"],modelSec=s["clock"],pausedWallSec=s["pausedSec"],feetMoved=sum(d>1 for _,d in s["feet"]),
        travelModelUnits=s["distance"],moves=s["moves"],arrivals=events["arrive"],contacts=events["proximity"],socialEvents=events["social"],
        bubbleChanges=len(s["lines"]))

def group_input(rows):
    taps=[r for r in rows if r["mode"]=="tap"]; drags=[r for r in rows if r["mode"]=="drag"]
    reacted=lambda r: any(e[0]=="tap" and e[2]==r["key"] for e in r["observed"]["events"])
    return dict(tapWrongResident=sum(not r["selectedIntended"] and any(d["accepted"] for d in r["observed"]["down"]) for r in taps),
                tapWithoutSelection=sum(not any(d["accepted"] for d in r["observed"]["down"]) for r in taps),
                dragLostAfterSelection=sum(r["selectedIntended"] and not r["dragAttemptedForIntended"] for r in drags),
                v5Rejected=sum(r["dragAttemptedForIntended"] and not r["routeAcceptedOnRelease"] for r in drags),
                tapSelected=sum(r["selectedIntended"] for r in taps),tapReactions=sum(reacted(r) for r in taps),taps=len(taps),
                dragSelected=sum(r["selectedIntended"] for r in drags),dragCommands=sum(r["dragAttemptedForIntended"] for r in drags),
                dragAccepted=sum(r["routeAcceptedOnRelease"] for r in drags),
                dragMoved=sum(r["routeAcceptedOnRelease"] and r["observed"]["displacement"]>1 for r in drags),
                closeEndpoint=sum(r["routeAcceptedOnRelease"] and r["targetErrorCss"] is not None and r["targetErrorCss"]<=4 for r in drags),
                planned=sum(bool((r.get("openingPlanner") or {}).get("choice")) for r in drags),
                dryDirections=sum(r.get("openingPlanner") is not None for r in drags),
                unpausedDryDirections=sum(r.get("openingPlanner") is not None and not r["openingPlanner"]["paused"] for r in drags),drags=len(drags),
                blockedAtStart=sum(not r["readyForInput"] for r in taps+drags),
                selectionMeanMs=statistics.fmean(times) if (times:=[d["at"]-d["ts"] for r in rows for d in r["observed"]["down"] if d["key"]==r["key"]]) else 0,
                selectionP95ms=quantile(times,.95),releaseMeanMs=statistics.fmean(up) if (up:=[e["at"]-e["ts"] for r in drags for e in r["observed"]["up"] if e["key"]==r["key"]]) else 0,
                releaseP95ms=quantile(up,.95))

def csv_write(path,rows):
    with path.open("w",newline="") as f:
        writer=csv.DictWriter(f,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)

def detail(row):
    s=row["sample"];p=s["phases"]
    avg=lambda k:p.get(k,{}).get("ms",0)/max(1,p.get(k,{}).get("calls",0))
    return (f'{s["rafHz"]:.1f} | {s["p95"]:.0f} / {s["max"]:.0f} | {len(s["long"])} | '
            f'{p.get("model",{}).get("calls",0)/s["seconds"]:.1f} | {s["steps"]["walk"]:.1f} / {s["clock"]:.1f} | {avg("model"):.1f} / {avg("actors"):.1f} / {avg("world"):.1f} | '
            f'{p.get("plan",{}).get("calls",0)} / {avg("plan"):.1f}')

def raw_archive(files,target):
    target.parent.mkdir(parents=True,exist_ok=True)
    with target.open("wb") as stream,gzip.GzipFile(filename="",mode="wb",fileobj=stream,mtime=0) as gz,tarfile.open(fileobj=gz,mode="w") as tar:
        for fname,data in sorted(files.items()):
            entry=tarfile.TarInfo(fname);entry.size=len(data);tar.addfile(entry,io.BytesIO(data))

def regional(folder,complete,archive):
    all_files={};perf={};inputs={}
    for name,raw in iter_raw(folder):
        d=json.loads(raw);region=d.get("region") or next(iter(d["rows"].values()))["scene"][0]
        if not d["rows"]:continue
        assert region in REGIONS and d["engine"]=="chromium"
        old=all_files.get(f"{region}/{name}")
        if old and len(json.loads(old)["rows"])>=len(d["rows"]):continue
        all_files[f"{region}/{name}"]=raw
        (perf if name=="region.json" else inputs)[region]=d
    if complete:
        expected_seating=hashlib.sha256((ROOT/"seating.js").read_bytes()).hexdigest()
        expected_policy=hashlib.sha256((ROOT/"policy.js").read_bytes()).hexdigest()
        assert set(perf)==set(inputs)==set(REGIONS),(list(perf),list(inputs))
        controllers={r["sourceHashes"]["home-production-diorama-population.js"] for d in perf.values() for r in d["rows"].values()}
        controllers.update(d["sources"]["home-production-diorama-population.js"] for d in inputs.values())
        assert len(controllers)==1,("Mixed controller builds",controllers)
        for region in REGIONS:
            expected={tuple(x) for x in scenes(argparse.Namespace(region=region,scene=None,suite="region"))}
            actual={tuple(r["scene"]) for r in perf[region]["rows"].values()}
            assert actual==expected,(region,expected-actual,actual-expected)
            for document in [inputs[region]["sources"], *(r["sourceHashes"] for r in perf[region]["rows"].values())]:
                assert document["population-seating.js"]==expected_seating and document["population-policy.js"]==expected_policy,(region,document)
            for row in perf[region]["rows"].values():
                n=row["scene"][2];assert row["sample"]["sameNodes"] and row["sample"]["rows"]==n and len({a[0] for a in row["opening"]})==n

            r=inputs[region]["rows"]
            assert len(r)==224
            for p in ("B","current","A","C"):
                sub=[row for row in r.values() if row["policy"]==p]
                assert len({row["key"] for row in sub})==28
                assert sum(row["role"]=="companion" for row in sub)==52
                assert all(any(e["trusted"] for e in row["observed"]["pointers"]) for row in sub)
    if all_files and archive:raw_archive(all_files,archive)
    summary=[compact_perf(row) for reg in REGIONS if reg in perf for row in perf[reg]["rows"].values()]
    if summary:csv_write(EVIDENCE/"performance-regions.csv",summary)
    input_summary=[{"region":reg,"policy":p,"role":role,**group_input([r for r in d["rows"].values() if r["policy"]==p and r["role"]==role])}
        for reg,d in inputs.items() for p in ("current","A","B","C") for role in ROLES]
    if input_summary:csv_write(EVIDENCE/"input-regions.csv",input_summary)
    return perf,inputs

def same_role_row(rows,label):
    s=group_input(rows)
    return (f'| {label} | {s["tapSelected"]}/{s["taps"]} | {s["dragSelected"]}/{s["drags"]} | '
            f'{s["dragCommands"]}/{s["drags"]} | {s["dragAccepted"]}/{s["drags"]} | '
            f'{s["closeEndpoint"]}/{s["drags"]} | {s["dragMoved"]}/{s["drags"]} | '
            f'{s["selectionMeanMs"]:.0f} / {s["selectionP95ms"]:.0f} |')

def report_input(inputs):
    output=["# 住民を選び、実際に動かせた割合","",
        "28体の家族を390×844 CSS pxの縦画面（ゲーム高792 px）で開いた。各地域・候補ごとに主人公、恋人、仲間26体全員を1回ずつタップし、別の新規起動で各1回ずつドラッグした。経路は足元から画面中央に向けて水平12 CSS pxを指定する。対象の不透明な3点から選択可能な最初の点に指を置き、3点とも別人なら最初の点を使った。全点を均等に試す幾何測定よりも狙いを定めやすい条件になる。",
        "","各試行はChromiumの信頼済みタッチ入力で、ポインターの座標、本人の選択、指を離したときのV5の経路受理、700 ms以上後の足座標を記録した。『着地点』は受理された経路の終点が指定位置から4 CSS px以内、『移動』は受理に加えて本人の足が1モデル単位を超えて動いた試行を表す。『発行』にはV5が到達不可能として退けた指示も含む。端末の処理待ちで700 msを過ぎる場合もある。", ""]
    if inputs:
        regions=list(inputs)
        for policy in ("current","A","B","C"):
            title={"current":"現行・固定","A":"A・配置調整","B":"B・配置調整","C":"C・配置調整"}[policy]
            output.extend([f"## {title}","", "| 対象 | 本人タップ | ドラッグ開始で本人 | 本人へ発行 | V5受理 | 着地点4px以内 | 移動 | 本人選択まで平均 / p95 ms |",
                           "|---|---:|---:|---:|---:|---:|---:|---:|"])
            joined=[r for reg in regions for r in inputs[reg]["rows"].values() if r["policy"]==policy]
            for role,label in ROLES.items():output.append(same_role_row([r for r in joined if r["role"]==role],label))
            for reg in REGIONS:
                if reg in inputs:output.append(same_role_row([r for r in inputs[reg]["rows"].values() if r["policy"]==policy],JP[reg]))
            output.append("")
            taps=[r for r in joined if r["mode"]=="tap"]
            drags=[r for r in joined if r["mode"]=="drag"]
            wrong=sum(not r["selectedIntended"] and any(d["accepted"] for d in r["observed"]["down"]) for r in taps)
            noselect=sum(not any(d["accepted"] for d in r["observed"]["down"]) for r in taps)
            lost=sum(r["selectedIntended"] and not r["dragAttemptedForIntended"] for r in drags)
            refused=sum(r["dragAttemptedForIntended"] and not r["routeAcceptedOnRelease"] for r in drags)
            sim=group_input(joined)
            output.extend([f"全地域のタップで別人を選んだ試行が{wrong}回、選択が発生しなかった試行が{noselect}回。本人のドラッグ開始後、指を離しても本人への移動指示が届かなかった試行は{lost}回、本人への指示をV5が受理しなかった試行は{refused}回。入力前の独立した経路照合では{sim['planned']}/{sim['dryDirections']}方向に経路があり、照合した全方向のうち計測時のモデルが停止していた方向が{sim['dryDirections']-sim['unpausedDryDirections']}件あった。",""])
    local=sorted(EVIDENCE.glob("input-owner-*.json"))+sorted(EVIDENCE.glob("input-focus-*.json"))
    if local:
        output+=["## 実際の入力経路の個別確認","",
           "試遊画面の確認では再生ボタンをタッチし、iframeの実座標に補正してから住民を狙った。ゲーム直開きの確認と合わせ、本人の選択・経路の受理・実移動を画面ごとに記録した。","",
           "| 試行 | 追加倍率・実際に狙った役 | タップ本人 | ドラッグ本人 | V5受理 | 受理後移動 |","|---|---|---:|---:|---:|---:|"]
        for f in local:
            d=json.loads(f.read_text());rows=list(d["rows"].values());ss=group_input(rows)
            entry="試遊画面" if d.get("ownerShell") else "ゲーム直開き"
            roles='・'.join(ROLES[k] for k in ROLES if any(r["role"]==k for r in rows))
            gain=rows[0]["plan"]["settings"]["extra"]
            output.append(f'| {entry} {JP[d["region"]]} {d["width"]}px {d["count"]}体 | +{gain:g}% {roles} | {ss["tapSelected"]}/{ss["taps"]} | {ss["dragSelected"]}/{ss["drags"]} | {ss["dragAccepted"]}/{ss["drags"]} | {ss["dragMoved"]}/{ss["drags"]} |')
        output+=[""]+[f"- [{f.stem}](evidence/{f.name})" for f in local]+[""]
    fixed_file=EVIDENCE/"input-focus-home-fixed.json"
    if fixed_file.exists() and "home" in inputs:
        fixed=list(json.loads(fixed_file.read_text())["rows"].values())
        target={(r["key"],r["mode"]) for r in fixed}
        optimized=[r for r in inputs["home"]["rows"].values() if r["policy"]=="B" and (r["key"],r["mode"]) in target]
        assert {(r["key"],r["mode"]) for r in optimized}==target
        output+=["## おうち390px・Bの同じ住民で配置を比較","",
            "同じ28体・B・390pxで、現行席の個別試験で狙った全員を、配置調整の地域試験からも同じ住民キーで抽出した。どちらも新規起動のゲームに同じ方式で指を入れた。固定は共有Linux Chromium、配置調整はCIのChromeで、時刻やレイテンシーには実行環境の差が含まれる。","",
            "| Bの配置 | 本人タップ | ドラッグ開始で本人 | 本人へ発行 | V5受理 | 着地点4px以内 | 移動 | 本人選択まで平均 / p95 ms |",
            "|---|---:|---:|---:|---:|---:|---:|---:|",same_role_row(fixed,"固定"),same_role_row(optimized,"配置調整"),""]
    output+=["選択時間はポインターのイベント時刻からゲームが対象を選ぶまで。通信、OSのタッチセンサー、液晶の応答は計測外。各ドラッグでは指を入れる直前にV5と同じ経路計算を副作用なしでも照合した。経路が計算できることと、指で本人まで指示が届き、歩くことを別々に集計している。","",
        "[地域・役別のCSV](evidence/input-regions.csv) ／ [各住民のポインターと経路の記録](https://naotocchi-cast-size.kerzion214.chatgpt.site/evidence/v4/performance-input-regions.tar.gz)"]
    (ROOT/"INTERACTION.md").write_text("\n".join(output)+"\n")

def report_performance(perf):
    out=["# 住民数と画面幅を変えたときの処理時間","",
         "実寸の縦画面から試遊バー52 CSS pxを引いたゲームをDPR 2で起動し、秋・晴れ・昼の同じ世帯で計測した。V5の住民更新、経路探索、住民・装備・影のDOM反映、背景Canvas描画の同期時間を測った。経路探索は住民更新の内数、自然演出は背景の内数。同期時間にはブラウザーが処理を再開するまでの待ちが入りうる。rAF Hzはブラウザーから返ったアニメーションコールバック頻度。実機iPhoneの液晶FPS、GPU完了時刻は今回の測定範囲外。",""]
    if perf:
        focused={p:[r for d in perf.values() for r in d["rows"].values() if r["scene"][1:6]==[390,28,p,"linear","fixed"]] for p in ("current","A","B","C")}
        if all(focused.values()):
            def fps(rows):
                return sum(r["sample"]["callbacks"] for r in rows)/sum(r["sample"]["seconds"] for r in rows)
            def paint(rows):
                parts=[r["sample"]["phases"]["actors"] for r in rows];return sum(x["ms"] for x in parts)/sum(x["calls"] for x in parts)
            base=focused["current"];b=focused["B"]
            byregion={r["scene"][0]:r["sample"]["rafHz"] for r in base}
            better=sum(r["sample"]["rafHz"]>byregion[r["scene"][0]] for r in b if r["scene"][0] in byregion)
            out+=[f'390px・28体・固定配置の{len(base)}地域を合わせると、現行 / A / B / CのrAFは '+ " / ".join(f"{fps(focused[p]):.1f}" for p in ("current","A","B","C"))+
                  f' Hz。Bが現行のrAFを上回った地域は{better}/{len(b)}。1回の住民表示更新は現行{paint(base):.2f}ms、B{paint(b):.2f}msだった。各試行の経路発生数と長い停止は下表およびCSVに含む。',""]
        small=[r for d in perf.values() for r in d["rows"].values() if r["scene"][1:3]==[320,28]]
        unchanged=sum(max(abs(v-ref) for v,ref in zip(r["scales"],[1.2,1.2,1.05]))<1e-7 and r["settings"]["extra"]==0 for r in small)
        out+=[f'320×516 CSS pxのゲームでは28体・4候補の{unchanged}/{len(small)}試行で追加倍率が0%、実表示倍率が主人公120%・恋人120%・仲間105%だった。',""]
        pose_exact=0;matches=0;max_diff=0;dim_exact=0
        for d in perf.values():
            groups=collections.defaultdict(list)
            for r in d["rows"].values():
                reg,w,n,p,curve,l,_=r["scene"]
                if n==28 and w in (375,390,430) and l=="fixed":groups[w].append(r)
            for group in groups.values():
                reference=next((r for r in group if r["scene"][3]=="current"),None)
                if not reference:continue
                for r in group:
                    if r is reference:continue
                    pairs=list(zip(reference["opening"],r["opening"]))
                    if any(a[0]!=b[0] for a,b in pairs):raise AssertionError("Household changed")
                    dims=all(a[1:3]==b[1:3] for a,b in pairs)
                    delta=max(abs(a[i]-b[i]) for a,b in pairs for i in (3,4))
                    matches+=1;dim_exact+=dims;pose_exact+=delta<1e-6;max_diff=max(max_diff,delta)
        out+=[f'28体の固定配置で、同地域・同画面幅の現行とA/B/Cを{matches}組照合した。住民キーとモデル寸法は{dim_exact}/{matches}組、全員の初期足座標は{pose_exact}/{matches}組で一致。最大座標差は{max_diff:.4f}モデル単位だった。',""]
        out.extend(["## 13地域の28体・390px幅","",
                    "各セルはrAF Hz / 最大間隔 ms。GitHub Actionsの新規Chromeでそれぞれ4秒以上、表下のCSVには375・390・430pxの両配置、320×516・344×682・360×728 CSS px（ゲーム実寸）の固定配置、19〜27体各人数の現行・B段階・B線形と18体以下などの対照も収録した。4秒の短い窓で一度も経路探索が動かなかった場合がある。",
                    "", "| 地域 | 現行固定 | A固定 | B固定 | C固定 | B配置調整 |","|---|---:|---:|---:|---:|---:|"])
        for reg in REGIONS:
            if reg not in perf:continue
            def entry(p,l):
                r=next((r for r in perf[reg]["rows"].values() if r["scene"][1:6]==[390,28,p,"linear",l]),None)
                if r is None:return "—"
                s=r["sample"];return f'{s["rafHz"]:.1f} / {s["max"]:.0f}'
            out.append("| "+JP[reg]+" | "+" | ".join(entry(p,l) for p,l in [("current","fixed"),("A","fixed"),("B","fixed"),("C","fixed"),("B","optimized")])+" |")
        out+=["","[全条件の処理時間・移動・交流CSV](evidence/performance-regions.csv) ／ [元の時系列と各停止の内訳](https://naotocchi-cast-size.kerzion214.chatgpt.site/evidence/v4/performance-input-regions.tar.gz)",""]
    if perf:
        out+=["## 19〜27体の段階適用と線形適用","",
              "390pxの固定配置。各セルは全地域のコールバック数÷合計実秒で求めたrAF Hz / 250ms以上の停止回数。地域と歩行の進行が異なるため短い観測窓の順位は変動する。","","| 人数 | 現行 | B線形 | B段階 |","|---:|---:|---:|---:|"]
        for n in range(19,28):
            cells=[]
            for p,curve in [("current","linear"),("B","linear"),("B","step")]:
                samples=[r["sample"] for d in perf.values() for r in d["rows"].values() if r["scene"][1:6]==[390,n,p,curve,"fixed"]]
                cells.append(f'{sum(s["callbacks"] for s in samples)/sum(s["seconds"] for s in samples):.1f} / {sum(len(s["long"]) for s in samples)}' if samples else "—")
            out.append("| "+str(n)+" | "+" | ".join(cells)+" |")
        out.append("")
        allrows=[r for d in perf.values() for r in d["rows"].values()]
        longest=max(allrows,key=lambda r:r["sample"]["max"])
        reg,w,n,p,curve,l,_=longest["scene"]; sample=longest["sample"]
        hitch=max(sample["long"],key=lambda h:h["ms"]) if sample["long"] else None
        if hitch:
            events=hitch["events"]
            model=sum(ms for name,ms in events if name=="model")
            plan=sum(ms for name,ms in events if name=="plan")
            out+=[f"地域試験の最大間隔は{JP[reg]}・{w}px・{n}体・{p}・{curve}・{l}で{hitch['ms']/1000:.2f}秒。重なった50ms以上の同期区間は住民更新{model:.0f}ms、そのうち経路計画{plan:.0f}msだった。端点をまたぐ計測区間があるので、これらはフレーム長の厳密な内訳ではない。",""]
    out+=["## 長めの実行と停止の内訳","",
          "Linux共有ホストのChromiumとWPE WebKitで測定した。「共有」は視認性など他の試験も実行中で、4コア相当のホストに対して負荷平均35に達した。「低負荷」は開始前10秒のホスト全体のCPU使用量が1コア未満になってから単一ブラウザーを起動した。試行中の負荷は生データに収録。画面更新、OSの負荷、経路探索の発生は試行ごとに異なる。『歩行秒』は1体以上がそのステップで歩いたモデル時間。住民/表示/背景は各呼び出しの平均ms、経路は回数 / 1回平均ms。","","| 条件・地域・エンジン・ゲーム実寸・人数・候補・配置 | 実秒 | rAF Hz | p95 / 最大 ms | 250ms以上 | 住民更新 回/実秒 | 歩行秒 / モデル秒 | 住民 / 表示 / 背景 ms | 経路 回 / ms |","|---|---:|---:|---:|---:|---:|---:|---:|---:|"]
    for f in sorted(EVIDENCE.glob("perf-*.json")):
        d=json.loads(f.read_text())
        for r in d["rows"].values():
            region,w,n,p,curve,l,_=r["scene"];s=r["sample"]
            condition='低負荷' if 'quiet' in f.name else '共有'
            out.append(f'| {condition} {JP[region]} {d["engine"]} {w}×{r.get("gameViewport",[w,HEIGHT[w]-52])[1]} {n}体 {p} {l} | {s["seconds"]:.1f} | {detail(r)} |')
    for f in sorted(EVIDENCE.glob("perf-social-*.json")):
        for r in json.loads(f.read_text())["rows"].values():
            ss=r["sample"];events=collections.Counter(e["type"] for e in ss["reactions"])
            names=dict(r["names"]);matches=[]
            social=[e for e in ss["reactions"] if e["type"]=="social" and e["listener"]]
            for i,e in enumerate(social):
                end=min(e["t"]+22000,social[i+1]["t"] if i+1<len(social) else float("inf"))
                lines=[x for x in ss["lines"] if e["t"]-50<=x["t"]<=end]
                pair=[next((x for x in lines if x["line"].split("\n")[0]==names.get(e[k])),None) for k in ("actor","listener")]
                if all(pair) and pair[0]["t"]<pair[1]["t"]:matches.append(pair)
            out+=["","## 暮らしと会話の継続","",
                  f'{JP[r["scene"][0]]}、{r["scene"][1]}px、{r["scene"][2]}体、{r["scene"][3]}固定を{ss["seconds"]:.1f}実秒観察。モデルは{ss["clock"]:.1f}秒進み、{sum(d>1 for _,d in ss["feet"])}/{len(ss["feet"])}体の足が1モデル単位以上移った。移動開始{ss["moves"]}、到着{events["arrive"]}、接近{events["proximity"]}、住民2体の交流{events["social"]}、異なる吹き出し表示{len(ss["lines"])}回だった。次の交流までの22秒以内に2人が順番に発言した組は{len(matches)}組。']
            if matches:
                pair=matches[0];out+=["", " → ".join(x["line"].replace("\n","「",1)+"」" for x in pair)]
    trace_files=[]
    for f in sorted(EVIDENCE.glob("perf-*.json")):
        for r in json.loads(f.read_text())["rows"].values():
            trace=r["sample"].get("chromiumTrace")
            if trace:trace_files.append((r,trace))
    if trace_files:
        out+=["","## Chromiumのレイアウト・ペイント・ラスタライズ","",
              "1試行ずつブラウザーのタイムラインから記録。表はイベントの処理時間合計÷観測実秒（ms/秒）。並行するラスタースレッドの仕事量は加算される。","","| 地域・幅・人数・候補 | 実秒 | Layout | Paint | RasterTask |","|---|---:|---:|---:|---:|"]
        for r,tr in trace_files:
            reg,w,n,p,*_=r["scene"]
            out.append(f"| {JP[reg]} {w}px {n}体 {p} | {tr['seconds']:.1f} | "+" | ".join(f"{tr['phases'][k]['totalMs']/tr['seconds']:.1f}" for k in ("Layout","Paint","RasterTask"))+" |")
    out+=["", "各ローカル試行は同じネイティブ名簿、実寸、足元、スケール、ブラウザーのバージョン、ソースのSHA-256を保存した。固定配置は配席候補の編集前後を含む。配席表を使う配置調整は採用した表で実行する。各住民の足が1モデル単位以上動いたか、経路が発生した時刻と長いコールバック間隔が重なるかをJSONで追える。",""]
    for f in sorted(EVIDENCE.glob("perf-*.json")):
        out.append(f"- [{f.stem}](evidence/{f.name})")
    (ROOT/"PERFORMANCE.md").write_text("\n".join(out)+"\n")

if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--regional",type=Path);p.add_argument("--complete",action="store_true")
    p.add_argument("--archive",type=Path,help="Private owner-site path for the raw tar.gz bundle")
    args=p.parse_args()
    perf,inputs=regional(args.regional,args.complete,args.archive) if args.regional else ({},{})
    report_performance(perf)
    if inputs or list(EVIDENCE.glob("input-focus-*.json")):report_input(inputs)
