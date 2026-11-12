"""なおとっち BGM VERSION 2 — 編曲（楽器の 割り当て）。

V1 の 楽譜（prototypes/bgm-master32-v1/scores.json と home-scores-original.json）を そのまま 受けつぎ、
すべての 音の 音高・開始時刻・長さは 1つも 変えない。変えるのは 次だけ:
  * どの 楽器で 鳴らすか（例: 伴奏の マリンバ → 自作ナイロンギター、ベース → コントラバスの ピチカート＝ウッドベース）
  * 強さ・強弱レイヤー・左右の 位置・残響の 量
  * 旋律の 重ね（同じ 音高・同じ リズムで 別の 楽器を 小さく 重ねる。オクターブ上の きらめきを 含む）
主旋律の イベント（role=melody）は 時刻・音高・長さ・本数が V1 と 完全一致する ことを verify.py で 確認する。
ホーム4曲（採用アレンジA）は 楽器も 音も そのまま。描き方（音源の 質・残響・帯域）だけを V2 に する。
"""
import json, pathlib, copy, math
ROOT = pathlib.Path(__file__).resolve().parents[1]
V1 = ROOT.parent / 'bgm-master32-v1'

# 用途ごとの 音づくり。lead=主旋律 / dbl=旋律の 重ね [(楽器, 音量比, 半音, どの周で)] / broken=分散和音 / bass / pad=持続和音 / sparkle / stab=和音きざみ
# perc=打楽器の 置きかえ / room=残響（秒, 送り量） / width=伴奏の 広がり
FAM = {
 'poyo':     dict(lead='marimba', lead_layer=1, dbl=[('flute', .16, 0, 'odd')], broken='harp', bass='woodbass', pad=('violas', 'violins'), sparkle='glock', perc=None, room=(1.7, .20), width=.55, tone='やわらかい マリンバと ハープ、2周目は フルートが 小さく 寄りそう（少し 不思議で 考えごとを じゃましない）'),
 'koro':     dict(lead='piano', lead_layer=2, dbl=[('clarinet', .20, 0, 'odd')], broken='guitar', bass='woodbass', pad=('violas', 'violins'), sparkle='glock', perc='soft', room=(1.3, .15), width=.6, tone='ピアノの 旋律に ナイロンギターの 分散和音と ウッドベース。2周目は クラリネットが 旋律に 寄りそう（明るく 軽やか）'),
 'card':     dict(lead='piano', lead_layer=2, dbl=[('xylo', .16, 0, 'odd')], broken='marimba', bass='woodbass', pad=('violas', 'violins'), sparkle='glock', stab='cellopizz', perc='soft', room=(1.1, .12), width=.6, tone='ピアノと マリンバに 弦の ピチカートの きざみ。2周目は 木琴が 重なり 少し 緊張感が 増す'),
 'action':   dict(lead='marimba', lead_layer=1, dbl=[('xylo', .16, 0, 'odd')], broken='guitar', bass='woodbass', pad=('violas', 'violins'), sparkle='glock', perc='soft', room=(1.1, .12), width=.6, tone='マリンバと 木琴の 旋律、ギターと ウッドベース、軽い 打楽器'),
 'explore':  dict(lead='flute', lead_layer=2, dbl=[('clarinet', .14, -12, 'odd')], broken='harp', bass='cellopizz', pad=('violas', 'violins'), sparkle='glock', perc=None, room=(2.0, .24), width=.7, tone='フルートの 旋律、ハープの 分散和音、弦の 持続音。2周目は クラリネットが 1オクターブ下で 支える（神秘と 冒険）'),
 'love':     dict(lead='piano', lead_layer=2, dbl=[('flute', .13, 0, 'odd')], broken='harp', bass='cellos', pad=('violas', 'violins'), sparkle='glock', perc=None, room=(1.8, .22), width=.6, tone='ピアノと ハープ、チェロと 弦の やわらかい 持続音（感情を 押しつけない）'),
 'celebrate':dict(lead='piano', lead_layer=2, dbl=[('flute', .20, 0, 'all')], broken='harp', bass='woodbass', pad=('violas', 'violins'), sparkle='glock', stab='guitar', perc='soft', room=(1.5, .18), width=.65, tone='ピアノと フルートの 旋律、ハープと ギターの 和音、グロッケンの きらめき'),
 'memory':   dict(lead='piano', lead_layer=2, dbl=[('clarinet', .16, 0, 'odd')], broken='harp', bass='cellos', pad=('violas', 'violins'), sparkle='glock', perc=None, room=(1.9, .24), width=.6, tone='ピアノと ハープ、2周目は クラリネットが 旋律を なぞる（思い出）'),
 'quick':    dict(lead='marimba', lead_layer=1, dbl=[('xylo', .18, 0, 'odd')], broken='guitar', bass='woodbass', pad=('violas', 'violins'), sparkle='glock', perc='soft', room=(1.0, .11), width=.6, tone='マリンバと 木琴、ギター、ウッドベース、軽い 打楽器（テンポよく）'),
 'race':     dict(lead='piano', lead_layer=3, dbl=[('xylo', .22, 0, 'all')], broken='marimba', bass='woodbass', pad=('violas', 'violins'), sparkle='glock', stab='guitar', perc='race', room=(1.0, .11), width=.65, tone='ピアノと 木琴の 旋律、マリンバ、ギターの きざみ、ウッドベースと 打楽器'),
 'farewell': dict(lead='piano', lead_layer=2, dbl=[], broken='harp', bass='cellos', pad=('violas', 'violins'), sparkle=None, perc=None, room=(2.2, .26), width=.55, tone='静かな ピアノと ハープ、チェロ（音数を 増やさない）'),
 'puzzle':   dict(lead='clarinet', lead_layer=1, dbl=[], broken='harp', bass='woodbass', pad=('violas', 'violins'), sparkle='glock', perc=None, room=(1.6, .18), width=.55, tone='クラリネットの あたたかい 旋律と ハープ（思考を じゃましない）'),
 'sports':   dict(lead='marimba', lead_layer=1, dbl=[('xylo', .16, 0, 'odd')], broken='guitar', bass='woodbass', pad=('violas', 'violins'), sparkle='glock', perc='soft', room=(1.0, .11), width=.6, tone='マリンバと 木琴、ギター、ウッドベース、軽い 打楽器'),
 'flight':   dict(lead='flute', lead_layer=2, dbl=[('glock', .10, 12, 'all')], broken='harp', bass='cellos', pad=('violas', 'violins'), sparkle='glock', perc=None, room=(2.4, .28), width=.75, tone='フルートの 旋律に 1オクターブ上の グロッケン、ハープの きらめきと 広い 空間（煌びやかで 透明）'),
 'board':    dict(lead='piano', lead_layer=1, dbl=[], broken='guitar', bass='woodbass', pad=('violas', 'violins'), sparkle='glock', perc=None, room=(1.3, .15), width=.55, tone='ピアノと ギター、ウッドベース（落ちついて 考えられる）'),
 'fishing':  dict(lead='piano', lead_layer=1, dbl=[], broken='guitar', bass='cellos', pad=('violas', 'violins'), sparkle='glock', perc=None, room=(1.7, .20), width=.6, tone='ピアノと ナイロンギター、チェロ（水辺の うたたね）'),
 'sleep':    dict(lead='harp', lead_layer=1, dbl=[], broken='piano', broken_layer=1, bass='cellos', pad=('violas', 'violins'), sparkle='glock', perc=None, room=(2.4, .26), width=.5, tone='ハープの 旋律と 弱い ピアノ、ごく 小さい 弦（眠りを じゃましない）'),
 'hatch':    dict(lead='trumpet', lead_layer=3, dbl=[], broken='piano', bass='woodbass', pad=('violas', 'violins'), sparkle='glock', stab='trumpet', perc='hatch', room=(1.6, .18), width=.6, tone='トランペットの ファンファーレに グロッケン、ティンパニ、シンバル、最後の E♭ 和音'),
}

