"""音の つながり（ぶつ切り）の 目安: 旋律の 音と 次の 音の あいだで 音量が どれだけ 落ちるか（dB）。

各 旋律音の 立ち上がり 直後 0.15 秒の 最大値と、次の 旋律音の 直前 0.25 秒（その 音の 区間の 後半）の 最小値の 差を とる（50 ms ごと、全帯域）。
値が 小さい ほど、音が 次の 音へ 途切れず に つながって いる。V3 と V4 を 同じ 物差しで 比べる。聴感を 保証する ものでは ない。
使い方: python legato_metric.py <scores.json> <audio-dirA> <audio-dirB> id …
"""
import sys, json, numpy as np, soundfile as sf
def dips(path, s):
    x, sr = sf.read(path); m = x.mean(1); hop = int(sr * .05); n = len(m) // hop
    e = 10 * np.log10((m[:n * hop] ** 2).reshape(n, hop).mean(1) + 1e-14)
    mel = sorted(ev['t'] for ev in s['events'] if ev['role'] == 'melody'); out = []
    for a, b in zip(mel, mel[1:]):
        if b - a < .3: continue
        i0 = int(a / .05); i1 = min(n, int((a + .15) / .05) + 1); j1 = int(b / .05); j0 = max(i1, int((b - .25) / .05))
        if j1 <= j0 or i1 > n: continue
        out.append(e[i0:i1].max() - e[j0:j1].min())
    return np.array(out)
if __name__ == '__main__':
    sc = {s['id']: s for s in json.load(open(sys.argv[1]))}; a, b = sys.argv[2], sys.argv[3]
    for i in sys.argv[4:]:
        da, db = dips(f'{a}/{i}.flac', sc[i]), dips(f'{b}/{i}.flac', sc[i])
        print(f'{i:18s} 音の あいだの 落ちこみ 中央値 {np.median(da):5.1f} → {np.median(db):5.1f} dB   上位10% {np.percentile(da, 90):5.1f} → {np.percentile(db, 90):5.1f} dB')
