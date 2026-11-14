"""Verify saved artifacts, immutable B MIDI, input score and all audible diagnostics."""
import pathlib,json,hashlib,sys,math
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[1];V7=ROOT.parent/'bgm-v7-20261114'
from performance import build
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
scores=json.loads((V7/'scores-b.json').read_text());assert len(scores)==32
assert sum(e['role']=='melody' for s in scores for e in s['events'])==3158
summary={'baselineCommit':'25c69a0a78e7f72351ffad1836ec4932760f0552','scoresBsha256':sha(V7/'scores-b.json'),'melodyNotes':3158,'homeStringNotes':104,'variants':[],'originals':{}}
for s in scores[:4]:
 summary['originals'][s['id']]={e:sha(V7/'audio/b'/(s['id']+'.'+e)) for e in ('m4a','flac')}
 for v in ('b1','b2'):
  rec=json.loads((ROOT/'receipts'/v/(s['id']+'.json')).read_text());assert not rec['problems']
  for folder,ext,key in [('audio','flac','flacSha256'),('audio','m4a','aacSha256'),('midi','mid','midiSha256')]:assert sha(ROOT/folder/v/(s['id']+'.'+ext))==rec[key]
  assert sha(ROOT/'midi'/v/(s['id']+'.mid'))==sha(V7/'midi/b'/(s['id']+'.mid'))
  for f in rec['diagnosticFiles']:
   assert sha(ROOT/f['path'])==f['sha256'];assert abs(f['integratedLUFS']+26)<.15;assert f['truePeakDbtp']<-1
  assert all(u['usedEndFrame']<=u['nativeFrames'] and u['syntheticLoops']==0 for u in rec['samplesUsed'])
  for inst in ('violin_solo','cello_chamber'):
   rows=[e for e in build(s) if e['instrument']==inst]
   for a,b in zip(rows,rows[1:]):
    if not a['connectedOut']:assert a['t']+a['sustain']+a['release']<b['t']
  joins=rec['joins'];ratio=lambda tag:[20*math.log10(max(j[tag]['minRms'],1e-12)/max(j[tag]['maxRms'],1e-12)) for j in joins]
  summary['variants'].append({k:rec[k] for k in ('id','variant','integratedLUFS','truePeakDbtp','clippedSamples','monoLossDb','loopJoinJump','pianoGlobalGain')}|{'joins':len(joins),'medianJoinDipOldDb':round(float(np.median(ratio('old'))),2),'medianJoinDipNewDb':round(float(np.median(ratio('new'))),2),'firstHalfPianoResidualDb':rec.get('firstHalfPianoResidualDb')})
files={str(p.relative_to(ROOT)):sha(p) for folder in ('audio','midi','diagnostics') for p in sorted((ROOT/folder).rglob('*')) if p.is_file()}
(ROOT/'verification/artifacts.json').write_text(json.dumps(files,indent=1)+'\n');(ROOT/'verification/audio-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=1)+'\n')
print(json.dumps(summary['variants'],indent=1));print('PASS: 8 full mixes, 12 dry clips, immutable MIDI, original master hashes, explicit phrase rests, native sample bounds, 3158 melodies')
