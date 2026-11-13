"""目立つ 高音の 立ち上がりを 楽譜の 音に 結びつけて 数える（「チン」「キン」の 点検）。

2〜8 kHz の 5 ms ごとの 強さが、直前 0.3 秒の 中央値より 10 dB 以上 跳ね上がり、かつ 曲の 中で 聞こえる 大きさ
（その 帯域の 上位 5% から 25 dB 以内）の 瞬間を「目立つ 立ち上がり」と する。その 瞬間（-30〜+150 ms）に
鳴り始めた 音を 楽譜から 探し、
  * melody   … 主旋律（または 旋律の 重ね）の 音（必要な 音）
  * 楽器名   … 主旋律の ない 瞬間に 立ち上がった 伴奏・装飾・打楽器の 音
に 分けて 数える。主旋律と 関係の ない 単発の 高音（ハープ・グロッケン・マリンバ など）が どれだけ 残って いるかの 目安。
自動の 目安で あり、聴感の 良し悪しを 保証する ものでは ない。
使い方: python ping_attrib.py <audio-dir> <scores.json> id …
"""
import sys, json, collections, numpy as np, soundfile as sf
from scipy.signal import butter, sosfiltfilt
from scipy.ndimage import median_filter

def onsets(path):
    x, sr = sf.read(path); m = x.mean(1); hop = int(sr * .005)
    y = sosfiltfilt(butter(4, [2000, 8000], 'bandpass', fs=sr, output='sos'), m); n = len(y) // hop
    e = 10 * np.log10((y[:n * hop] ** 2).reshape(n, hop).mean(1) + 1e-14)
    prev = np.concatenate([np.full(60, e[:60].mean()), e])
    base = median_filter(prev, size=61, origin=30)[:n]          # 直前 0.3 秒の 中央値
    jump = e - base; loud = e >= np.percentile(e, 95) - 25
    idx = np.where((jump >= 10) & loud)[0]; out = []; last = -99
    for i in idx:
        if i - last > 16: out.append((i * .005, float(jump[i])))
        last = i
    return out

def attribute(sid, adir, scores):
    s = scores[sid]; ev = s['events']; per = s['period'] if s['loop'] else None
    c = collections.Counter(); ex = []
    for t, j in onsets(f'{adir}/{sid}.flac'):
        near = [e for e in ev if -0.03 <= ((t - e['t']) % per if per else t - e['t']) <= .15 or (per and -0.03 <= t - e['t'] - per <= .15)]
        if any(e['role'] in ('melody', 'doubling') for e in near): c['melody'] += 1; continue
        if not near: c['(楽譜に 音なし)'] += 1; continue
        top = max(near, key=lambda e: e['midi'] if e['role'] != 'percussion' else -1)
        c[top['instrument']] += 1
        ex.append((round(t, 2), top['instrument'], top['midi'], round(j, 1)))
    return c, ex

if __name__ == '__main__':
    adir, scores = sys.argv[1], {s['id']: s for s in json.load(open(sys.argv[2]))}
    res = {}
    for sid in sys.argv[3:]:
        c, ex = attribute(sid, adir, scores); res[sid] = dict(c)
        print(f'{sid:18s}', dict(c.most_common()), flush=True)
    if '--json' in sys.argv: print(json.dumps(res, ensure_ascii=False))
