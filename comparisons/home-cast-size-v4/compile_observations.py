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
import tempfile
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
        openingFitRecoveries=r.get("openingFitRecoveries",0),startupRetries=len(r.get("priorTimeouts",[])),
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
    return dict(noDocumentPointerSequence=sum(not r["observed"]["pointers"] for r in rows),tapWrongResident=sum(not r["selectedIntended"] and any(d["accepted"] for d in r["observed"]["down"]) for r in taps),
                tapWithoutSelection=sum(not any(d["accepted"] for d in r["observed"]["down"]) for r in taps),
                dragLostAfterSelection=sum(r["selectedIntended"] and not r["dragAttemptedForIntended"] for r in drags),
                v5Rejected=sum(r["dragAttemptedForIntended"] and not r["routeAcceptedOnRelease"] for r in drags),
                tapSelected=sum(r["selectedIntended"] for r in taps),tapReactions=sum(reacted(r) for r in taps),taps=len(taps),
                dragSelected=sum(r["selectedIntended"] for r in drags),dragCommands=sum(r["dragAttemptedForIntended"] for r in drags),
                dragAccepted=sum(r["routeAcceptedOnRelease"] for r in drags),
                dragMoved=sum(r["routeAcceptedOnRelease"] and r["observed"]["displacement"]>1 for r in drags),
                closeEndpoint=sum(r["routeAcceptedOnRelease"] and r["targetErrorCss"] is not None and r["targetErrorCss"]<=4 for r in drags),
                planned=sum(bool((r.get("openingPlanner") or {}).get("choice")) for r in drags),
                plannedButRejectedAtRelease=sum(bool((r.get("openingPlanner") or {}).get("choice")) and r["dragAttemptedForIntended"] and not r["routeAcceptedOnRelease"] for r in drags),
                unplannedButAcceptedAtRelease=sum(r.get("openingPlanner") is not None and not r["openingPlanner"]["choice"] and r["routeAcceptedOnRelease"] for r in drags),
                dryDirections=sum(r.get("openingPlanner") is not None for r in drags),
                unpausedDryDirections=sum(r.get("openingPlanner") is not None and not r["openingPlanner"]["paused"] for r in drags),drags=len(drags),
                blockedAtStart=sum(not r["readyForInput"] for r in taps+drags),
                startupRetries=sum(len(r.get("priorTimeouts",[])) for r in rows),openingFitRecoveries=sum(r["plan"].get("fitRecoveries",0) for r in rows),
                selectionMeanMs=statistics.fmean(times) if (times:=[d["at"]-d["ts"] for r in rows for d in r["observed"]["down"] if d["key"]==r["key"]]) else 0,
                selectionP95ms=quantile(times,.95),releaseMeanMs=statistics.fmean(up) if (up:=[e["at"]-e["ts"] for r in drags for e in r["observed"]["up"] if e["key"]==r["key"]]) else 0,
                releaseP95ms=quantile(up,.95))

def csv_write(path,rows):
    with path.open("w",newline="") as f:
        writer=csv.DictWriter(f,fieldnames=list(rows[0]),lineterminator="\n");writer.writeheader();writer.writerows(rows)

def detail(row):
    s=row["sample"];p=s["phases"]
    avg=lambda k:p.get(k,{}).get("ms",0)/max(1,p.get(k,{}).get("calls",0))
    return (f'{s["rafHz"]:.1f} | {s["p95"]:.0f} / {s["max"]:.0f} | {len(s["long"])} | '
            f'{p.get("model",{}).get("calls",0)/s["seconds"]:.1f} | {s["steps"]["walk"]:.1f} / {s["clock"]:.1f} | {avg("model"):.1f} / {avg("actors"):.1f} / {avg("world"):.1f} | '
            f'{p.get("plan",{}).get("calls",0)} / {avg("plan"):.1f}')

