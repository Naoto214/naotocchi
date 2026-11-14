"""なおとっち BGM VERSION 5 — 描画（V4 の 描画設定を そのまま 使う: ペダル・離鍵・打鍵の やわらげ・伴奏の 音量・モノラル保護）。

V4 から 変えた 点:
  * 新しい 声部 counter（和音に 沿う 内声の 対旋律）と response（木管の 短い 応答）を 描く。主旋律に 対して 対旋律 −14 dB・応答 −13 dB。
  * 旋律と 重ねの 強さは arrange_v5.py が 1音ずつ 補正した 値（音量ムラの 修正）。
使い方（リポジトリの ルートで）:
  python prototypes/bgm-v5-20261115/tools/render_v5.py --stage 1 | --group 2..5 | 曲ID …
"""
import json, pathlib, sys
V4T = pathlib.Path(__file__).resolve().parents[2] / 'bgm-v4-20261114' / 'tools'
sys.path.insert(0, str(V4T))
_argv = sys.argv; sys.argv = sys.argv[:1]
import render_v4 as V4
sys.argv = _argv
R, L = V4.R, V4.L
ROOT = pathlib.Path(__file__).resolve().parents[1]
R.AUDIO, R.MIDI, R.REC = ROOT / 'audio', ROOT / 'midi', ROOT / 'receipts'
R.BUS['counter'] = ([('hp', 90), ('peak', 350, -1.5, .9)], 1.15, .5)
R.BUS['response'] = ([('hp', 150)], 1.2, .5)
R.ROLE_DB['counter'] = 0; R.ROLE_DB['response'] = 0
R.BALANCE.update({'counter': -14, 'response': -13})
R.FAMILY_BALANCE['home4'].update({'counter': -15, 'response': -14})

def ids_for(arg, ids):
    home = ids[:4]; rest = ids[4:]
    if arg == ('--stage', '1'): return home
    if arg[0] == '--group':
        g = int(arg[1]); assert 2 <= g <= 5
        return rest[(g - 2) * 7:(g - 1) * 7]
    raise SystemExit('使い方: --stage 1 | --group 2..5 | 曲ID …')

if __name__ == '__main__':
    scores = json.loads((ROOT / 'scores-v5.json').read_text()); ids = [s['id'] for s in scores]
    args = sys.argv[1:]; force = '--force' in args; args = [a for a in args if a != '--force']
    want = ids_for(tuple(args[:2]), ids) if args and args[0].startswith('--') else (args or ids)
    lib = L.Library()
    for s in scores:
        if s['id'] not in want: continue
        if not force and R.receipt_ok(s['id']):
            print(f"skip {s['id']} (receipt と ハッシュが 一致)", flush=True); continue
        V4._soft['db'] = V4.SOFTEN.get(s['id'], V4.SOFTEN_FAMILY.get(s['family'], 0.0)); V4._soft['sideScale'] = 1.0
        saved = dict(R.FAMILY_BALANCE['home4'])
        if s['id'] == 'home-night': R.FAMILY_BALANCE['home4'].update(V4.NIGHT)
        try:
            r = R.render(V4.performed(s), lib)
        finally:
            R.FAMILY_BALANCE['home4'] = saved
        (R.MIDI / f"{s['id']}.mid").write_bytes(R.midi_bytes(s)); r['midiSha256'] = R.sha(R.MIDI / f"{s['id']}.mid")
        r['version'] = 5; r['pianoAttackSoftenDb'] = V4._soft['db']; r['sideScale'] = V4._soft.get('sideScale', 1.0)
        r['removedNotes'] = len(s.get('removed', [])); r['pedalNotes'] = sum(1 for e in s['events'] if 'hold' in e); r['v5'] = s.get('v5', {})
        (R.REC / f"{s['id']}.json").write_text(json.dumps(r, ensure_ascii=False, indent=1) + '\n')
        b = r['bands']
        print(f"{s['id']:18s} {r['seconds']:7.2f}s LUFS {r['integratedLUFS']:6.1f} TP {r['truePeakDbtp']:5.1f} mono {r['monoLossDb']:5.2f} pres {b['pres3k_6k']:6.1f} gains {r['roleGainsDb']} {'NG ' + ','.join(r['problems']) if r['problems'] else 'OK'}", flush=True)
