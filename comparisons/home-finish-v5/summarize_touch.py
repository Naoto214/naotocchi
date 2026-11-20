"""Compile the trusted-input report directly from recorded event/position traces."""
import csv
import gzip
import json
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
SITE = 'https://naotocchi-cast-size.kerzion214.chatgpt.site/evidence/v5'
REGIONS = 'forest river_lake city home countryside mountain snow sea jungle desert deepsea star_stop memory_lake'.split()
NAMES = dict(zip(REGIONS,'もり みずべ とかい おうち いなか やま ゆきぐに うみ ジャングル さばく しんかい ほしぞらのていりゅうじょ きおくのみずうみ'.split()))
DRAGS = {'historical','diagonal','clear','obstacle','occupied','detour'} | {f'offset{angle}' for angle in range(0,360,45)}
def read(path):
    return json.loads(gzip.decompress(path.read_bytes()))
def wanted(d,**filters):
    return all(d[k]==v for k,v in filters.items())
def rows(data,kinds=DRAGS,**filters):
    return [r for d in data if wanted(d,**filters) for r in d['rows'].values() if r['kind'] in kinds and 'skip' not in r]
def num(rs,k):
    return sum(bool(r[k]) for r in rs)
def near(rs,k,tol):
    return sum(r[k] is not None and r[k]<=tol for r in rs)
def joined(rs):
    return f"{num(rs,'issued')} / {num(rs,'accepted')} / {num(rs,'arrivals')} / {near(rs,'fingerErrorAtArrivalCss',4)}"
def rate(n,m):
    return f'{n}/{m}'
def fmt(n):
    return '—' if n is None else f'{n:.1f}'
def audit(d,r):
    origin=d['opening'][r['index']][1:3]
    prev=origin
    violations=0;crossed=0;cap=0;step_count=0
    max_step=0
    for sample in r['observed']['steps']:
        _,x,y,limit,*before=sample
        if before:prev=before
        length=math.dist(prev,[x,y]);max_step=max(max_step,length)
        if length>limit+.002:cap+=1
        if not d['live']:
            for i,(_,bx,by,bw,bh,*_) in enumerate(d['opening']):
                if i==r['index']:continue
                rx=(d['opening'][r['index']][3]+bw)*.5+10
                ry=(d['opening'][r['index']][4]+bh)*.38+10
                px=(prev[0]-bx)/rx;py=(prev[1]-by)/ry
                vx=(x-prev[0])/rx;vy=(y-prev[1])/ry
                denom=vx*vx+vy*vy
                t=max(0,min(1,-(px*vx+py*vy)/denom)) if denom else 0
                initial=math.hypot(px,py);minimum=math.hypot(px+t*vx,py+t*vy)
                if minimum<min(initial,1)-.00015:crossed+=1
        prev=[x,y];step_count+=1
    crossed=r['observed'].get('sweptContactViolations',crossed)
    violations=r['observed']['unsafeSteps']
    return dict(steps=step_count,speed=cap,terrainOrCrowd=violations,continuous=crossed,maxStep=max_step)

