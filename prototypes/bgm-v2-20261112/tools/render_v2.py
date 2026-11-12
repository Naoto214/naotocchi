"""なおとっち BGM VERSION 2 — 描画・ミックス・マスタリング・書き出し・検証。

使い方（リポジトリの ルートで）:
  python prototypes/bgm-v2-20261112/tools/render_v2.py home-morning poyo-1 …   # 指定した 曲だけ
  python prototypes/bgm-v2-20261112/tools/render_v2.py --group 1                # 8曲ずつの グループ

* 完成した 曲は receipts/<id>.json（FLAC・AAC・MIDI の SHA-256 と 検証値）を 最後に 書く。
  receipt が あり ファイルの ハッシュが 一致する 曲は 作り直さない（中断からの 再開用）。
* ループ曲は、はみ出した 音の 余韻と 残響を 曲の 頭へ 折りかえすので、つなぎ目が 切れない。
"""
import json, math, pathlib, subprocess, sys, hashlib, time
import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt, resample_poly, lfilter
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import library as L

SR = L.SR
ROOT = pathlib.Path(__file__).resolve().parents[1]
AUDIO, MIDI, REC = ROOT / 'audio', ROOT / 'midi', ROOT / 'receipts'
GROUPS = None  # catalog の 順に 8曲ずつ

# ---------- フィルター（RBJ の biquad） ----------
def biquad(kind, f, gain_db=0.0, q=.707):
    A = 10 ** (gain_db / 40); w = 2 * math.pi * f / SR; cw, sw = math.cos(w), math.sin(w); al = sw / (2 * q)
    if kind == 'peak':
        b = [1 + al * A, -2 * cw, 1 - al * A]; a = [1 + al / A, -2 * cw, 1 - al / A]
    elif kind == 'lowshelf':
        s = 2 * math.sqrt(A) * al
        b = [A * ((A + 1) - (A - 1) * cw + s), 2 * A * ((A - 1) - (A + 1) * cw), A * ((A + 1) - (A - 1) * cw - s)]
        a = [(A + 1) + (A - 1) * cw + s, -2 * ((A - 1) + (A + 1) * cw), (A + 1) + (A - 1) * cw - s]
    elif kind == 'highshelf':
        s = 2 * math.sqrt(A) * al
        b = [A * ((A + 1) + (A - 1) * cw + s), -2 * A * ((A - 1) + (A + 1) * cw), A * ((A + 1) + (A - 1) * cw - s)]
        a = [(A + 1) - (A - 1) * cw + s, 2 * ((A - 1) - (A + 1) * cw), (A + 1) - (A - 1) * cw - s]
    b = np.array(b) / a[0]; a = np.array(a) / a[0]
    return np.concatenate([b, a])[None, :]

def eq(x, bands, loop):
    """bands: [(kind, f, gain, q)]。ループ曲は 頭に 末尾を 付けて 過渡を 消してから 切りもどす。"""
    if not bands: return x
    sos = np.concatenate([biquad(*b) if b[0] not in ('hp', 'lp') else butter(2, b[1], fs=SR, btype='highpass' if b[0] == 'hp' else 'lowpass', output='sos') for b in bands])
    if loop:
        pre = min(len(x), SR * 2)
        y = sosfilt(sos, np.concatenate([x[-pre:], x]), axis=0)[pre:]
    else:
        y = sosfilt(sos, x, axis=0)
    return y

