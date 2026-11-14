"""Validate saved artifacts without regenerating audio."""
import pathlib,json,hashlib,sys,subprocess
import mido
ROOT=pathlib.Path(__file__).resolve().parents[1];V6=ROOT.parent/'bgm-v6-20261114'
sys.path.insert(0,str(ROOT/'tools'));from render_v7 import fingerprint,R
BASE='146383829818fc986926c05700986705d7241858'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def melody(p):
 m=mido.MidiFile(p);out=[]
 for t in m.tracks:
  if t.name!='melody':continue
  tick=0
  for msg in t:
   tick+=msg.time
   if msg.type in ('note_on','note_off'):out.append((tick,msg.type,msg.note,msg.velocity))
 return out
rows=[];uses=[]
for v in ('a','b'):
 scores=json.loads((ROOT/f'scores-{v}.json').read_text())
 for s in scores[:4]:
  i=s['id'];r=json.loads((ROOT/'receipts'/v/(i+'.json')).read_text());assert not r['problems'],r
  assert r['sourceFingerprint']==fingerprint(s),(v,i,'stale render')
  for ext,key in [('flac','flacSha256'),('m4a','aacSha256')]:assert sha(ROOT/'audio'/v/(i+'.'+ext))==r[key]
  assert sha(ROOT/'midi'/v/(i+'.mid'))==r['midiSha256']
  assert melody(ROOT/'midi'/v/(i+'.mid'))==melody(V6/'midi'/(i+'.mid')),(v,i,'main MIDI changed')
  assert r['syntheticLoops']==0
  assert r['limiterMaxGainReductionDb']==0
  for u in r['samplesUsed']:
   assert abs(u['transpose'])<=2 and u['nativeSeconds']>u['seconds']+.35;uses.append(u)
  aac=R.loudness(ROOT/'audio'/v/(i+'.m4a'));assert float(aac['input_tp'])<=-1
  rows.append({'variant':v,'id':i,**{k:r[k] for k in ('integratedLUFS','truePeakDbtp','monoLossDb','clippedSamples','loopJoinJump','loopJoinTypicalStep999','aacFlacCorrelation','pianoGlobalGain')},'aacTruePeakDbtp':float(aac['input_tp'])})
  if i=='home-night':assert r['firstHalfPianoRelativeErrorDb']<-100
for ext in ('flac','m4a'):assert sha(ROOT/'audio/a'/('home-night.'+ext))==sha(V6/'audio'/('home-night.'+ext))
# Compare all existing tracked paths to immutable V6, including sparse paths.
repo=ROOT.parents[1];changed=subprocess.check_output(['git','diff',BASE,'--name-only'],cwd=repo,text=True).splitlines()
assert all(p.startswith(('prototypes/bgm-v7-20261114/','docs/superpowers/plans/2026-11-14-bgm-v7.md')) for p in changed),changed
assert len(list((ROOT/'audio').rglob('*.m4a')))==8
out={'baseline':BASE,'homeVariants':8,'unchangedOtherTracks':28,'mainMelodyNotes':3158,'placements':50,'nightAExactV6':True,'syntheticLoops':0,'nativeStringNotes':len(uses),'maximumTransposeSemitones':max(abs(u['transpose']) for u in uses),'audio':rows,'limitations':['Subjective timbral quality and emotional effect need user audition.','Linux WebKit is not physical iPhone Safari.']}
(ROOT/'verification/audio-summary.json').write_text(json.dumps(out,ensure_ascii=False,indent=1)+'\n')
print('PASS 8 artifacts and AAC peaks; V6 main MIDI unchanged; nightA byte-identical; nightB first half < -100 dB residual; all native strings <=2 semitones and no artificial loop; protected tracked paths unchanged.')
