"""なおとっち BGM VERSION 4 — 編曲（V3 の 楽譜 → V4）。音を 減らし、旋律の 美しさと 自然な 余韻を 立たせる。

守る もの: 主旋律（role=melody）の 音高・開始時刻・譜面上の 長さ（dur）・本数（V1 と 完全一致。verify_v4.py で 確認）、
         曲ID・曲名・テンポ・拍子・小節数・反復・長さ・ループ指定、配置 50行。
変える もの:
  * 一定の リズムで 刻み 続ける ギターを 削除（ストローク＝和音の きざみは 音ごと 削除、分散和音は やわらかい ピアノか ハープへ）。ホーム4曲は ギターなし。
  * シェイカー（「シャン」「シャカシャカ」）と シンバルを 全曲で 削除。リズムが 必要な ゲーム（アクション・クイック・スポーツ・レース・CARD GAME・ファンファーレ）
    だけ キックと スネアの タップを 控えめに 残し、それ以外の 曲の 打楽器は 削除。
  * ペダル: ピアノ・ハープの 音を 和声が 変わる まで 響かせる（hold＝鳴らす 長さ。譜面の dur は 変えない）。旋律は 次の 音へ わずかに 重ねて つなぐ。
  * 伴奏の 主張を 下げる（render_v4.py の 音量バランス）。
削除した 音は 各曲の removed に 理由つきで 記録（V3 で 削除した 装飾音も 引き継ぐ）。
"""
import json, pathlib, math, hashlib
import numpy as np
ROOT = pathlib.Path(__file__).resolve().parents[1]
V2 = ROOT.parent / 'bgm-v2-20261112'; V3 = ROOT.parent / 'bgm-v3-20261113'

RHYTHM = {'action', 'quick', 'sports', 'race', 'card', 'hatch'}          # 打楽器を 控えめに 残す 曲
PEDAL = {'home4', 'sleep', 'farewell', 'love', 'memory', 'fishing', 'board', 'puzzle', 'koro', 'celebrate', 'explore', 'flight', 'poyo'}
HOME = {
 'home-morning': dict(bass='piano', dbl={1: ('flute', .12)}, room=(2.0, .20), tone='ピアノ ひとりの 旋律と 左手の 和音（ペダルで つなぐ）。2周目は フルートが そっと 寄りそう（爽やかで 軽やか）'),
 'home-day': dict(bass='piano', dbl={1: ('clarinet', .11), 2: ('flute', .10)}, room=(1.9, .19), tone='ピアノの 旋律と 左手の 和音（ペダルで つなぐ）。2周目は クラリネット、3周目は フルートが そっと 寄りそう（明るく 疲れない）'),
 'home-evening': dict(bass='cellos', dbl={1: ('clarinet', .12)}, room=(2.2, .21), tone='ピアノの 旋律と 和音、チェロが 低音を 長く 支える。2周目は クラリネットが 寄りそう（穏やかで 少し 感傷的）'),
 'home-night': dict(bass='piano', dbl={}, room=(2.8, .28), tone='ピアノ だけ。ペダルで 一音一音を 長く 響かせ、次の 音へ つなぐ（静かな 夜の ピアノ曲）'),
}

def seeded(sid):
    return np.random.default_rng(int(hashlib.sha256(('v4:' + sid).encode()).hexdigest()[:8], 16))

def shape_melody(s, rng):
    """人が 弾く ような 強弱（音高・時刻・長さは 変えない）。V3 と 同じ 考え方で、山なりを 少し 広く・拍の 強弱を 少し 弱く。"""
    bar = 60 / s['bpm'] * s['meter']; beat = 60 / s['bpm']; t0 = s.get('leadIn', 0)
    for e in s['events']:
        if e['role'] != 'melody': continue
        t = e['t'] - t0; p = (t % (4 * bar)) / (4 * bar)
        arch = 1 + .08 * math.sin(math.pi * p)
        inbar = t % bar
        acc = 1.03 if inbar < .02 or inbar > bar - .02 else (1.0 if abs((inbar / beat) - round(inbar / beat)) < .04 else .96)
        e['vel'] = e['vel'] * arch * acc * (1 + .02 * rng.standard_normal())

def pedal(s):
    """ペダル: 和声の 変わり目（低音・伴奏の 打ち始め）で 踏みかえ、それまで ピアノ・ハープの 音を 響かせる。"""
    ev = s['events']; per = s['period'] if s['loop'] else s['duration']
    ch = sorted({round(e['t'], 4) for e in ev if e['role'] == 'bass'}) or sorted({round(e['t'], 4) for e in ev if e['role'] == 'accompaniment'})
    if s['family'] == 'home4':
        # ホームは 低音（小節の 頭）で 踏みかえ、小節の 途中は 和音が 実際に 変わる ときだけ 踏みかえる（同じ 和音の 打ち直しでは 踏みかえない）
        chords = {}
        for e in ev:
            if e['role'] == 'accompaniment': chords.setdefault(round(e['t'], 4), set()).add(e['midi'] % 12)
        ch = set(round(e['t'], 4) for e in ev if e['role'] == 'bass'); prev = None
        for t in sorted(chords):
            if prev is not None and chords[t] != prev: ch.add(t)
            prev = chords[t]
        ch = sorted(ch)
    if not ch: return
    ch = np.array(ch)
    mel = sorted(e['t'] for e in ev if e['role'] == 'melody'); mel = np.array(mel) if mel else None
    beat = 60 / s['bpm']
    for e in ev:
        if e['instrument'] not in ('piano', 'harp'): continue
        t = e['t']; k = np.searchsorted(ch, t + .06)
        nxt = ch[k] if k < len(ch) else (ch[0] + per if s['loop'] else per)
        hold = max(e['dur'], nxt - t + .04)
        if e['role'] == 'melody' and mel is not None:
            j = np.searchsorted(mel, t + 1e-4)
            nm = mel[j] if j < len(mel) else (mel[0] + per if s['loop'] else t + e['dur'])
            if nm - t <= 2.5 * beat: hold = max(hold, nm - t + .09)           # 指で つなぐ（次の 音に 少し 重ねる）
        e['hold'] = round(min(hold, 4.5, max(e['dur'], 6 * beat)), 4)

