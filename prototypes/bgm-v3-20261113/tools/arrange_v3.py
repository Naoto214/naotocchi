"""なおとっち BGM VERSION 3 — 編曲（V2 の 楽譜 → V3）。

目的: 「チン」「キン」と 鳴る 不要な 高音を なくし、音数を 整理して 生楽器の 自然な 掛け合いに する。
守る もの: 主旋律（role=melody）の 音高・開始時刻・長さ・本数（V1 と 完全一致。verify_v3.py で 確認）、
         曲ID・曲名・テンポ・拍子・小節数・反復・長さ・ループ指定、伴奏の 音高と リズム（ギターの 和音の ずらし 30 ms 以内を 除く）。
変える もの: 楽器・強さ・強弱レイヤー・定位、そして 音楽的な 役割の ない 単発の 装飾音の 削除（削除した 音は removed に 理由つきで 記録）。

調査で 分かった 原因（ping_scan.py・stem_probe.py）:
  * ホーム4曲: 伴奏の ハープ（昼は マリンバ）の 単発音（1曲 11〜30音、音高 73〜81）。全体の 高域エネルギーの 13〜58% を 占め、
    鳴った 瞬間だけ 高域が まわりより 最大 約 35 dB 突出する。V2 の 補正（3.8 kHz +4 dB・8 kHz 以上 +5 dB、ピアノ用 +4 dB/+3 dB）が 重なって 目立った。
  * 28曲: V1 の ベルを 引きついだ 単発の グロッケン（role=sparkle、1曲 2〜30音）。活発な 曲の 2周目に 重なる 木琴。
"""
import json, pathlib, math, hashlib
import numpy as np
ROOT = pathlib.Path(__file__).resolve().parents[1]
V2 = ROOT.parent / 'bgm-v2-20261112'

HOME = {
 # 朝: 爽やかで 軽やか。ギターの 和音と ウッドベース、2周目は フルートが 旋律に そっと 寄りそう
 'home-morning': dict(chords=['guitar', 'guitar'], bass='woodbass', dbl={1: ('flute', .14)}, mel_layer=3, room=(1.6, .17), tone='ピアノの 旋律に ナイロンギターの 和音と ウッドベース。2周目は フルートが そっと 寄りそう（爽やかで 軽やか）'),
 # 昼: 明るく 親しみやすく 疲れない。1周目は ピアノの 和音、2周目は ギターに 受けわたし、3周目は 2つで 支え、クラリネットが 寄りそう
 'home-day': dict(chords=['piano', 'guitar', 'guitar+piano'], bass='woodbass', dbl={1: ('clarinet', .13), 2: ('flute', .11)}, mel_layer=3, room=(1.5, .16), tone='ピアノの 旋律。和音は ピアノ → ギター → 両方と 受けわたし、ウッドベース。2周目は クラリネット、3周目は フルートが 寄りそう（明るく 疲れない）'),
 # 夕: 穏やかで 少し 感傷的。1周目は ピアノ、2周目は ギターが 和音を 受けつぎ、チェロが 低音を 長く 支え、クラリネットが 寄りそう
 'home-evening': dict(chords=['piano', 'guitar'], bass='cellos', dbl={1: ('clarinet', .14)}, mel_layer=3, room=(1.8, .19), tone='ピアノの 旋律。和音は ピアノ → ギター、チェロの やわらかい 低音。2周目は クラリネットが 寄りそう（穏やかで 少し 感傷的）'),
 # 夜: 静かで 温かい。ピアノ だけ（伴奏は 弱い タッチ）。単発の 高音は 削除
 'home-night': dict(chords=['piano'], bass='piano', dbl={}, mel_layer=3, room=(1.9, .19), tone='弱い タッチの ピアノ だけ（静かで 温かい 夜の 空気）'),
}
QUIET = {'sleep', 'farewell', 'puzzle', 'love', 'memory', 'fishing', 'board', 'explore', 'poyo'}

def seeded(sid):
    return np.random.default_rng(int(hashlib.sha256(('v3:' + sid).encode()).hexdigest()[:8], 16))

def shape_melody(s, rng):
    """人が 弾く ような 強弱（音高・時刻・長さは 変えない）: 4小節の 山なり ＋ 拍の 強弱 ＋ ごく 小さい ゆらぎ。"""
    bar = 60 / s['bpm'] * s['meter']; beat = 60 / s['bpm']; t0 = s.get('leadIn', 0)
    for e in s['events']:
        if e['role'] != 'melody': continue
        t = e['t'] - t0; p = (t % (4 * bar)) / (4 * bar)
        arch = 1 + .07 * math.sin(math.pi * p)
        inbar = t % bar
        acc = 1.05 if inbar < .02 or inbar > bar - .02 else (1.0 if abs((inbar / beat) - round(inbar / beat)) < .04 else .95)
        e['vel'] = e['vel'] * arch * acc * (1 + .025 * rng.standard_normal())

def strum(evs, inst):
    """同じ 時刻の 和音を 低い 音から 高い 音へ 少し ずらす（指で はじく ギターの 和音）。最大 30 ms。"""
    by = {}
    for e in evs: by.setdefault(round(e['t'], 4), []).append(e)
    for t, g in by.items():
        g.sort(key=lambda e: e['midi'])
        for k, e in enumerate(g): e['t'] = e['t'] + min(.028, .009 * k)