# ---------- 残響（自作の ステレオ インパルス応答。左右は 独立した 乱数で、モノラルでも 打ち消し合いにくい 振幅） ----------
def room_ir(rt, seed=11):
    n = int(SR * min(4.5, rt * 1.4)); t = np.arange(n) / SR; rng = np.random.default_rng(seed)
    ir = np.zeros((n, 2))
    # 帯域ごとに 減衰を 変える（高い 音ほど 早く 消える＝自然な 空気の 吸収）
    for lo, hi, k in [(150, 600, 1.15), (600, 2500, 1.0), (2500, 6000, .75), (6000, 14000, .5)]:
        sos = butter(2, [lo, hi], fs=SR, btype='bandpass', output='sos')
        nz = sosfilt(sos, rng.standard_normal((n, 2)), axis=0)
        ir += nz * np.exp(-6.91 * t / (rt * k))[:, None] * (1 if hi < 6000 else .7)
    pre = int(SR * .018); ir = np.concatenate([np.zeros((pre, 2)), ir])[:n]
    fade = np.minimum(1, t / .04)[:, None]; ir *= fade  # 立ち上がりを なめらかに
    # 初期反射（左右で 時刻を ずらす）
    for d, g, side in [(.011, .55, 0), (.017, .5, 1), (.029, .38, 0), (.037, .34, 1), (.053, .25, 0), (.061, .22, 1)]:
        i = int(d * SR); ir[i, side] += g * .9; ir[i + 37, 1 - side] += g * .35
    ir /= np.sqrt((ir ** 2).sum() / 2)
    return ir

def convolve_loop(x, ir, loop):
    y = np.stack([fftconvolve(x[:, 0], ir[:, 0]) * .5 + fftconvolve(x[:, 1], ir[:, 0]) * .2,
                  fftconvolve(x[:, 1], ir[:, 1]) * .5 + fftconvolve(x[:, 0], ir[:, 1]) * .2], 1)
    n = len(x)
    if loop:
        out = y[:n].copy(); tail = y[n:]
        while len(tail):
            k = min(n, len(tail)); out[:k] += tail[:k]; tail = tail[k:]
        return out
    return y[:n]

# ---------- 定位 ----------
def place(buf, x, start, pan, width, loop):
    """ステレオ素材を 幅 width に 狭めてから pan の 位置へ（等パワー）。ループは 先頭へ 折りかえす。"""
    m = (x[:, 0] + x[:, 1]) * .5; s = (x[:, 0] - x[:, 1]) * .5 * width
    l, r = m + s, m - s
    a = (pan + 1) * math.pi / 4; gl, gr = math.cos(a) * math.sqrt(2), math.sin(a) * math.sqrt(2)
    y = np.stack([l * gl, r * gr], 1)
    n = len(buf)
    if loop:
        i = start % n
        while len(y):
            k = min(n - i, len(y)); buf[i:i + k] += y[:k]; y = y[k:]; i = 0
    elif start < n:
        k = min(len(y), n - start); buf[start:start + k] += y[:k]

def shell():
    t = np.arange(round(SR * .30)) / SR; rng = np.random.default_rng(534)
    x = sosfilt(butter(2, [1500, 5000], fs=SR, btype='bandpass', output='sos'), rng.normal(0, .3, len(t))) * np.exp(-t * 32)
    x += .15 * np.sin(2 * np.pi * (380 * t + 1800 * t * t)) * np.exp(-t * 18)
    return np.stack([x, x], 1).astype(np.float32)

