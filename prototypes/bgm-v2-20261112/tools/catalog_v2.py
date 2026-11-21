"""V2 の 曲目表（ゲーム統合と 比較ページ用）。V1 の catalog.json の 曲ID・曲名・用途・配置行を そのまま 引きつぎ、
V2 の 音源・長さ・ラウドネスを 足す。出力: catalog-v2.json と compare/catalog.js"""
import json, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1]; V1 = ROOT.parent / 'bgm-master32-v1'
cat = json.loads((V1 / 'catalog.json').read_text()); dm = {d['id']: d for d in json.loads((V1 / 'decoded-metrics.json').read_text())} if isinstance(json.loads((V1 / 'decoded-metrics.json').read_text()), list) else {}
scores = {s['id']: s for s in json.loads((ROOT / 'scores-v2.json').read_text())}
FEATURED = ['home-morning', 'koro-1', 'card-2', 'var-flight', 'event-1', 'bgm-farewell']
tracks = []
for t in cat['tracks']:
    r = json.loads((ROOT / 'receipts' / f"{t['id']}.json").read_text()); s = scores[t['id']]
    v1lufs = t.get('integratedLUFS')
    tracks.append({k: t[k] for k in ('number', 'id', 'title', 'usage', 'category', 'bpm', 'meter', 'bars', 'repeats', 'loop', 'placementRows')} | {
        'featured': FEATURED.index(t['id']) + 1 if t['id'] in FEATURED else 0,
        'tone': s['tone'], 'targetLUFS': s['targetLUFS'],
        'v1': {'audio': t['audio'].split('/')[-1], 'duration': t['duration'], 'lufs': v1lufs},
        'v2': {'audio': f"{t['id']}.m4a", 'master': f"{t['id']}.flac", 'midi': f"{t['id']}.mid", 'duration': r['frames'] / r['sampleRate'], 'frames': r['frames'], 'sampleRate': r['sampleRate'], 'lufs': r['integratedLUFS'], 'truePeak': r['truePeakDbtp'], 'aacSha256': r['aacSha256'], 'flacSha256': r['flacSha256']},
        'loopStart': 0, 'loopEnd': r['frames'] / r['sampleRate'] if t['loop'] else None})
out = {'version': 2, 'basedOn': 'PR #536 catalog.json（曲ID・曲名・用途・配置行は 変更なし）', 'tracks': tracks}
(ROOT / 'catalog-v2.json').write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n')
(ROOT / 'compare' / 'catalog.js').write_text('window.BGM_V2_CATALOG = ' + json.dumps(out, ensure_ascii=False) + ';\n')
print(len(tracks), 'tracks; featured', [t['id'] for t in sorted(tracks, key=lambda x: x['featured']) if t['featured']])
