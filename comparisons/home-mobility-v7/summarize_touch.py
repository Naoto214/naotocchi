"""Publish lookup tables for matched native touch, alpha, warm input and serialization."""
import argparse
import csv
from collections import Counter
from datetime import datetime,timezone
import hashlib
import json
from pathlib import Path

HERE=Path(__file__).resolve().parent
ARMS=('v5','v6','v7')
REGIONS='home forest river_lake city countryside mountain snow sea jungle desert deepsea star_stop memory_lake'.split()
RAW_SITE='https://naotocchi-cast-size.kerzion214.chatgpt.site/evidence/mobility-v7/touch/'


def csvfile(file,rows):
    with file.open('w',encoding='utf-8',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=list(rows[0]),lineterminator='\n')
        writer.writeheader();writer.writerows(rows)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def evidence(row):
    keys='key trusted selectedKey selected issued accepted routed arrived near4 terminalArrived terminalNear4 earlyDistanceCss endDistanceCss endFingerErrorCss correctedErrorCss releaseJumpCss arrivalClock searchCount unsafeSteps sweptViolations'.split()
    return {k:row.get(k) for k in keys}


def diag_class(row):
    diag=row['inkAtPress'];wanted=row['key']
    target=next((a for a in diag['stack'] if a['key']==wanted),None)
    if not target or target['alpha'] is None:return 'unverified-target-pixel'
    if not target['alpha']:return 'target-mask' if target.get('masked') else 'target-transparent'
    if diag['foreground']!=wanted:return 'opaque-resident-in-front'
    return 'requested-resident-visible'


def matrix_rows(root):
    cells=[]
    for path in sorted(root.rglob('*.json')):
        if path.name in ('region.json','index.json'):continue
        d=json.loads(path.read_text())
        if d.get('schema')==2 and set(d.get('arms',{}))==set(ARMS):
            cells.append(d)
    assert len(cells)==len({(d['region'],d['count'],d['width']) for d in cells})==260
    rows=[];sources={}
    for c in cells:
        tap='tap/'+str(min(4,c['count']-1));rr=[c['arms'][a]['rows'][tap] for a in ARMS]
        assert all(r['start']==rr[0]['start'] and r['trusted'] for r in rr)
        row=dict(region=c['region'],count=c['count'],width=c['width'],key=rr[0]['key'],
                 x=rr[0]['start'][0],y=rr[0]['start'][1],v6Reason=diag_class(rr[1]))
        for a,r in zip(ARMS,rr):
            ink=r['inkAtPress'];stack=ink['stack'];selected=r['selectedKey']
            hashes=c['arms'][a]['hashes']
            model=next(v for n,v in hashes.items() if 'production-model' in n)
            control=next(v for n,v in hashes.items() if 'production-diorama' in n)
            assert sources.setdefault(a,(model,control))==(model,control)
            row.update({a+'Selected':selected,a+'Intended':r['selected'],a+'Visible':selected==ink['foreground'],
                        a+'Foreground':ink['foreground'],a+'Stack':' '.join(f"{x['key']}={x['alpha']}" for x in stack)})
        rows.append(row)
    return rows,sources