def build(data,strict,raw_root):
    fs={}
    out=['# タッチで選ぶ・ドラッグで歩く','',
        '足元を画面中央へ水平12 CSS px動かす旧試験を、Chromiumのタッチ入力で再測定した。対象の絵を押して本人を選べたか、指を離したときに経路を受理したか、実際に歩いて指定位置に到着したかを別々に数えた。','',
        '| もり28体・390×844（ゲーム390×792） | 本人選択 | 本人へ発行 | 離した時点で受理 | 0.70モデル秒で1px超移動 | 実到着 | 補正終点から0.75px以内 | 指定位置から4px以内 |',
        '|---|---:|---:|---:|---:|---:|---:|---:|']
    data_sets=[('v4','off','V4・B'),('v5','off','V5・元の足元'),('v5','on','V5・新しい足元')]
    for ver,ground,label in data_sets:
        ds=[d for d in data if wanted(d,version=ver,ground=ground,suite='forest',width=390,engine='chromium')]
        if not ds:continue
        d=ds[0];rs=rows([d]);fs[label]=d;n=len(rs)
        out.append('| '+' | '.join([label,*[rate(k,n) for k in (num(rs,'selected'),num(rs,'issued'),num(rs,'accepted'),sum((r['earlyDistanceCss'] or 0)>1 for r in rs),num(rs,'arrivals'),near(rs,'correctedErrorCss',.75),near(rs,'fingerErrorAtArrivalCss',4))]])+' |')
    if len(fs)>=2:
        old=list(fs.values())[0];new=list(fs.values())[-1];a=old['rows'];b=new['rows'];keys=set(a)&set(b)
        gain=[a[k]['plan']['key'] for k in a if k in keys and not a[k]['accepted'] and b[k]['accepted']]
        loss=sum(a[k]['accepted'] and not b[k]['accepted'] for k in keys);fail=[b[k] for k in keys if not b[k]['accepted']];oldfail=[a[k] for k in keys if not a[k]['accepted']]
        gained=[b[k] for k in keys if not a[k]['accepted'] and b[k]['accepted']]
        faced=sum(any(p['key']==r['plan']['key'] and any(v['activity']=='look' for v in p.get('actor',[])) for p in r['observed']['release']) for r in fail)
        still=sum(r['endDistanceCss']<=.001 for r in fail)
        out+=['',f"初期の住民ID・足座標・体寸法・描画足位置を28体分照合（完全一致 {sum(x==y for x,y in zip(old['opening'],new['opening']))}/28）。以前受理された7件のうち新たな拒否は{loss}件。新たに到着したのは{len(gain)}体（{'、'.join(x.split(':')[-1] for x in gain)}）。",
            '',f"旧版で拒否された{len(oldfail)}件のうち、指定足位置が他の住民の接触楕円内だったのは{sum(bool(r['plan']['requestClass']['contacts']) for r in oldfail)}件、開始時から楕円が重なっていたのは{sum(bool(r['plan']['startClass']['contacts']) for r in oldfail)}件。新版で拒否された{len(fail)}件は、{sum(bool(r['plan']['requestClass']['contacts']) for r in fail)}件が占有位置への指定、{sum(bool(r['plan']['startClass']['contacts']) for r in fail)}件が開始時にも重なっていた。",f"指を離した直後に本人が「見る」姿勢になったのは拒否{len(fail)}件中{faced}件。全観測後に開始位置に留まったのは{still}件。"]
        if gained:
            errors=[r['fingerErrorAtArrivalCss'] for r in gained if r['arrivals']]
            displacements=[r['endDistanceCss'] for r in gained]
            out+=['',f"新たに受理された{len(gained)}件で足が実際に動いた距離は{min(displacements):.1f}〜{max(displacements):.1f}px、元の指定位置との差は{min(errors):.1f}〜{max(errors):.1f}px。{near(gained,'fingerErrorAtArrivalCss',4)}/{len(gained)}件が指定位置4px以内に入った。"]
    if 'V5・新しい足元' in fs:
        opening=fs['V5・新しい足元']
        native=opening['sourceHashes']['home-production-model-finish.js']
        out+=['',f"本表と地域・画面幅の一対比較のネイティブモデルは `{native[:12]}`。Chromium {opening['browser']}、DPR 2。"]
    out+=['','## 実際の指入力と判定','',
        'ChromiumのDevTools Protocolで半径5 CSS pxの指を押し、始点から終点まで5段階で通し、指を離した。DOMで発生した各ポインターイベントの `isTrusted`、`pointerType`、座標と時刻を保存した。水平12pxは開始時の足を基準とする。絵の不透明な3点のうち本人に当たる最初の点から始める。ほかの試験は先頭の絵の点を固定し、選びやすい点を探し直さない。','',
        '固定条件では実ゲームのURLを直接開き、ゲーム表示高を本人限定ページのiframeと同じにした。開いたゲームの住民・初期足座標・乱数状態を各試行前に復元し、入力は実際のイベントハンドラーに通した。入力中の時刻を揃え、離した後は実際のモデルを0.05秒刻みで12.35秒進めた。この条件は他の住民の新しい自動行動を停止する。0.70秒の移動は途中値、実到着は本人を発信元とする `arrive/drag` の観測。補正誤差はそのイベント時の足と直前の受理経路の終点との距離。指への誤差は開始時の指定足位置との距離。同じ指示で複数回到着した場合は最小値を記した。どちらも画面の縦横倍率を適用したCSS px。','',
        '## 全13地域の同じ3操作','',
        '各行は主人公の水平12px、恋人の斜め68px（画面端では48/32px）、仲間の他者の足へのドラッグを各1回。数値は順に「本人へ発行 / 離した時点で受理 / 実到着 / 指定足位置4px以内」。各地域で別の仲間をタップした。',
        '', '| 地域・390px幅 | V4 B | V5 元の足元 | V5 新しい足元 |','|---|---|---|---|']
    for region in REGIONS:
        result=[]
        for ver,ground,_ in data_sets:
            rr=rows(data,version=ver,ground=ground,suite='regions',region=region,width=390,engine='chromium')
            result.append(joined(rr) if rr else '—')
        out.append('| '+' | '.join([NAMES[region],*result])+' |')
    totals=[]
    for ver,ground,_ in data_sets:
        rr=rows(data,version=ver,ground=ground,suite='regions',width=390,engine='chromium')
        totals.append(joined(rr) if rr else '—')
    out.append('| '+' | '.join(['全地域計',*totals])+' |')
    for region in ('city','river_lake'):
        before=rows(data,{'diagonal','occupied'},version='v4',ground='off',suite='regions',region=region,width=390,engine='chromium')
        final=rows(data,{'diagonal','occupied'},version='v5',ground='on',suite='regions',region=region,width=390,engine='chromium')
        if len(before)==len(final)==2:
            old_by={r['kind']:r for r in before};new_by={r['kind']:r for r in final}
            if all(old_by[k]['arrivals'] and not new_by[k]['routed'] for k in ('diagonal','occupied')):
                out+=['',f"{NAMES[region]}では、恋人の斜め指定と仲間の占有位置指定で、V4は指定位置から順に{fmt(old_by['diagonal']['fingerErrorAtArrivalCss'])}px・{fmt(old_by['occupied']['fingerErrorAtArrivalCss'])}px離れた所へ到着した。V5は本人に指示が届いても両方とも移動を見送った。"]
    out+=['','## 画面幅と狙った先','',
        '| もり・幅 | V4 B | V5 元の足元 | V5 新しい足元 |','|---|---|---|---|']
    for width in (320,360,375,390,430):
        values=[]
        for ver,ground,_ in data_sets:
            rr=rows(data,version=ver,ground=ground,suite='regions',region='forest',width=width,engine='chromium')
            values.append(joined(rr) if rr else '—')
        out.append('| '+' | '.join([str(width),*values])+' |')
    eligible=[d for d in data if wanted(d,version='v5',ground='on',engine='chromium') and d['suite'] in ('focus','detour','directions')]
    out+=['','近距離の空き地は、事前に全区間の安全性を確認した標的を選んだ。障害物は歩行地形の外、占有は近隣の住民の足。迂回路は終点が空いていて直接経路が塞がり、中間点を通る実ナビ経路が見つかる標的を選んだ。条件を満たす標的が見当たらない試行は別欄に記録した。','',
        '| V5 新しい足元 | 指を送信 | 本人を選択 | 標的候補なし | 受理 | 実到着 | 補正終点0.75px以内 | 指定足位置4px以内 | 実到着時の指定位置からの最大差 |','|---|---:|---:|---:|---:|---:|---:|---:|---:|']
    for kind,lab in [('clear','空き地'),('obstacle','歩行域外'),('occupied','他者の足'),('diagonal','斜め'),('detour','迂回')]:
        rr=rows(eligible,{kind});skip=sum(r['kind']==kind and 'skip' in r for d in eligible for r in d['rows'].values())
        errors=[r['fingerErrorAtArrivalCss'] for r in rr if r['arrivals']]
        out.append(f"| {lab} | {len(rr)} | {num(rr,'selected')} | {skip} | {num(rr,'accepted')} | {num(rr,'arrivals')} | {near(rr,'correctedErrorCss',.75)} | {near(rr,'fingerErrorAtArrivalCss',4)} | {fmt(max(errors,default=None))} |")
    detours=rows(eligible,{'detour'})
    bends=[r for r in detours if r['arrivals'] and any(len(p['path'])>1 for p in r['observed']['plans'])]
    if bends:
        r=bends[0]
        d=next(d for d in eligible if r in d['rows'].values())
        path=r['observed']['plans'][0]['path']
        out+=['',f"迂回候補のうち、実指示で複数の経路点を通って到着したのは{len(bends)}件。例は{NAMES[d['region']]}の{r['plan']['key']}で、最初の経路は{len(path)}点、到着時の指定位置との差は{fmt(r['fingerErrorAtArrivalCss'])}px。"]
    dirs=rows(eligible,{f'offset{angle}' for angle in range(0,360,45)})
    if dirs:
        out+=['',f"3体のもり・おうちで同じ主人公を8方向に操作。上下左右は足から36px、斜めは72px。実行 {len(dirs)}回、本人選択 {num(dirs,'selected')}回、本人の実到着 {num(dirs,'arrivals')}回、指定位置4px以内 {near(dirs,'fingerErrorAtArrivalCss',4)}回。"]
    out+=['','## 通常再生・実際の経過時間','',
        '本人限定ページの iframe 内で「停止」から再生し、通常の描画フレームと自律行動が動く状態で指を送った。最初は壁時計700ms後、続いて本人の到着イベント、または12.2モデル秒経過まで観測した。','',
        '| 地域・人数 | 操作 | 本人選択 | 受理 | 実到着 | 700ms後の足移動 | 到着時の指定位置からの差 |','|---|---|---:|---:|---:|---:|---:|']
    for d in sorted((d for d in data if d['live']),key=lambda d:(d['region'],d['count'])):
        for r in rows([d]):
            out.append(f"| {NAMES[d['region']]} {d['count']} | {r['kind']} | {int(r['selected'])} | {int(r['accepted'])} | {int(bool(r['arrivals']))} | {fmt(r['earlyDistanceCss'])} px | {fmt(r['fingerErrorAtArrivalCss'])} |")
    out+=['','## 入力境界と歩行の安全性','']
    sel=[d for d in data if d['version']=='v5' and d['engine']=='chromium']
    bykind=lambda k:rows(sel,{k})
    taps=bykind('tap');cancels=bykind('cancel');pauses=bykind('paused');jitter=bykind('jitter');thresh=bykind('threshold');empty=bykind('empty')
    out+=[f"- タップで本人を選択 {rate(num(taps,'selected'),len(taps))}。タップからのドラッグ発行 {num(taps,'issued')}。指をキャンセルした後のドラッグ発行 {rate(num(cancels,'issued'),len(cancels))}。停止中の本人選択 {rate(num(pauses,'selected'),len(pauses))}。",
        f"- 体の同じ点から水平5px動かしたときのドラッグ発行 {rate(num(jitter,'issued'),len(jitter))}。10px動かしたときのドラッグ発行 {rate(num(thresh,'issued'),len(thresh))}。判定閾値は画面上の8 CSS px。"]
    proof=rows([d for d in sel if d['suite']=='taps'],{'tap'})
    correct=sum(bool(r['observed'].get('visualDown',{}).get('visible')) and r['observed']['visualDown']['key']==r['plan']['key'] and r['observed']['visualDown']['label']==r['observed']['expectedLabel'] for r in proof)
    if proof:out.append(f"- もり28体を1体ずつ不透明な先頭の点でタップ。本人選択 {rate(num(proof,'selected'),len(proof))}、押した直後に本人のDOM選択属性と本人名の表示ラベルを両方確認 {rate(correct,len(proof))}。")
    if empty:out.append(f"- 空き地をタップして住民が新たに選択された件数 {rate(sum(r['observed']['selected'] is not None for r in empty),len(empty))}。")
    allrows=[(d,r) for d in sel for r in d['rows'].values() if 'skip' not in r]
    def complete(r):
        p=r['observed']['pointers']
        return bool(p) and p[0][0]=='pointerdown' and p[-1][0]==('pointercancel' if r['kind']=='cancel' else 'pointerup')
    audits=[audit(d,r) for d,r in allrows];total=lambda k:sum(a[k] for a in audits)
    releases=[r['releaseJumpCss'] for d,r in allrows if r['releaseJumpCss'] is not None and not d['live']]
    out+=[f"- 信頼済みタッチイベント {rate(sum(r['trusted'] for d,r in allrows),len(allrows))} 試行。押下からリリース／キャンセルまで揃ったポインター列 {rate(sum(complete(r) for _,r in allrows),len(allrows))}。固定配置で指を離した瞬間の最大足移動 {fmt(max(releases,default=None))} CSS px。本人のドラッグによる足移動 {total('steps')} ステップを確認し、速度上限超過 {total('speed')}、歩行域・表示範囲・接触の実位置制約違反 {total('terrainOrCrowd')}。各実ステップの開始時に全住民の現在の接触楕円と移動線分との最小距離を再計算し、新規侵入または既存重なりの増大 {total('continuous')}。"]
    wk=[d for d in data if d['engine']=='webkit'];wt=rows(wk,{'tap'});wm=rows(wk)
    wkinput='・'.join(sorted({{'touch':'WPEネイティブタッチ','mouse':'マウス'}[r['source']] for r in wm}))
    out+=[f"- Linux WebKitのタップはタッチで本人を選択 {rate(num(wt,'selected'),len(wt))}。同環境のドラッグは{wkinput}。WPEの入力座標はプロトコル指定の整数CSS pxに丸めた。信頼済み {rate(num(wm,'trusted'),len(wm))}、本人選択 {rate(num(wm,'selected'),len(wm))}、実到着 {rate(num(wm,'arrivals'),len(wm))}。Chromiumタッチとは別集計。物理iPhone・Safari実機の検証は未実施。"]
    after=[r for _,r in allrows if r['arrivals'] and not r['accepted']]
    out+=['',f"本人の指示を受けた当初は未受理で、同じ試行の後半で本人のドラッグ到着が生じたのは{len(after)}件。初回受理と後の実到着は個別ログで照合できる。"]
    peers=sorted((raw_root/'touch-peers').glob('*.json.gz'))
    for f in peers:
        d=read(f);r=next(iter(d['rows'].values()))
        if r.get('skip'):continue
        out+=['',f"もりの別試行では待機が生じる組を事前探索し、開始位置に戻して2回の実タッチを送った。{r['plan']['key']}に指示後、待ち時間中に別の実タッチで{r['peer']['peer']}を動かした。最初の本人指示の受理{int(r['accepted'])}件、待機後に本人が受理した経路{len(r['observed']['plans'])}件、本人の実到着{r['arrivals']}件、到着時の指定位置からの差{fmt(r['fingerErrorAtArrivalCss'])}px。 [動いた隣人と待機中指示の記録]({SITE}/touch-peers/{f.name})"]
    final_files=sorted((raw_root/'touch-final').glob('*.json.gz'))
    if final_files:
        out+=['','## 配布モデルでの再確認','']
        final=[(f,read(f)) for f in final_files]
        model=next(iter(final))[1]['sourceHashes']['home-production-model-finish.js']
        assert all(d['sourceHashes']['home-production-model-finish.js']==model for _,d in final)
        out+=[f"配布モデル `{model}` を同じシードのゲームで起動して実入力を再送した。全試行の個別URLはCSVに収録した。",'',
              '| 条件 | 実行した操作 | 初回発行・受理・実到着・誤差が旧測定と一致 | 指定位置4px以内の実到着 | 移動線分の接触侵入 |',
              '|---|---:|---:|---:|---:|']
        groups={}
        for f,d in final:
            if d['live'] or d['suite']=='peer':continue
            base=next((q for q in data if all(q[k]==d[k] for k in ('version','suite','ground','engine','width','region','count','live'))),None)
            if not base:continue
            assert base['opening']==d['opening'] and base['seed']==d['seed'],f.name
            cluster=(d['suite'],d['ground'],d['engine'],d['width']==390)
            acc=groups.setdefault(cluster,[0,0,0,0])
            for key,r in d['rows'].items():
                if 'skip' in r:continue
                a=base['rows'][key]
                matches=all(a.get(field)==r.get(field) for field in ('issued','accepted','arrivals'))
                for field in ('correctedErrorCss','fingerErrorAtArrivalCss'):
                    v,w=a.get(field),r.get(field)
                    matches=matches and ((v is None and w is None) or (v is not None and w is not None and abs(v-w)<=.01))
                acc[0]+=1;acc[1]+=matches;acc[2]+=near([r],'fingerErrorAtArrivalCss',4)
                acc[3]+=r['observed'].get('sweptContactViolations',0)
        labels={'forest':'もり28体の水平12px','regions':'地域・役別','focus':'空き地・障害物・占有等','detour':'迂回','directions':'8方向','taps':'28体のタップ','threshold':'しきい値・中止'}
        for (suite,g,engine,standard),n in groups.items():
            width='390px' if standard else 'その他の画面幅'
            out.append('| '+' | '.join([f"{labels.get(suite,suite)}・{engine}・{width}・{'新' if g=='on' else '元'}",*map(str,n)])+' |')
        totals=[sum(n[i] for n in groups.values()) for i in range(4)]
        out.append('| '+' | '.join(['固定条件の合計',*map(str,totals)])+' |')
        measured=[(d,r) for _,d in final for r in d['rows'].values() if 'skip' not in r]
        checks=[audit(d,r) for d,r in measured]
        out+=['','誤差の比較許容差は0.01 CSS px。条件を満たす標的候補がない操作は除外した。',
            f"通常再生・待機再試行・同じページを開き続けた条件を含む配布版{len(measured)}試行で、本人の歩行{sum(x['steps'] for x in checks)}ステップを照合。速度制限違反 {sum(x['speed'] for x in checks)}、地形・表示範囲・接触の位置制約違反 {sum(x['terrainOrCrowd'] for x in checks)}、線分の接触侵入 {sum(x['continuous'] for x in checks)}。",'']
        for f,d in final:
            rr=[r for r in d['rows'].values() if 'skip' not in r]
            if not rr:continue
            violations=sum(r['observed'].get('sweptContactViolations',0) for r in rr)
            if d['suite']=='peer':
                r=rr[0];out.append(f"- 同じ配布モデルで{r['peer']['key']}の未受理指示は、2回目のタッチで{r['peer']['peer']}が歩いた後に到着。初回受理 {int(r['accepted'])}、実到着 {r['arrivals']}、補正終点との距離{fmt(r['correctedErrorCss'])}px、指定位置との距離{fmt(r['fingerErrorAtArrivalCss'])}px、歩行中の接触侵入 {violations}。 [実測]({SITE}/touch-final/{f.name})")
            if d['suite']=='soak':
                miss=[r for r in rr if not r['issued']]
                times=[r['observed']['pointers'][0][5]/1000 for r in rr if r['observed']['pointers']]
                overlap=[d['rows'][f'historical/{i}']['observed']['pointers'][0][5]/1000 for i in (16,17,18) if f'historical/{i}' in d['rows']]
                gate_count=sum(bool(r.get('initialGates',{}).get('blocked')) or any(g.get('state',{}).get('blocked') for g in r['observed'].get('gates',[])) for r in miss)
                out.append(f"- 以前に3件届かなかった長時間の測定に合わせ、同じページで28件を前回のブラウザー経過時刻順に再送した（観測{min(times):.1f}〜{max(times):.1f}秒）。本人選択 {num(rr,'selected')}/{len(rr)}、本人へ発行 {num(rr,'issued')}/{len(rr)}、受理・実到着 {num(rr,'arrivals')}/{len(rr)}。以前の3体の今回の押下時刻は{'、'.join(format(v,'.2f') for v in overlap)}秒。今回の未発行{len(miss)}件のうち、入力中にゲーム側の操作停止が記録されたものは{gate_count}件。 [長時間の再確認]({SITE}/touch-final/{f.name})")
                for item in miss:
                    g=item.get('initialGates',{});event=item['observed']['pointers'][0]
                    down=next((z for z in item['observed'].get('gates',[]) if z.get('type')=='pointerdown'),{})
                    if g.get('framework') and g.get('reaction'):
                        out.append(f"  - {item['plan']['key']}は{event[5]/1000:.2f}秒で指が本人（DOM対象 `{down.get('target')}`）に当たった。ゲームの通常の操作停止が有効で `castResponse` に `{g['reaction']}` があり、経路指示が発行される前に操作が止まった。")
            if d['live']:
                out.append(f"- {NAMES[d['region']]}{d['count']}体の通常再生で信頼済み入力 {num(rr,'trusted')}/{len(rr)}、本人への発行 {num(rr,'issued')}、初回受理 {num(rr,'accepted')}、実到着 {num(rr,'arrivals')}、歩行中の接触侵入 {violations}。 [実測]({SITE}/touch-final/{f.name})")
    for fresh in sorted((raw_root/'touch-peer-fresh').glob('*.json.gz')):
        d=read(fresh);r=next(iter(d['rows'].values()))
        out+=['',f"同じ2体を別の新規ページで再試行し、このページには経路の事前探索を一度も実行しなかった。2回の信頼済みタッチだけで本人指示の初回受理{int(r['accepted'])}、待機後の実到着{r['arrivals']}、補正終点誤差{fmt(r['correctedErrorCss'])}px、移動線分の接触侵入{r['observed']['sweptContactViolations']}。 [探索を行わない別ページでの記録]({SITE}/touch-peer-fresh/{fresh.name})"]
    soak=raw_root/'touch-soak'
    if soak.exists():
        slow=read(next(soak.glob('*-forest-chromium*')));recheck=read(next(soak.glob('*-custom-chromium*')))
        missed=[r for r in slow['rows'].values() if not r['issued']]
        out+=['','## 長時間開いたままの別試行','',f"修正途中のモデル `{slow['sourceHashes']['home-production-model-finish.js'][:12]}` では、共有ホストに負荷がかかった状態で同じページに続けて28件を送った。{len(missed)}/28件で信頼済みの指の上下イベントが記録されたが、本人の移動指示が発行されなかった。発生したページ経過時刻は{'、'.join(format(r['observed']['pointers'][0][5]/1000,'.2f') for r in missed)}秒。うち{sum(r['selected'] for r in missed)}件は本人を選択、残りは選択も成立しなかった。このログだけから発生源は確定できない。",'',
        f"同じビルド・足位置で、この3体を新しいページで再試行。全{len(recheck['rows'])}件で本人を選択して指示を発行し、リスだけが経路を受理・実到着した。標準の水平12pxの表では各ページ当たり最大7件の条件を集計した。以前の長時間観測と再試行は別記録として残す。 [連続28件]({SITE}/touch-soak/v5-on-forest-chromium-390-forest-28.json.gz) ／ [新規ページで再試行した3件]({SITE}/touch-soak/v5-on-custom-chromium-390-forest-28.json.gz)"]
    out+=['','## 再現','',
          'V4/V5配布物を別ポートで配信し、PythonのPlaywrightとChromiumを用意する。JSON圧縮ファイルは条件別に開ける。以下の例ではもりの個別試験を再測定する。全ログを揃えたときは集計時の `--partial` を外す。各ファイルには実行したブラウザーの版、ゲーム表示サイズ、モデル・コントローラーの元ハッシュ、キャストの全初期位置、ポインター列・受理経路・時刻別足位置が入る。','',
          '```sh','python verify_touch.py --url http://127.0.0.1:8824 --version v4 --suite forest --out /tmp/finish-raw/touch','python verify_touch.py --url http://127.0.0.1:8315 --version v5 --ground on --suite forest --out /tmp/finish-raw/touch','python summarize_touch.py --partial --raw-root /tmp/finish-raw','```','','[測定入力](verify_touch.py) ／ [描画と入力の観測](touch_probe.js) ／ [各ジェスチャーの実測と限定配布元データのURL](evidence/touch-summary.csv)']
    if strict:
        assert len(fs)==3
        final=[d for d in data if d['version']=='v5']
        assert len({d['sourceHashes']['home-production-model-finish.js'] for d in final})==1
        assert len({d['sourceHashes']['home-production-diorama-finish.js'] for d in final})==1
        for ver,ground,_ in data_sets:
            ds=[d for d in data if wanted(d,version=ver,ground=ground,suite='regions',width=390,engine='chromium')]
            assert {d['region'] for d in ds}==set(REGIONS) and all(len(d['rows'])==4 for d in ds)
        for region in REGIONS:
            paired=[d for d in data if wanted(d,suite='regions',width=390,region=region,engine='chromium')]
            assert all(d['opening']==paired[0]['opening'] and d['seed']==paired[0]['seed'] for d in paired),region
        assert len(jitter)==2 and len(thresh)==2
        assert len(wt)==2 and len(wm)==6
        assert len([d for d in data if d['live']])==2
        assert all(len(rows([d]))==28 for d in fs.values())
        assert all(d['opening']==old['opening'] for d in fs.values())
        assert all(num(rows(data,kinds={'tap'},suite='regions',version=v,ground=g,engine='chromium',width=390),'trusted')==13 for v,g,_ in data_sets)
        assert all(r['trusted'] and complete(r) for _,r in allrows)
        assert all(r['trusted'] and complete(r) for r in wt+wm)
        assert max(releases)==0 and total('speed')==0 and total('terrainOrCrowd')==0 and total('continuous')==0
    return '\n'.join(out)+'\n'

