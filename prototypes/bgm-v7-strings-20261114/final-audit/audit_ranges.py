import pathlib,json,fnmatch,sys,soundfile as sf
ROOT=pathlib.Path(__file__).resolve().parents[1];BASE=ROOT.parent
sys.path.insert(0,str(BASE/'bgm-v2-20261112/tools'));import library as L
m=json.loads((BASE/'bgm-v2-20261112/samples-manifest.json').read_text());sc=json.loads((BASE/'bgm-v7-20261114/scores-b.json').read_text());out={}
for inst in json.loads((ROOT/'final-audit/instrument-inventory.json').read_text()):
 if inst not in L.SPEC:continue
 spec=L.SPEC[inst];files=[f for f in m['files'] if fnmatch.fnmatch(f['path'],spec['glob'])];zones=[]
 for f in files:
  p=L.VSCO/f['path'];q=pathlib.Path(f['path']);zones.append((spec['root'](q),spec['layer'](q),p))
 events=[e for s in sc[4:] for e in s['events'] if e['instrument']==inst];trans=[];wide=[];layers=sorted(set(l for _,l,_ in zones));short=[]
 for e in events:
  layer=min(layers,key=lambda l:abs(l-e.get('layer',1)));root,_,p=min([z for z in zones if z[1]==layer],key=lambda z:(abs(z[0]-e['midi']),z[0]<e['midi']));shift=0 if spec['kind']=='hit' else e['midi']-root;trans.append(shift)
  if abs(shift)>3:wide.append({'t':e['t'],'midi':e['midi'],'layer':layer,'rootMidi':root,'semitones':shift,'source':str(p.relative_to(L.VSCO))})
  if spec['kind']=='sustain' and p.exists():
   inf=sf.info(p);native=inf.duration/(2**(shift/12));requested=e['dur']+spec['release']
   if requested>native:short.append({'t':e['t'],'midi':e['midi'],'requested':requested,'native':native,'sample':p.name})
 out[inst]={'sourceFilesInManifest':len(files),'sourceRoots':[min(z[0] for z in zones),max(z[0] for z in zones)],'layers':layers,'remaining28Notes':len(events),'maxAbsoluteTranspose':max(map(abs,trans),default=0),'nativeShorterThanRequested':len(short),'examples':short[:3],'wideTransposeExamples':wide[:6],'wideTransposeNotes':len(wide),'lengthScreenScope':'sustain only, untrimmed raw source; excludes cache, attack trim, pedal and struck instruments'}
(ROOT/'final-audit/other-instrument-ranges.json').write_text(json.dumps(out,indent=1)+'\n')
for k,v in out.items():print(k,'layers',v['layers'],'maxtranspose',v['maxAbsoluteTranspose'],'nativeShort',v['nativeShorterThanRequested'])
