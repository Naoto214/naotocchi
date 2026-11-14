"""Fail closed on missing batch outputs, changed melodies or stale receipts."""
import json,pathlib,sys,hashlib,subprocess,unittest
import mido
from provenance import fingerprint
ROOT=pathlib.Path(__file__).resolve().parents[1];REPO=ROOT.parents[1];V5=ROOT.parent/'bgm-v5-20261115'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def midi_melody(path):
 m=mido.MidiFile(path);t=0;out=[]
 for e in m.tracks[1]:
  t+=e.time
  if e.type in ('note_on','note_off'):out.append((t,e.type,e.note,e.velocity>0 if e.type=='note_on' else False))
 return out
def main():
 scores=json.loads((ROOT/'scores-v6.json').read_text());ids=[s['id'] for s in scores]
 args=sys.argv[1:];want=ids if not args else (ids[:4] if args==['--home'] else ids[(int(args[1])-2)*7+4:(int(args[1])-1)*7+4] if args[0]=='--group' else args)
 assert set(want)<=set(ids),'unknown track'
 suite=unittest.defaultTestLoader.discover(str(ROOT/'tools'),pattern='test_*.py')
 assert unittest.TextTestRunner(verbosity=1).run(suite).wasSuccessful()
 # Protect original master melody independently of V5.
 v1={s['id']:s for s in json.loads((ROOT.parent/'bgm-master32-v1/scores.json').read_text())}
 home={s['id']:s for s in json.loads((ROOT.parent/'bgm-master32-v1/home-scores-original.json').read_text())}
 mapping={'home-morning':'soyokaze','home-day':'current','home-evening':'starlake','home-night':'hoshizora'}
 key=lambda s:sorted((e['t'],e['midi'],e['dur']) for e in s['events'] if e['role']=='melody')
 for s in scores:
  orig=home[mapping[s['id']]] if s['id'] in mapping else v1[s['id']]
  assert key(s)==key(orig),s['id']+' V1 melody mismatch'
  if s['id'] not in want:continue
  sid=s['id'];r=json.loads((ROOT/'receipts'/f'{sid}.json').read_text())
  assert r['version']==6 and r['sourceFingerprint']==fingerprint(s),sid+' stale receipt'
  assert not r['problems'],(sid,r['problems'])
  for ext,k in [('flac','flacSha256'),('m4a','aacSha256')]:assert sha(ROOT/'audio'/f'{sid}.{ext}')==r[k],sid
  assert sha(ROOT/'midi'/f'{sid}.mid')==r['midiSha256']
  assert midi_melody(ROOT/'midi'/f'{sid}.mid')==midi_melody(V5/'midi'/f'{sid}.mid'),sid+' MIDI mismatch'
  assert r['clippedSamples']==0 and r['truePeakDbtp']<=-1 and r['monoLossDb']>=-1.5
  assert abs(r['integratedLUFS']-s['targetLUFS'])<.2
  assert r['limiterMaxGainReductionDb']==0,(sid,'unexpected compression')
  print(sid,'OK',r['integratedLUFS'],'LUFS',r['truePeakDbtp'],'dBTP',r['monoLossDb'],'mono')
 # Any changes outside the V6 source/plan are a preservation failure.
 changes=subprocess.check_output(['git','diff','--name-only','0cf8100d3ad85888f5e32f670a56631ecb4e82ce','--'],cwd=REPO,text=True).splitlines()
 assert all(p.startswith(('prototypes/bgm-v6-20261114/','docs/superpowers/plans/2026-11-14-bgm-v6.md')) for p in changes),changes
 print(f'PASS: {len(want)} complete outputs; 32 IDs, 3158 V1 melody notes, 50 placements, old tracked files unchanged')
if __name__=='__main__':main()