def write_csv(raw_root):
    columns=['raw_url','raw_sha256','version','ground','browser','engine','width','height','count','region','suite','live',
             'native_model_sha256','row','kind','resident','input','trusted','selected','visual_owner','visible_label',
             'aim_dx_css','aim_dy_css','opening_contacts','destination_contacts','destination_on_terrain','destination_straight_clear',
             'issued','accepted_immediately','routed_later_or_immediately','arrive_count','finger_error_css','corrected_error_css',
             'early_displacement_css','final_displacement_css','release_jump_css','observed_steps','constraint_violations','skipped']
    import hashlib
    path=HERE/'evidence'/'touch-summary.csv'
    path.parent.mkdir(exist_ok=True)
    with path.open('w',newline='') as stream:
        writer=csv.DictWriter(stream,fieldnames=columns,lineterminator='\n');writer.writeheader()
        for source in sorted(raw_root.glob('touch*/*.json.gz')):
            d=read(source);digest=hashlib.sha256(source.read_bytes()).hexdigest()
            for key,r in d['rows'].items():
                observation=r.get('observed',{});visual=observation.get('visualDown',{})
                record={k:d.get(k) for k in ['version','ground','browser','engine','width','height','count','region','suite','live']}
                record.update(raw_url=f'{SITE}/{source.parent.name}/{source.name}',raw_sha256=digest,
                    native_model_sha256=next(v for n,v in d['sourceHashes'].items() if 'model' in n),
                    row=key,kind=r['kind'],resident=r.get('plan',{}).get('key',r.get('key')),input=r.get('source'),
                    visual_owner=visual.get('key'),visible_label=visual.get('label') if visual.get('visible') else None,
                    observed_steps=len(observation['steps']) if 'steps' in observation else None,
                    constraint_violations=observation.get('unsafeSteps'),skipped=r.get('skip'))
                if 'plan' in r:
                    plan=r['plan'];flag=plan['requestClass']
                    record.update(aim_dx_css=round(plan['goal'][0]-plan['foot'][0],3),aim_dy_css=round(plan['goal'][1]-plan['foot'][1],3),
                        opening_contacts=len(plan['startClass']['contacts']),destination_contacts=len(flag['contacts']),
                        destination_on_terrain=flag['terrain'],destination_straight_clear=flag['straightClear'])
                for dest,field in [('trusted','trusted'),('selected','selected'),('issued','issued'),('accepted_immediately','accepted'),
                    ('routed_later_or_immediately','routed'),('arrive_count','arrivals'),('finger_error_css','fingerErrorAtArrivalCss'),
                    ('corrected_error_css','correctedErrorCss'),('early_displacement_css','earlyDistanceCss'),
                    ('final_displacement_css','endDistanceCss'),('release_jump_css','releaseJumpCss')]:
                    record[dest]=r.get(field)
                writer.writerow(record)

