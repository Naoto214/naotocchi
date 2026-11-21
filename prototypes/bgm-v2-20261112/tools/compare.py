"""V1 と V2 の 比較測定（全32曲）。iPhone スピーカー近似は「300 Hz 以下と 10 kHz 以上が ほぼ 出ない 小型スピーカー」を
帯域通過フィルターで まねた もので、実機の 測定モデルでは ない。
出力: compare.json と、表（VALIDATION.md 用）"""
import json, pathlib, subprocess, sys, numpy as np
from scipy.signal import butter, sosfilt
ROOT = pathlib.Path(__file__).resolve().parents[1]; V1 = ROOT.parent / 'bgm-master32-v1'; SR = 44100
sys.path.insert(0, str(ROOT / 'tools')); import render_v2 as R
def load(p):
    b = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(b, np.float32).reshape(-1, 2).astype(np.float64)
PHONE = butter(4, [320, 9000], fs=SR, btype='bandpass', output='sos')
def phone(x):
    """小型スピーカー近似で、明瞭さに 効く 1.5〜5 kHz が 鳴っている 帯域全体に 占める 割合（dB）"""
    m = sosfilt(PHONE, x.mean(1)); n = 1 << 14; w = np.hanning(n); acc = 0
    for i in range(0, len(m) - n, n): acc = acc + np.abs(np.fft.rfft(m[i:i + n] * w)) ** 2
    f = np.fft.rfftfreq(n, 1 / SR); return round(float(10 * np.log10(acc[(f >= 1500) & (f < 5000)].sum() / acc[f > 300].sum())), 1)
cat = json.loads((V1 / 'catalog.json').read_text())['tracks']; out = []
for t in cat:
    a = load(V1 / t['master']); b = load(ROOT / 'audio' / f"{t['id']}.flac"); r = json.loads((ROOT / 'receipts' / f"{t['id']}.json").read_text())
    ba, bb = R.band_levels(a), R.band_levels(b)
    side = lambda x: round(float(10 * np.log10((((x[:, 0] - x[:, 1]) / 2) ** 2).mean() / (((x[:, 0] + x[:, 1]) / 2) ** 2).mean() + 1e-20)), 1)
    out.append({'id': t['id'], 'title': t['title'], 'v1': {**ba, 'sideToMidDb': side(a), 'phoneClarityDb': phone(a)}, 'v2': {**bb, 'sideToMidDb': side(b), 'phoneClarityDb': phone(b)}, 'v2LUFS': r['integratedLUFS'], 'v2TruePeak': r['truePeakDbtp'], 'v2MonoLossDb': r['monoLossDb']})
(ROOT / 'compare.json').write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n')
print('| 曲 | 3〜6 kHz V1→V2 | 6〜12 kHz V1→V2 | 重心 Hz V1→V2 | 小型スピーカー明瞭度 V1→V2 | 左右の広がり V1→V2 | V2 LUFS | V2 TP | モノラル差 |')
print('|---|---|---|---|---|---|---|---|---|')
for o in out:
    a, b = o['v1'], o['v2']
    print(f"| {o['title']}（{o['id']}） | {a['pres3k_6k']} → {b['pres3k_6k']} | {a['air6k_12k']} → {b['air6k_12k']} | {a['centroidHz']} → {b['centroidHz']} | {a['phoneClarityDb']} → {b['phoneClarityDb']} | {a['sideToMidDb']} → {b['sideToMidDb']} | {o['v2LUFS']} | {o['v2TruePeak']} | {o['v2MonoLossDb']} |")
