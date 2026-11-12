"""なおとっち BGM VERSION 2 — 楽器ライブラリ（VSCO 2 Community Edition・CC0）と自作ギター合成。

* サンプルは固定コミット 440300901dfe9275fd84e0b7763af1f8443ae62e の VSCO 2 CE だけを使う（CC0-1.0）。
* V1 との主な違い: ステレオのまま読む・強弱レイヤー（dyn/v）とラウンドロビン（rr）を使う・
  楽器ごとの一律ローパスを掛けない・余韻は録音そのものを生かす。
* アコースティックギターは VSCO 2 CE に無いので、権利が明確な自作の物理モデル（拡張カープラス・ストロング法）で合成する。
"""
import hashlib, json, math, pathlib, re
from fractions import Fraction
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly, lfilter, butter, sosfilt

SR = 44100
ROOT = pathlib.Path(__file__).resolve().parents[1]
VSCO = pathlib.Path(__import__('os').environ.get('VSCO_DIR', '/home/user/sgossner/vsco-2-ce'))
VSCO_COMMIT = '440300901dfe9275fd84e0b7763af1f8443ae62e'
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
PIANO_MAP = {i: 21 + 2 * i for i in range(44)}; PIANO_MAP[44] = 108

def name_midi(s, offset):
    m = re.search(r'(?:^|_)([A-G])(#?)(-?\d)(?:_|\.)', s)
    n, sh, o = m.groups()
    return (int(o) + offset) * 12 + NOTE[n] + (1 if sh else 0)