if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--partial',action='store_true')
    p.add_argument('--require-final',action='store_true',help='Require the full distribution-model replay and audit every native step')
    p.add_argument('--raw-root',type=Path,default=HERE/'evidence',help='Parent directory containing touch/ and touch-soak/')
    a=p.parse_args()
    data=[read(f) for f in sorted((a.raw_root/'touch').glob('*.json.gz'))]
    if a.require_final:
        final_dir=a.raw_root/'touch-final'
        for path in (a.raw_root/'touch').glob('v5-*.json.gz'):
            final=read(final_dir/path.name);prior=read(path)
            assert set(final['rows'])==set(prior['rows']),path.name
            for row in final['rows'].values():
                if 'skip' in row:continue
                flags=audit(final,row)
                assert row['trusted'] and not any(flags[k] for k in ('speed','terrainOrCrowd','continuous')),(path.name,row['kind'],flags)
        pair=read(next(final_dir.glob('*-peer-chromium-*.json.gz')))
        r=next(iter(pair['rows'].values()))
        assert r['selected'] and r['issued'] and not r['accepted'] and r['routed'] and r['arrivals'] and r['correctedErrorCss']<=.75
        assert not r['observed']['sweptContactViolations']
        hold=read(next(final_dir.glob('*-soak-chromium-*.json.gz')))
        assert len(hold['rows'])==28 and all(r['trusted'] for r in hold['rows'].values())
    (HERE/'INPUT.md').write_text(build(data,not a.partial,a.raw_root))
    write_csv(a.raw_root)
