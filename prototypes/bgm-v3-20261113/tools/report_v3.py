"""VALIDATION.md を 作る（receipts と ping_attrib の 結果から）。リポジトリの prototypes/ で 実行。"""
import json, subprocess, sys
T = 'bgm-v3-20261113/tools/ping_attrib.py'
S = json.load(open('bgm-v3-20261113/scores-v3.json')); ids = [s['id'] for s in S]
def pa(adir, sc): return json.loads(subprocess.run([sys.executable, T, adir, sc, *ids, '--json'], capture_output=True, text=True, check=True).stdout.strip().splitlines()[-1])
p2 = pa('bgm-v2-20261112/audio', 'bgm-v2-20261112/scores-v2.json'); p3 = pa('bgm-v3-20261113/audio', 'bgm-v3-20261113/scores-v3.json')
rows = []; tot2 = tot3 = 0; hh2 = hh3 = 0
for s in S:
    i = s['id']; a = json.load(open(f'bgm-v2-20261112/receipts/{i}.json')); b = json.load(open(f'bgm-v3-20261113/receipts/{i}.json'))
    d2, d3 = p2[i].get('glock', 0), p3[i].get('glock', 0); h2 = p2[i].get('harp', 0) + p2[i].get('marimba', 0); h3 = p3[i].get('harp', 0) + p3[i].get('marimba', 0)
    tot2 += d2; tot3 += d3
    if s['family'] == 'home3': hh2 += h2; hh3 += h3
    rows.append(f"| {i} | {s['title']} | {len(s.get('removed', []))} | {d2} → {d3} | {h2} → {h3} | {a['bands']['pres3k_6k']} → {b['bands']['pres3k_6k']} | {a['bands']['air6k_12k']} → {b['bands']['air6k_12k']} | {b['integratedLUFS']} | {b['truePeakDbtp']} | {b['clippedSamples']} | {b['monoLossDb']} | {b['aacFlacCorrelation']} | {'OK' if not b['problems'] else b['problems']} |")
hr = sum(len(s['removed']) for s in S if s['family'] == 'home3')
md = f"""# BGM VERSION 3 — 検証記録

## 楽譜（`tools/verify_v3.py --audio`）

- 32曲・曲ID・曲名・テンポ・拍子・小節数・反復・ループ指定: V1 と 同じ
- 主旋律 3,158音: 音高・開始時刻・長さ・本数が V1 と 完全一致。MIDI の 主旋律トラックも 一致
- 伴奏・打楽器: V1 の 全音が V3 に 残る（ギターの 和音 313音は 最大 28 ms の ずらし）か、理由つきで 削除（500音: ホーム {hr}音・28曲 {500 - hr}音。ハープ・マリンバ・グロッケンの 単発音 だけ）
- 配置表 50行の 曲が すべて ある。V1・V2 の 原盤（AAC・FLAC）の ハッシュは 変わって いない
- 32曲 すべての receipt と 音源の ハッシュが 一致し、自動点検の 問題 なし

## 音（receipts と `tools/ping_attrib.py`）

- 「単発グロッケン」: 旋律の ない 瞬間に 目立って 立ち上がった グロッケンの 回数（2〜8 kHz が 直前 0.3 秒より 10 dB 以上 跳ねた 瞬間を、楽譜の 音に 結びつけた）。**32曲 合計 {tot2} → {tot3}**
- 「ハープ・マリンバ」: 同じく ハープ・マリンバ。ホーム4曲では 単発音（「チン」の 正体）で **{hh2} → {hh3}**。28曲で 残る 数は 伴奏として 続く 分散和音（音楽的な 役割が ある 音）
- 単発の 音が 旋律と 同時に 鳴る 場合は「旋律」と 数える ため、上の 回数は 削除した 音の 数より 少ない。削除した 音そのものの 数は「削除音」の 列
- pres / air: 3〜6 kHz（明瞭さ）・6〜12 kHz（金属的な 響き・録音の サー音）の 全体比（dB）
- LUFS は V1 と 同じ 用途別の 目標。true peak・クリップ・モノラル再生（mono, dB）・AAC と FLAC の 一致・ループの つなぎ目は receipt の 自動点検

| ID | 曲名 | 削除音 | 単発グロッケン V2→V3 | ハープ・マリンバ V2→V3 | pres V2→V3 | air V2→V3 | LUFS | TP dBTP | クリップ | mono dB | AAC/FLAC | 点検 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
""" + "\n".join(rows) + """

## 分かって いる こと・限界

- 自動の 測定は 目安。「チン」「キン」が 聞こえなく なったか、温かく 自然に 聞こえるかは 本人の 試聴で 確かめる（iPhone Safari の 比較ページ）。
- V2 で 単発の グロッケンと 高域の 持ち上げに 明るさを 頼って いた 曲（poyo-1・explore-1・kisetsu・var-poyo-clear・var-poyo-chapter）は 少し 暗く なった。
  3.8 kHz の なめらかな 補いを 最大 +5 dB に して いる。こもって 聞こえる 場合は 次の 調整候補。
- ギターは 自作の 物理モデル（V2 と 同じ）。自然さは 試聴で 確かめる。
- 第1段階の ホーム4曲は 3〜6 kHz の 補い 上限 +2.5 dB で 完成・保存（再生成して いない）。
"""
open('bgm-v3-20261113/VALIDATION.md', 'w').write(md)
print('glock', tot2, '→', tot3, ' home harp/marimba', hh2, '→', hh3)
