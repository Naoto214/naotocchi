"""Score/MIDI/master locks and delivered waveform receipts; full or group."""
import sys,json,subprocess
from render import ROOT,BASE,sha,lock,fingerprint
sys.path.insert(0,str(BASE/'bgm-v6-20261114/tools'));from verify_v6 import midi_melody
scores=json.loads((ROOT/'scores-v7.json').read_text());v6={s['id']:s for s in json.loads((BASE/'bgm-v6-20261114/scores-v6.json').read_text())};orig={s['id']:s for s in json.loads((BASE/'bgm-master32-v1/scores.json').read_text())};home={s['id']:s for s in json.loads((BASE/'bgm-master32-v1/home-scores-original.json').read_text())};mapping={'home-morning':'soyokaze','home-day':'current','home-evening':'starlake','home-night':'hoshizora'}
args=sys.argv[1:];want=json.loads((ROOT/'groups.json').read_text())[args[1]] if args and args[0]=='--group' else [s['id'] for s in scores]
lock();assert len(scores)==32 and len({s['id'] for s in scores})==32
assert sha(ROOT/'placement.json')==sha(BASE/'bgm-master32-v1/placement.json')
key=lambda s:[(e['t'],e['midi'],e['dur']) for e in s['events'] if e['role']=='melody']
assert sum(len(key(s)) for s in scores)==3158
report=[]
for s in scores:
 sid=s['id'];assert key(s)==key(home[mapping[sid]] if sid in mapping else orig[sid]),sid
 assert s['title']==v6[sid]['title']
 if sid not in mapping:assert s==v6[sid],sid+' V6 score/expression changed'
 if sid not in want:continue
 r=json.loads((ROOT/'receipts'/f'{sid}.json').read_text());assert not r['problems']
 for ext,k in [('flac','flacSha256'),('m4a','aacSha256')]:assert sha(ROOT/'audio'/f'{sid}.{ext}')==r[k]
 assert sha(ROOT/'midi'/f'{sid}.mid')==r['midiSha256']
 assert midi_melody(ROOT/'midi'/f'{sid}.mid')==midi_melody(BASE/'bgm-v6-20261114/midi'/f'{sid}.mid')
 if sid not in mapping:
  assert r['sourceFingerprint']==fingerprint(s),sid+' stale production code'
  assert r['syntheticLoops']==0 and all(u['usedEndFrame']<=u['nativeFrames'] for u in r['nativeSourceUses'])
 assert r['clippedSamples']==0 and r['truePeakDbtp']<=-1 and r['monoLossDb']>=-1.5
 assert abs(r['integratedLUFS']-s['targetLUFS'])<.2
 assert r['limiterMaxGainReductionDb']==0,(sid,'compression')
 report.append({k:r[k] for k in ['id','title','integratedLUFS','truePeakDbtp','monoLossDb','aacFlacCorrelation','loopJoinJump','loopJoinTypicalStep999','clippedSamples','aacSha256','flacSha256']})
changes=subprocess.check_output(['git','diff','--name-only','c9c4b82','--'],cwd=BASE.parent,text=True).splitlines()
assert all(p.startswith(('prototypes/bgm-v7-complete-20261114/','docs/superpowers/plans/2026-11-14-bgm-v7-complete.md')) for p in changes),changes
out={'passed':True,'tracks':len(report),'melodyNotes':3158,'placements':50,'homeLockFiles':16,'scope':'preview only; production unchanged','results':report}
(ROOT/'verification'/('group-'+args[1]+'.json' if args else 'full32.json')).write_text(json.dumps(out,ensure_ascii=False,indent=1)+'\n')
print('PASS',len(report),'tracks; 3158 melody notes; 50 placements; approved home masters exact')
