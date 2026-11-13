"""なおとっち BGM VERSION 3 — 描画・ミックス・マスタリング（V2 の 描画部品を そのまま 使い、音づくりの 設定だけ 変える）。

使い方（リポジトリの ルートで）:
  python prototypes/bgm-v3-20261113/tools/render_v3.py --stage 1        # 第1段階: ホーム4曲
  python prototypes/bgm-v3-20261113/tools/render_v3.py --group 2..5     # 第2段階: 残り28曲を 7曲ずつ
  python prototypes/bgm-v3-20261113/tools/render_v3.py home-day …       # 指定した 曲だけ

V2 から 変えた 点（「チン」「キン」と 耳に 刺さる 高音を 生まない ため）:
  * 仕上げの 帯域補正で 高域を 持ち上げない（8 kHz 以上は 下げる 方向だけ、3〜6 kHz の 補いは 最大 +2.5 dB）。
  * ピアノの 補正 EQ を やわらかく（V2: 3.4 kHz +4 dB・9 kHz 以上 +3 dB → V3: 2.6 kHz +1.5 dB のみ）。
  * ハープ・マリンバ・グロッケン・打楽器の 6〜7 kHz 以上を 少し 丸める（撥音の 金属的な 角を とる）。
  * ホーム4曲にも 役割の 音量バランスを 使う（ギター・ウッドベース・木管が 加わった ため）。
完成した 曲は receipts/<id>.json の ハッシュが 一致すれば 作り直さない。
"""
import json, math, pathlib, sys
import numpy as np
V2T = pathlib.Path(__file__).resolve().parents[2] / 'bgm-v2-20261112' / 'tools'
sys.path.insert(0, str(V2T))
import library as L
import render_v2 as R

ROOT = pathlib.Path(__file__).resolve().parents[1]
R.AUDIO, R.MIDI, R.REC = ROOT / 'audio', ROOT / 'midi', ROOT / 'receipts'

R.INST_EQ = {
 'piano': [('peak', 2600, 1.5, .7)],
 'harp': [('highshelf', 6500, -3.0, .7)],
 'marimba': [('highshelf', 6000, -3.5, .7)],
 'glock': [('highshelf', 7000, -5.0, .7), ('peak', 3000, -1.5, .9)],
 'woodbass': [('peak', 900, 1.5, 1.0)],
 'cellos': [('peak', 250, -1.5, .9)],
 'trumpet': [('peak', 2600, -1.0, 1.0)],
 'shaker': [('highshelf', 7000, -3.0, .7)],
 'cymbal': [('highshelf', 6000, -4.0, .7)],
}
R.BUS['percussion'] = ([('hp', 45), ('highshelf', 6500, -5.0, .7)], .5, .7)
R.BUS['sparkle'] = ([('hp', 300), ('highshelf', 7000, -2.0, .7)], 1.4, .9)
R.BALANCE['doubling'] = -9
R.FAMILY_BALANCE.update({
 'home3': {'accompaniment': -6, 'bass': -8, 'doubling': -10},
 'flight': {'sparkle': -12, 'doubling': -12, 'pad': -12},
 'celebrate': {'sparkle': -14, 'doubling': -8},
})
NIGHT = {'accompaniment': -4.5, 'bass': -7}

def tonal_correction(x, loop, family, used=(0.0, 0.0)):
    """V3: 明瞭さ（3〜6 kHz）は 足りない 分を 最大 +2.5 dB まで。空気感（8 kHz 以上）は 多すぎる ときに 下げる だけ。"""
    b = R.band_levels(x); bands = []
    if family == 'home3': tp = -24.0
    elif family in ('sleep', 'farewell', 'puzzle', 'fishing', 'love', 'memory'): tp = -23.0
    elif family in ('flight', 'celebrate', 'hatch'): tp = -20.5
    else: tp = -21.5
    air_max = -26.0 if family in ('flight', 'celebrate', 'hatch') else -29.0
    d1 = tp - b['pres3k_6k']; d1 = 0 if abs(d1) <= 1.5 else d1 - math.copysign(1.5, d1)
    g1 = float(np.clip(d1, -6 - used[0], 2.5 - used[0]))
    d2 = air_max - b['air6k_12k'] - .6 * max(g1, 0)
    g2 = float(np.clip(d2, -5 - used[1], 0.0)) if d2 < -1 else 0.0
    if abs(g1) > .3: bands.append(('peak', 3800, round(g1, 1), .7))
    if abs(g2) > .3: bands.append(('highshelf', 8000, round(g2, 1), .7))
    if b['lowmid250_800'] > -2.5 and used == (0.0, 0.0): bands.append(('peak', 380, -1.5, .8))
    return R.eq(x, bands, loop), bands, b
R.tonal_correction = tonal_correction

def ids_for(arg, ids):
    home = ids[:4]; rest = ids[4:]
    if arg == ('--stage', '1'): return home
    if arg[0] == '--group':
        g = int(arg[1]); assert 2 <= g <= 5, 'グループは 2〜5（7曲ずつ）'
        return rest[(g - 2) * 7:(g - 1) * 7]
    raise SystemExit('使い方: --stage 1 | --group 2..5 | 曲ID …')

if __name__ == '__main__':
    scores = json.loads((ROOT / 'scores-v3.json').read_text()); ids = [s['id'] for s in scores]
    args = sys.argv[1:]; force = '--force' in args; args = [a for a in args if a != '--force']
    want = ids_for(tuple(args[:2]), ids) if args and args[0].startswith('--') else (args or ids)
    lib = L.Library()
    for s in scores:
        if s['id'] not in want: continue
        if not force and R.receipt_ok(s['id']):
            print(f"skip {s['id']} (receipt と ハッシュが 一致)", flush=True); continue
        saved = dict(R.FAMILY_BALANCE['home3'])
        if s['id'] == 'home-night': R.FAMILY_BALANCE['home3'].update(NIGHT)
        try:
            r = R.render(s, lib)
        finally:
            R.FAMILY_BALANCE['home3'] = saved
        r['version'] = 3; r['removedNotes'] = len(s.get('removed', []))
        (R.REC / f"{s['id']}.json").write_text(json.dumps(r, ensure_ascii=False, indent=1) + '\n')
        b = r['bands']
        print(f"{s['id']:18s} {r['seconds']:7.2f}s LUFS {r['integratedLUFS']:6.1f} TP {r['truePeakDbtp']:5.1f} mono {r['monoLossDb']:5.2f} side {r['sideToMidDb']:5.1f} corr {r['aacFlacCorrelation']:.3f} cent {b['centroidHz']:5d} pres {b['pres3k_6k']:6.1f} air {b['air6k_12k']:6.1f} eq {r['tonalCorrection']} gains {r['roleGainsDb']} {r['renderSeconds']}s {'NG ' + ','.join(r['problems']) if r['problems'] else 'OK'}", flush=True)