def home(s):
    cfg = HOME[s['id']]; rng = seeded(s['id']); per = s['period'] / s['repeats']
    out, removed = [], []
    ev = s['events']
    # 和音の まとまり（同じ 時刻の ピアノ伴奏）。いちばん 長い 低音（2小節 ほど 伸ばす 音）を ベースに 分ける
    acc = [e for e in ev if e['role'] == 'accompaniment' and e['instrument'] == 'piano']
    longest = max(e['dur'] for e in acc)
    for e in ev:
        rep = min(s['repeats'] - 1, int(e['t'] // per))
        if e['role'] == 'melody':
            out.append({**e, 'layer': cfg['mel_layer']})
            if rep in cfg['dbl']:
                inst, ratio = cfg['dbl'][rep]
                out.append({**e, 'instrument': inst, 'vel': e['vel'] * ratio, 'layer': 1, 'pan': .14, 'role': 'doubling'})
            continue
        if e['instrument'] in ('harp', 'marimba'):
            removed.append({**e, 'reason': '旋律と 関係の ない 単発の 高音（ハープ／マリンバ）＝「チン」の 原因'}); continue
        # ピアノ伴奏
        is_bass = abs(e['dur'] - longest) < 1e-6 and e['midi'] < 55
        vel = e['vel']
        if is_bass:
            b = cfg['bass']
            if b == 'piano': out.append({**e, 'layer': 1, 'role': 'bass', 'pan': -.1})
            elif b == 'woodbass': out.append({**e, 'instrument': 'woodbass', 'vel': vel * .9, 'layer': 1, 'role': 'bass', 'pan': -.06})
            elif b == 'cellos': out.append({**e, 'instrument': 'cellos', 'vel': vel * .75, 'layer': 1, 'role': 'bass', 'pan': -.18})
            continue
        ch = cfg['chords'][min(rep, len(cfg['chords']) - 1)]
        if 'piano' in ch: out.append({**e, 'layer': 1, 'role': 'accompaniment', 'pan': -.16, 'vel': vel * (.8 if '+' in ch else 1)})
        if 'guitar' in ch: out.append({**e, 'instrument': 'guitar', 'vel': vel * (1.05 if '+' not in ch else .8), 'layer': 1, 'role': 'accompaniment', 'pan': .22})
    strum([e for e in out if e['instrument'] == 'guitar'], 'guitar')
    s2 = {**s, 'family': 'home3', 'room': list(cfg['room']), 'tone': cfg['tone'], 'events': out}
    shape_melody(s2, rng)
    s2['events'].sort(key=lambda x: (x['t'], x['role'] != 'melody'))
    return s2, removed

def other(s):
    fam = s['family']; rng = seeded(s['id']); out, removed = [], []
    for e in s['events']:
        i, r = e['instrument'], e['role']
        if i == 'glock' and r == 'sparkle' and fam != 'hatch':
            removed.append({**e, 'reason': '単発の グロッケン（V1 の ベル）＝ 旋律と 関係の ない「チン」'}); continue
        if i == 'shaker':
            e = {**e, 'vel': e['vel'] * .6}                                    # シェイカーは 控えめに（刻みの シャカシャカが 前に 出すぎない）
        if i == 'xylo':
            e = {**e, 'instrument': 'marimba', 'vel': e['vel'] * 1.15}       # 木琴の 重ね → あたたかい マリンバ
        if r == 'melody' and i == 'piano':
            e = {**e, 'layer': 3}                                              # 旋律の ピアノは 澄んだ 強い 打鍵の 録音（明瞭さを 高域の 持ち上げで なく 録音で 得る）
        if i == 'glock' and r == 'doubling' and fam == 'flight':
            e = {**e, 'vel': e['vel'] * .75}                                   # 飛行・海の 煌めき（旋律の 1オクターブ上）は 残し、少し 控えめに
        out.append(dict(e))
    s2 = {**s, 'events': out}
    if fam in QUIET:
        # 静かな 曲: 同じ 楽器・役割の 中で 強さの 外れ値を おさえる（突然 大きな 音が 鳴らない ように）
        groups = {}
        for e in out: groups.setdefault((e['instrument'], e['role']), []).append(e)
        for g in groups.values():
            cap = float(np.percentile([e['vel'] for e in g], 90)) * 1.1
            for e in g: e['vel'] = min(e['vel'], cap)
    shape_melody(s2, rng)
    return s2, removed

def build():
    v2 = json.loads((V2 / 'scores-v2.json').read_text())
    res = []
    for s in v2:
        s = json.loads(json.dumps(s))
        s3, rem = home(s) if s['family'] == 'home' else other(s)
        s3['removed'] = rem
        res.append(s3)
    return res

if __name__ == '__main__':
    sc = build()
    (ROOT / 'scores-v3.json').write_text(json.dumps(sc, ensure_ascii=False, indent=1) + '\n')
    for s in sc:
        inst = {}
        for e in s['events']: inst[e['instrument']] = inst.get(e['instrument'], 0) + 1
        print(f"{s['id']:18s} removed {len(s['removed']):3d}  {inst}")
