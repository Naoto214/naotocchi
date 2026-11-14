"""VALIDATION.md を 作る（V5 の receipts・旋律の 音量の 測定・追加した 声部・音の つながり）。リポジトリの prototypes/ で 実行。"""
import json, sys
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfiltfilt
sys.path.insert(0, 'bgm-v4-20261114/tools')
import legato_metric as LM
S = json.load(open('bgm-v5-20261115/scores-v5.json'))
rows = []
for s in S:
    i = s['id']; b = json.load(open(f'bgm-v5-20261115/receipts/{i}.json')); v = s.get('v5', {}); ad = v.get('added') or {}
    leg = '—'
    if s['loop'] and any(e['instrument'] in ('piano', 'harp') and e['role'] == 'melody' for e in s['events']):
        leg = f"{np.median(LM.dips(f'bgm-v4-20261114/audio/{i}.flac', s)):.1f} → {np.median(LM.dips(f'bgm-v5-20261115/audio/{i}.flac', s)):.1f}"
    rows.append(f"| {i} | {s['title']} | {v.get('melodyLevelSdBefore', '—')} → {v.get('melodyLevelSdAfter', '—')} | {v.get('melodyLevelRangeBefore', '—')} → {v.get('melodyLevelRangeAfter', '—')} | {ad.get('counter', 0)} | {ad.get('response', 0)} | {ad.get('bassWalk', 0)} | {len(v.get('doublingDropped', []))} | {leg} | {b['integratedLUFS']} | {b['truePeakDbtp']} | {b['clippedSamples']} | {b['monoLossDb']} | {b['aacFlacCorrelation']} | {'OK' if not b['problems'] else b['problems']} |")
# いつもの にわ 36 秒
def seg(path, a, z):
    x, sr = sf.read(path); m = x.mean(1); y = sosfiltfilt(butter(4, [1000, 1100], 'bandpass', fs=sr, output='sos'), m)
    return 10 * np.log10((y[int(a * sr):int(z * sr)] ** 2).mean() + 1e-14)
d36 = {}
for v, d in (('V4', 'bgm-v4-20261114'), ('V5', 'bgm-v5-20261115')):
    p = f'{d}/audio/home-day.flac'; ref = seg(p, 34.0, 36.2); d36[v] = (seg(p, 36.30, 36.45) - ref, seg(p, 36.55, 36.90) - ref)
md = f"""# BGM VERSION 5 — 検証記録

## 楽譜（`tools/verify_v5.py --audio`）

- 32曲・曲ID・曲名・テンポ・拍子・小節数・反復・ループ指定: V1 と 同じ
- 主旋律 3,158音: 音高・開始時刻・譜面上の 長さ・本数が V1 と 完全一致。MIDI の 主旋律トラックも 一致（変えたのは 強さ（vel）だけ）
- 伴奏・打楽器: V1 の 全音が V5 に 残るか、V3・V4 で 理由つきで 削除した 音（2,134音）。V4 で 除いた ギターの 刻み・シェイカー・シンバル・単発グロッケン・静かな 曲の 打楽器は 再導入 なし
- 追加した 声部（対旋律 counter・応答 response・低音の 5度）は クラリネット・フルート・ビオラ・チェロ・ピアノ だけ。どれも その 時の 和音の 音で、旋律と 2度・長7度で 重ならない
- 配置表 50行の 曲が すべて ある。V1・V2・V3・V4 の 原盤（AAC・FLAC）の ハッシュは 変わって いない
- 32曲 すべての receipt と 音源の ハッシュが 一致し、自動点検の 問題 なし

## 「いつもの にわ」36秒付近

- 原因: 3周目の クラリネットの 重ねの C6（36.30 秒）。VSCO の クラリネットの 最高音の 録音が ほかの クラリネットの 音より 約 20 dB 大きく、打鍵の あとも ふくらんで「ファー」と のびて いた
- 修正: クラリネットの 重ねは A5（81）より 上を 鳴らさない（旋律は ピアノが 弾く）
- C6（1,000〜1,100 Hz）の 大きさ（34.0〜36.2 秒の 平均 比）: 打鍵直後 36.30〜36.45 秒 V4 {d36['V4'][0]:+.1f} dB → V5 {d36['V5'][0]:+.1f} dB、
  のびて いる 部分 36.55〜36.90 秒 **V4 {d36['V4'][1]:+.1f} dB → V5 {d36['V5'][1]:+.1f} dB**（V4 は 打鍵より ふくらみ、V5 は ピアノとして 自然に 消える）

## 旋律の 音量（`tools/note_level.py` で 1音ずつ 測った 聴感上の 大きさ）

- ばらつき: 主旋律の 音ごとの 大きさの 標準偏差（dB）。V4 → V5。V5 の 値には 意図して つけた 抑揚（4小節の 山なり・高い 音・拍の 頭・フレーズの 終わり）を 含む
- 幅: いちばん 大きい 音と 小さい 音の 差（dB）
- 対旋律・応答・低音: 追加した 音の 数（2周目 以降・静かな ループ曲 だけ）。重ね除外: 楽器の 苦しい 高音域の ため 外した 旋律の 重ね
- つながり: 旋律の 音と 次の 音の あいだの 音量の 落ちこみ（中央値 dB、V4 → V5、`../bgm-v4-20261114/tools/legato_metric.py`）

| ID | 曲名 | ばらつき dB | 幅 dB | 対旋律 | 応答 | 低音 | 重ね除外 | つながり | LUFS | TP dBTP | クリップ | mono dB | AAC/FLAC | 点検 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
""" + "\n".join(rows) + """

## 分かって いる こと・限界

- 1音ずつの 大きさは 音源ライブラリで その 音を 単独に 描いて 測った 目安。伴奏に よる マスキングは 伴奏の 音量バランス（V4）で 下げて あり、個々の 音では 補正して いない。
- 自動の 測定は 目安。自然な 強弱・変化・美しさが 実際に どう 聞こえるかは 本人の 試聴で 確かめる（iPhone Safari の 比較ページ）。
- 追加した 内声・応答は 和音の 音から 自動で 選んで いる。音楽的に 合わない 箇所が あれば、曲と 秒数を 教えて ほしい。
"""
open('bgm-v5-20261115/VALIDATION.md', 'w').write(md)
print('ok', d36)
