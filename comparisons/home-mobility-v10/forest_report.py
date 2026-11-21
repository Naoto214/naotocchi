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

def render(folder, output, run):
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
         'V9で記録された犬の連続拒否は、174.9097から559.7604モデル秒までの384.851秒。この前に27.472、26.196、10.958 CSS pxの3脚を完了した。連続拒否を終えたのは5.181 CSS pxの退避。下表は新しい10分観測での通常脚数と、最初の通常歩行後、次の本人の一歩または経路を要求しない活動までの最長連続拒否秒数を示す。通常歩行0回なら、その後の秒数は空欄。',
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
         '[全728条件の個体別記録](evidence/forest-residents.csv)・[26再生の集計](evidence/forest-cells.csv)・[全員の3・8・16px退路と配置間の比較](evidence/forest-pairs.csv)',
         '## 保存・復帰と安全性',
         '各再生の終了時にゲームが試験用の保存領域へ書き込んだデータを、新しいホームのネイティブローダーに渡した。住民の並び・恋人・地域を照合し、比較用再配置をせずにホームを動かした。この検証とは別に、経路の途中の足・元の目標・乱数を保存した試験用チェックポイントから個体ごとの指操作を実行した。',
         '全26セルで実測した復帰後の本人歩行開始は合計'+str(sum(int(t['restore_own_starts']) for t in c))+'回。歩行脚の速度上限を超えた記録は'+str(sum(int(t['speed_exceedances']) for t in c))+'件。脚以外で観測した足の差は'+str(sum(int(t['between_legs_shifts']) for t in c))+'件、最大'+str(max(float(t['max_shift_css']) for t in c))+' CSS px。座標差の原因が記録されていないものは歩行距離に加えなかった。個々の幅・配置での復帰と位置差は集計CSVに収録した。',
         '各セルは同一乱数につき1回の実時間再生。ホストのフレーム間隔や世話・会話のタイミングで後続経路は分岐する。既往例の厳密な再現を比較するには、同じ状態の個別再生とこの自然再生を併用する。',
         f'[固定コミットでの全26観測と生の数値]({run})']
    output.write_text('\n\n'.join(out)+'\n')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--evidence',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--run',required=True);a=p.parse_args();render(a.evidence,a.output,a.run)
