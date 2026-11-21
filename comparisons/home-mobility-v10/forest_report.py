"""Render the verified forest cohort in the owner comparison report."""
import argparse
import csv
from pathlib import Path

ARMS={'v9':'V9 従来','v10':'V10 従来','v9-seats':'V9 2体配置案','v10-reference':'V10・V9と同じ2体配置','v10-seats':'V10 退路を保護する配置案'}
NAMES={'pet:dog':'主人公の犬','companion:tanuki':'タヌキ','companion:panda':'パンダ','companion:box':'箱'}

def read(path):
    with path.open() as f:return list(csv.DictReader(f))

def md(headers,rows):
    fmt=lambda row:'| '+' | '.join(str(x) for x in row)+' |'
    return '\n'.join([fmt(headers),fmt(['---']*len(headers)),*(fmt(r) for r in rows)])

def render(folder, output, run, controls=None, pilot=None, all_evidence=None, extra_run=None):
    c=read(folder/'forest-cells.csv');r=read(folder/'forest-residents.csv');pairs=read(folder/'forest-pairs.csv')
    assert len(c)==26 and len(r)==728 and len({(x['arm'],x['width'],x['seed'],x['order'],x['key']) for x in r})==728
    published=[t for t in c if t['width']=='390' and t['order']=='0'];answer=[]
    for arm in ['v10','v10-reference','v10-seats']:
        first=sorted([t for t in published if t['arm']==arm],key=lambda i:int(i['seed']))
        s='、'.join(f"乱数{t['seed']}で{t['first_walkers']}/28体が通常歩行を完了し、そのうち{t['repeat_walkers']}体が2回以上完了" for t in first)
        answer.append(ARMS[arm]+'は'+s+'。')
    out=['# 森28体の継続歩行',*answer,
         '実際のホームを昼・秋・晴れ、28体、サイズB、DPR 2、縦792 CSS pxで開き、同じ配置・乱数の組ごとに独立したLinux Chromeを使った。全26条件でモデル時計と実時間の双方が600秒を超えるまで、1回も画面を閉じずに再生した。下の比較は先頭600モデル秒でそろえた。',
         '## 390pxの従来配置と2体配置案',
         md(['乱数','版・配置','実時間 / モデル秒','通常歩行者','2回以上','前半・後半とも通常歩行','最長の連続拒否（本人の一歩まで）'],
            [[t['seed'],ARMS[t['arm']],f"{float(t['wall_s']):.1f} / {float(t['model_s']):.1f}",t['first_walkers'],t['repeat_walkers'],t['walkers_in_both_halves'],f"{float(t['longest_step_refusal_s']):.1f}秒（{t['longest_refusal_actor']}）"] for t in published]),
         'V10の同一2体配置は、V9のコウモリ12px・柴犬4pxの比較案を開始地点まで一致させて、経路探索だけを比較する対照。退路を保護するV10配置案は、適用前の退路を失う配置を却下する。配置を変更した案の採用には本人の判断が必要。',
         '## 犬、タヌキ、パンダ、箱',
         'V9で記録された犬の連続拒否は、174.9097から559.7604モデル秒までの384.851秒。この前に27.472、26.196、10.958 CSS pxの3脚を完了した。559.7604秒に自律歩行を開始し、559.8603秒に5.181 CSS px進んで本人の元の目標に4.989 CSS px近づいた。ゲーム上の退避フラグはfalseで、この試験の8px基準には届かなかった。150.4773秒に始まった3.000 CSS pxの退避とは別の脚。下表は新しい10分観測での通常脚数と、最初の通常歩行後、次の本人の一歩または経路を要求しない活動までの最長連続拒否秒数を示す。通常歩行0回なら、その後の秒数は空欄。',
         md(['乱数','版・配置',*[name+' 回 / 秒' for name in NAMES.values()]],
            [[t['seed'],ARMS[t['arm']],*[t[k.split(':')[-1]+'_normal']+' / '+(str(round(float(t[k.split(':')[-1]+'_longest_post_first_s']),1)) if t[k.split(':')[-1]+'_longest_post_first_s'] else '—') for k in NAMES]] for t in published]),
         '## 幅・住民順と個体ごとの指操作',
         '並べ替え条件では、使い捨てセーブの仲間26体の順を乱数937でシャッフルしてから、ゲームに実際にロードした。主人公と恋人の役割は同じ。各条件の開幕と600秒後に、その条件の全28体の姿勢を別のホームへ復元して本人ごとに1回ずつドラッグを送った。本人のモデルに指示が届いた数と経路終点に到着した数を分けて表示する。',
         md(['幅','乱数','仲間順','版・配置','通常1回 / 2回以上','前半・後半とも','開幕の指示受理 / 到着','長時間後の指示受理 / 到着'],
           [[t['width'],t['seed'],'標準' if t['order']=='0' else '変更',ARMS[t['arm']],t['first_walkers']+' / '+t['repeat_walkers'],t['walkers_in_both_halves'],t['opening_issued']+' / '+t['opening_arrived'],t['aged_issued']+' / '+t['aged_arrived']] for t in c]),
         '## 成立率、復帰、意図された待機',
         '通常歩行は、本人の最初の目標に0.75 CSS pxを超えて近づき、正味8 CSS px以上進んで自律経路の終点に到着した脚。道を譲る歩行や退避のタグを持つ歩行は除外した。1回・2回・前後半の両方の3指標は別々に判定した。',
         '経路成立率の分母は住民が実際に発行した自律要求。拒否区間の開始はネイティブ探索の不成立。次の本人の一歩、次の本人の成立経路、または次の通常歩行の終点を別々に数えた。いずれも座る・休む・見回す・向きを変える活動へ移った時点で、その連続拒否区間を閉じる。歩行枠が埋まって4活動を選んだ場合も含む。会話、病気、睡眠などでモデル時計が停止した実時間は経路拒否に加えていない。ネイティブ時計が30実秒以上動かず、応答が必要な質問・延期ボタンが画面に出た場合のみ同一の手順で実タップした。発症時の薬や通常の清掃・給餌もV9とV10で同条件。各ゲートの時間と行った世話の回数は条件別CSVに残した。',
         '各個体のCSVには失敗区間が本人の一歩で終わった件数、自発・枠待ちの活動で終わった件数、観測末に未解決の件数を併記した。step_recovery_fraction は本人の一歩で終了した件数 / 全開始区間。strict_normal_recoveries は通常移動で終了した件数。peer_change_retries は、近傍の足やヘルパーの利用可能性が変化したためネイティブモデルが実際に再試行した回数。道譲り後の継続経路の再開は別欄に記録した。',
         '[全728条件の個体別記録](evidence/forest-residents.csv)・[26再生の集計](evidence/forest-cells.csv)・[全員の3・4・5・6・8・12・18・24px退路と配置間の比較](evidence/forest-pairs.csv)',
         '## 保存・復帰と安全性',
         '各再生の終了時にゲームが試験用の保存領域へ書き込んだデータを、新しいホームのネイティブローダーに渡した。住民の並び・恋人・地域を照合し、比較用再配置をせずにホームを動かした。この検証とは別に、経路の途中の足・元の目標・乱数を保存した試験用チェックポイントから個体ごとの指操作を実行した。',
         '全26セルで実測した復帰後の本人歩行開始は合計'+str(sum(int(t['restore_own_starts']) for t in c))+'回。歩行脚の速度上限を超えた記録は'+str(sum(int(t['speed_exceedances']) for t in c))+'件。脚以外で観測した足の差は'+str(sum(int(t['between_legs_shifts']) for t in c))+'件、累計'+str(round(sum(float(t['cumulative_shift_css']) for t in c),3))+' CSS px、最大'+str(max(float(t['max_shift_css']) for t in c))+' CSS px。座標差の原因が記録されていないものは歩行距離に加えなかった。320px・乱数214のパンダで従来配置のV9が22.595 CSS px、V10が22.742 CSS px。個々の幅・配置での復帰と位置差は集計CSVに収録した。 [座標差が生じた住民と記録区間](evidence/forest-foot-shifts.csv)',
         '各セルは同一乱数につき1回の実時間再生。ホストのフレーム間隔や世話・会話のタイミングで後続経路は分岐する。既往例の厳密な再現を比較するには、同じ状態の個別再生とこの自然再生を併用する。',
         (f'[今回のV10観測と生の数値]({run})・[同じブラウザー、資産、初期状態を照合したV9基準]({controls})' if controls else f'[固定コミットでの全26観測と生の数値]({run})')]
    if pilot:
        pc=read(pilot);important=[t for t in pc if t['arm']=='v10-reference' and t['width']=='390' and t['order']=='0']
        out+=['## 最初のV10候補', '最初の候補の終点は独立して保存した。V9と同じ2体配置での通常歩行者数・2回以上歩いた人数は'+ '、'.join(t['seed']+'で'+t['first_walkers']+'体・'+t['repeat_walkers']+'体' for t in important)+'。乱数937ではタヌキが521.553モデル秒連続して拒否された。最新候補の結果とは別の試行。']
    tracked=read(all_evidence/'forest-cells.csv') if all_evidence else c
    v10=[t for t in tracked if t['arm'].startswith('v10')]
    summary=[]
    for before,after in [('v9','v10'),('v9-seats','v10-reference')]:
        later=[t for t in tracked if t['arm']==after]
        earlier=[next(a for a in tracked if a['arm']==before and (a['width'],a['seed'],a['order'])==(b['width'],b['seed'],b['order'])) for b in later]
        assert all(a['initial_sha256']==b['initial_sha256'] and a['browser']==b['browser'] for a,b in zip(earlier,later))
        pair=lambda k:str(sum(int(t[k]) for t in earlier))+' → '+str(sum(int(t[k]) for t in later))
        summary.append([ARMS[before]+' → '+ARMS[after],len(later)*28,pair('first_walkers'),pair('repeat_walkers'),pair('walkers_in_both_halves'),pair('aged_arrived'),sum(int(t['reopened_retries']) for t in later)])
    place=out.index('## 犬、タヌキ、パンダ、箱')
    out[place:place]=['## 同一の初期状態に限定した版間比較',md(['組','住民条件数','通常1回以上','2回以上','前後半とも','長時間後の指到着','最終V10の追加再試行回数'],summary),
        '従来配置6条件では、長期拒否用に追加した分岐は1回も発火しなかった。この組の総歩行者数の増減を追加再試行の効果に帰属させることはできない。条件ごとにV9・V10の足位置、表示原画、住民順、行動期限、初期乱数、ブラウザー版を照合した。']
    retry_count=sum(int(t['reopened_retries']) for t in v10)
    if retry_count:
        immediate=sum(int(t['reopened_accepted']) for t in v10);subsequent=sum(int(t['reopened_followed_normal']) for t in v10)
        path='evidence/forest-all/forest-reopen-events.csv' if all_evidence else 'evidence/forest-reopen-events.csv'
        out.insert(out.index('## 保存・復帰と安全性'),'長期拒否後に元の目標方向が開き、最終V10に追加した再試行を実際に発行した回数は'+str(retry_count)+'回。その場で経路が成立したのは'+str(immediate)+'回。元と同じ目標を選んだまま、次の通常の行動選択または12秒までに経路が受理され、600秒以内に8px以上の通常歩行を完了したものは'+str(subsequent)+'回。 [発生した再試行と到着の個別照合]('+path+')')
    if all_evidence:
        all_cells=read(all_evidence/'forest-cells.csv')
        for n,paragraph in enumerate(out):
            if paragraph.startswith('実際のホームを'):
                out[n]=paragraph.replace('全26条件で','当初の26条件と、同じV9配置を調べる追加4条件の合計30条件で')
            if paragraph.startswith('全26セルで実測した'):
                total_distance=sum(float(t['cumulative_shift_css']) for t in all_cells)
                out[n]='全30セルで実際にセーブを読み戻した後に、すべてのホームで自律歩行が始まった（合計'+str(sum(int(t['restore_own_starts']) for t in all_cells))+'回）。コミットされた歩行脚の速度上限超過は'+str(sum(int(t['speed_exceedances']) for t in all_cells))+'件。脚の間などで観測した原因未分類の足位置差は'+str(sum(int(t['between_legs_shifts']) for t in all_cells))+'件、累計'+str(round(total_distance,3))+' CSS px、最大'+str(max(float(t['max_shift_css']) for t in all_cells))+' CSS px。320px・乱数214のパンダで従来配置のV9が22.595 CSS px、V10が22.742 CSS px。これらの座標差は移動距離から除外した。 [位置差の発生区間と対象住民](evidence/forest-all/forest-foot-shifts.csv)'

        assert len(all_cells)==30
        extra=[t for t in all_cells if t['arm']=='v10-reference' and not (t['width']=='390' and t['order']=='0')]
        comparison=[]
        for t in extra:
            before=next(a for a in all_cells if (a['width'],a['seed'],a['order'],a['arm'])==(t['width'],t['seed'],t['order'],'v9-seats'))
            assert before['initial_sha256']==t['initial_sha256'] and before['browser']==t['browser']
            pair=lambda k:before[k]+' → '+t[k]
            comparison.append([t['width'],t['seed'],'標準' if t['order']=='0' else '変更',pair('first_walkers'),pair('repeat_walkers'),pair('walkers_in_both_halves'),pair('longest_step_refusal_s'),pair('aged_arrived')])
        pos=out.index('## 成立率、復帰、意図された待機')
        out[pos:pos]=['## V9の2体配置をそのまま使う追加4条件',
            '狭いホーム・広いホーム・仲間順を変更したホームでも、V9とV10の開始時点の28体の足、体格、原画、乱数と行動期限を照合した。V9の12対照は先行観測の実測値。標準順390px以外では、その幅・住民順で実際にV9配置処理が返した開始位置を使った。変更された個体と退路は配置の検査記録に示した。 [配置の検査](SEATS.md)追加4条件も実時間とモデル時間の双方で600秒以上の連続再生、開幕・終点の各28ドラッグ、保存・復帰を検証した。',
            md(['幅','乱数','仲間順','通常歩行者 V9→V10','2回以上','前後半とも','最長連続拒否 秒','長時間後の指到着'],comparison),
            f'[全30セルの集計](evidence/forest-all/forest-cells.csv)・[全840件の住民記録](evidence/forest-all/forest-residents.csv)・[追加4セルの生の数値]({extra_run})']
    out+=['## 同じ入口からの独立した追加観測',
        '別ホストのLinux Chromiumで、390px・乱数937・V9の同一2体配置をもう一度再生した。V9は709.343実秒 / 601.461モデル秒、最終V10は783.913実秒 / 602.779モデル秒。通常歩行を1回以上・2回以上・前後半とも完了した人数はV9が27・26・20体、最終V10が19・15・11体。最終V10の犬は6回、タヌキは1回、パンダと箱は0回。近傍が変化して長期拒否向けの追加再試行に至った回数は0。どの版もこの同一乱数から一意の長時間結果を再現する保証はなく、Actionsの結果とは別に記録した。',
        '長時間後の独立入力では、全住民の足と目標を復元した後、新たな自律要求を止めて12.35モデル秒だけ追跡する。最終V10の初回フックは終点の長期拒否履歴マップを保存しなかった。手動指示では本人の履歴を消し、自律停止中は追加再試行が履歴を読む前に戻ることをソースで確認した。602.779秒の追加観測で保存した19件の履歴を復元した場合と省いた場合の実ドラッグを、犬と最も古い2件のパンダ・しっぽのおおいきつねにそれぞれ送ると、受理、終点の足、ステップ数、安全判定がすべて一致した。別途、この実セーブに戻した操作用ホームでも28件すべて本人に指示が届き、22件が経路終点に到着した。']
    output.write_text('\n\n'.join(out)+'\n')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--evidence',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--run',required=True);p.add_argument('--controls');p.add_argument('--pilot',type=Path);p.add_argument('--all-evidence',type=Path);p.add_argument('--extra-run');a=p.parse_args();render(a.evidence,a.output,a.run,a.controls,a.pilot,a.all_evidence,a.extra_run)