def raw_archive(files,target):
    target.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=target.parent,delete=False) as stream:
        temporary=Path(stream.name)
        try:
            with gzip.GzipFile(filename="",mode="wb",fileobj=stream,mtime=0) as gz,tarfile.open(fileobj=gz,mode="w") as tar:
                for fname,data in sorted(files.items()):
                    entry=tarfile.TarInfo(fname);entry.size=len(data);tar.addfile(entry,io.BytesIO(data))
            stream.flush()
            temporary.replace(target)
        finally:
            temporary.unlink(missing_ok=True)

def regional(folder,complete,archive,controller_source=None):
    all_files={};perf={};inputs={}
    for name,raw in iter_raw(folder):
        d=json.loads(raw)
        if not d.get("rows"):continue
        region=d.get("region") or next(iter(d["rows"].values()))["scene"][0]
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
        controllers.update(r.get("sourceHashes",d["sources"])["home-production-diorama-population.js"] for d in inputs.values() for r in d["rows"].values())
        assert len(controllers)==1,("Mixed controller builds",controllers)
        if controller_source:
            wanted=hashlib.sha256(controller_source.read_bytes()).hexdigest()
            assert controllers=={wanted},("Unexpected browser controller",controllers,wanted)
        for region in REGIONS:
            expected={tuple(x) for x in scenes(argparse.Namespace(region=region,scene=None,suite="region"))}
            actual={tuple(r["scene"]) for r in perf[region]["rows"].values()}
            assert actual==expected and len(perf[region]["rows"])==len(expected),(region,expected-actual,actual-expected)
            sample_hashes=[r.get("sourceHashes",inputs[region]["sources"]) for r in inputs[region]["rows"].values()]
            for document in sample_hashes+[r["sourceHashes"] for r in perf[region]["rows"].values()]:
                assert document["population-seating.js"]==expected_seating and document["population-policy.js"]==expected_policy,(region,document)
            for row in perf[region]["rows"].values():
                n=row["scene"][2];assert row["sample"]["sameNodes"] and row["sample"]["rows"]==n and len({a[0] for a in row["opening"]})==n

            r=inputs[region]["rows"]
            assert len(r)==224
            for p in ("B","current","A","C"):
                sub=[row for row in r.values() if row["policy"]==p]
                assert all(row["layout"]==("fixed" if p=="current" else "optimized") for row in sub)
                rosters=[]
                for mode in ("tap","drag"):
                    by_mode=[row for row in sub if row["mode"]==mode]
                    roster={row["key"] for row in by_mode}
                    assert len(by_mode)==len(roster)==28 and {row["index"] for row in by_mode}==set(range(28))
                    assert collections.Counter(row["role"] for row in by_mode)=={"pet":1,"partner":1,"companion":26}
                    rosters.append(roster)
                assert rosters[0]==rosters[1]
                assert all(row["actualInput"]=="touch" and all(e["trusted"] for e in row["observed"]["pointers"]) for row in sub)
                assert any(row["observed"]["pointers"] for row in sub),("Missing document pointer observer",region,p)
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

