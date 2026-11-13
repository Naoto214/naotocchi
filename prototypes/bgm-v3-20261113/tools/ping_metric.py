"""「チン」「キン」の 量を 数える（V2 と V3 を 同じ 物差しで 比べる）。

金属音が 響く 帯域（6〜12 kHz）の 5 ms ごとの 強さを、前後 1.5 秒の 中央値と 比べ、
  * spikes: 中央値より 12 dB 以上 突出し、かつ 曲の 大きい 部分から 45 dB 以内（聞こえる 大きさ）の 立ち上がりの 回数（0.1 秒 以内は 1回）
  * maxJumpDb: 最大の 突出（dB）
  * hiOverMidDb: 同じ 瞬間の 中域（300〜3000 Hz）に 対して 高域が 最も 強く 出た 量（金属音らしさ）
  * airPeakDb: 6〜12 kHz の 瞬間の 強さ（上位 0.1%）が 曲の 大きい 部分（全帯域 上位 5%）に 対して どれだけか
自動の 物差しで あり、聴感の 良し悪しを 保証する ものでは ない。
使い方: python ping_metric.py <v2-audio-dir> <v3-audio-dir> id …   （v3 が なければ v2 だけ）
"""
import sys, json, pathlib, numpy as np, soundfile as sf
from scipy.signal import butter, sosfiltfilt
from scipy.ndimage import median_filter

def measure(path):
    x, sr = sf.read(path); m = x.mean(1)
    hop = int(sr * .005)
    def env(lo, hi):
        y = sosfiltfilt(butter(4, [lo, hi], 'bandpass', fs=sr, output='sos'), m); n = len(y) // hop
        return 10 * np.log10((y[:n * hop] ** 2).reshape(n, hop).mean(1) + 1e-14)
    n = len(m) // hop
    full = 10 * np.log10((m[:n * hop] ** 2).reshape(n, hop).mean(1) + 1e-14)
    h, mid = env(6000, 12000), env(300, 3000)
    med = median_filter(h, size=601, mode='wrap')
    jump = h - med
    audible = h >= np.percentile(full, 95) - 45      # 曲の 大きい 部分から 45 dB 以内（実際に 聞こえる 大きさ）
    on = np.where((jump >= 12) & audible)[0]; spikes = 0; last = -99
    for i in on:
        if i - last > 20: spikes += 1
        last = i
    loud = mid > np.percentile(mid, 20)
    return {'spikes': int(spikes), 'maxJumpDb': round(float(jump[audible].max() if audible.any() else 0), 1),
            'p999JumpDb': round(float(np.percentile(jump, 99.9)), 1),
            'hiOverMidDb': round(float(np.percentile((h - mid)[loud], 99.9)), 1),
            'airPeakDb': round(float(np.percentile(h, 99.9) - np.percentile(full, 95)), 1)}

if __name__ == '__main__':
    a, b = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]); out = {}
    for i in sys.argv[3:]:
        r = {'v2': measure(a / f'{i}.flac')}
        if (b / f'{i}.flac').exists(): r['v3'] = measure(b / f'{i}.flac')
        out[i] = r
        v3 = r.get('v3', {})
        print(f"{i:18s} spikes {r['v2']['spikes']:4d} → {v3.get('spikes', '-'):>4}   maxJump {r['v2']['maxJumpDb']:5.1f} → {v3.get('maxJumpDb', '-'):>5}   p99.9 {r['v2']['p999JumpDb']:5.1f} → {v3.get('p999JumpDb', '-'):>5}   hi/mid {r['v2']['hiOverMidDb']:6.1f} → {v3.get('hiOverMidDb', '-'):>6}   airPeak {r['v2']['airPeakDb']:6.1f} → {v3.get('airPeakDb', '-'):>6}", flush=True)
    pm = (b / '..' / 'ping-metrics.json').resolve()
    old = json.loads(pm.read_text()) if pm.exists() else {}
    old.update(out); pm.write_text(json.dumps(old, ensure_ascii=False, indent=1) + '\n')
