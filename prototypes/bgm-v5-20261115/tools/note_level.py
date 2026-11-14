"""1音ごとの 聴感上の 大きさ（目安）を 測る: 音源ライブラリで その 音を 単独に 描き、耳の 感度に 近い 重み（K 特性 相当の 高域 持ち上げ ＋ 低域 カット）を
かけた RMS（dB）。打鍵・撥弦は 立ち上がり 0.35 秒、持続音は 発音中（最大 0.6 秒）を 測る。"""
import sys, pathlib, functools, numpy as np
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / 'bgm-v2-20261112' / 'tools'))
import library as L
from scipy.signal import butter, sosfilt
SR = L.SR
_k = np.concatenate([butter(2, 60, fs=SR, btype='highpass', output='sos'),
                     # K 特性の 高域 シェルフ（+4 dB @ 2 kHz 付近から）
                     __import__('render_v2').biquad('highshelf', 1700, 4.0, .7)])
@functools.lru_cache(maxsize=None)
def unit_level(inst, midi, layer, dur_bucket):
    lib = _lib()
    x = lib.note(inst, midi, dur_bucket, 1.0, layer).astype(np.float64).mean(1)
    kind = L.SPEC.get(inst, {}).get('kind', 'struck') if inst != 'guitar' else 'struck'
    w = .35 if kind != 'sustain' else min(.6, max(.15, dur_bucket))
    y = sosfilt(_k, x)[: int(w * SR)]
    return 20 * np.log10(np.sqrt((y ** 2).mean()) + 1e-12)
_L = None
def _lib():
    global _L
    if _L is None: _L = L.Library()
    return _L
def level(e):
    """vel を 含めた 1音の 大きさ（dB）。round robin の 影響を 避ける ため 同じ 条件の 代表音で 測る。"""
    db = round(min(e.get('hold', e['dur']), 2.0) * 4) / 4 or .25
    lib = _lib(); lib.rr.clear()
    return 20 * np.log10(max(e['vel'], 1e-9)) + unit_level(e['instrument'], int(e['midi']), int(e.get('layer', 1)), db)
