"""VALIDATION.md を 作る（V4 の receipts・削除の 記録・音の つながりの 目安から）。リポジトリの prototypes/ で 実行。"""
import json, sys, collections, pathlib
sys.path.insert(0, 'bgm-v4-20261114/tools')
import legato_metric as LM
import numpy as np
S = json.load(open('bgm-v4-20261114/scores-v4.json'))
rows = []; totals = collections.Counter()
def cat(reason):
    if 'ギター' in reason: return 'guitar'
    if 'シャン' in reason: return 'shaker'
    if '打楽器' in reason: return 'perc'
    return 'decor'
for s in S:
    i = s['id']; b = json.load(open(f'bgm-v4-20261114/receipts/{i}.json')); a = json.load(open(f'bgm-v3-20261113/receipts/{i}.json'))
    c = collections.Counter(cat(e['reason']) for e in s['removed']); totals.update(c)
    pianoish = any(e['instrument'] in ('piano', 'harp') and e['role'] == 'melody' for e in s['events'])
    if pianoish and s['loop']:
        d3 = np.median(LM.dips(f'bgm-v3-20261113/audio/{i}.flac', s)); d4 = np.median(LM.dips(f'bgm-v4-20261114/audio/{i}.flac', s)); leg = f'{d3:.1f} → {d4:.1f}'
    else: leg = '—'
    rows.append(f"| {i} | {s['title']} | {c['guitar']} | {c['shaker']} | {c['perc']} | {c['decor']} | {sum(1 for e in s['events'] if 'hold' in e)} | {leg} | {b['integratedLUFS']} | {b['truePeakDbtp']} | {b['clippedSamples']} | {b['monoLossDb']} | {b['aacFlacCorrelation']} | {a['bands']['pres3k_6k']} → {b['bands']['pres3k_6k']} | {'OK' if not b['problems'] else b['problems']} |")
md = f"""# BGM VERSION 4 — 検証記録

## 楽譜（`tools/verify_v4.py --audio`）

- 32曲・曲ID・曲名・テンポ・拍子・小節数・反復・ループ指定: V1 と 同じ
- 主旋律 3,158音: 音高・開始時刻・譜面上の 長さ・本数が V1 と 完全一致。MIDI の 主旋律トラックも 一致（MIDI は 譜面の 長さで 記録。ペダルの 長さは scores-v4.json の hold）
- 伴奏・打楽器: V1 の 全音が V4 に 残るか、理由つきで 削除。削除の 合計 {sum(totals.values())}音
  （ギターの 刻み {totals['guitar']}・シェイカー／シンバル {totals['shaker']}・静かな 曲の 打楽器 {totals['perc']}・単発の 装飾音（V3 から の 引き継ぎを 含む）{totals['decor']}）
- 配置表 50行の 曲が すべて ある。V1・V2・V3 の 原盤（AAC・FLAC）の ハッシュは 変わって いない
- 32曲 すべての receipt と 音源の ハッシュが 一致し、自動点検の 問題 なし

## 音

- ギターの 刻み・シェイカー・シンバルは 楽譜から 削除した ため、V4 の 32曲に 1音も ない（`scores-v4.json` で 確認できる）
- 「つながり」: 旋律の 音と 次の 音の あいだの 音量の 落ちこみ（中央値 dB、`tools/legato_metric.py`）。小さい ほど 途切れず つながる。ピアノ・ハープが 旋律の ループ曲だけ
- ペダル音: 和声が 変わる まで 響かせた ピアノ・ハープの 音の 数
- LUFS は V1 と 同じ 用途別の 目標。mono は モノラル再生での 変化（dB）。pres は 3〜6 kHz（明瞭さ）の 全体比（dB）

| ID | 曲名 | ギター 削除 | シェイカー等 削除 | 打楽器 削除 | 装飾音 削除 | ペダル音 | つながり V3→V4 | LUFS | TP dBTP | クリップ | mono dB | AAC/FLAC | pres V3→V4 | 点検 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
""" + "\n".join(rows) + """

## 分かって いる こと・限界

- 自動の 測定は 目安。美しさ・透明感・余韻が 実際に どう 聞こえるかは 本人の 試聴で 確かめる（iPhone Safari の 比較ページ）。
- アップライトピアノの 録音は 打鍵後 0.5 秒で −15〜−20 dB と 急に 減衰する 性質が ある。V4 は ペダル・ゆっくりした 離鍵・打鍵の 山の やわらげ（夜 7 dB）で 補ったが、
  さらに 長く 歌わせる には ピアノ音源 そのものの 変更（権利の 確かな 別の 録音）が 必要に なる。
- 伴奏を 下げた ぶん 左右に 広い 響きの 割合が 増えた 曲は、モノラルで 小さく ならない ように 左右の 差を 少し 狭めた（receipt の sideScale）。
- 第1段階の ホーム4曲は 左右の 差の 調整（sideScale）を 入れる 前に 完成・保存（mono −0.9 dB 以内で 問題 なし）。
"""
open('bgm-v4-20261114/VALIDATION.md', 'w').write(md)
print(dict(totals))