def home(s2, s3):
    """ホーム4曲: V2 の アレンジA（ピアノ）から 作り直す。ギター・ウッドベースは 使わない。V3 で 削除した 単発の ハープ／マリンバは 引き継いで 削除。"""
    cfg = HOME[s2['id']]; per = s2['period'] / s2['repeats']; out = []
    acc = [e for e in s2['events'] if e['role'] == 'accompaniment' and e['instrument'] == 'piano']
    longest = max(e['dur'] for e in acc)
    for e in s2['events']:
        rep = min(s2['repeats'] - 1, int(e['t'] // per))
        if e['role'] == 'melody':
            out.append({**e, 'layer': 3})
            if rep in cfg['dbl']:
                inst, ratio = cfg['dbl'][rep]
                out.append({**e, 'instrument': inst, 'vel': e['vel'] * ratio, 'layer': 1, 'pan': .12, 'role': 'doubling'})
            continue
        if e['instrument'] in ('harp', 'marimba'): continue           # V3 で 削除済み（removed は s3 から 引き継ぐ）
        if abs(e['dur'] - longest) < 1e-6 and e['midi'] < 55:
            if cfg['bass'] == 'cellos': out.append({**e, 'instrument': 'cellos', 'vel': e['vel'] * .7, 'layer': 1, 'role': 'bass', 'pan': -.15})
            else: out.append({**e, 'layer': 1, 'role': 'bass', 'pan': -.1})
            continue
        out.append({**e, 'layer': 1, 'role': 'accompaniment', 'pan': -.14, 'vel': e['vel'] * .9})
    s = {**s3, 'family': 'home4', 'room': list(cfg['room']), 'tone': cfg['tone'], 'events': out, 'removed': list(s3.get('removed', []))}
    return s

def other(s3):
    fam = s3['family']; out = []; removed = list(s3.get('removed', [])); w = .6
    for e in s3['events']:
        i, r = e['instrument'], e['role']
        if i == 'shaker' or i == 'cymbal' or i == 'tamb' or i == 'sleigh':
            removed.append({**e, 'reason': '「シャン」「シャカシャカ」と 鳴る 高域の 打楽器'}); continue
        if r == 'percussion' and fam not in RHYTHM and i != 'shell':
            removed.append({**e, 'reason': '静かな・おだやかな 曲で 一定間隔に 鳴り続ける 打楽器'}); continue
        if i == 'guitar':
            if e['pan'] < 0:                                              # V2 の 和音きざみ（ストローク）
                removed.append({**e, 'reason': '一定の リズムで 刻み 続ける ギターの 和音（分散和音と 持続音が 和声を 担う）'}); continue
            e = {**e, 'instrument': 'harp' if fam in ('celebrate', 'koro') else 'piano', 'layer': 1, 'vel': e['vel'] * (.75 if fam in ('celebrate', 'koro') else .85), 'pan': .28}
        if i == 'glock' and r == 'sparkle':                               # ファンファーレの 単発グロッケンも 派手な 装飾音として 削除
            removed.append({**e, 'reason': '単発の グロッケン（派手な 装飾音）'}); continue
        if r == 'percussion' and i in ('kick', 'snare', 'snarehit'):
            e = {**e, 'vel': e['vel'] * .8}
        out.append(dict(e))
    return {**s3, 'events': out, 'removed': removed}

def build():
    v2 = {s['id']: s for s in json.loads((V2 / 'scores-v2.json').read_text())}
    v3 = json.loads((V3 / 'scores-v3.json').read_text()); res = []
    for s3 in v3:
        s3 = json.loads(json.dumps(s3)); rng = seeded(s3['id'])
        if s3['family'] == 'home3':
            s = home(json.loads(json.dumps(v2[s3['id']])), s3)
        else:
            s = other(s3)
            # V3 で つけた 旋律の 強弱は そのまま（V3 の 値を 引き継ぐ）
        if s['family'] == 'home4': shape_melody(s, rng)
        if s['family'] in PEDAL: pedal(s)
        s['events'].sort(key=lambda x: (x['t'], x['role'] != 'melody'))
        res.append(s)
    return res

if __name__ == '__main__':
    sc = build()
    (ROOT / 'scores-v4.json').write_text(json.dumps(sc, ensure_ascii=False, indent=1) + '\n')
    for s in sc:
        inst = {}
        for e in s['events']: inst[e['instrument']] = inst.get(e['instrument'], 0) + 1
        held = [e['hold'] / e['dur'] for e in s['events'] if 'hold' in e]
        print(f"{s['id']:18s} removed {len(s['removed']):4d}  pedal x{(np.mean(held) if held else 1):4.2f}  {inst}")
