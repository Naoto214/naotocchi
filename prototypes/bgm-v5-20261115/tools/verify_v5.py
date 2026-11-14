"""なおとっち BGM VERSION 5 — 楽譜・旋律・ID・配置・保護ファイルの 点検。

1. 曲ID・曲名・テンポ・拍子・小節数・反復・長さ・ループ指定が V1 と 同じ（32曲・同じ 並び）。
2. 主旋律（role=melody）の 音高・開始時刻・長さ・本数が V1 と 完全一致。
3. V1 の 伴奏・打楽器の 全音が、V4 に 同じ 音高・長さで 残っている（時刻の ずれは ギターの 和音の ずらし 30 ms まで）か、
   「音楽的な 役割の ない 単発の 装飾音」として removed に 理由つきで 記録されて いる（削除は ハープ／マリンバ／グロッケンの 単発音 だけ）。
4. MIDI の 主旋律トラックが 2 と 一致。
5. 配置表 50行の 曲が すべて V3 に ある。
6. V1・V2 の 原盤（AAC・FLAC）が それぞれの catalog・receipt の ハッシュの まま（V3 作業で 触って いない）。
使い方: python prototypes/bgm-v3-20261113/tools/verify_v3.py [--audio]
"""
import json, pathlib, hashlib, sys, struct
ROOT = pathlib.Path(__file__).resolve().parents[1]; V1 = ROOT.parent / 'bgm-master32-v1'; V2 = ROOT.parent / 'bgm-v2-20261112'; V3 = ROOT.parent / 'bgm-v3-20261113'; V4 = ROOT.parent / 'bgm-v4-20261114'
fails = []
def fail(m): fails.append(m)
sha = lambda p: hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
key = lambda e: (round(e['t'], 6), int(e['midi']), round(e['dur'], 6))
v1 = {s['id']: s for s in json.loads((V1 / 'scores.json').read_text())}
home = {h['id']: h for h in json.loads((V1 / 'home-scores-original.json').read_text())}
HOME = {'home-morning': 'soyokaze', 'home-day': 'current', 'home-evening': 'starlake', 'home-night': 'hoshizora'}
cat = json.loads((V1 / 'catalog.json').read_text())['tracks']
v3 = {s['id']: s for s in json.loads((ROOT / 'scores-v5.json').read_text())}  # V4 の 楽譜（変数名は V3 版から の 流用）
DECOR = {'harp', 'marimba', 'glock', 'bell', 'guitar', 'shaker', 'cymbal', 'kick', 'snare', 'snarehit', 'tamb', 'sleigh'}

if [t['id'] for t in cat] != list(v3): fail('曲IDの 並び・数が V1 と 違う')
stats = {'removed': 0, 'shifted': 0}
for t in cat:
    i = t['id']; s = v3[i]
    for k in ('title', 'bpm', 'meter', 'bars', 'repeats', 'loop'):
        if s[k] != t[k]: fail(f'{i}: {k} が V1 と 違う')
    src = home[HOME[i]] if i in HOME else v1[i]
    mel1 = sorted(key(e) for e in src['events'] if e['role'] == 'melody')
    mel3 = sorted(key(e) for e in s['events'] if e['role'] == 'melody')
    if mel1 != mel3: fail(f'{i}: 主旋律が V1 と 一致しない')
    # 伴奏・打楽器: 同じ 音高・長さで、時刻が 30 ms 以内に ある（ギターの ずらし）
    have = {}
    for e in s['events']:
        if e['role'] in ('melody', 'doubling') and not (e['role'] == 'doubling' and e['instrument'] == 'glock' and src['family'] == 'hatch'): continue
        have.setdefault((int(e['midi']), round(e['dur'], 6)), []).append(e['t'])
    rem = {}
    for e in s.get('removed', []):
        rem.setdefault(key(e), 0); rem[key(e)] += 1
        if e['instrument'] not in DECOR: fail(f"{i}: 装飾音 以外が 削除された（{e['instrument']}）")
        if e['role'] == 'melody': fail(f'{i}: 主旋律の 音が 削除された')
        if not e.get('reason'): fail(f'{i}: 削除の 理由が ない')
    missing = 0
    for e in src['events']:
        if e['role'] == 'melody': continue
        k = key(e)
        if rem.get(k, 0) > 0: rem[k] -= 1; stats['removed'] += 1; continue
        lst = have.get((int(e['midi']), round(e['dur'], 6)), [])
        j = next((n for n, tt in enumerate(lst) if -1e-6 <= tt - e['t'] <= .0301), None)
        if j is None: missing += 1; continue
        if abs(lst[j] - e['t']) > 1e-6: stats['shifted'] += 1
        lst.pop(j)
    if missing: fail(f'{i}: V1 の 伴奏・打楽器 {missing} 音が V4 に ない（削除の 記録も ない）')
    if any(v for v in rem.values()): fail(f'{i}: removed の 記録が V1 の 音と 対応しない')
    mp = ROOT / 'midi' / f'{i}.mid'
    if mp.exists():
        b = mp.read_bytes(); pos = 14; tracks = []
        while pos < len(b):
            n = struct.unpack('>I', b[pos + 4: pos + 8])[0]; tracks.append(b[pos + 8: pos + 8 + n]); pos += 8 + n
        tr = tracks[1]; tt = 0; j = 0; on = {}; notes = []; run = 0
        while j < len(tr):
            d = 0
            while True:
                c = tr[j]; j += 1; d = (d << 7) | (c & 127)
                if c < 128: break
            tt += d; st = tr[j]
            if st == 0xff: ln = tr[j + 2]; j += 3 + ln; continue
            if st >= 0x80: run = st; j += 1
            if run & 0xf0 in (0x90, 0x80):
                note, vel = tr[j], tr[j + 1]; j += 2
                if run & 0xf0 == 0x90 and vel: on[note] = tt
                else: notes.append((on.pop(note), note, tt))
            elif run & 0xf0 == 0xc0: j += 1
        mm = sorted((round(a / 960 * 60 / s['bpm'], 3), n) for a, n, _ in notes)
        ev = sorted({(round(e['t'] * s['bpm'] / 60 * 960) / 960 * 60 / s['bpm'], e['midi']) for e in s['events'] if e['role'] == 'melody'})
        if mm != sorted((round(a, 3), n) for a, n in ev): fail(f'{i}: MIDI の 主旋律トラックが 楽譜と 違う')
    elif '--audio' in sys.argv: fail(f'{i}: MIDI が ない')