# ---------- バス（役割）ごとの 音づくり ----------
BUS = {
 # role: (EQ, 残響の 送り倍率, 素材の 幅)
 'melody':        ([('hp', 90), ('peak', 3200, 1.5, .8)], .75, .5),
 'doubling':      ([('hp', 120)], 1.0, .6),
 'accompaniment': ([('hp', 110), ('peak', 320, -2.0, .9)], 1.0, .8),
 'bass':          ([('hp', 38), ('peak', 200, -1.0, 1.0)], .25, .3),
 'pad':           ([('hp', 150), ('peak', 400, -2.0, .9)], 1.35, 1.0),
 'sparkle':       ([('hp', 300)], 1.4, .9),
 'cadence':       ([('hp', 60)], 1.0, .8),
 'percussion':    ([('hp', 45), ('highshelf', 7000, -4.0, .7)], .5, .7),
}
def rms(x):
    """音の ある 部分だけの RMS（休みの 多い パートが 過大に 持ち上がらない ように）。"""
    e = (x ** 2).sum(1); k = max(1, len(e) // 2048); blk = e[: len(e) // k * k].reshape(-1, k).mean(1)
    act = blk[blk > blk.max() * 1e-3] if blk.max() > 0 else blk
    return float(np.sqrt(act.mean() + 1e-30))
# 主旋律に 対する 各パートの 目標（dB、鳴っている 部分の RMS）
BALANCE = {'doubling': -8, 'accompaniment': -4, 'bass': -6, 'pad': -13, 'sparkle': -15, 'percussion': -14, 'cadence': -3}
FAMILY_BALANCE = {
 'sleep': {'accompaniment': -6, 'bass': -9, 'pad': -15}, 'farewell': {'accompaniment': -6, 'bass': -8, 'pad': -14},
 'fishing': {'accompaniment': -5, 'bass': -8}, 'puzzle': {'accompaniment': -5, 'bass': -8, 'pad': -14},
 'race': {'percussion': -11}, 'quick': {'percussion': -12}, 'sports': {'percussion': -12}, 'action': {'percussion': -12}, 'card': {'percussion': -13},
 'flight': {'sparkle': -11, 'doubling': -10, 'pad': -12}, 'explore': {'pad': -11, 'sparkle': -14},
 'celebrate': {'sparkle': -13, 'doubling': -7}, 'hatch': {'percussion': -7, 'accompaniment': -6, 'doubling': -9, 'cadence': -2},
 'poyo': {'doubling': -9},
}
# 楽器ごとの 補正 EQ（録音の 性質に 合わせる。VSCO の アップライトピアノは 録音が 暗い ので 明瞭さを 補う）
INST_EQ = {
 'piano': [('peak', 3400, 4.0, .6), ('highshelf', 9000, 3.0, .7)],
 'woodbass': [('peak', 900, 1.5, 1.0)],
 'cellos': [('peak', 250, -1.5, .9)],
 'trumpet': [('peak', 2600, -1.0, 1.0)],
}
# V1 の 強さ（vel）から V2 の ミックスへの 換算（dB）。主旋律を 前に、伴奏は 後ろで 支える。
ROLE_DB = {'melody': 0, 'doubling': 0, 'accompaniment': 1.5, 'bass': 2.5, 'pad': 3.0, 'sparkle': 1.0, 'cadence': 1.0, 'percussion': 0}

def band_levels(x):
    m = x.mean(1); n = 1 << 15; w = np.hanning(n); acc = np.zeros(n // 2 + 1)
    for i in range(0, max(1, len(m) - n), n // 2): acc += np.abs(np.fft.rfft(m[i:i + n] * w, n)) ** 2
    f = np.fft.rfftfreq(n, 1 / SR); tot = acc[f > 40].sum() + 1e-20
    r = lambda a, b: 10 * np.log10(acc[(f >= a) & (f < b)].sum() / tot + 1e-12)
    return {'centroidHz': round(float((f * acc).sum() / (acc.sum() + 1e-20))), 'low40_250': round(r(40, 250), 1), 'lowmid250_800': round(r(250, 800), 1), 'mid800_3k': round(r(800, 3000), 1), 'pres3k_6k': round(r(3000, 6000), 1), 'air6k_12k': round(r(6000, 12000), 1), 'top12k_20k': round(r(12000, 20000), 1)}

# 目標の 帯域バランス（全体に 対する dB）。生楽器の 室内録音に 近い、明るすぎない 値。
TARGET = {'pres3k_6k': -20.5, 'air6k_12k': -27.0}

def tonal_correction(x, loop, family, used=(0.0, 0.0)):
    """帯域の 実測から、こもりを 取る 補正だけを 計算する（高域の 一律ブーストではなく、足りない 分だけ・上限つき）。"""
    b = band_levels(x); bands = []
    tgt = dict(TARGET)
    if family == 'home':
        tgt = {'pres3k_6k': -22.5, 'air6k_12k': -34.0}  # ピアノ中心の アレンジA: 6 kHz 以上は もともと 少ない（無理に 足すと 録音の ノイズが 出る）
    elif family in ('sleep', 'farewell', 'puzzle', 'fishing'):
        tgt = {'pres3k_6k': -22.5, 'air6k_12k': -30.0}  # 静かな 場面は 少し 控えめ
    if family in ('flight', 'celebrate', 'hatch'):
        tgt = {'pres3k_6k': -19.5, 'air6k_12k': -25.0}  # 煌びやかな 場面
    # 目標から ±1.5 dB（明瞭さ）／±2.5 dB（空気感）の 範囲内なら 触らない。外れた 分だけ、上限つきで 補う／抑える
    d1 = tgt['pres3k_6k'] - b['pres3k_6k']; d1 = 0 if abs(d1) <= 1.5 else d1 - math.copysign(1.5, d1)
    g1 = float(np.clip(d1, -6 - used[0], 6 - used[0]))  # 2回の 合計でも 上限を 超えない
    d2 = tgt['air6k_12k'] - b['air6k_12k'] - .6 * g1; d2 = 0 if abs(d2) <= 3 else d2 - math.copysign(3, d2)
    g2 = float(np.clip(d2, -5 - used[1], 5 - used[1]))
    if abs(g1) > .3: bands.append(('peak', 3800, round(g1, 1), .7))
    if abs(g2) > .3: bands.append(('highshelf', 8000, round(g2, 1), .7))
    if b['lowmid250_800'] > -2.5 and used == (0.0, 0.0): bands.append(('peak', 380, -1.5, .8))  # 中低域の もこもこを 少し 減らす（1回だけ）
    return eq(x, bands, loop), bands, b

def true_peak(x):
    y = resample_poly(x, 4, 1, axis=0)
    return 20 * math.log10(float(np.abs(y).max()) + 1e-12)

def limiter(x, ceiling_db, loop):
    """先読み つきの やわらかい リミッター（必要な ときだけ。音圧を 稼ぐ ためには 使わない）。"""
    c = 10 ** (ceiling_db / 20); a = np.abs(resample_poly(x, 4, 1, axis=0)).max(1).reshape(-1, 4).max(1)[: len(x)]
    need = np.minimum(1, c / np.maximum(a, 1e-9))
    if need.min() >= 1: return x, 0.0
    look = int(SR * .004); rel = int(SR * .08)
    from scipy.ndimage import minimum_filter1d
    g = minimum_filter1d(need, size=2 * look + 1, mode='wrap' if loop else 'nearest')
    g = lfilter([1 / rel] * 1, [1, -(1 - 1 / rel)], g[::-1])[::-1]  # 解放を なめらかに
    g = np.minimum(g, minimum_filter1d(need, size=2 * look + 1, mode='wrap' if loop else 'nearest'))
    return x * g[:, None], float(20 * math.log10(g.min()))

def loudness(path):
    s = subprocess.run(['ffmpeg', '-hide_banner', '-nostdin', '-i', str(path), '-af', 'loudnorm=I=-23:TP=-2:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True, check=True).stderr
    return json.loads(s[s.rfind('{'):])

def sha(p): return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()

def render(score, lib):
    t0 = time.time(); loop = score['loop']
    length = int(round((score['period'] if loop else score['duration']) * SR))
    buses = {}; rng = np.random.default_rng(int(hashlib.sha256(score['id'].encode()).hexdigest()[:8], 16))
    for e in score['events']:
        role = e['role'] if e['role'] in BUS else 'accompaniment'
        if e['instrument'] == 'shell':
            x = shell() * (e['vel'] / .09) * .5
        else:
            vel = e['vel'] * 10 ** (ROLE_DB[role] / 20)
            if role not in ('melody', 'doubling', 'cadence'): vel *= 1 + .05 * rng.standard_normal()  # 伴奏だけ 強さに わずかな ゆらぎ
            x = lib.note(e['instrument'], e['midi'], e['dur'], vel, e.get('layer', 1))
        jitter = 0 if role in ('melody', 'doubling', 'percussion', 'cadence') or e['instrument'] == 'shell' else int(rng.normal(0, .003) * SR)
        start = int(round(e['t'] * SR)) + jitter
        if start < 0 and not loop: start = 0
        b = buses.setdefault((role, e['instrument']), np.zeros((length, 2)))
        place(b, x.astype(np.float64), start, e.get('pan', 0), BUS[role][2] * (1.0 if score['family'] != 'home' else .9), loop)
    room = score['room']; ir = room_ir(room[0])
    # 楽器ごとの EQ と 役割ごとの EQ → 役割ごとに まとめる
    roles = {}
    for (role, inst), b in buses.items():
        b = eq(b, INST_EQ.get(inst, []) + BUS[role][0], loop)
        roles[role] = roles.get(role, 0) + b
    # 役割ごとの 音量バランス（主旋律を 基準に 目標の 差へ そろえる。ホーム4曲は アレンジAの 強さの まま）
    gains = {}
    if score['family'] != 'home' and 'melody' in roles:
        ref = rms(roles['melody']); tgt = dict(BALANCE); tgt.update(FAMILY_BALANCE.get(score['family'], {}))
        for role, b in roles.items():
            if role == 'melody': continue
            g = ref * 10 ** (tgt.get(role, -10) / 20) / max(rms(b), 1e-12)
            roles[role] = b * g; gains[role] = round(20 * math.log10(g), 1)
    dry = np.zeros((length, 2)); send = np.zeros((length, 2))
    for role, b in roles.items():
        dry += b; send += b * BUS[role][1]
    wet = convolve_loop(eq(send, [('hp', 180), ('peak', 350, -2, .9)], loop), ir, loop)
    mix = dry + wet * room[1]
    if not loop:
        n = min(int(.30 * SR), length); mix[-n:] *= np.cos(np.linspace(0, np.pi / 2, n))[:, None] ** 2
    mix, corr, before = tonal_correction(mix, loop, score['family'])
    used = (sum(c[2] for c in corr if c[1] == 3800), sum(c[2] for c in corr if c[1] == 8000))
    mix, corr2, _ = tonal_correction(mix, loop, score['family'], used)  # 2回目で 残りを 詰める（範囲内なら 何もしない）
    corr = corr + corr2
    # 音量: V1 と 同じ 目標 LUFS（用途別）。上げるのは 線形ゲインだけ。
    AUDIO.mkdir(exist_ok=True); MIDI.mkdir(exist_ok=True); REC.mkdir(exist_ok=True)
    tmp = AUDIO / (score['id'] + '.tmp.wav'); import soundfile as sf
    mix /= max(1e-9, np.abs(mix).max()) / .5
    sf.write(tmp, mix.astype(np.float32), SR, subtype='FLOAT')
    st = loudness(tmp); gain = 10 ** ((score['targetLUFS'] - float(st['input_i'])) / 20); mix *= gain
    mix, gr = limiter(mix, -1.3, loop)
    sf.write(tmp, mix.astype(np.float32), SR, subtype='FLOAT')
    out = {}
    for ext, args in [('flac', ['-c:a', 'flac', '-sample_fmt', 's32', '-bits_per_raw_sample', '24']),
                      ('m4a', ['-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-movie_timescale', str(SR)])]:
        p = AUDIO / f"{score['id']}.{ext}"
        subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', str(tmp), *args, str(p)], check=True); out[ext] = p
    tmp.unlink()
    (MIDI / f"{score['id']}.mid").write_bytes(midi_bytes(score))
    return verify(score, out, mix, {'roleGainsDb': gains, 'tonalCorrection': corr, 'bandsBeforeCorrection': before, 'limiterMaxGainReductionDb': round(gr, 2), 'renderSeconds': round(time.time() - t0, 1)})

def decode(p):
    b = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(p), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(b, np.float32).reshape(-1, 2).astype(np.float64)

def verify(score, out, mix, extra):
    loop = score['loop']; n = len(mix)
    fl = decode(out['flac']); aac = decode(out['m4a'])
    st = loudness(out['flac'])
    # AAC は 先頭の 遅延を 合わせて 比べる
    k = min(len(aac), n); lag = int(np.argmax(np.correlate(aac[:SR, 0], fl[:SR // 2, 0], 'valid'))) if len(aac) > SR else 0
    a = aac[lag: lag + n]; m = min(len(a), n)
    corr = float(np.corrcoef(a[:m].mean(1), fl[:m].mean(1))[0, 1])
    mono = (fl[:, 0] + fl[:, 1]) * .5
    monoLoss = float(10 * np.log10((mono ** 2).mean() / (((fl ** 2).sum(1) * .5).mean() + 1e-20) + 1e-20))
    side = float(10 * np.log10((((fl[:, 0] - fl[:, 1]) * .5) ** 2).mean() / ((mono ** 2).mean() + 1e-20) + 1e-20))
    jump = float(np.abs(fl[0] - fl[-1]).max()); typ = float(np.percentile(np.abs(np.diff(fl, axis=0)).max(1), 99.9))
    rec = {
        'id': score['id'], 'title': score['title'], 'family': score['family'], 'loop': loop, 'sampleRate': SR, 'frames': n, 'seconds': round(n / SR, 6),
        'flacFrames': len(fl), 'aacDecodedFrames': len(aac), 'integratedLUFS': float(st['input_i']), 'targetLUFS': score['targetLUFS'], 'truePeakDbtp': float(st['input_tp']),
        'samplePeakDbfs': round(20 * math.log10(np.abs(fl).max() + 1e-12), 2), 'clippedSamples': int((np.abs(fl) >= .9999).sum()),
        'monoLossDb': round(monoLoss, 2), 'sideToMidDb': round(side, 1), 'aacFlacCorrelation': round(corr, 4),
        'loopJoinJump': round(jump, 5), 'loopJoinTypicalStep999': round(typ, 5), 'bands': band_levels(fl),
        **extra,
        'flacSha256': sha(out['flac']), 'flacBytes': out['flac'].stat().st_size, 'aacSha256': sha(out['m4a']), 'aacBytes': out['m4a'].stat().st_size,
        'midiSha256': sha(MIDI / f"{score['id']}.mid"),
    }
    problems = []
    if len(fl) != n: problems.append('FLAC の 長さが 違う')
    if len(aac) < n: problems.append('AAC が 短い')
    if rec['truePeakDbtp'] > -1.0: problems.append('true peak が -1 dBTP を 超えた')
    if rec['clippedSamples']: problems.append('クリップ')
    if corr < .98: problems.append('AAC と FLAC の 相関が 低い')
    if abs(rec['integratedLUFS'] - score['targetLUFS']) > 1.0: problems.append('ラウドネスが 目標から 1 LU 以上 ずれた')
    if monoLoss < -1.5: problems.append('モノラルで 1.5 dB 以上 小さく なる')
    if loop and jump > max(typ * 1.5, .02): problems.append('ループの つなぎ目に 段差')
    rec['problems'] = problems
    return rec

# ---------- MIDI（V2 の 楽器割り当てを 記録。主旋律は チャンネル1） ----------
GM = {'piano': 0, 'harp': 46, 'marimba': 12, 'xylo': 13, 'glock': 9, 'woodbass': 32, 'cellopizz': 45, 'clarinet': 71, 'flute': 73, 'violins': 48, 'violas': 49, 'cellos': 42, 'trumpet': 56, 'guitar': 24, 'timpani': 47}
DRUM = {'kick': 36, 'snare': 38, 'snarehit': 38, 'snareroll': 38, 'shaker': 70, 'tamb': 54, 'claves': 75, 'logdrum': 77, 'triangle': 81, 'cymbal': 49, 'sleigh': 83, 'shell': 37}
def vlq(n):
    b = [n & 127]; n >>= 7
    while n: b.insert(0, (n & 127) | 128); n >>= 7
    return bytes(b)
def midi_bytes(score):
    import struct
    tpq = 960; tick = lambda s: round(s * score['bpm'] / 60 * tpq)
    tracks = [b'\0\xff\x51\x03' + round(60000000 / score['bpm']).to_bytes(3, 'big') + b'\0\xff\x58\x04' + bytes([score['meter'], 2, 24, 8]) + b'\0\xff\x2f\0']
    groups = {}
    for e in score['events']:
        key = 'melody' if e['role'] == 'melody' else ('drums' if e['instrument'] in DRUM else e['instrument'] + ':' + e['role'])
        groups.setdefault(key, []).append(e)
    chans = [c for c in range(16) if c != 9]; order = ['melody'] + sorted(k for k in groups if k not in ('melody', 'drums')) + (['drums'] if 'drums' in groups else [])
    for i, key in enumerate(order):
        ev = groups[key]; ch = 9 if key == 'drums' else chans[min(i, len(chans) - 1)]
        name = key.encode(); msgs = [(0, b'\xff\x03' + vlq(len(name)) + name)]
        if ch != 9: msgs.append((0, bytes([0xc0 + ch, GM.get(ev[0]['instrument'], 0)])))
        iv = {}
        for e in ev:
            note = DRUM.get(e['instrument'], e['midi']); s = tick(e['t']); t = s + max(1, tick(e['dur']))
            iv.setdefault(note, []).append((s, t, max(1, min(127, round(e['vel'] * 300)))))
        for note, items in iv.items():
            merged = []
            for s, t, v in sorted(items):
                if merged and s < merged[-1][1]: merged[-1] = (merged[-1][0], max(t, merged[-1][1]), max(v, merged[-1][2]))
                else: merged.append((s, t, v))
            for s, t, v in merged: msgs += [(s, bytes([0x90 + ch, note, v])), (t, bytes([0x80 + ch, note, 0]))]
        body = b''; last = 0
        for t, m in sorted(msgs, key=lambda a: (a[0], (a[1][0] & 0xf0) != 0x80)): body += vlq(t - last) + m; last = t
        tracks.append(body + b'\0\xff\x2f\0')
    out = b'MThd' + struct.pack('>IHHH', 6, 1, len(tracks), tpq)
    for t in tracks: out += b'MTrk' + struct.pack('>I', len(t)) + t
    return out

def receipt_ok(i):
    p = REC / f'{i}.json'
    if not p.exists(): return False
    r = json.loads(p.read_text())
    try:
        return (r['flacSha256'] == sha(AUDIO / f'{i}.flac') and r['aacSha256'] == sha(AUDIO / f'{i}.m4a') and r['midiSha256'] == sha(MIDI / f'{i}.mid') and not r['problems'])
    except FileNotFoundError:
        return False

if __name__ == '__main__':
    scores = json.loads((ROOT / 'scores-v2.json').read_text()); ids = [s['id'] for s in scores]
    args = sys.argv[1:]; force = '--force' in args; args = [a for a in args if a != '--force']
    if args and args[0] == '--group':
        g = int(args[1]); want = ids[(g - 1) * 8: g * 8]
    else:
        want = args or ids
    lib = L.Library()
    for s in scores:
        if s['id'] not in want: continue
        if not force and receipt_ok(s['id']):
            print(f"skip {s['id']} (receipt と ハッシュが 一致)", flush=True); continue
        r = render(s, lib)
        (REC / f"{s['id']}.json").write_text(json.dumps(r, ensure_ascii=False, indent=1) + '\n')
        b = r['bands']
        print(f"{s['id']:18s} {r['seconds']:7.2f}s LUFS {r['integratedLUFS']:6.1f} TP {r['truePeakDbtp']:5.1f} mono {r['monoLossDb']:5.2f} side {r['sideToMidDb']:5.1f} corr {r['aacFlacCorrelation']:.3f} cent {b['centroidHz']:5d} pres {b['pres3k_6k']:6.1f} air {b['air6k_12k']:6.1f} eq {r['tonalCorrection']} {r['renderSeconds']}s {'NG ' + ','.join(r['problems']) if r['problems'] else 'OK'}", flush=True)