def report_input(inputs,perf=None):
    output=["# 住民を選び、実際に動かせた割合","",
        "28体の家族を390×844 CSS pxの縦画面（ゲーム高792 px）で開いた。各地域・候補ごとに主人公、恋人、仲間26体全員を1回ずつタップし、別の新規起動で各1回ずつドラッグした。経路は足元から画面中央に向けて水平12 CSS pxを指定する。対象の不透明な3点から選択可能な最初の点に指を置き、3点とも別人なら最初の点を使った。全点を均等に試す幾何測定よりも狙いを定めやすい条件になる。[全3点・各時刻・各画面幅の判定](GEOMETRY.md)",
        "","地域試験ではChromiumを自動操作し、ブラウザーのタッチ入力（isTrusted=true）を送った。ポインターの座標、本人の選択、指を離したときのV5の経路受理、700 ms以上後の足座標を記録した。『着地点』は受理された経路の終点が指定位置から4 CSS px以内、『移動』は受理に加えて本人の足が1モデル単位を超えて動いた試行を表す。『発行』にはV5が到達不可能として退けた指示も含む。端末の処理待ちで700 msを過ぎる場合もある。", ""]
    if inputs:
        regions=list(inputs)
        output+=["## 全地域・全員の結果","","| 表示と配置 | 本人タップ | ドラッグ開始で本人 | 本人へ発行 | V5受理 | 着地点4px以内 | 移動 | 本人選択まで平均 / p95 ms |",
                 "|---|---:|---:|---:|---:|---:|---:|---:|"]
        for policy,label in (("current","現行・固定"),("A","A・配置調整"),("B","B・配置調整"),("C","C・配置調整")):
            group=[r for d in inputs.values() for r in d["rows"].values() if r["policy"]==policy]
            output.append(same_role_row(group,label))
        output.append("")
        outcomes={p:{(reg,r["key"]):r for reg,d in inputs.items() for r in d["rows"].values() if r["policy"]==p and r["mode"]=="drag"} for p in ("current","A","B","C")}
        baseline=outcomes["current"]
        output+=["同じ住民・同じ地域のドラッグを対応させ、現行固定との間でV5受理が入れ替わった件数も調べた。現行から候補への切替には表示倍率と開始配置の両方が含まれる。","",
                 "| 現行固定からの切替 | 未受理 → 受理 | 受理 → 未受理 | 同じ結果 |","|---|---:|---:|---:|"]
        for p in ("A","B","C"):
            candidate=outcomes[p];assert candidate.keys()==baseline.keys()
            changed=collections.Counter((r["routeAcceptedOnRelease"],candidate[key]["routeAcceptedOnRelease"]) for key,r in baseline.items())
            output.append(f'| {p}配置調整 | {changed[False,True]} | {changed[True,False]} | {changed[True,True]+changed[False,False]} |')
        output.append("")
        changed_b=[(reg,key) for (reg,key),r in outcomes["B"].items() if r["routeAcceptedOnRelease"]!=baseline[reg,key]["routeAcceptedOnRelease"]]
        if len(changed_b)==1 and perf:
            reg,key=changed_b[0]
            names=dict(next(r["names"] for r in perf[reg]["rows"].values() if r["scene"][2]==28))
            record=outcomes["B"][reg,key]
            if record["routeAcceptedOnRelease"] and record["targetErrorCss"] is not None:
                output+=[f'Bで変わった対象は{JP[reg]}の「{names[key]}」。現行固定では本人を選べた後にV5が指示を拒み、B配置調整では受理された。足は{record["observed"]["displacement"]:.1f}モデル単位動き、選ばれた経路終点は指定位置から{record["targetErrorCss"]:.1f} CSS px離れていた。',""]
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
            output.extend([f"全地域のタップで別人を選んだ試行が{wrong}回、選択が発生しなかった試行が{noselect}回。本人のドラッグ開始後、指を離しても本人への移動指示が届かなかった試行は{lost}回、本人への指示をV5が受理しなかった試行は{refused}回。","",
                           f"入力前の経路照合では{sim['planned']}/{sim['dryDirections']}方向に経路があり、照合した全方向のうち計測時にモデルが停止していた方向は{sim['dryDirections']-sim['unpausedDryDirections']}件。事前に経路が見つかり、本人に指示が届いても指を離したときにV5が拒んだ試行は{sim['plannedButRejectedAtRelease']}回。事前に経路が見つからず実入力で受理された試行は{sim['unplannedButAcceptedAtRelease']}回。",""])
    local=sorted(EVIDENCE.glob("input-owner-*.json"))+sorted(EVIDENCE.glob("input-focus-*.json"))
    if local:
        local_data={p:json.loads(p.read_text()) for p in local}
        local.sort(key=lambda p:(local_data[p]["count"],local_data[p]["width"],p.name))
        intermediate={d["count"]:d for path,d in local_data.items() if 19<=d["count"]<=27 and d.get("ownerShell") and path.stem.endswith("-"+str(d["count"]))}
        if len(intermediate)==9:
            names={}
            for data_file in sorted(EVIDENCE.glob("perf-social-*.json")):
                for observed in json.loads(data_file.read_text())["rows"].values():names.update(observed["names"])
            trials=[r for d in intermediate.values() for r in d["rows"].values()]
            scored=group_input(trials)
            failed=[f'{JP[d["region"]]}{d["count"]}体の「{names.get(r["key"],r["key"])}」' for d in intermediate.values() for r in d["rows"].values() if r["mode"]=="drag" and not r["routeAcceptedOnRelease"]]
            output+=["## 19〜27体の実際の再生画面","",
                     f'各人数で実際の再生ボタンからB線形漸増・配置調整を開始し、主人公・恋人・仲間を交替して狙った。本人タップ{scored["tapSelected"]}/{scored["taps"]}、本人のドラッグ開始{scored["dragSelected"]}/{scored["drags"]}、V5の受理{scored["dragAccepted"]}/{scored["drags"]}、受理後に足が動いた試行{scored["dragMoved"]}/{scored["drags"]}。']
            if failed:output.append("受理されなかった対象は"+"、".join(failed)+"。")
            output.append("")
        output+=["## 実際の入力経路の個別確認","",
           "試遊画面の確認では再生ボタンをタッチし、iframeの実座標に補正してから住民を狙った。ゲーム直開きの確認と合わせ、本人の選択・経路の受理・実移動を画面ごとに記録した。","",
           "| 試行 | 追加倍率・実際に狙った役 | タップ本人 | ドラッグ本人 | V5受理 | 受理後移動 |","|---|---|---:|---:|---:|---:|"]
        for f in local:
            d=local_data[f];rows=list(d["rows"].values());ss=group_input(rows)
            entry=("試遊画面" if d.get("ownerShell") else "ゲーム直開き")+("・WebKit" if d["engine"]=="webkit" else "・Chromium")
            roles='・'.join(ROLES[k] for k in ROLES if any(r["role"]==k for r in rows))
            gain=rows[0]["plan"]["settings"]["extra"]
            variant="現行" if rows[0]["policy"]=="current" else rows[0]["policy"]
            placement="固定" if rows[0]["layout"]=="fixed" else "配置調整"
            curve="19体で一括" if d["curve"]=="step" else "線形漸増"
            output.append(f'| {entry} {JP[d["region"]]} {d["width"]}×{d["height"]} {d["count"]}体 | {variant} +{gain:g}%・{curve}・{placement} {roles} | {ss["tapSelected"]}/{ss["taps"]} | {ss["dragSelected"]}/{ss["drags"]} | {ss["dragAccepted"]}/{ss["drags"]} | {ss["dragMoved"]}/{ss["drags"]} |')
        protected=[r for d in local_data.values() if d["width"]==320 and d.get("ownerShell") and d["region"]=="forest" for r in d["rows"].values()]
        wrong_cat=[r for r in protected if r["key"]=="companion:cat_friend" and r["plan"]["hits"]==["partner:forest_bear"]*3 and any(x["accepted"] and x["key"]=="partner:forest_bear" for x in r["observed"]["down"])]
        if {(r["policy"],r["mode"]) for r in wrong_cat}=={(p,m) for p in ("B","current") for m in ("tap","drag")}:
            output+=["","もり320×516・28体では、現行固定とB配置調整のどちらも追加倍率0%。猫を狙った3点とも恋人のクマと重なり、両条件の実タップとドラッグでもクマが選択された。"]
        if any(d["engine"]=="webkit" for d in local_data.values()):
            output+=["","Linux WPE WebKitのタップにはブラウザーのタッチ入力を使った。ドラッグは同じブラウザーのマウスポインターで行い、指によるドラッグの集計はChromiumに限った。"]
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
    output+=["選択時間はポインターのイベント時刻からゲームが対象を選ぶまで。通信、OSのタッチセンサー、液晶の応答は計測外。各ドラッグでは指を入れる直前にV5と同じ経路計算を副作用なしでも照合した。経路が計算できることと、指で本人まで指示が届き、歩くことを別々に集計している。",""]
    if inputs:
        output.append("[地域・役別のCSV](evidence/input-regions.csv) ／ [各住民のポインターと経路の記録](https://naotocchi-cast-size.kerzion214.chatgpt.site/evidence/v4/performance-input-regions.tar.gz)")
    (ROOT/"INTERACTION.md").write_text("\n".join(output)+"\n")