PERC_MAP = {
 # V1 の 打楽器 名 → V2 の 音（リズムは そのまま）
 'soft': {'kick': ('kick', 1, .55), 'snare': ('snare', 1, .9), 'shaker': ('shaker', 1, .55), 'cymbal': ('cymbal', 2, .8), 'timpani': ('timpani', 1, .9)},
 'race': {'kick': ('kick', 2, .7), 'snare': ('snare', 2, .9), 'shaker': ('shaker', 1, .7), 'cymbal': ('cymbal', 2, .8), 'timpani': ('timpani', 1, .9)},
 'hatch': {'kick': ('kick', 2, .7), 'snare': ('snarehit', 2, .8), 'shaker': ('shaker', 1, .9), 'cymbal': ('cymbal', 3, .9), 'timpani': ('timpani', 3, 1.2)},
 None: {'kick': ('kick', 1, .5), 'snare': ('snare', 1, .8), 'shaker': ('shaker', 1, .8), 'cymbal': ('cymbal', 2, .8), 'timpani': ('timpani', 1, .9)},
}

def classify(e, fam1):
    """V1 の イベントが 伴奏の どの 役割か（V1 arrange.cjs の 書き方から 決まる）。"""
    r, inst, pan = e['role'], e['instrument'], round(e.get('pan', 0), 2)
    if r == 'melody': return 'melody'
    if r in ('percussion',): return 'perc'
    if r in ('doubling',): return 'doubling'
    if r in ('sparkle',): return 'gliss'
    if r in ('cadence',): return 'cadence'
    if inst == 'strings': return 'pad'
    if inst == 'bell': return 'sparkle'
    if pan == .22: return 'broken'
    if pan == -.07: return 'bass'
    if pan in (-.2, -.15): return 'stab'
    if inst == 'trumpet': return 'stab'
    raise ValueError(f"unclassified {e}")

