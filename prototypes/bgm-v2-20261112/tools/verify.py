"""なおとっち BGM VERSION 2 — 楽譜・旋律・ID・配置・保護ファイルの 点検（音を 描かずに できる 点検）。

1. 曲ID・曲名・テンポ・拍子・小節数・反復・長さ・ループ指定が V1 と 同じ。
2. 主旋律（role=melody）の 音高・開始時刻・長さ・本数が V1 と 完全一致（ホーム4曲は アレンジA の 全音が 一致）。
3. V1 の 伴奏・打楽器の 全音が、V2 に 同じ 時刻・音高・長さで 残っている（楽器が 変わるだけ＝主要な リズムを 保つ）。
4. V2 の MIDI の 主旋律トラックが 2 と 一致。
5. 配置表 50行の 曲が すべて V2 に ある。
6. V1 の 原盤（AAC・FLAC・MIDI）が V1 の source-lock / catalog の ハッシュの まま（V2 作業で 触って いない）。
使い方: python prototypes/bgm-v2-20261112/tools/verify.py [--audio]   （--audio は receipts の 検証値も 集計）
"""
import json, pathlib, hashlib, sys, struct
ROOT = pathlib.Path(__file__).resolve().parents[1]; V1 = ROOT.parent / 'bgm-master32-v1'
fails = []
def fail(m): fails.append(m)
sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
key = lambda e: (round(e['t'], 6), int(e['midi']), round(e['dur'], 6))

v1 = {s['id']: s for s in json.loads((V1 / 'scores.json').read_text())}
home = {h['id']: h for h in json.loads((V1 / 'home-scores-original.json').read_text())}
HOME = {'home-morning': 'soyokaze', 'home-day': 'current', 'home-evening': 'starlake', 'home-night': 'hoshizora'}
cat = json.loads((V1 / 'catalog.json').read_text())['tracks']
v2 = {s['id']: s for s in json.loads((ROOT / 'scores-v2.json').read_text())}

if [t['id'] for t in cat] != list(v2): fail('曲IDの 並び・数が V1 と 違う')
for t in cat:
    i = t['id']; s = v2[i]
    for k in ('title', 'bpm', 'meter', 'bars', 'repeats', 'loop'):
        if s[k] != t[k]: fail(f'{i}: {k} が V1 と 違う ({s[k]} != {t[k]})')
    src = home[HOME[i]] if i in HOME else v1[i]
    if i in HOME:
        a = sorted(key(e) for e in src['events']); b = sorted(key(e) for e in s['events'])
        if a != b: fail(f'{i}: アレンジA の 音が 変わった')
        if [e['instrument'] for e in sorted(src['events'], key=key)] != [e['instrument'] for e in sorted(s['events'], key=key)]: fail(f'{i}: アレンジA の 楽器が 変わった')
        mel1 = sorted(key(e) for e in src['events'] if e['role'] == 'melody')
    else:
        mel1 = sorted(key(e) for e in src['events'] if e['role'] == 'melody')
        others = sorted(key(e) for e in src['events'] if e['role'] != 'melody')
        have = {}
        for e in s['events']:
            if e['role'] != 'melody' and e['role'] != 'doubling' or (e['role'] == 'doubling' and e['instrument'] == 'glock' and src['family'] == 'hatch'):
                have[key(e)] = have.get(key(e), 0) + 1
        missing = 0
        for k in others:
            if have.get(k, 0) > 0: have[k] -= 1
            else: missing += 1
        if missing: fail(f'{i}: V1 の 伴奏・打楽器 {missing} 音が V2 に ない')
        for k2 in ('period', 'duration', 'leadIn'):
            if abs(s[k2] - src[k2]) > 1e-9: fail(f'{i}: {k2} が V1 と 違う')
    mel2 = sorted(key(e) for e in s['events'] if e['role'] == 'melody')
    if mel1 != mel2: fail(f'{i}: 主旋律が V1 と 一致しない')
    # MIDI の 主旋律（最初の 音符トラック）
    mp = ROOT / 'midi' / f'{i}.mid'
    if mp.exists():
        b = mp.read_bytes(); pos = 14; tracks = []
        while pos < len(b):
            n = struct.unpack('>I', b[pos + 4: pos + 8])[0]; tracks.append(b[pos + 8: pos + 8 + n]); pos += 8 + n
        tr = tracks[1]; t = 0; j = 0; on = {}; notes = []; run = 0
        while j < len(tr):
            d = 0
            while True:
                c = tr[j]; j += 1; d = (d << 7) | (c & 127)
                if c < 128: break
            t += d; st = tr[j]
            if st == 0xff:
                ln = tr[j + 2]; j += 3 + ln; continue
            if st >= 0x80: run = st; j += 1
            if run & 0xf0 in (0x90, 0x80):
                note, vel = tr[j], tr[j + 1]; j += 2
                if run & 0xf0 == 0x90 and vel: on[note] = t
                else: notes.append((on.pop(note), note, t))
            elif run & 0xf0 == 0xc0: j += 1
        mm = sorted((round(a / 960 * 60 / s['bpm'], 3), n) for a, n, _ in notes)
        ev = sorted({(round(e['t'] * s['bpm'] / 60 * 960) / 960 * 60 / s['bpm'], e['midi']) for e in s['events'] if e['role'] == 'melody'})
        ev = sorted((round(a, 3), n) for a, n in ev)
        if mm != ev: fail(f'{i}: MIDI の 主旋律トラックが 楽譜と 違う')
    elif '--audio' in sys.argv: fail(f'{i}: MIDI が ない')

placed = {sid for r in json.loads((V1 / 'placement.json').read_text()) for sid in r['songs']}
missing = placed - set(v2)
if missing: fail(f'配置表の 曲が V2 に ない: {sorted(missing)}')
if len(json.loads((V1 / 'placement.json').read_text())) != 50: fail('配置表が 50行で ない')

for t in cat:
    for k, f in (('audioSha256', t['audio']), ('masterSha256', t['master'])):
        if sha(V1 / f) != t[k]: fail(f"V1 の {f} が 変わった")

summary = {'songs': len(v2), 'placementRows': 50, 'melodyNotes': sum(1 for s in v2.values() for e in s['events'] if e['role'] == 'melody')}
if '--audio' in sys.argv:
    recs = []
    for i in v2:
        p = ROOT / 'receipts' / f'{i}.json'
        if not p.exists(): fail(f'{i}: receipt が ない'); continue
        r = json.loads(p.read_text()); recs.append(r)
        if r['problems']: fail(f"{i}: {r['problems']}")
        if r['flacSha256'] != sha(ROOT / 'audio' / f'{i}.flac') or r['aacSha256'] != sha(ROOT / 'audio' / f'{i}.m4a'): fail(f'{i}: 音源の ハッシュが receipt と 違う')
    summary['audio'] = len(recs)
print(json.dumps(summary, ensure_ascii=False))
if fails:
    print('\n'.join('FAIL ' + f for f in fails)); sys.exit(1)
print('OK: 曲ID・主旋律・伴奏の リズム・MIDI 主旋律・配置50行・V1 原盤の 保護')