def report_performance(perf):
    out=["# 住民数と画面幅を変えたときの処理時間","",
         "現行の実表示は主人公120%、恋人120%、仲間105%。A・B・Cはこの表示に最大10%・15%・20%を一度掛ける。375px以上・28体のBでは138%・138%・120.75%になる。","","実寸の縦画面から試遊バー52 CSS pxを引いたゲームをDPR 2で起動し、秋・晴れ・昼の同じ世帯で計測した。V5の住民更新、経路探索、住民・装備・影のDOM反映、背景Canvas描画の同期時間を測った。経路探索は住民更新の内数、自然演出は背景の内数。同期時間にはブラウザーが処理を再開するまでの待ちが入りうる。rAF Hzはブラウザーから返ったアニメーションコールバック頻度。実機iPhoneの液晶FPS、GPU完了時刻は今回の測定範囲外。",""]
    quiet={}
    for f in EVIDENCE.glob("perf-quiet-*.json"):
        d=json.loads(f.read_text())
        width_rows={r["scene"][3]:r for r in d["rows"].values() if r["scene"][:3]==["river_lake",375,28] and r["scene"][5]=="fixed"}
        if set(width_rows)==set(("current","A","B","C")):quiet[d["engine"]]=width_rows
    if quiet:
        source_list=sorted({r["sourceHashes"]["home-production-diorama-population.js"][:12] for g in quiet.values() for r in g.values()})
        out+=[f'この低負荷4候補比較は起動時のフィットを修正したコントローラー {", ".join(source_list)} で行った。地域試験のコントローラー識別子と後続の再試行は別途記録した。',""]
        out+=["## みずべ・375px・28体の低負荷比較","",
              "同じ初期位置から再生した。各セルは10秒以上の試行のrAF Hz / 最大間隔 ms。Chromiumはタイムラインの記録も有効。","","| Linuxブラウザー | 現行 | A +10% | B +15% | C +20% |","|---|---:|---:|---:|---:|"]
        for name,group in sorted(quiet.items()):
            cells=[f'{group[p]["sample"]["rafHz"]:.1f} / {group[p]["sample"]["max"]:.0f}' for p in ("current","A","B","C")]
            out.append("| "+{"chromium":"Chromium","webkit":"WPE WebKit"}[name]+" | "+" | ".join(cells)+" |")
        out+=["","経路探索を含む同期更新に時間がかかると、同じ人数・同じ倍率でも長い停止が出る。各倍率1試行の経路回数と処理時間も下表に併記した。",""]
    confirmations=[]
    for f in sorted(EVIDENCE.glob("perf-repeat-final-*.json")):
        d=json.loads(f.read_text())
        for r in d["rows"].values():confirmations.append((d["engine"],r))
    if confirmations:
        out+=["## 最終コントローラーの再照合","",
              "同じみずべ・375×760・28体・固定位置で現行とBを再起動した。フィット回復は準備完了時点までに起動時の振動を止めた回数。","","| ブラウザー | 候補 | コントローラー SHA-256 先頭12桁 | フィット回復 | rAF Hz | p95 / 最大 ms | モデル秒 / 実秒 |","|---|---|---|---:|---:|---:|---:|"]
        for engine,r in confirmations:
            ss=r["sample"]
            out.append(f'| {engine} | {r["scene"][3]} | {r["sourceHashes"]["home-production-diorama-population.js"][:12]} | {r.get("openingFitRecoveries","—")} | {ss["rafHz"]:.1f} | {ss["p95"]:.0f} / {ss["max"]:.0f} | {ss["clock"]:.1f} / {ss["seconds"]:.1f} |')
        out.append("")
    if perf:
        out+=["## 全地域で比較した現行・A・B・C",""]
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
            out+=["### 390px・28体・固定配置で使った同期処理時間","",
                  "13地域の合計実秒で割ったms/秒。経路探索を住民更新から差し引き、住民のDOM反映、背景描画と分けて示す。処理が呼ばれた頻度も値に影響する。","",
                  "| 候補 | 経路探索 | そのほかの住民更新 | 住民のDOM反映 | 背景描画 | 経路回数 | 250ms以上の停止 |",
                  "|---|---:|---:|---:|---:|---:|---:|"]
            for candidate,group in focused.items():
                stats=[compact_perf(r) for r in group];seconds=sum(s["seconds"] for s in stats)
                rates=[sum(s[k] for s in stats)/seconds for k in ("plannerMs","modelWithoutPlannerMs","residentPaintMs","worldMs")]
                out.append("| "+("現行" if candidate=="current" else candidate)+" | "+" | ".join(f"{value:.1f}" for value in rates)+
                           f' | {sum(s["plannerCalls"] for s in stats)} | {sum(s["stalls250ms"] for s in stats)} |')
            out.append("")
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
        ids=sorted({row["sourceHashes"]["home-production-diorama-population.js"][:12] for d in perf.values() for row in d["rows"].values()})
        measurement_rows=[r for d in perf.values() for r in d["rows"].values()]
        recoveries=sum(r.get("openingFitRecoveries",0)>0 for r in measurement_rows)
        retries=sum(len(r.get("priorTimeouts",[])) for r in measurement_rows)
        out+=[f'地域試験の{len(measurement_rows)}試行はコントローラーSHA-256先頭12桁 {", ".join(ids)} を使用した。{recoveries}試行で起動時にカメラの振動を補正し、表示準備の時間超過で再起動した回数は{retries}回だった。',""]
        out+=[f'28体の固定配置で、同地域・同画面幅の現行とA/B/Cを{matches}組照合した。住民キーとモデル寸法は{dim_exact}/{matches}組、全員の初期足座標は{pose_exact}/{matches}組で一致。最大座標差は{max_diff:.4f}モデル単位だった。',""]
        out.extend(["## 13地域の28体・390px幅","",
                    "各セルはrAF Hz / 最大間隔 ms。GitHub Actionsの新規Chromeでそれぞれ4秒以上、表下のCSVには375・390・430pxの両配置、320×516・344×682・360×728 CSS px（ゲーム実寸）の固定配置、19〜27体各人数の現行・B一括・B線形漸増と18体以下などの対照も収録した。4秒の短い窓で一度も経路探索が動かなかった場合がある。",
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
        out+=["## 19〜27体で一括適用と線形漸増を比較","",
              "390pxの固定配置。一括は19体で+15%、線形漸増は19体で+1.5%から28体で+15%に達する。各セルは全地域のコールバック数÷合計実秒で求めたrAF Hz / 250ms以上の停止回数。地域と歩行の進行が異なるため短い観測窓の順位は変動する。","","| 人数 | 現行 | B線形漸増 | B一括 |","|---:|---:|---:|---:|"]
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
    layout_pairs=[]
    for f in sorted(EVIDENCE.glob("perf-quiet-*.json")):
        d=json.loads(f.read_text())
        for reg,w,h in [("forest",360,693),("home",375,760)]:
            pair={r["scene"][5]:r for r in d["rows"].values() if r["scene"][:5]==[reg,w,28,"B","linear"] and r.get("gameViewport",[w,HEIGHT[w]-52])[1]==h}
            if "fixed" in pair and "optimized" in pair:layout_pairs.append((d["engine"],reg,w,h,pair))
    if layout_pairs:
        out+=["## 開始位置だけを変えた重点2地域","",
              "同じB線形漸増・28体・同じ実寸で、配置だけを変更した。『位置差』はV5の配席後に実際の足位置が変わった人数。固定 → 配置調整の順に記載する。","","| 地域・ブラウザー・ゲーム実寸 | 位置差 | rAF Hz | 最大間隔 ms | 足が移動した人数 |","|---|---:|---:|---:|---:|"]
        for engine,reg,w,h,pair in layout_pairs:
            a,b=pair["fixed"],pair["optimized"];sa,sb=a["sample"],b["sample"]
            changed=sum(math.dist(x[3:5],y[3:5])>1e-6 for x,y in zip(a["opening"],b["opening"]))
            out.append(f'| {JP[reg]} {engine} {w}×{h} | {changed}/28 | {sa["rafHz"]:.1f} → {sb["rafHz"]:.1f} | {sa["max"]:.0f} → {sb["max"]:.0f} | {sum(v>1 for _,v in sa["feet"])} → {sum(v>1 for _,v in sb["feet"])} |')
        out.append("")
    out+=["## 長めの実行と停止の内訳","",
          "Linux共有ホストのChromiumとWPE WebKitで測定した。「初期版・共有」は最終版の起動時フィット修正前に視認性など他の試験も実行中で、4コア相当のホストに対して負荷平均35に達した。「低負荷」は開始前10秒のホスト全体のCPU使用量が1コア未満になってから単一ブラウザーを起動した。低負荷試行では開始時と終了時のホスト負荷も保存した。画面更新、OSの負荷、経路探索の発生は試行ごとに異なる。『歩行秒』は1体以上がそのステップで歩いたモデル時間。住民/表示/背景は各呼び出しの平均ms、経路は回数 / 1回平均ms。","","| 条件・地域・エンジン・ゲーム実寸・人数・候補・適用・配置 | 実秒 | rAF Hz | p95 / 最大 ms | 250ms以上 | 住民更新 回/実秒 | 歩行秒 / モデル秒 | 住民 / 表示 / 背景 ms | 経路 回 / ms |","|---|---:|---:|---:|---:|---:|---:|---:|---:|"]
    for f in sorted(EVIDENCE.glob("perf-*.json")):
        d=json.loads(f.read_text())
        for r in d["rows"].values():
            region,w,n,p,curve,l,_=r["scene"];s=r["sample"]
            condition='低負荷' if 'quiet' in f.name or '-final-' in f.name else '初期版・共有'
            curve_name='19体で一括' if curve=='step' else '線形漸増'
            layout_name='配置調整' if l=='optimized' else '固定'
            out.append(f'| {condition} {JP[region]} {d["engine"]} {w}×{r.get("gameViewport",[w,HEIGHT[w]-52])[1]} {n}体 {p} +{r["settings"]["extra"]:g}% {curve_name} {layout_name} | {s["seconds"]:.1f} | {detail(r)} |')
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
            stage="最終版" if "-final-" in f.name else "起動時フィット修正前"
            out+=["",f"## 暮らしと会話の継続（{stage}）","",
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
    out+=["", "各ローカル試行は同じネイティブ名簿、実寸、足元、スケール、ブラウザーのバージョン、ソースのSHA-256を保存した。初期版の共有ホスト試行には配席候補の編集前後も含む。最終版の比較は地域試験と低負荷の試行を参照。配席表を使う配置調整は採用した表で実行する。各住民の足が1モデル単位以上動いたか、経路が発生した時刻と長いコールバック間隔が重なるかをJSONで追える。",""]
    for f in sorted(EVIDENCE.glob("perf-*.json")):
        out.append(f"- [{f.stem}](evidence/{f.name})")
    out+=["","再計測の条件とコマンドは地域ごとのCI定義に含む。[測定ワークフロー](../../.github/workflows/home-cast-size-v4-matrix.yml) ／ [集計スクリプト](compile_observations.py)"]
    (ROOT/"PERFORMANCE.md").write_text("\n".join(out)+"\n")

if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--regional",type=Path);p.add_argument("--complete",action="store_true")
    p.add_argument("--archive",type=Path,help="Private owner-site path for the raw tar.gz bundle")
    p.add_argument("--controller-source",type=Path,help="Validate complete regional observations against this built controller")
    args=p.parse_args()
    perf,inputs=regional(args.regional,args.complete,args.archive,args.controller_source) if args.regional else ({},{})
    report_performance(perf)
    if inputs or list(EVIDENCE.glob("input-focus-*.json")):report_input(inputs,perf)
