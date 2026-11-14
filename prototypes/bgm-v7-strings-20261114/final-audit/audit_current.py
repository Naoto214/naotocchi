"""Read-only source/performance audit. Does not render or alter any master."""
import pathlib,sys,json,hashlib,collections
import numpy as np,soundfile as sf
ROOT=pathlib.Path(__file__).resolve().parents[1];BASE=ROOT.parent;OUT=ROOT/'final-audit'
sys.path.insert(0,str(BASE/'bgm-v6-20261114/tools'));import render_v6 as V
L=V.L;SR=L.SR
scores=json.loads((BASE/'bgm-v7-20261114/scores-b.json').read_text());v6=json.loads((BASE/'bgm-v6-20261114/scores-v6.json').read_text())
insts={}
for s in scores:
 for e in s['events']:
  x=insts.setdefault(e['instrument'],{'homeNotes':0,'otherNotes':0,'notes':[],'homeTracks':set(),'otherTracks':set()});key='home' if s in scores[:4] else 'other';x[key+'Notes']+=1;x[key+'Tracks'].add(s['id']);x['notes'].append(e['midi'])
for k,v in insts.items():v['midiRange']=[min(v.pop('notes')),None]
# reconstruct full ranges explicitly
for k,v in insts.items():
 notes=[e['midi'] for s in scores for e in s['events'] if e['instrument']==k];v['midiRange']=[min(notes),max(notes)];v['homeTracks']=sorted(v['homeTracks']);v['otherTracks']=sorted(v['otherTracks'])
(OUT/'instrument-inventory.json').write_text(json.dumps(insts,ensure_ascii=False,indent=1)+'\n')
lib=L.Library();original=L.Library.shifted;records=[];now={}
def shifted(self,inst,root,layer,rri,src,semis,maxlen):
 x=original(self,inst,root,layer,rri,src,semis,maxlen)
 if inst=='piano':
  expected=min(6.,now['dur']+.60);available=len(src)/SR/(2**(semis/12));actual=min(len(x)/SR,expected);missing=max(0,min(expected,available)-actual)
  records.append({'track':now['track'],'t':now['t'],'midi':now['midi'],'layer':layer,'rootMidi':root,'semitones':semis,'writtenOrPedalSeconds':now['dur'],'requestedRingSeconds':expected,'availableNativeSeconds':available,'deliveredSeconds':actual,'shortenedSeconds':missing})
 return x
L.Library.shifted=shifted
for s in v6[:4]:
 for e in V.V4.performed(s)['events']:
  now={**e,'track':s['id']};lib.note(e['instrument'],e['midi'],e['dur'],e['vel'],e.get('layer',1))
(OUT/'piano-cache-trace.json').write_text(json.dumps(records,indent=1)+'\n')
print('PIANO',len(records),'shortened>.05',sum(r['shortenedSeconds']>.05 for r in records),'maxShortening',max(r['shortenedSeconds'] for r in records))
# Raw takes actually selected in home piano: never confuse key/bow noise with a measured silent noise floor.
source=[]
for root,layer in sorted({(e['rootMidi'],e['layer']) for e in records}):
 p=next(p for p in L.VSCO.glob(L.SPEC['piano']['glob']) if L.SPEC['piano']['root'](p)==root and L.SPEC['piano']['layer'](p)==layer)
 x,sr=sf.read(p,always_2d=True);a=np.max(np.abs(x),axis=1);onset=int(np.argmax(a>a.max()*.01));x=x[onset:];hop=round(sr*.05);rms=np.sqrt(np.mean(x[:len(x)//hop*hop].reshape(-1,hop,x.shape[1])**2,axis=(1,2))+1e-20)
 def level(a,b):return float(20*np.log10(np.sqrt(np.mean(x[round(a*sr):round(b*sr)]**2))+1e-20))
 source.append({'path':str(p.relative_to(L.VSCO)),'rootMidi':root,'layer':layer,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'nativeSeconds':len(x)/sr,'clippedSamples':int((np.abs(x)>=1).sum()),'first350msRmsDbfs':level(0,.35),'tail3to4secRmsDbfs':level(3,4),'tail8to9secRmsDbfs':level(8,9),'rms50msDbfs':[round(float(20*np.log10(z)),2) for z in rms]})
(OUT/'piano-sources.json').write_text(json.dumps(source,indent=1)+'\n')
print('SOURCES',len(source),'clipped',sum(s['clippedSamples'] for s in source),'minNativeSeconds',min(s['nativeSeconds'] for s in source))
print('INSTRUMENTS',json.dumps(insts,ensure_ascii=False))