# 楽器定義: (グロブ, 根音の求め方, 強弱レイヤーの求め方, 余韻の扱い)
#  kind: 'struck' = 打鍵・撥弦（録音の自然減衰を生かす）、'sustain' = 持続音（譜面の長さで止めて離す）
SPEC = {
    'piano':    dict(glob='Keys/Upright Piano/Player_dyn*_rr1_*.wav', root=lambda p: PIANO_MAP[int(p.stem[-3:])], layer=lambda p: int(p.stem[10]), kind='struck', release=.30, maxring=6.0),
    'harp':     dict(glob='Strings/Harp/KSHarp_*.wav', root=lambda p: name_midi(p.name, 1), layer=lambda p: 1, kind='struck', release=.9, maxring=5.0),
    'marimba':  dict(glob='Percussion/Marimba/*.wav', root=lambda p: name_midi(p.name, 2), layer=lambda p: 1, kind='struck', release=.5, maxring=2.5),
    'xylo':     dict(glob='Percussion/Xylo/*.wav', root=lambda p: name_midi(p.name, 2), layer=lambda p: 1, kind='struck', release=.4, maxring=1.6),
    'glock':    dict(glob='Percussion/Glock/*.wav', root=lambda p: name_midi(p.name, 2), layer=lambda p: 1, kind='struck', release=1.2, maxring=3.0),
    'woodbass': dict(glob='Strings/Solo Contrabass/Pizz/*.wav', root=lambda p: name_midi(p.name, 2), layer=lambda p: int(re.search(r'_v(\d)', p.name).group(1)), kind='struck', release=.35, maxring=2.2),
    'cellopizz':dict(glob='Strings/Cello Section/pizzT/*.wav', root=lambda p: name_midi(p.name, 2), layer=lambda p: int(re.search(r'_v(\d)', p.name).group(1)), kind='struck', release=.3, maxring=1.6),
    'clarinet': dict(glob='Woodwinds/Clarinet/susLong/*.wav', root=lambda p: name_midi(p.name, 2), layer=lambda p: int(re.search(r'_v(\d)', p.name).group(1)), kind='sustain', release=.16, attack=.018),
    'flute':    dict(glob='Woodwinds/Flute/susNV/*.wav', root=lambda p: name_midi(p.name, 2), layer=lambda p: int(re.search(r'_v(\d)', p.name).group(1)), kind='sustain', release=.16, attack=.022),
    'violins':  dict(glob='Strings/Violin Section/susVib/*.wav', root=lambda p: name_midi(p.name, 2), layer=lambda p: int(re.search(r'_v(\d)', p.name).group(1)), kind='sustain', release=.45, attack=.09),
    'violas':   dict(glob='Strings/Viola Section/susvib/*.wav', root=lambda p: name_midi(p.name, 2), layer=lambda p: int(re.search(r'_v(\d)', p.name).group(1)), kind='sustain', release=.45, attack=.09),
    'cellos':   dict(glob='Strings/Cello Section/susvib/*.wav', root=lambda p: name_midi(p.name, 2), layer=lambda p: int(re.search(r'_v(\d)', p.name).group(1)), kind='sustain', release=.45, attack=.07),
    'trumpet':  dict(glob='Brass/Trumpet/sus/*.wav', root=lambda p: name_midi(p.name, 2), layer=lambda p: int(re.search(r'_v(\d)', p.name).group(1)), kind='sustain', release=.18, attack=.02),
    'timpani':  dict(glob='Percussion/Timpani/Timpani2_Hit_*.wav', root=lambda p: 43, layer=lambda p: int(re.search(r'_v(\d)', p.name).group(1)), kind='hit', release=.9, maxring=3.0),
    'kick':     dict(glob='Percussion/BDrumNewhit_*.wav', root=lambda p: 36, layer=lambda p: int(re.search(r'_v(\d)', p.name).group(1)), kind='hit', release=.3, maxring=1.2),
    'snare':    dict(glob='Percussion/Snare2-taps_*.wav', root=lambda p: 38, layer=lambda p: int(re.search(r'_v(\d)', p.name).group(1)), kind='hit', release=.15, maxring=.6),
    'snarehit': dict(glob='Percussion/Snare2-HitSN_*.wav', root=lambda p: 38, layer=lambda p: int(re.search(r'_v(\d)', p.name).group(1)), kind='hit', release=.2, maxring=.9),
    'snareroll':dict(glob='Percussion/Snare2-rollSN_*.wav', root=lambda p: 38, layer=lambda p: int(re.search(r'_v(\d)', p.name).group(1)), kind='hit', release=.2, maxring=3.0),
    'shaker':   dict(glob='Percussion/Tamb1-Shake_*.wav', root=lambda p: 42, layer=lambda p: 1, kind='hit', release=.1, maxring=.5),
    'tamb':     dict(glob='Percussion/Tamb1-Hit_*.wav', root=lambda p: 54, layer=lambda p: int(re.search(r'_v(\d)', p.name).group(1)), kind='hit', release=.15, maxring=.8),
    'claves':   dict(glob='Percussion/Claves1_Hit_*.wav', root=lambda p: 75, layer=lambda p: int(re.search(r'_v(\d)', p.name).group(1)), kind='hit', release=.1, maxring=.4),
    'logdrum':  dict(glob='Percussion/LogDrumHi_*.wav', root=lambda p: 77, layer=lambda p: int(re.search(r'_v(\d)', p.name).group(1)), kind='hit', release=.15, maxring=.8),
    'triangle': dict(glob='Percussion/Triangle3-Hit_*.wav', root=lambda p: 81, layer=lambda p: int(re.search(r'_v(\d)', p.name).group(1)), kind='hit', release=1.0, maxring=3.0),
    'cymbal':   dict(glob='Percussion/susCymb1-hit_*.wav', root=lambda p: 49, layer=lambda p: {'pp': 1, 'mp': 2, 'f': 3, 'fff': 4}[re.search(r'hit_([a-z]+)_', p.name).group(1)], kind='hit', release=1.5, maxring=5.0),
    'sleigh':   dict(glob='Percussion/Sleighbells_Hit_*.wav', root=lambda p: 80, layer=lambda p: 1, kind='hit', release=.4, maxring=1.2),
}

def files_used():
    out = []
    for inst, s in SPEC.items():
        for p in sorted(VSCO.glob(s['glob'])):
            out.append(p)
    return out

def manifest():
    """全サンプルの 固定URL・SHA-256（音源本体は Git に入れず、この表で 復元・照合する）。"""
    files = []
    for p in files_used() + [VSCO / 'Readme.txt']:
        rel = p.relative_to(VSCO).as_posix()
        files.append({'path': rel, 'url': f'https://raw.githubusercontent.com/sgossner/VSCO-2-CE/{VSCO_COMMIT}/' + rel.replace(' ', '%20').replace('#', '%23'), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'bytes': p.stat().st_size})
    return {'source': 'VSCO 2 Community Edition', 'commit': VSCO_COMMIT, 'license': 'CC0-1.0', 'homepage': 'https://versilian-studios.com/vsco-community/', 'files': files}