def arrange(score):
    f = FAM[score['family']]; spb = 60 / score['bpm']; per = score['period'] / score['repeats']
    out = []
    def add(src, inst, vel, layer, pan, role, midi=None, send=None):
        out.append({'t': src['t'], 'midi': src['midi'] if midi is None else midi, 'dur': src['dur'], 'vel': vel, 'instrument': inst, 'layer': layer, 'pan': pan, 'role': role, **({'send': send} if send is not None else {})})
    w = f['width']
    for e in score['events']:
        k = classify(e, None)
        rep = int(max(0, e['t'] - score.get('leadIn', 0)) // per) if score['loop'] else 0
        if k == 'melody':
            add(e, f['lead'], e['vel'], f['lead_layer'], 0, 'melody')
            for inst, ratio, semis, which in f['dbl']:
                if which == 'all' or (which == 'odd' and rep % 2 == 1):
                    add(e, inst, e['vel'] * ratio, 1 if inst in ('clarinet', 'flute') else 2, .12 if semis >= 0 else -.12, 'doubling', midi=e['midi'] + semis)
        elif k == 'broken':
            inst = f['broken']; layer = f.get('broken_layer', 2 if inst == 'piano' else 1)
            add(e, inst, e['vel'] * (1.1 if inst == 'guitar' else 1.0), layer, .35 * w / .6, 'accompaniment')
        elif k == 'bass':
            inst = f['bass']; v = e['vel'] * (.9 if inst == 'woodbass' else .8 if inst == 'cellos' else 1)
            add(e, inst, v, 1 if inst != 'cellopizz' else 2, -.08, 'bass')
        elif k == 'stab':
            inst = f.get('stab', 'piano')
            if score['family'] == 'hatch':
                add(e, 'trumpet', e['vel'] * .9, 1, -.25, 'accompaniment')
            elif inst == 'guitar':
                add(e, 'guitar', e['vel'] * 1.25, 1, -.32 * w / .6, 'accompaniment')
            elif inst == 'cellopizz':
                add(e, 'cellopizz', e['vel'] * 1.3, 1, -.32 * w / .6, 'accompaniment')
                add(e, 'piano', e['vel'] * .45, 1, -.2, 'accompaniment')
            else:
                add(e, 'piano', e['vel'], 1, -.3, 'accompaniment')
        elif k == 'pad':
            # 持続和音は ビオラ（下）と バイオリン（上）に 分け、左右へ 広げる
            inst = f['pad'][1] if e['midi'] >= 62 else f['pad'][0]
            add(e, inst, e['vel'] * 1.15, 1, (.45 if inst == 'violins' else -.45) * w / .6, 'pad')
        elif k == 'sparkle':
            if f['sparkle']: add(e, f['sparkle'], e['vel'] * .85, 1, .42 * w / .6, 'sparkle')
        elif k == 'gliss':
            add(e, 'harp', e['vel'] * 1.1, 1, e['pan'] * 1.4, 'sparkle')
        elif k == 'doubling':
            add(e, 'glock', e['vel'] * .8, 1, .18, 'doubling')
        elif k == 'cadence':
            add(e, 'trumpet' if e['instrument'] == 'trumpet' else e['instrument'], e['vel'] * (1.0 if e['instrument'] == 'trumpet' else 1.1), 2 if e['instrument'] == 'trumpet' else 1, e['pan'] * 1.5, 'cadence')
        elif k == 'perc':
            if e['instrument'] == 'shell':
                out.append({**{k2: e[k2] for k2 in ('t', 'midi', 'dur')}, 'vel': e['vel'], 'instrument': 'shell', 'layer': 1, 'pan': 0, 'role': 'percussion'}); continue
            inst, layer, g = PERC_MAP[f['perc']][e['instrument']]
            add(e, inst, e['vel'] * g, layer, {'kick': 0, 'snare': .12, 'snarehit': .12, 'shaker': -.3, 'cymbal': .1, 'timpani': 0}.get(inst, 0), 'percussion')
    meta = {k2: score[k2] for k2 in ('id', 'title', 'family', 'bpm', 'meter', 'repeats', 'bars', 'loop', 'leadIn', 'period', 'duration', 'targetLUFS')}
    return {**meta, 'room': f['room'], 'tone': f['tone'], 'events': sorted(out, key=lambda x: (x['t'], x['role'] != 'melody'))}

def arrange_home(h, v1cat):
    """ホーム4曲（アレンジA）: 楽器・音・強さは そのまま。"""
    # 強さは アレンジA の まま。ピアノは 旋律を 強いレイヤー（輪郭が はっきり）、伴奏を 中間レイヤーで 鳴らす。
    # レイヤー較正で ピアノが 2.5 dB 上がる ぶん、単一レイヤーの ハープ・マリンバを 同じだけ 上げて 楽器間の 比を 保つ。
    ev = [{'t': e['t'], 'midi': e['midi'], 'dur': e['dur'], 'vel': e['vel'] * (1 if e['instrument'] == 'piano' else 10 ** (2.5 / 20)), 'instrument': e['instrument'], 'layer': (3 if e['role'] == 'melody' else 2) if e['instrument'] == 'piano' else 1, 'pan': e.get('pan', 0), 'role': e['role']} for e in h['events']]
    c = next(t for t in v1cat if t['id'] == HOME_ID[h['id']])
    return {'id': HOME_ID[h['id']], 'title': c['title'], 'family': 'home', 'bpm': h['bpm'], 'meter': h['meter'], 'repeats': c['repeats'], 'bars': c['bars'], 'loop': True, 'leadIn': 0, 'period': h['period'], 'duration': c['duration'], 'targetLUFS': -23, 'room': (1.8, .20), 'tone': '採用アレンジA の 楽譜と 楽器（ピアノ＋ハープ／マリンバ）は そのまま。音源の 質・ステレオ・残響・帯域だけ 改善', 'events': ev}

HOME_ID = {'soyokaze': 'home-morning', 'current': 'home-day', 'starlake': 'home-evening', 'hoshizora': 'home-night'}

def build():
    v1 = json.loads((V1 / 'scores.json').read_text()); home = json.loads((V1 / 'home-scores-original.json').read_text())
    cat = json.loads((V1 / 'catalog.json').read_text())['tracks']
    by = {s['id']: arrange(s) for s in v1}
    for h in home: a = arrange_home(h, cat); by[a['id']] = a
    order = [t['id'] for t in cat]
    return [by[i] for i in order]

if __name__ == '__main__':
    scores = build()
    (ROOT / 'scores-v2.json').write_text(json.dumps(scores, ensure_ascii=False, indent=1) + '\n')
    print(len(scores), 'scores;', sum(len(s['events']) for s in scores), 'events')
