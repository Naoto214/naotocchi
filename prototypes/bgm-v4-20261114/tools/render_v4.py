"""なおとっち BGM VERSION 4 — 描画・ミックス・マスタリング（V2 の 描画部品と V3 の 音づくりを 使い、V4 の 設定だけ 変える）。

使い方（リポジトリの ルートで）:
  python prototypes/bgm-v4-20261114/tools/render_v4.py --stage 1        # 第1段階: ホーム4曲
  python prototypes/bgm-v4-20261114/tools/render_v4.py --group 2..5     # 第2段階: 残り28曲を 7曲ずつ
V3 から 変えた 点:
  * ペダル: 楽譜の hold（和声が 変わる まで の 鳴らす 長さ）で ピアノ・ハープを 響かせる。譜面の dur は 変えない。
  * ピアノの 離鍵（ダンパー）を ゆっくり（0.30 → 0.60 秒、うち 後半 0.30 秒で なめらかに 消える）。
  * ピアノの 打鍵の 山を やわらげる（夜 7 dB・ホーム 4 dB・静かな 曲 3 dB、0.3 秒で もどる）。
  * 伴奏・低音・打楽器を 主旋律に 対して 下げる（伴奏 −4 → −7 dB、低音 −6 → −9 dB、打楽器 −14 → −17 dB など）。
完成した 曲は receipts/<id>.json の ハッシュが 一致すれば 作り直さない。
"""
import json, pathlib, sys
V3T = pathlib.Path(__file__).resolve().parents[2] / 'bgm-v3-20261113' / 'tools'
sys.path.insert(0, str(V3T))
_argv = sys.argv; sys.argv = sys.argv[:1]
import render_v3 as V3          # V2 の 描画部品に V3 の 設定（EQ・高域を 持ち上げない 補正）を 当てた もの
sys.argv = _argv
R, L = V3.R, V3.L
ROOT = pathlib.Path(__file__).resolve().parents[1]
R.AUDIO, R.MIDI, R.REC = ROOT / 'audio', ROOT / 'midi', ROOT / 'receipts'

L.SPEC['piano']['release'] = .60
R.BALANCE.update({'accompaniment': -7, 'bass': -9, 'pad': -15, 'doubling': -11, 'sparkle': -16, 'percussion': -17, 'cadence': -4})
R.FAMILY_BALANCE.update({
 'home4': {'accompaniment': -8, 'bass': -10, 'doubling': -12},
 'sleep': {'accompaniment': -9, 'bass': -11, 'pad': -17}, 'farewell': {'accompaniment': -9, 'bass': -10, 'pad': -16},
 'fishing': {'accompaniment': -8, 'bass': -10}, 'puzzle': {'accompaniment': -8, 'bass': -10, 'pad': -16},
 'love': {'accompaniment': -8, 'bass': -10, 'pad': -16}, 'memory': {'accompaniment': -8, 'bass': -10, 'pad': -16},
 'board': {'accompaniment': -8, 'bass': -10}, 'koro': {'accompaniment': -8, 'bass': -10},
 'race': {'percussion': -15}, 'quick': {'percussion': -16}, 'sports': {'percussion': -16}, 'action': {'percussion': -16}, 'card': {'percussion': -17},
 'flight': {'sparkle': -13, 'doubling': -13, 'pad': -13}, 'explore': {'pad': -13, 'sparkle': -15},
 'celebrate': {'sparkle': -15, 'doubling': -9, 'accompaniment': -8}, 'hatch': {'percussion': -10, 'accompaniment': -7, 'doubling': -10, 'cadence': -3},
 'poyo': {'doubling': -11, 'accompaniment': -8},
})
NIGHT = {'accompaniment': -7.5, 'bass': -9.5}
# 伴奏を 下げた ぶん、左右に 広い 持続音・残響の 割合が 増え、モノラル（iPhone の スピーカー 1つ）で 小さく なりやすい。広がりを 少し 狭める
for role, w in (('pad', .8), ('accompaniment', .7), ('sparkle', .75), ('doubling', .5)):
    R.BUS[role] = (R.BUS[role][0], R.BUS[role][1], w)