class Library:
    def __init__(self):
        self.zones = {}   # inst -> list of (root, layer, [rr arrays])
        self.loaded = set()
        self.cache = {}
        self.rr = {}

    def load(self, inst):
        if inst in self.loaded or inst == 'guitar':
            return
        s = SPEC[inst]; groups = {}
        for p in sorted(VSCO.glob(s['glob'])):
            x, rate = sf.read(p, always_2d=True, dtype='float32')
            if x.shape[1] == 1: x = np.repeat(x, 2, 1)
            x = x[:, :2]
            if rate != SR: x = resample_poly(x, SR, rate, axis=0).astype(np.float32)
            # 立ち上がり前の 無音を 切る（2 ms 残す）
            a = np.abs(x).max(1); thr = a.max() * .01
            i = int(np.argmax(a > thr)); x = x[max(0, i - int(SR * .002)):]
            # 直流と 超低域の ゴロつきだけ 除く（楽器の 実音域より 十分 下）
            x = sosfilt(butter(2, 28, fs=SR, btype='highpass', output='sos'), x, axis=0).astype(np.float32)
            groups.setdefault((s['root'](p), s['layer'](p)), []).append(x)
        # 楽器 全体で 1つの 正規化（強弱レイヤー間の 自然な 音量差は 保つ）
        peak = max(float(np.abs(x).max()) for g in groups.values() for x in g)
        zones = [(r, l, [x / peak * .7 for x in g]) for (r, l), g in groups.items()]
        # 強弱レイヤーの 較正: レイヤーを 1段 上げるごとに 約 +2.5 dB に そろえる（明るさは 録音の まま 変わる）
        def rms(z):
            x = z[2][0][: int(SR * .35)]; return float(np.sqrt((x ** 2).mean()) + 1e-9)
        layers = sorted({l for _, l, _ in zones}); ref = {}
        for l in layers:
            ref[l] = float(np.median([rms(z) for z in zones if z[1] == l]))
        base = ref[layers[0]]
        gain = {l: (base * 10 ** (2.5 * i / 20)) / ref[l] for i, l in enumerate(layers)}
        self.zones[inst] = [(r, l, [x * gain[l] for x in g]) for r, l, g in zones]
        self.loaded.add(inst)

    def layers(self, inst):
        return sorted({l for _, l, _ in self.zones[inst]})

    def pick(self, inst, midi, layer):
        zs = self.zones[inst]
        avail = sorted({l for _, l, _ in zs})
        layer = min(avail, key=lambda l: abs(l - layer))
        cand = [z for z in zs if z[1] == layer]
        root, _, rrs = min(cand, key=lambda z: (abs(z[0] - midi), z[0] < midi))
        k = (inst, root, layer); i = self.rr.get(k, 0); self.rr[k] = i + 1
        return root, rrs[i % len(rrs)], i % len(rrs), layer

    def shifted(self, inst, root, layer, rri, src, semis, maxlen):
        key = (inst, root, layer, rri, semis)
        if key in self.cache:
            return self.cache[key]
        x = src[: int(maxlen * SR * max(1, 2 ** (semis / 12)) + 1)]
        if semis:
            fr = Fraction(2 ** (-semis / 12)).limit_denominator(1000)
            x = resample_poly(x, fr.numerator, fr.denominator, axis=0).astype(np.float32)
        self.cache[key] = x
        return x

    def note(self, inst, midi, dur, vel, layer):
        """1音を 描く。戻り値は ステレオ float32。"""
        if inst == 'guitar':
            return guitar(midi, dur, vel)
        self.load(inst); s = SPEC[inst]
        root, src, rri, layer = self.pick(inst, midi, layer)
        semis = 0 if s['kind'] == 'hit' else midi - root
        if s['kind'] == 'sustain':
            length = dur + s['release']
            x = self.shifted(inst, root, layer, rri, src, semis, length + .05)
            n = int(round(length * SR))
            if len(x) < n:  # 録音より 長い 音は、後半を クロスフェードで 折り返して 延ばす
                x = loop_extend(x, n)
            x = x[:n].copy()
            a = max(1, int(s.get('attack', .01) * SR)); x[:a] *= np.linspace(0, 1, a)[:, None] ** 1.5
            st = int(dur * SR); r = n - st
            if r > 0: x[st:] *= np.cos(np.linspace(0, np.pi / 2, r))[:, None] ** 2
        else:
            ring = s.get('maxring', 2.0)
            if s['kind'] == 'struck' and inst == 'piano':
                ring = min(ring, dur + s['release'])  # ピアノは 鍵を 離すと 止まる
            else:
                ring = max(ring if s['kind'] == 'hit' else min(ring, max(dur * 1.6 + s['release'], .6)), .1)
            x = self.shifted(inst, root, layer, rri, src, semis, ring + .05)
            n = min(len(x), int(round(ring * SR))); x = x[:n].copy()
            f = min(n, int(s['release'] * SR * .5))
            if f > 0: x[n - f:] *= np.cos(np.linspace(0, np.pi / 2, f))[:, None] ** 2
        return x * vel

