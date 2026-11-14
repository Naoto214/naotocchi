"""なおとっち BGM VERSION 5 — 編曲（V4 の 楽譜 → V5）。

1. 旋律の 音量ムラを 整える: 主旋律と 旋律の 重ねの 1音ずつの 聴感上の 大きさ（note_level.py。音源の 録音差・音域差・強弱レイヤー・
   vel を 含む）を 測り、フレーズとして 意図の ある 抑揚（4小節の 山なり・高い 音は 少し 豊かに・拍の 頭・フレーズの 終わりは 力を 抜く）に
   合う ように 1音ずつ 強さを 補正する（最大 ±12 dB）。音高・時刻・長さは 変えない。強い コンプレッサーは 使わない。
2. 「いつもの にわ」36秒付近の「ファー」: 3周目の クラリネットの 重ねの C6（36.30 秒）が、VSCO の クラリネットの 最高音の 録音の 大きさの ため、
   ほかの クラリネットの 音より 約 20 dB 大きかった。クラリネットの 重ねは A5（81）より 上を 鳴らさない（旋律は ピアノが 弾く）。
3. 単調さを 和らげる（2周目 以降・静かな 曲）: 和音に 沿って ゆっくり 動く 内声の 対旋律、旋律の すきまに 入る 木管の 短い 応答、
   ホームの 低音の 自然な 動き。どれも その 時に 鳴って いる 和音の 音だけで 作り、旋律と 2度で ぶつかる 音は 入れない。
   一定の 刻み・単発の 高音・ベル・鈴・金属音は 入れない（verify_v5.py で 確認）。
"""
import json, pathlib, math, hashlib, sys
import numpy as np
ROOT = pathlib.Path(__file__).resolve().parents[1]; V4 = ROOT.parent / 'bgm-v4-20261114'
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import note_level as NL

VAR = {
 # 曲 or 系統: 対旋律の 楽器（周ごと）、応答の 楽器、低音の 動き
 'home-morning': dict(counter={1: 'clarinet'}, response='flute', walk=True),
 'home-day': dict(counter={1: 'cellos', 2: 'clarinet'}, response='flute', walk=True),
 'home-evening': dict(counter={1: 'violas'}, response='flute', walk=False),
 'home-night': None,
 'love': dict(counter={1: 'clarinet'}, response=None, walk=False), 'memory': dict(counter={1: 'violas'}, response='flute', walk=False),
 'puzzle': dict(counter={1: 'cellos'}, response='flute', walk=False), 'board': dict(counter={1: 'clarinet'}, response='flute', walk=False),
 'fishing': dict(counter={1: 'clarinet'}, response='flute', walk=False), 'koro': dict(counter={1: 'violas'}, response='flute', walk=False),
 'explore': dict(counter={1: 'violas'}, response=None, walk=False), 'poyo': dict(counter={1: 'clarinet'}, response=None, walk=False),
 'farewell': dict(counter={1: 'violas'}, response=None, walk=False),
}
RANGE = {'clarinet': (55, 79), 'cellos': (48, 64), 'violas': (55, 72), 'flute': (65, 86)}
DBL_MAX = {'clarinet': 81, 'flute': 93}

def rng_for(sid): return np.random.default_rng(int(hashlib.sha256(('v5:' + sid).encode()).hexdigest()[:8], 16))

def chords(s):
    """和音の 区間: 伴奏・低音の 打ち始めごとに、その 時に 鳴って いる 伴奏・低音の 音（ピッチクラス）。"""
    ev = [e for e in s['events'] if e['role'] in ('accompaniment', 'bass', 'pad')]
    ts = sorted({round(e['t'], 3) for e in ev}); out = []
    for i, t in enumerate(ts):
        end = ts[i + 1] if i + 1 < len(ts) else (s['period'] if s['loop'] else s['duration'])
        pcs = {e['midi'] % 12 for e in ev if e['t'] <= t + 1e-3 and e['t'] + e['dur'] > t + .05}
        if pcs: out.append([t, end, pcs])
    merged = []
    for c in out:
        if merged and merged[-1][2] == c[2] and abs(merged[-1][1] - c[0]) < 1e-3: merged[-1][1] = c[1]
        else: merged.append(c)
    return merged
def chord_at(ch, t):
    for a, b, p in ch:
        if a - 1e-3 <= t < b: return p
    return None

def clashes(midi, t, dur, mel):
    """旋律と 2度（短・長）・長7度で 重なる なら True。"""
    for m in mel:
        if m['t'] < t + dur - .05 and m['t'] + max(m['dur'], .2) > t + .05:
            if (abs(m['midi'] - midi) % 12) in (1, 2, 10, 11) or m['midi'] == midi: return True
    return False