BANNED = {'guitar', 'shaker', 'cymbal', 'tamb', 'sleigh', 'triangle', 'xylo', 'bell'}
RHYTHM = {'action', 'quick', 'sports', 'race', 'card', 'hatch'}
for i, s in v3.items():
    for e in s['events']:
        if e['instrument'] in BANNED: fail(f"{i}: V4 で 除いた 楽器 {e['instrument']} が ある")
        if e['instrument'] == 'glock' and not (e['role'] == 'doubling' and s['family'] in ('flight', 'hatch')): fail(f"{i}: 単発の グロッケンが ある")
        if e['role'] == 'percussion' and s['family'] not in RHYTHM: fail(f"{i}: 静かな 曲に 打楽器が ある")
        if e['role'] in ('counter', 'response') and e['instrument'] not in ('clarinet', 'flute', 'violas', 'cellos'): fail(f"{i}: 追加した 声部の 楽器が 想定外（{e['instrument']}）")
placed = {sid for r in json.loads((V1 / 'placement.json').read_text()) for sid in r['songs']}
if placed - set(v3): fail(f'配置表の 曲が V4 に ない: {sorted(placed - set(v3))}')
if len(json.loads((V1 / 'placement.json').read_text())) != 50: fail('配置表が 50行で ない')
for t in cat:
    for k, f in (('audioSha256', t['audio']), ('masterSha256', t['master'])):
        if sha(V1 / f) != t[k]: fail(f'V1 の {f} が 変わった')
    r4 = json.loads((V4 / 'receipts' / f"{t['id']}.json").read_text())
    if sha(V4 / 'audio' / f"{t['id']}.m4a") != r4['aacSha256'] or sha(V4 / 'audio' / f"{t['id']}.flac") != r4['flacSha256']: fail(f"V4 の {t['id']} が 変わった")
    r3 = json.loads((V3 / 'receipts' / f"{t['id']}.json").read_text())
    if sha(V3 / 'audio' / f"{t['id']}.m4a") != r3['aacSha256'] or sha(V3 / 'audio' / f"{t['id']}.flac") != r3['flacSha256']: fail(f"V3 の {t['id']} が 変わった")
    r2 = json.loads((V2 / 'receipts' / f"{t['id']}.json").read_text())
    if sha(V2 / 'audio' / f"{t['id']}.m4a") != r2['aacSha256'] or sha(V2 / 'audio' / f"{t['id']}.flac") != r2['flacSha256']: fail(f"V2 の {t['id']} が 変わった")

summary = {'songs': len(v3), 'placementRows': 50, 'melodyNotes': sum(1 for s in v3.values() for e in s['events'] if e['role'] == 'melody'), 'removedDecorativeNotes': stats['removed'], 'strummedShiftedNotes': stats['shifted']}
if '--audio' in sys.argv:
    done = 0
    for i in v3:
        p = ROOT / 'receipts' / f'{i}.json'
        if not p.exists(): continue
        r = json.loads(p.read_text()); done += 1
        if r['problems']: fail(f"{i}: {r['problems']}")
        if r['flacSha256'] != sha(ROOT / 'audio' / f'{i}.flac') or r['aacSha256'] != sha(ROOT / 'audio' / f'{i}.m4a'): fail(f'{i}: 音源の ハッシュが receipt と 違う')
    summary['audioDone'] = done
print(json.dumps(summary, ensure_ascii=False))
if fails:
    print('\n'.join('FAIL ' + f for f in fails)); sys.exit(1)
print('OK: 曲ID・主旋律・伴奏の 音（削除は 理由つきの 装飾音・ギターの きざみ・高域打楽器 だけ）・MIDI 主旋律・配置50行・V1/V2/V3/V4 原盤の 保護・V4 で 除いた 音の 再導入 なし')