# ピアノの 打鍵の 山を やわらげる（音源の エンベロープ調整）。録音の アップライトピアノは 打鍵後 0.5 秒で −15〜−20 dB と 急に 減衰し、
# ペダルで 伸ばしても 一音ずつ 叩く ように 聞こえる（ぶつ切り）。立ち上がりの 山だけを A dB 下げ、時定数 τ で 元に もどす
# （0.5 秒で 約 1/5、1 秒で ほぼ 0）。響きの 部分が 相対的に 長く 歌う。音量は 最後に ラウドネスで そろえる。
import numpy as np
SOFTEN = {'home-night': 7.0}
SOFTEN_FAMILY = {'home4': 4.0, 'sleep': 3.0, 'farewell': 3.0, 'love': 3.0, 'memory': 3.0, 'fishing': 3.0, 'board': 3.0, 'koro': 2.0, 'celebrate': 2.0}
_soft = {'db': 0.0}
_note = L.Library.note
def note(self, inst, midi, dur, vel, layer):
    x = _note(self, inst, midi, dur, vel, layer)
    if inst == 'piano' and _soft['db'] > 0:
        t = np.arange(len(x)) / L.SR
        x = x * (10 ** (-_soft['db'] * np.exp(-t / .30) / 20))[:, None].astype(np.float32)
    return x
L.Library.note = note

_tc = V3.tonal_correction
def mono_safe(x):
    """左右の 差（side）が 中央（mid）に 対して −5 dB より 大きい 曲だけ、side を 少し 下げる（モノラル再生で 小さく ならない ように）。"""
    m = (x[:, 0] + x[:, 1]) * .5; s = (x[:, 0] - x[:, 1]) * .5
    sd = 10 * np.log10((s ** 2).mean() / ((m ** 2).mean() + 1e-20) + 1e-20)
    k = min(1.0, 10 ** ((-5.0 - sd) / 20)); _soft['sideScale'] = round(k, 3)
    if k >= 1: return x
    s = s * k
    return np.stack([m + s, m - s], 1)
def tonal_correction(x, loop, family, used=(0.0, 0.0)):
    if used == (0.0, 0.0): x = mono_safe(x)
    return _tc(x, loop, 'home3' if family == 'home4' else family, used)
R.tonal_correction = tonal_correction

def performed(s):
    """描画用の 写し: ピアノ・ハープは hold（ペダル）の 長さで 鳴らす。"""
    return {**s, 'events': [{**e, 'dur': e.get('hold', e['dur'])} for e in s['events']]}

def ids_for(arg, ids):
    home = ids[:4]; rest = ids[4:]
    if arg == ('--stage', '1'): return home
    if arg[0] == '--group':
        g = int(arg[1]); assert 2 <= g <= 5
        return rest[(g - 2) * 7:(g - 1) * 7]
    raise SystemExit('使い方: --stage 1 | --group 2..5 | 曲ID …')

if __name__ == '__main__':
    scores = json.loads((ROOT / 'scores-v4.json').read_text()); ids = [s['id'] for s in scores]
    args = sys.argv[1:]; force = '--force' in args; args = [a for a in args if a != '--force']
    want = ids_for(tuple(args[:2]), ids) if args and args[0].startswith('--') else (args or ids)
    lib = L.Library()
    for s in scores:
        if s['id'] not in want: continue
        if not force and R.receipt_ok(s['id']):
            print(f"skip {s['id']} (receipt と ハッシュが 一致)", flush=True); continue
        _soft['db'] = SOFTEN.get(s['id'], SOFTEN_FAMILY.get(s['family'], 0.0)); _soft['sideScale'] = 1.0
        saved = dict(R.FAMILY_BALANCE['home4'])
        if s['id'] == 'home-night': R.FAMILY_BALANCE['home4'].update(NIGHT)
        try:
            r = R.render(performed(s), lib)
        finally:
            R.FAMILY_BALANCE['home4'] = saved
        # MIDI は 譜面の 長さ（dur）で 書く（ペダルで 伸ばした 長さで 書くと 同じ 高さの 連続音が 1音に つながって しまう）
        (R.MIDI / f"{s['id']}.mid").write_bytes(R.midi_bytes(s)); r['midiSha256'] = R.sha(R.MIDI / f"{s['id']}.mid")
        r['version'] = 4; r['pianoAttackSoftenDb'] = _soft['db']; r['sideScale'] = _soft.get('sideScale', 1.0); r['removedNotes'] = len(s.get('removed', [])); r['pedalNotes'] = sum(1 for e in s['events'] if 'hold' in e)
        (R.REC / f"{s['id']}.json").write_text(json.dumps(r, ensure_ascii=False, indent=1) + '\n')
        b = r['bands']
        print(f"{s['id']:18s} {r['seconds']:7.2f}s LUFS {r['integratedLUFS']:6.1f} TP {r['truePeakDbtp']:5.1f} mono {r['monoLossDb']:5.2f} side {r['sideToMidDb']:5.1f} corr {r['aacFlacCorrelation']:.3f} cent {b['centroidHz']:5d} pres {b['pres3k_6k']:6.1f} air {b['air6k_12k']:6.1f} eq {r['tonalCorrection']} gains {r['roleGainsDb']} {r['renderSeconds']}s {'NG ' + ','.join(r['problems']) if r['problems'] else 'OK'}", flush=True)