def counter_line(s, inst, reps, ch, mel, per):
    lo, hi = RANGE[inst]; out = []; prev = (lo + hi) // 2; bar = 60 / s['bpm'] * s['meter']; beat = 60 / s['bpm']
    for a, b, pcs in ch:
        rep = int(a // per)
        if rep not in reps or b - a < beat * .99: continue
        if int(((a % per) + 1e-3) // bar) % 4 == 3: continue           # 4小節の 4小節目は 休む（息つぎ・対比）
        cands = [m for m in range(lo, hi + 1) if m % 12 in pcs and not clashes(m, a, b - a, mel)]
        if not cands: continue
        n = min(cands, key=lambda m: (abs(m - prev), m))
        out.append({'t': a, 'midi': n, 'dur': round(b - a - .03, 4), 'vel': .05, 'instrument': inst, 'layer': 1, 'pan': -.2 if inst in ('cellos', 'violas') else .22, 'role': 'counter'})
        prev = n
    return out

def responses(s, inst, reps, ch, mel, per):
    """旋律が 2拍 以上 のばす 音の あいだ（1拍目の 裏から）に、木管が 短く 答える（その 時の 和音の 音だけで、のばして いる 旋律の 3度〜1オクターブ 下を
    上がって／下がって 3音）。2回に 1回だけ、向きを 交互に。"""
    beat = 60 / s['bpm']; out = []; k = 0; lo, hi = RANGE[inst]
    ms = sorted(mel, key=lambda m: m['t'])
    for i in range(len(ms) - 1):
        a, b = ms[i], ms[i + 1]
        if b['t'] - a['t'] < 2 * beat - 1e-3 or int(a['t'] // per) not in reps: continue
        k += 1
        if k % 2 == 0: continue
        t0 = a['t'] + .5 * beat; pcs = chord_at(ch, t0)
        room = int((b['t'] - .08 - t0) / (.5 * beat) + 1e-6)            # 8分音符 いくつ 分の 余地が あるか
        if pcs is None or room < 2: continue
        pool = [n for n in range(max(lo, a['midi'] - 12), min(hi, a['midi'] - 3) + 1) if n % 12 in pcs]
        if len(pool) < 2: continue
        fig = sorted(pool)[-min(3, room):]
        if (k // 2) % 2: fig = fig[::-1]
        rhythm = [(j * .5, .5) for j in range(len(fig))]
        for n, (off, d) in zip(fig, rhythm):
            tt = t0 + off * beat; dd = d * beat * .92
            if clashes(n, tt, dd, mel) or chord_at(ch, tt) != pcs: break
            out.append({'t': round(tt, 4), 'midi': n, 'dur': round(dd, 4), 'vel': .05, 'instrument': inst, 'layer': 1, 'pan': .25, 'role': 'response'})
    return out

def bass_walk(s, reps, per):
    """ホーム: 2周目 以降、小節の 低音（全音符）の 3拍目に 5度（根音から 完全5度、低い 位置）を そっと 加える。"""
    out = []; bar = 60 / s['bpm'] * s['meter']
    for e in s['events']:
        if e['role'] != 'bass' or e['instrument'] != 'piano' or int(e['t'] // per) not in reps or e['dur'] < bar * .9: continue
        n = e['midi'] + 7 if e['midi'] + 7 <= 52 else e['midi'] - 5
        out.append({'t': round(e['t'] + bar / 2, 4), 'midi': n, 'dur': round(bar / 2 - .05, 4), 'vel': e['vel'] * .8, 'instrument': 'piano', 'layer': 1, 'pan': -.1, 'role': 'bass'})
    return out

def even_melody(s):
    """主旋律・旋律の 重ね・追加した 声部の 1音ずつの 大きさを、意図の ある 抑揚に 合わせる。"""
    bar = 60 / s['bpm'] * s['meter']; beat = 60 / s['bpm']; t0 = s.get('leadIn', 0)
    mel = sorted([e for e in s['events'] if e['role'] == 'melody'], key=lambda e: e['t'])
    if not mel: return {}
    lv = np.array([NL.level(e) for e in mel]); base = float(np.median(lv)); mp = float(np.median([e['midi'] for e in mel]))
    tgt = {}
    for i, e in enumerate(mel):
        t = e['t'] - t0; p = (t % (4 * bar)) / (4 * bar)
        shape = 1.5 * math.sin(math.pi * p)                                         # 4小節の 山なり
        shape += float(np.clip(.12 * (e['midi'] - mp), -1.5, 1.5))                 # 高い 音は 少し 豊かに
        inbar = t % bar
        if inbar < .03 or inbar > bar - .03: shape += .6                            # 小節の 頭
        elif abs(inbar / beat - round(inbar / beat)) > .05 and e['dur'] < beat * .6: shape -= .6   # 裏拍の 短い 音
        nxt = mel[i + 1]['t'] if i + 1 < len(mel) else None
        if nxt is None or nxt - (e['t'] + e['dur']) >= beat * .9: shape -= 1.0     # フレーズの 終わり
        tgt[id(e)] = base + shape
    before = lv.std()
    for e, l in zip(mel, lv):
        g = float(np.clip(tgt[id(e)] - l, -12, 12)); e['vel'] = e['vel'] * 10 ** (g / 20); e['gainDb'] = round(g, 2)
    after = np.array([NL.level(e) for e in mel])
    # 旋律に 重なる・寄りそう 声部（重ね・対旋律・応答）は 楽器ごとに 中央値へ そろえ、旋律と 同じ 抑揚を 少しだけ つける
    for role in ('doubling', 'counter', 'response'):
        for inst in {e['instrument'] for e in s['events'] if e['role'] == role}:
            g = [e for e in s['events'] if e['role'] == role and e['instrument'] == inst]
            l = np.array([NL.level(e) for e in g]); med = float(np.median(l))
            for e, x in zip(g, l):
                tt = e['t'] - t0; shape = .8 * math.sin(math.pi * ((tt % (4 * bar)) / (4 * bar)))
                gg = float(np.clip(med + shape - x, -24, 9)); e['vel'] = e['vel'] * 10 ** (gg / 20); e['gainDb'] = round(gg, 2)
    return {'melodyLevelSdBefore': round(float(before), 2), 'melodyLevelSdAfter': round(float(after.std()), 2),
            'melodyLevelRangeBefore': round(float(lv.max() - lv.min()), 1), 'melodyLevelRangeAfter': round(float(after.max() - after.min()), 1)}

def build():
    v4 = json.loads((V4 / 'scores-v4.json').read_text()); res = []
    for s in v4:
        s = json.loads(json.dumps(s)); notes = {}
        # 旋律の 重ね: 楽器の 苦しい 高音域は 鳴らさない（旋律は ピアノ／主楽器が 弾く）
        keep = []
        for e in s['events']:
            if e['role'] == 'doubling' and e['instrument'] in DBL_MAX and e['midi'] > DBL_MAX[e['instrument']]:
                notes.setdefault('doublingDropped', []).append({'t': e['t'], 'midi': e['midi'], 'instrument': e['instrument']}); continue
            keep.append(e)
        s['events'] = keep
        cfg = VAR.get(s['id'], VAR.get(s['family'])) if s['loop'] and s['repeats'] >= 2 else None
        if cfg:
            per = s['period'] / s['repeats']; ch = chords(s); mel = [e for e in s['events'] if e['role'] == 'melody']
            reps_all = set(range(1, s['repeats']))
            add = []
            for rep, inst in cfg['counter'].items():
                add += counter_line(s, inst, {rep} if s['repeats'] > 2 else reps_all, ch, mel, per)
            if cfg['response']: add += responses(s, cfg['response'], reps_all, ch, mel, per)
            if cfg['walk']: add += bass_walk(s, reps_all, per)
            s['events'] += add; notes['added'] = {r: sum(1 for e in add if e['role'] == r and not (r == 'bass')) for r in ('counter', 'response')}
            notes['added']['bassWalk'] = sum(1 for e in add if e['role'] == 'bass')
        notes.update(even_melody(s))
        s['v5'] = notes
        s['events'].sort(key=lambda x: (x['t'], x['role'] != 'melody'))
        res.append(s)
    return res

if __name__ == '__main__':
    sc = build()
    (ROOT / 'scores-v5.json').write_text(json.dumps(sc, ensure_ascii=False, indent=1) + '\n')
    for s in sc:
        v = s['v5']; print(f"{s['id']:18s} 旋律の 大きさの ばらつき {v.get('melodyLevelSdBefore', '-')} → {v.get('melodyLevelSdAfter', '-')} dB  幅 {v.get('melodyLevelRangeBefore', '-')} → {v.get('melodyLevelRangeAfter', '-')}  追加 {v.get('added', '-')}  重ね除外 {len(v.get('doublingDropped', []))}", flush=True)