def main(raw,out,report,matrix=None):
    out.mkdir(exist_ok=True,parents=True);artifacts=[];data={};pins={};revision={}
    def record(arm,m):
        for name,h in m['hashes'].items():
            previous=pins.setdefault((arm,name),h);assert previous==h,(arm,name,previous,h)
    for path in sorted(raw.rglob('*.json')):
        blob=path.read_bytes();c=json.loads(blob);a=c['arm'];suite=c['suite'];engine=c.get('engine','chromium')
        closed=datetime.fromtimestamp(path.stat().st_mtime,timezone.utc).isoformat(timespec='seconds')
        name=path.relative_to(raw).as_posix()
        artifacts.append(dict(file=name,closedUTC=closed,bytes=len(blob),sha256=sha(blob),url=RAW_SITE+name))
        if path.parent==raw/'revision':
            assert a=='v7' and engine=='chromium'
            revision[suite]=c['data']
            continue
        datum=c['data'];data[(suite,engine,a)]=datum
        if suite=='overlap':
            for v in datum.values():record(a,v['meta'])
        else:record(a,datum['meta'])
    forest=[];fresh=[];overlap=[];warmed=[];saves=[]
    for a in ARMS:
        d=data['forest','chromium',a];baseline=data['forest','chromium','v5']
        assert d['meta']['opening']==baseline['meta']['opening'] and d['meta']['seed']==baseline['meta']['seed']
        for i,r in d['rows'].items():
            assert r['trusted'] and r['start']==baseline['rows'][i]['start'] and r['goal']==baseline['rows'][i]['goal']
            forest.append(dict(arm=a,index=i,**evidence(r),startX=r['start'][0],startY=r['start'][1],goalX=r['goal'][0],goalY=r['goal'][1],
                               startContacts=' '.join(r['startClass']['contacts']),goalContacts=' '.join(r['goalClass']['contacts']),
                               blockedClass=r['blockedClass'],gateAtDown=r['initialGate']['blocked'],gateAtUp=r['releaseGate']['blocked'],
                               peerSteps=sum(q['steps'] for q in r['peerWalk'].values()),peerIDs=' '.join(r['peerWalk'])))
        if ('fresh','chromium',a) in data:
            retry=data['fresh','chromium',a]
            assert retry['meta']['opening']==baseline['meta']['opening']
            for i,r in retry['rows'].items():
                original=d['rows'][i]
                assert r['trusted'] and r['start']==original['start'] and r['goal']==original['goal']
                fresh.append(dict(arm=a,index=i,**evidence(r),originalIssued=original['issued'],originalTerminal=original['terminalArrived'],
                                  originalFingerError=original['endFingerErrorCss'],gateAtDown=r['initialGate']['blocked'],
                                  gateAtUp=r['releaseGate']['blocked'],originalGateAtDown=original['initialGate']['blocked'],
                                  originalGateAtUp=original['releaseGate']['blocked'],originalStepCount=original['stepCount'],stepCount=r['stepCount'],
                                  blockedClass=r['blockedClass']))
        for engine in ('chromium','webkit'):
            if ('overlap',engine,a) not in data:continue
            for profile,d in data['overlap',engine,a].items():
                for case,r in d['rows'].items():
                    ref=data['overlap',engine,'v5'][profile]['rows'][case]
                    assert r['trusted'] and r['start']==ref['start'] and r['goal']==ref['goal']
                    overlap.append(dict(engine=engine,arm=a,profile=profile,case=case,**evidence(r),startX=r['start'][0],startY=r['start'][1],
                                        foreground=r['ink']['foreground'],stack=' '.join(f"{x['key']}={x['alpha']}" for x in r['ink']['stack'])))
        warm=data['warm','chromium',a];r=warm['row'];s=warm['before'];begin=warm['first']
        warmed.append(dict(arm=a,ageWallSec=round((s['wall']-begin['wall'])/1000,2),ageNativeSec=round(s['metrics']['clock']-begin['metrics']['clock'],3),
                           priorNativeStarts=s['metrics']['moves'],priorDistance=round(s['metrics']['distance'],3),
                           preGate=s['gates']['blocked'],overlays=' '.join(s['gates']['visibleOverlays']),**evidence(r)))
        d=data['restore','chromium',a];r=d['row'];native=d['nativeUnloaded'];normal=d['defaultReload'];restored=d['restored']
        saves.append(dict(arm=a,nativeSaveSHA256=d['sha256'],bytes=d['savedBytes'],beforeMoney=d['before']['money'],markedMoney=d['markerSaved']['money'],
                          defaultReloadMoney=normal['money'],nativeUnloadRevision=native['revision'],restoredMoney=restored['money'],restoredRevision=restored['revision'],
                          equipped=native['gear'],spouse=native['partner'],companions=' '.join(native['companions']),residentIDs=' '.join(d['restoredRoster']),
                          cleanMotion=d['cleanMotion'],**evidence(r)))
    csvfile(out/'forest-drag-touch.csv',forest);csvfile(out/'overlap-touch.csv',overlap)
    if fresh:csvfile(out/'forest-fresh-touch.csv',fresh)
    csvfile(out/'warm-drag-touch.csv',warmed);csvfile(out/'native-save-touch.csv',saves);csvfile(out/'touch-artifacts.csv',artifacts)
    lines=['# 住民を選ぶ指と、密集した足元のドラッグ','',
        'V6の260タップでは狙った本人を218回選んだ。42件の内訳は、4体の家族でウサギを押して犬が選ばれた33件と、20体または28体でフクロウを押して手前のリス・アザラシ・シバが選ばれた9件だった。以前の判定は住民画像の透明部分も矩形として扱う。','']
    if matrix:
        mr,sources=matrix_rows(matrix);csvfile(out/'selection-matrix.csv',mr)
        misses=[r for r in mr if not r['v6Intended']]
        assert len(misses)==42
        reasons=Counter(r['v6Reason'] for r in misses)
        total={a:sum(r[a+'Intended'] for r in mr) for a in ARMS}
        gains=sum(r['v7Intended'] and not r['v6Intended'] for r in mr)
        losses=sum(r['v6Intended'] and not r['v7Intended'] for r in mr)
        lines += [f"同じ画面座標を押すと、本人選択は V5 {total['v5']} / V6 {total['v6']} / V7 {total['v7']}（各260回）。V6からの新規選択 {gains}件、喪失 {losses}件。V6で外れた42件のうち、押した画素に目的の本人が見えていたものは {reasons['requested-resident-visible']}件、別の住民の不透明な画素が実際に手前にあったものは {reasons['opaque-resident-in-front']}件。V7で選択した住民は {sum(r['v7Visible'] for r in mr)}/260件で、その座標に実際に見えていた最前面の住民と一致した。画素と前後関係は各版で指を押した瞬間に記録した。V7モデル `{sources['v7'][0][:12]}`、コントローラー `{sources['v7'][1][:12]}`。 [全260地点の選択・重なり順・PNG画素](evidence/selection-matrix.csv)",'']
        for row in mr:
            if row['v7Intended'] and not row['v6Intended'] and row['v6Reason']=='opaque-resident-in-front':
                lines += [f"指の画面座標とモデルの足が同じでも、絵の輪郭が版間で異なる例が1件あった。{row['region']}・{row['count']}体・{row['width']}pxの座標（{row['x']:.2f}, {row['y']:.2f}）では、V6の押下時には犬もウサギもアルファ255で、V7の押下時には犬が0、ウサギが255だった。両方ともその瞬間に見える住民を選んだ。この1件を差し引くと同じ透明な手前の画素から本人を新たに選べたのは{gains-1}件。",'']
    lines+=['V7は押した位置に複数の住民枠が重なる場合だけ、元の判定で選ばれた手前の住民の画像を調べる。完全に透明で、奥に不透明度128以上の実画素があるとき、その画素の住民を選ぶ。描画中の画像、左右反転、サイズと奥行き、回転、親要素の変形、風景の前景マスクを使用する。半透明の輪郭、見える手前の住民、画像を読めない場合、全員が透明な余白は従来どおり。キャンバスで確認するのは押した瞬間の1画素だけ。','',
        '森・4体・390pxでは、ウサギの見える位置（122.1, 319.6）で犬のPNGはアルファ値0、ウサギは255だった。V5/V6では犬、V7ではウサギを選んだ。そこから約5.7px離れた犬の不透明画素では3版とも犬を選んだ。森・20体・320pxでは、フクロウを狙った元の座標でアザラシとフクロウがともに255で、V7も手前のアザラシを選んだ。2.8pxずれたフクロウの見える位置からはV7でフクロウを選び、ドラッグできた。','',
        '| エンジン・条件 | 版 | 本人を選んだ数 / 試行 | 本人への移動指示 |','|---|---|---:|---:|']
    for engine in ('chromium','webkit'):
        for cat in ('exposed','opaque'):
            for a in ARMS:
                rr=[r for r in overlap if r['engine']==engine and r['arm']==a and r['case'].startswith(cat+'-')]
                if rr:lines.append(f"| {engine}・{'手前が透明' if cat=='exposed' else '手前が不透明'} | {a.upper()} | {sum(r['selected'] for r in rr)} / {len(rr)} | {sum(r['issued'] for r in rr)} |")
    lines+=['','各条件でタップ、5pxの指ぶれ、10pxのドラッグを同じ画面座標から送った。8 CSS pxのドラッグ開始閾値、表示中の通知・入力制限、奥行き順を維持している。手前の絵が不透明な場所から、完全に隠れた奥の住民を直接指名する操作は追加していない。[実タッチ全件](evidence/overlap-touch.csv) ／ [選択処理](selection-hit.js) ／ [独立した画素計測](selection-probe.js)','',
        '## 森28体・全員の水平12px','','従来と同じ直接起動、390×792 CSS pxの本編、同じ初期足・乱数・住民・押下点・離した点。各住民の足元から中央側へ水平方向に12px指定した。実際のChromeタッチイベントを送った後、自発的な新規行動を止め、0.05秒刻みで12.35モデル秒進めて元の経路の結果を測った。安全な歩行を経て、採用経路の終点に0.01px以内で立ち止まったものを到着と数え、最初の受理や反応とは区別した。','',
        '| 版 | 本人選択 | 本人に届いた | 即受理 | 歩いて停止 | 指から4px以内に停止 | 安全違反 / 区間接触 |','|---|---:|---:|---:|---:|---:|---:|']
    for a in ARMS:
        r=[x for x in forest if x['arm']==a]
        vals=[sum(v[k] for v in r) for k in ('selected','issued','accepted','terminalArrived','terminalNear4','unsafeSteps','sweptViolations')]
        lines += ['| '+a.upper()+' | '+' | '.join(map(str,vals[:5]))+f' | {vals[5]} / {vals[6]} |']
    lines+=['','これは同時負荷がある環境での初回28操作の実測。V6ではタヌキ、フクロウ、ハムスター、サルの操作時に本編の入力制限が作動した。V7ではアザラシを選択した後、離した時に本編のバウンス反応と入力制限が重なり移動指示が届かなかった。V6のクマは経路を受理したが終点まで歩かなかった。','',
            '[28体それぞれの開始時接触・指定点接触・初動・4px精度・道を譲った相手](evidence/forest-drag-touch.csv)','']
    if len(fresh)==18:
        lines+=['入力制限が発生した5体とV6のクマに対し、各版で新しいページを1操作ごとに開き、同じ足・押下点・離した点を再試行した。下の合計はその6体の結果だけを再試行に置き換えた値で、上の28件の初回観測もすべて保存した。','',
                '| 版 | 再試行6件の本人到達 / 歩いて停止 / 指4px | 他の22件と合わせた終点停止 / 指4px（28体） |','|---|---:|---:|']
        for a in ARMS:
            test=[r for r in fresh if r['arm']==a];replace={r['index'] for r in test}
            rows=test+[r for r in forest if r['arm']==a and r['index'] not in replace]
            assert len(rows)==28
            l='/'.join(str(sum(r[k] for r in test)) for k in ['issued','terminalArrived','terminalNear4'])
            c='/'.join(str(sum(r[k] for r in rows)) for k in ['terminalArrived','terminalNear4'])
            lines.append(f"| {a.upper()} | {l} | {c} |")
        lines+=['','ハムスターはV6で動かず12pxの誤差が残った。V7では犬とアザラシが順に道を譲り、ハムスターが2.5モデル秒で歩き始め、指から3.538pxの地点に停止した。クマの停止時の誤差はV6の4.695pxからV7の2.360pxになった。石像の同じ指定ではV7でも歩き出せなかった。',
                '','[初回と新しいページでの再試行を、同じ6体の各版で照合](evidence/forest-fresh-touch.csv)','']
    if {'forest','resync'}<=set(revision):
        revised=[];v5=data['forest','chromium','v5'];old=data['forest','chromium','v7']
        for suite,d in sorted(revision.items()):
            assert d['meta']['opening']==v5['meta']['opening'] and d['meta']['seed']==v5['meta']['seed']
            meta=d['meta']['hashes'];base=old['meta']['hashes']
            changed=[n for n in meta if meta[n]!=base[n]]
            assert len(changed)==1 and 'production-model' in changed[0]
            for index,r in d['rows'].items():
                assert r['trusted'] and r['start']==v5['rows'][index]['start'] and r['goal']==v5['rows'][index]['goal']
                proof=r.get('refreshProof');prior=old['rows'][index]
                revised.append(dict(suite=suite,modelSHA256=meta[changed[0]],index=index,**evidence(r),priorTerminal=prior['terminalArrived'],
                                    priorError=prior['endFingerErrorCss'],gateAtDown=r['initialGate']['blocked'],gateAtUp=r['releaseGate']['blocked'],
                                    refreshClock=proof['clock'] if proof else None,identicalRosterAtRefresh=proof['before']==proof['after'] if proof else None,
                                    peerIDs=' '.join(r['peerWalk'])))
        csvfile(out/'forest-model-refresh-touch.csv',revised)
        rows=[r for r in revised if r['suite']=='forest']
        assert len(rows)==28
        tested=[r for r in revised if r['suite']=='resync']
        assert {r['index'] for r in tested}=={'5','24'}
        lines+=['### 同じシーンの再同期を直した最終モデルでの再測定','',
                f"上のV7は最初の候補（`b8e2c80495a4`）。最終モデル（`{rows[0]['modelSHA256'][:12]}`）でも、同じ28件を再試行の置き換えなしで全員に送った。本人選択 {sum(r['selected'] for r in rows)}/28、本人に指示到達 {sum(r['issued'] for r in rows)}/28、終点停止 {sum(r['terminalArrived'] for r in rows)}/28、指から4px以内の終点停止 {sum(r['terminalNear4'] for r in rows)}/28。検出した安全違反 {sum(r['unsafeSteps'] for r in rows)}、区間の接触悪化 {sum(r['sweptViolations'] for r in rows)}。",'',
                '別の新しいページでは同じ指操作の0.30モデル秒後に、表示中の気候・人数・体格を変えずに本編のシーン再同期を通した。前後で28体のID・足・寸法が完全一致した。','',
                '| 再同期付き実タッチ | 本人に指示到達 | 終点停止 | 指先誤差 px | 道を譲った住民 |','|---|---:|---:|---:|---|']
        for r in tested:
            lines.append(f"| {r['key']} | {int(r['issued'])} | {int(r['terminalArrived'])} | {r['endFingerErrorCss']} | {r['peerIDs']} |")
        lines+=['','[最終版の28操作・再同期付き2操作](evidence/forest-model-refresh-touch.csv)','']
    lines+=[
        '## 通常再生後の指と、読み込み後の歩行','','森28体では自律歩行・描画・通常のゲーム時計を動かした後、その時点のカワウソの姿をタッチして歩行を観測した。起動時の姿勢には戻していない。この表の座標・経路は各版の実際の生活の後の状態である。','',
        '| 版 | 入力までの実秒 / モデル秒 | それまでの移動指示 | 本人に届いた | 700ms後の移動 px | 終点停止 | 指先誤差 px |','|---|---:|---:|---:|---:|---:|---:|']
    for r in warmed:
        lines.append(f"| {r['arm'].upper()} | {r['ageWallSec']} / {r['ageNativeSec']} | {r['priorNativeStarts']} | {int(r['issued'])} | {r['earlyDistanceCss']} | {int(r['terminalArrived'])} | {r['endFingerErrorCss']} |")
    lines+=['','3版とも本人に届いたが、指定先がハムスター・石像・多尾のキツネに占有され、カワウソは歩き出さなかった。入力時のゲーム時計とゲート、接触者、個体の進路・再試行は原本に残した。','',
            '森4体では、本編が実際のbeforeunloadで書いたリビジョン・通貨・配偶者・仲間・装備を確認した。比較用ストレージはページ限定メモリーのため、通常の再読み込みでは初期家族に戻る。次の独立した再読み込みでは、その試行の実セーブ文字列を変更せず比較用ストレージに受け渡し、本編自身に読み込ませた。0から271にした検証用通貨は通常の再読み込みで0、保存文字列を引き継ぐと271になった。個人のセーブにはアクセスしていない。','','| 版 | 実セーブの版 / 読込版 | 人数 | 古い進路なし | 本人にドラッグ到達 | 終点まで歩行 |','|---|---:|---:|---:|---:|---:|']
    for r in saves:lines.append(f"| {r['arm'].upper()} | {r['nativeUnloadRevision']} / {r['restoredRevision']} | {len(r['residentIDs'].split())} | {int(r['cleanMotion'])} | {int(r['issued'])} | {int(r['terminalArrived'])} |")
    lines+=['','[通常再生後](evidence/warm-drag-touch.csv) ／ [実際の保存・初期化・復帰](evidence/native-save-touch.csv) ／ [全数値原本のSHA-256](evidence/touch-artifacts.csv)','',
            'Linux ChromiumのCDPとLinux WebKitのネイティブタッチプロトコルを使用した。iPhone Safari実機での指の狙いやすさ、処理時間、細い輪郭の見え方は未検証。WebKitの初期描画の待機上限は150秒。森での経年・保存・重なりの個別観測は初回モデルで行い、同じコントローラーを使った最終モデルでは森28件と再同期2件を別に収録した。[再現用プログラム](touch_focus.py)']
    report.write_text('\n'.join(lines)+'\n')


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--raw',type=Path,required=True);p.add_argument('--matrix',type=Path)
    p.add_argument('--out',type=Path,default=HERE/'evidence');p.add_argument('--report',type=Path,default=HERE/'SELECTION.md')
    a=p.parse_args();main(a.raw,a.out,a.report,a.matrix)
