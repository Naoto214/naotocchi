"""Write the owner-facing matched forest report from verified per-actor observations."""
from collections import Counter
import csv
import json
from pathlib import Path
import sys
from forest_results import FOCUS, POLICIES, PROFILES

TITLES = dict(zip(POLICIES, ['V11 足元','V12','A','B','C','D','D＋曲がる']))
LABELS = dict(zip(PROFILES, ['320 従来席・214','320 旧調整席・214','375 従来席・937','390 従来席・214','430 旧調整席・214']))


def table(head, rows):
    return '\n'.join('| '+' | '.join(map(str, row))+' |' for row in [head, ['---']*len(head), *rows])


def report(folder):
    read_csv = lambda name:list(csv.DictReader((folder/name).open()))
    raw = json.loads((folder/'forest-summary.json').read_bytes())
    homes = {(h['profile'],h['policy']):h for h in raw['homes']}
    rows = read_csv('forest-residents.csv')
    who = raw['names']
    index = {(r['profile'],r['policy'],r['key']):r for r in rows}
    sum_int = lambda group,k:sum(int(r[k]) for r in group)
    all_home = [homes[p,m] for p in PROFILES for m in POLICIES[2:]]
    assert len(all_home)==25 and all(h['cell']['wall_s']>=600 and h['cell']['model_s']>=600 for h in all_home)
    tr = lambda h: f"{h['cell']['own_once']}／{h['cell']['both_halves']}"
    c = lambda p,m:homes[p,m]['cell']
    lo, hi = min(h['cell']['wall_s'] for h in all_home), max(h['cell']['wall_s'] for h in all_home)
    text = ['# 森28体の継続歩行と退路',
        f'5つの開始条件でA〜DとD＋曲がる道譲りを独立に再生した。25家庭すべてで28体を保ち、実時間{lo:.1f}〜{hi:.1f}秒、ゲーム内600秒以上を観測した。共通の最初の600ゲーム内秒を前後半に分けた。開始状態、元のゲームと観測コードのSHA-256、公式ZIPのSHA-256は個別の記録に含む。',
        '通常歩行は、本人が自分の目的に0.75 CSS pxを超えて近づき、直線変位8 CSS px以上の自律経路を終えた場合。道譲り、短い脱出、向き直りは別に数えた。休息・着席・見回すなどの待機、またはその更新での自律判断枠の待機で不成立区間を区切った。会話・病気・世話などで止まるゲーム内時計と、実時間での応答は原本に別々に記録した。',
        '## 幅・席順による差',
        '各欄は「通常歩行を1回以上完了した人数／前半・後半とも完了した人数」。1家庭の分母は28体。V11足元のみ・V12は同じ幅、乱数、席配置で既に収録・照合した試行から引用した。',
        table(['幅・席・乱数',*[TITLES[m] for m in POLICIES]],[[LABELS[p],*[tr(homes[p,m]) for m in POLICIES]] for p in PROFILES])]
    aggregate, compare, focus, fixed, drag, timing, risks = [], [], [], [], [], [], []
    for m in POLICIES:
        group=[r for r in rows if r['profile'] in PROFILES and r['policy']==m]
        cells=[c(p,m) for p in PROFILES]
        n=len(group); assert n==140
        maxrow=max(group,key=lambda r:float(r['longest_blocked_s']))
        aggregate.append([TITLES[m],sum_int(cells,'own_once'),sum_int(cells,'both_halves'),sum_int(group,'normal'),
            f"{sum(float(r['actual_walk_distance_css']) for r in group):,.0f}",f"{sum_int(group,'plans')}／{sum_int(group,'requests')}",
            sum_int(group,'yields_performed'),sum_int(group,'completed_help_received')])
        eligible=sum_int(group,'recovered')+sum_int(group,'open_at_cutoff')
        risks.append([TITLES[m],sum_int(group,'episodes_over_60'),sum_int(group,'episodes_over_180'),
            f"{sum_int(group,'recovered')}／{eligible}",sum_int(group,'voluntary_end'),sum_int(group,'budget_end'),who[maxrow['key']],LABELS[maxrow['profile']],maxrow['longest_blocked_s']])
        drag.append([TITLES[m],f"{sum_int(group,'opening_arrived')}／{sum_int(group,'opening_trusted')}",
            f"{sum_int(group,'aged_arrived')}／{sum_int(group,'aged_trusted')}",sum_int(group,'opening_near4'),sum_int(group,'aged_near4'),
            sum_int(cells,'same_body_replacement_moves'),sum_int(cells,'between_legs_shifts'),sum_int(cells,'speed_bound_exceedances'),
            sum_int(cells,'drag_unsafe_steps'),sum_int(cells,'drag_swept_violations')])
    text.extend([table(['版（延べ140体）','1回以上','前後半とも','通常歩行回数','全実歩行距離 px','経路成立／要求','譲って到着','譲ってもらった'],aggregate),
        '全実歩行距離は家庭の終了時までで、短い歩行と道譲りを含む。個体別CSVには600秒以内の本人の通常歩行距離、全体の実距離、道譲りの申出、実際に到着した道譲りを別々に収録した。',
        table(['版','60秒超の不成立','180秒超','自分で歩き復帰／待機を除く区間','自分で待機を選択','自律判断枠で待機','最長の住民','家庭','ゲーム内秒'],risks)])
    opened = []
    for p in PROFILES:
        start=[]
        for m in POLICIES[2:-1]:
            group=homes[p,m]['people']
            start.append('／'.join(str(sum(r['openRays'][i]>0 for r in group)) for i in (0,1,2)))
        numbers=[]
        for m in POLICIES[2:-1]:
            group=[r for r in rows if r['profile']==p and r['policy']==m]
            numbers.append(str(sum_int(group,'opening_contacts')//2))
        opened.append([LABELS[p],*start,'／'.join(numbers)])
    text.extend(['## 開幕の退路と接触',
        '各欄は「3／8／16pxに少なくとも1方向を持つ住民数」。48方向の同じ角度と実際の足で比較した。初期接触は両方の住民が報告した組を1組として数えた。',
        table(['幅・席',*[TITLES[m] for m in POLICIES[2:-1]],'初期接触組 A／B／C／D'],opened)])
    for before,after in zip(POLICIES[2:],POLICIES[3:]):
        lost,gained,blocked,freed=[],[],[],[]
        for p in PROFILES:
            for actor in who:
                a,b=(index[p,m,actor] for m in (before,after))
                a2,b2=(int(r['first_half'])>0 and int(r['second_half'])>0 for r in (a,b))
                if a2 and not b2:lost.append((p,actor))
                if b2 and not a2:gained.append((p,actor))
                if float(a['longest_blocked_s'])<=180<float(b['longest_blocked_s']):blocked.append((p,actor))
                if float(b['longest_blocked_s'])<=180<float(a['longest_blocked_s']):freed.append((p,actor))
        compare.append([TITLES[before]+' → '+TITLES[after],len(gained),len(lost),len(freed),len(blocked)])
        if blocked:
            details='、'.join(f"{LABELS[p]}の{who[actor]}" for p,actor in blocked)
            timing.append(TITLES[before]+' → '+TITLES[after]+'で新たに180秒超となった家庭・住民は'+details+'。')
    text.extend(['## 個体間の利害',table(['比較','前後半歩行を獲得','前後半歩行を失った','180秒超の不成立が解消','新たに180秒超の不成立'],compare),
        *timing,'各値は同じ初期条件で対応する住民の差。実時間で発生する世話や通知の順序、選んだ行動と歩行は家庭ごとに分岐する。候補ごとの効果をより厳密に切り分けるため、下に時間刻みを固定した追試も示す。'])
    all_both=[f"{TITLES[m]} {sum(c(p,m)['both_halves']==28 for p in PROFILES)}/5" for m in POLICIES[2:]]
    text.append('28体全員が前後半とも通常歩行した実時間の家庭は、'+'、'.join(all_both)+'。延べ回数が増えた版でも、新たに長時間閉じる住民、歩けなくなる時間帯、ドラッグ到着の増減を合わせて評価する。')
    for p in PROFILES:
        for m in POLICIES[2:]:
            focal=[index[p,m,k] for k in FOCUS[1:]]
            fp=lambda col:'／'.join(str(r[col]) for r in focal)
            im=lambda r:f"{r['opening_arrived']}→{r['aged_arrived']}"
            focus.append([LABELS[p],TITLES[m],fp('normal'),fp('longest_blocked_s'),
                fp('opening_8px_headings'),fp('aged_8px_headings'),'／'.join(im(r) for r in focal)])
    text.extend(['## タヌキ・パンダ・箱',
        '各欄の並びはタヌキ／パンダ／箱。8pxの退路は全周48方向のうち安全に歩ける直線の本数。ドラッグは開幕→終了時の実入力で、1は安全な経路終点に到着、0は未到着。',
        table(['幅・席・乱数','案','通常歩行の回数','最長不成立 秒','開幕8px方向数','終了8px方向数','ドラッグ到着'],focus)])
    transitions = read_csv('forest-peer-changes.csv')
    peer_rows=[]
    for m in POLICIES[2:]:
        selected=[r for r in transitions if r['profile'] in PROFILES and r['policy']==m and r['radius_css']=='8']
        for p in PROFILES[:2]:
            items=[r for r in selected if r['profile']==p]
            peer_rows.append([LABELS[p],TITLES[m],sum(int(r['from_headings'])==0 for r in items),
                sum(int(r['to_headings'])==0 for r in items),
                '、'.join(who[k] for k in FOCUS[1:] if any(r['key']==k and int(r['from_headings'])==0 for r in items)) or 'なし'])
    text.extend(['## 周囲の歩行で開閉した8px経路',
        '同じ住民で、足の位置と大きさが完全に一致し、ほかの住民の足が変わった二つの観測を照合した。本人の地形・遮蔽・境界で許される48方向の本数が一致し、接触条件を加えた後だけ0本と1本以上が入れ替わった遷移を数える。開幕、実際の不成立要求、終了時に観測した範囲の下限。連続した全フレームの開閉回数ではない。',
        table(['幅・席','案','開いた観測回数','閉じた観測回数','開いたタヌキ・パンダ・箱'],peer_rows)])
    fine = folder/'forest-focal-directions.json'
    if fine.exists():
        observations=json.loads(fine.read_bytes())['observations']
        assert len(observations)==60
        sampled={(r['case'],r['phase'],r['key']):r for r in observations}
        fine_rows=[]
        for p in PROFILES[:2]:
            for m in POLICIES[2:]:
                triple=lambda phase,px:'／'.join(str(sampled[p+'-'+m,phase,k]['distances'][str(px)]['safeHeadings']) for k in FOCUS[1:])
                fine_rows.append([LABELS[p],TITLES[m],triple('opening',3),triple('opening',8),
                    triple('endpoint',3),triple('endpoint',8),triple('endpoint',16)])
        text.extend(['### 320pxの足で0.5度ごとに再検査',
            '実際の開始時と終了時のタヌキ／パンダ／箱を、全周720方向で調べた。推定した足位置は使わず、同じ28体、同じゲームと投影で、48方向に含まれるすべての角度が原本の結果と一致した。値は安全な方向数。0はこの刻みでの観測値。',
            table(['席','案','開幕3px','開幕8px','終了3px','終了8px','終了16px'],fine_rows),
            '[各方向の角度・地形／接触・足の座標](forest-focal-directions.json)'])
    for p in PROFILES:
        fc=[homes[p,m]['fixed'] for m in POLICIES[2:]]
        fixed.append([LABELS[p],*[f"{f['normal']}／{f['both']}" for f in fc],
            '一致' if fc[-1]['physicalSHA256']==fc[-2]['physicalSHA256'] else '異なる',
            f"{fc[-1]['searches']}／{fc[-1]['plans']}／{fc[-1]['physicallyWalked']}／{fc[-1]['assistedNormal']}"])
    sensitivity=[]
    for before,after in [('v13-a','v13-b'),('v13-b','v13-c'),('v13-c','v13-d'),('v13-d','v13-d-curve')]:
        for p in PROFILES:
            a,b=(homes[p,m]['fixed'] for m in (before,after))
            sums=lambda r,k:sum(r['perActor'][k])
            up=[k for k in who if sums(a,k)<sums(b,k)]
            down=[k for k in who if sums(a,k)>sums(b,k)]
            newly=[k for k in who if a['longestBlockedSeconds'][k]<=180<b['longestBlockedSeconds'][k]]
            lost=[k for k in who if all(a['perActor'][k]) and not all(b['perActor'][k])]
            sensitivity.append([LABELS[p],TITLES[before]+' → '+TITLES[after],len(up),len(down),len(lost),
                '、'.join(who[k] for k in newly) or 'なし', '一致' if a['physicalSHA256']==b['physicalSHA256'] else '異なる'])
    curves=[]
    for p in PROFILES:
        a,b=c(p,'v13-d'),c(p,'v13-d-curve')
        curves.append([LABELS[p],f"{a['both_halves']}→{b['both_halves']}",f"{a['walking_legs']}→{b['walking_legs']}",
            b['curve_searches'],b['curve_plans'],b['curve_walked'],b['assisted_owner_normals']])
    plus=[c(p,'v13-d-curve') for p in PROFILES]
    extra=f"曲がる探索は5家庭で計{sum_int(plus,'curve_searches')}件、成立{sum_int(plus,'curve_plans')}件、協力者の実歩行{sum_int(plus,'curve_walked')}件、本人の通常歩行完了{sum_int(plus,'assisted_owner_normals')}件だった。"
    text.extend(['## 曲がる道譲りの追加効果',extra,
        'DとD＋曲がる道譲りは、各家庭で足、体格、乱数、次の行動時刻を含む開幕署名が一致した。A〜Dの追加の曲がる探索は全件0。D＋曲がる道譲りでは計画、協力者が実際に歩いた事例、本人の通常歩行完了を別々に数えた。',
        table(['条件','前後半とも D→D＋曲がる','通常歩行回数 D→D＋曲がる','曲がる探索','計画成立','協力者の実歩行','本人の通常歩行完了'],curves),
        '### 同じ時間刻みで続けた場合',
        '実時間の観測に加え、各版の記録済み開幕から同じ移動モデルを1/30秒×18,000回進めた。各欄は「通常歩行回数／前半・後半とも歩いた人数」。照合対象は全員の要求、選択、実歩行、終了状態と乱数。会話・通知を含む通し観測の集計とは分けた。',
        table(['条件',*[TITLES[m] for m in POLICIES[2:]],'D対D＋曲がるの全行動','D＋曲がる 探索／成立／協力者移動／本人完了'],fixed),
        '### 時間刻みを固定しても残る個体差',
        'A→B、B→Cは同じ足で地形のみを変更し、C→Dは同じ地形で開幕席の保護処理を加えた。D→D＋曲がるは同じ地形と足。増減は本人が完了した通常歩行回数。不成立が新たに180秒を超えた人を家庭別に示す。',
        table(['条件','比較','回数増','回数減','前後半歩行を失う','新たに180秒超の住民','全状態と実行'],sensitivity),
        'V12で記録済みの375px・390pxの安全な曲がる歩行と短い退路の記録を維持した。[V12本人別の実測と再現](../home-mobility-v12/FAIRNESS.md)',
        '## 足元とタッチ',
        table(['版','開幕到着/実入力','終了時到着/実入力','開幕4px以内','終了時4px以内','同一表示差替え変位','歩行区間外の変位','速度違反','ドラッグで安全外','ドラッグ中すり抜け'],drag),
        'ドラッグは実生活への途中介入を避けるため、各家庭のスナップショットを復元し28人それぞれに最初のネイティブタッチを送った。世話を含む保存状態の復帰を別の通常画面で試した。Linux Chromeのモバイルビューポートで収録。iPhone Safari実機での連続再生、指での操作、発熱は未検証。',
        '## 原簿',
        '個体別CSVに前後半、総距離、経路成立率、最長不成立、復帰率、支援、ドラッグ、各足の方向数を収録した。家庭別JSONは公式ZIPのSHA-256、GitHub Actionsの実行ID・コミット・artifact ID、固定時間のSHA-256を含む。V11・V12は8家庭すべてを残し、上の直接比較は両版の同じ5条件を用いた。',
        '[個体別CSV](forest-residents.csv) ／ [家庭・公式照合・足の座標](forest-summary.json) ／ [同じ足で周囲が動いて退路が開閉した記録](forest-peer-changes.csv) ／ [実時間の曲がる道譲り](forest-curve-handoffs.json)'])
    if (folder/'forest-first.json').exists():
        guarded = {c(p,m)['projection_sources']['home-visible-ground-navigation-v13.mjs'] for p in PROFILES for m in POLICIES[3:]}
        assert len(guarded)==1
        final_run={homes[p,m]['receipt']['run'] for p in PROFILES for m in POLICIES[3:]}
        assert len(final_run)==1
        actual_commit={homes[p,m]['receipt']['commit'] for p in PROFILES for m in POLICIES[3:]}
        assert len(actual_commit)==1
        earlier=json.loads((folder/'forest-first.json').read_bytes())['homes']
        originals={(h['profile'],h['policy']):h for h in earlier}
        changed=[]
        for m in POLICIES[3:]:
            old=[originals[p,m]['cell'] for p in PROFILES]
            new=[c(p,m) for p in PROFILES]
            changed.append([TITLES[m],f"{sum_int(old,'both_halves')}→{sum_int(new,'both_halves')}",
                f"{sum_int(old,'walking_legs')}→{sum_int(new,'walking_legs')}",
                f"{sum_int(old,'blocked_above_180')}→{sum_int(new,'blocked_above_180')}"])
        text.extend(['## 原画との追加照合で除外した初回案',
            '初回案が通行可能としていた区間に、原画の障害物を横切る例が見つかった。上のB・C・D・D＋曲がるは原画の追加制限後に改めて10分以上観測した値。Aは元の地形を用いるため、最終ビルドと実行時の各ソースを照合して初回と同一の5家庭を使用した。計45件の固有のV13連続観測がある。',
            f"修正後の20家庭で実際に読み込んだ歩行判定のSHA-256は `{next(iter(guarded))}`。測定コミットは `{next(iter(actual_commit))}`。[最終の連続試験](https://github.com/Naoto214/naotocchi/actions/runs/{next(iter(final_run))})",
            table(['候補','前後半とも・初回→修正後','通常歩行・初回→修正後','180秒超不成立・初回→修正後'],changed),
            '[初回25家庭とその公式ZIP照合情報](forest-first.json)'])
    (folder/'forest-report.md').write_text('\n\n'.join(text)+'\n')


if __name__=='__main__':
    report(Path(sys.argv[1]))