def loop_extend(x, n):
    seg = x[int(len(x) * .35): int(len(x) * .85)]
    if len(seg) < SR * .3:
        return np.pad(x, ((0, n - len(x)), (0, 0)))
    out = x[: int(len(x) * .85)].copy(); xf = int(SR * .12)
    w = np.linspace(0, 1, xf)[:, None]
    while len(out) < n:
        nxt = seg.copy(); nxt[:xf] = nxt[:xf] * w + out[-xf:] * (1 - w)
        out = np.concatenate([out[:-xf], nxt])
    return out[:n]

# ---- 自作 ナイロン弦ギター（拡張カープラス・ストロング法） ----
_body = None
def body_ir():
    global _body
    if _body is None:
        t = np.arange(int(SR * .09)) / SR
        modes = [(98, .9, 55), (196, .7, 70), (285, .45, 90), (410, .35, 120), (560, .2, 160), (1100, .08, 260)]
        ir = np.zeros(len(t)); ir[0] = 1.0
        for f, a, d in modes: ir += a * .02 * np.sin(2 * np.pi * f * t) * np.exp(-t * d)
        _body = ir.astype(np.float64)
    return _body

def guitar(midi, dur, vel, seed=None):
    f = 440 * 2 ** ((midi - 69) / 12); P = SR / f
    ring = min(4.0, max(dur * 1.3 + .25, .5)); n = int(ring * SR)
    rng = np.random.default_rng(seed if seed is not None else (midi * 7919 + int(dur * 1000)) % 2**32)
    N = int(math.floor(P - .5 - .1)); d = P - .5 - N  # 遅延の 小数部は オールパスで
    c = (1 - d) / (1 + d)
    # 減衰: 低い 弦ほど 長く 鳴る（ナイロン弦らしく 高域は 早めに 落ちる）
    t60 = 3.2 * (110 / f) ** .35; g = 10 ** (-3 / (t60 * f))
    # 励振: 指で はじく 柔らかい ノイズ（強さで 明るさが 変わる）＋ はじく 位置の くし形フィルター
    exc = rng.uniform(-1, 1, N + 1)
    bright = .12 + .14 * min(1, vel / .08)  # ナイロン弦: 指の 腹で はじく やわらかい 音
    exc = lfilter([bright], [1, -(1 - bright)], exc)
    pp = max(1, int(N * .14)); exc[pp:] -= exc[:-pp] * .9
    x = np.zeros(n); x[:len(exc)] = exc
    # ループ: y = x*(1+c z^-1) / ((1+c z^-1) - g z^-N (c + z^-1)(.5 + .5 z^-1))
    den = np.zeros(N + 3); den[0] = 1; den[1] += c
    for k, v in ((N, .5 * c), (N + 1, .5 + .5 * c), (N + 2, .5)):
        den[k] -= g * v
    y = lfilter([1, c], den, x)
    # 離弦（譜面の 長さの あと 指で 止める）
    st = int(min(ring, dur + .12) * SR)
    if st < n: y[st:] *= np.exp(-np.linspace(0, 9, n - st))
    y = np.convolve(y, body_ir())[:n]
    # ナイロン弦の 倍音は 3 kHz 付近から 急に 弱く なる。高い 倍音ほど 早く 消える 性質は ループの 平均フィルターで、
    # 全体の 丸みは 出口の ローパスで つくる
    y = sosfilt(butter(2, [70, 2600], fs=SR, btype='bandpass', output='sos'), y)
    y = y + .8 * sosfilt(butter(2, [90, 320], fs=SR, btype='bandpass', output='sos'), y)  # 胴鳴り（低い 共鳴）
    # サンプル楽器（較正後の ハープ）と 同じ 尺度: 最初の 0.35 秒の RMS を そろえる
    y /= max(1e-9, float(np.sqrt((y[: int(SR * .35)] ** 2).mean())))
    y *= .09 * vel
    # 左右は 同じ 信号（時間差を つけると モノラル再生で 打ち消し合う ため）。広がりは 定位と 残響で つくる
    return np.stack([y, y], 1).astype(np.float32)
