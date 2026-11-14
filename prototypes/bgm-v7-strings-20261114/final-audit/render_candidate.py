"""Candidate only: fix piano take cache, freeze all existing musical/mix decisions.
B2 is read-only. Native B2 strings are reused by a linear piano-only delta.
"""
import pathlib,sys,json,hashlib,os,subprocess,fnmatch
import numpy as np,soundfile as sf
from piano_cache import PianoLibrary,V,L
ROOT=pathlib.Path(__file__).resolve().parent;B2=ROOT.parent;BASE=B2.parent;SR=L.SR;R=V.R
R.AUDIO=ROOT/'audio';R.MIDI=ROOT/'midi';R.REC=ROOT/'receipts'
for p in (R.AUDIO,R.MIDI,R.REC):p.mkdir(exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def check_pins():
 pin=json.loads((B2/'B2-CANDIDATE.json').read_text())
 repo=BASE.parent
 for p,h in pin['filesSha256'].items():
  if sha(repo/p)!=h:raise ValueError('Protected B2 changed: '+p)
 for p,h in json.loads((ROOT/'frozen-inputs.json').read_text()).items():
  if sha(repo/p)!=h:raise ValueError('Changed frozen rendering dependency '+p)
 manifest=json.loads((BASE/'bgm-v2-20261112/samples-manifest.json').read_text())
 home=json.loads((BASE/'bgm-v6-20261114/scores-v6.json').read_text())[:4];instruments={e['instrument'] for s in home for e in s['events']}
 for f in manifest['files']:
  if not any(fnmatch.fnmatch(f['path'],L.SPEC[i]['glob']) for i in instruments):continue
  if sha(L.VSCO/f['path'])!=f['sha256']:raise ValueError('Changed source '+f['path'])
def mid_side(x,k):
 m=x.mean(1);s=(x[:,0]-x[:,1])*.5*k;return np.stack([m+s,m-s],1)
def correction(s,oldlib,newlib):
 n=round(s['period']*SR);buses={};deltas={};rng=np.random.default_rng(int(hashlib.sha256(s['id'].encode()).hexdigest()[:8],16));events=V.V4.performed(s)['events'];changes=[]
 for idx,e in enumerate(events):
  role=e['role'] if e['role'] in R.BUS else 'accompaniment';vel=e['vel']*10**(R.ROLE_DB[role]/20)
  if role not in ('melody','doubling','cadence'):vel*=1+.05*rng.standard_normal()
  old=oldlib.note(e['instrument'],e['midi'],e['dur'],vel,e.get('layer',1))
  jitter=0 if role in ('melody','doubling','percussion','cadence') else int(rng.normal(0,.003)*SR);start=round(e['t']*SR)+jitter
  bus=buses.setdefault((role,e['instrument']),np.zeros((n,2)));R.place(bus,old.astype(np.float64),start,e.get('pan',0),R.BUS[role][2],s['loop'])
  if e['instrument']=='piano':
   new=newlib.note('piano',e['midi'],e['dur'],vel,e.get('layer',1));d=np.zeros((max(len(new),len(old)),2));d[:len(new)]+=new;d[:len(old)]-=old
   R.place(deltas.setdefault(role,np.zeros((n,2))),d,start,e.get('pan',0),R.BUS[role][2],s['loop'])
   if len(new)>len(old)+round(.05*SR):
    first=max(0,len(old)-round(.3*SR));tail=new[first:];changes.append({'event':idx,'role':role,'t':e['t'],'midi':e['midi'],'oldSeconds':len(old)/SR,'correctSeconds':len(new)/SR,'tailRelativeToNoteDb':float(20*np.log10((np.sqrt(np.mean(tail**2))+1e-20)/(np.sqrt(np.mean(new**2))+1e-20)))})
 roles={};piano={}
 for (role,inst),bus in buses.items():
  bus=R.eq(bus,R.INST_EQ.get(inst,[])+R.BUS[role][0],s['loop']);roles[role]=roles.get(role,0)+bus
  if inst=='piano':piano[role]=piano.get(role,0)+bus
 for role,bus in deltas.items():deltas[role]=R.eq(bus,R.INST_EQ.get('piano',[])+R.BUS[role][0],s['loop'])
 ref=R.rms(roles['melody']);tgt=dict(R.BALANCE);tgt.update(R.FAMILY_BALANCE.get(s['family'],{}));frozen={}
 for role,bus in roles.items():
  if role=='melody':continue
  g=ref*10**(tgt.get(role,-10)/20)/max(R.rms(bus),1e-12);frozen[role]=g;roles[role]=bus*g
  if role in piano:piano[role]*=g;deltas[role]*=g
 ir=R.room_ir(s['room'][0])
 def mix(parts):
  dry=np.zeros((n,2));send=np.zeros_like(dry)
  for role,b in parts.items():dry+=b;send+=b*R.BUS[role][1]
  return dry+R.convolve_loop(R.eq(send,[('hp',180),('peak',350,-2,.9)],s['loop']),ir,s['loop'])*s['room'][1]
 raw=mix(roles);full,corr,_=R.tonal_correction(raw,s['loop'],s['family']);m=raw.mean(1);side=(raw[:,0]-raw[:,1])*.5;sd=10*np.log10((side**2).mean()/((m**2).mean()+1e-20)+1e-20);k=min(1.,10**((-5-sd)/20))
 pn=R.eq(mid_side(mix(piano),k),corr,s['loop']);delta=R.eq(mid_side(mix(deltas),k),corr,s['loop'])
 used=(sum(c[2] for c in corr if c[1]==3800),sum(c[2] for c in corr if c[1]==8000));full,corr2,_=R.tonal_correction(full,s['loop'],s['family'],used);pn=R.eq(pn,corr2,s['loop']);delta=R.eq(delta,corr2,s['loop'])
 master,sr=sf.read(BASE/'bgm-v6-20261114/audio'/(s['id']+'.flac'));assert sr==SR
 gain=float(np.sum(master*full)/np.sum(full*full));pn*=gain;delta*=gain
 stempath=pathlib.Path(os.environ.get('V7_WORK_DIR','/workspace/work/v7-render'))/(s['id']+'-piano.wav');pin=json.loads((BASE/'bgm-v7-20261114/piano-preservation.json').read_text())[s['id']];assert sha(stempath)==pin['stemSha256'];stem,sr=sf.read(stempath)
 error=float(10*np.log10(np.mean((pn-stem)**2)/(np.mean(stem**2)+1e-30)+1e-30));assert error<-65,(s['id'],error)
 return delta,{'baselinePianoReconstructionErrorDb':error,'frozenRoleGains':frozen,'frozenSideScale':k,'frozenEq':corr+corr2,'frozenV6Gain':gain,'repairedNotes':changes,'deltaToPianoRmsDb':float(20*np.log10(R.rms(delta)/R.rms(stem)))}
def fingerprint():
 h=hashlib.sha256()
 for p in (ROOT/'piano_cache.py',ROOT/'render_candidate.py',B2/'B2-CANDIDATE.json',ROOT/'frozen-inputs.json'):h.update(p.read_bytes())
 return h.hexdigest()
def encode(x,p):
 tmp=ROOT/'mix.tmp.wav';sf.write(tmp,x,SR,subtype='FLOAT');args=['-c:a','aac','-b:a','192k','-movflags','+faststart','-movie_timescale',str(SR)] if p.suffix=='.m4a' else ['-c:a','flac','-sample_fmt','s32','-bits_per_raw_sample','24']
 subprocess.run(['ffmpeg','-nostdin','-v','error','-y','-i',str(tmp),*args,str(p)],check=True);tmp.unlink()
if __name__=='__main__':
 check_pins();scores=json.loads((BASE/'bgm-v6-20261114/scores-v6.json').read_text())[:4];fp=fingerprint()
 if all(R.receipt_ok(s['id']) and json.loads((R.REC/(s['id']+'.json')).read_text()).get('sourceFingerprint')==fp for s in scores):print('All 4 candidates verified; skip');sys.exit(0)
 oldlib=L.Library();newlib=PianoLibrary()
 for s in scores:
  V.V4._soft['db']=V.V4.SOFTEN.get(s['id'],V.V4.SOFTEN_FAMILY.get(s['family'],0));saved=dict(R.FAMILY_BALANCE['home4'])
  if s['id']=='home-night':R.FAMILY_BALANCE['home4'].update(V.V4.NIGHT)
  try:delta,extra=correction(s,oldlib,newlib)
  finally:R.FAMILY_BALANCE['home4']=saved
  b2,sr=sf.read(B2/'audio/b2'/(s['id']+'.flac'));assert sr==SR;prior=json.loads((B2/'receipts/b2'/(s['id']+'.json')).read_text());raw=b2+delta*prior['pianoGlobalGain']
  tmp=ROOT/'measure.tmp.wav';sf.write(tmp,raw,SR,subtype='FLOAT');loud=R.loudness(tmp);tmp.unlink();g=10**((-23-float(loud['input_i']))/20);x=raw*g
  out={ext:R.AUDIO/(s['id']+'.'+ext) for ext in ('flac','m4a')}
  for p in out.values():encode(x,p)
  (R.MIDI/(s['id']+'.mid')).write_bytes((B2/'midi/b2'/(s['id']+'.mid')).read_bytes())
  extra.update(sourceFingerprint=fp,variant='B2plus-piano-native-tail',originalB2Sha256=sha(B2/'audio/b2'/(s['id']+'.flac')),finalConstantGain=g,limiterMaxGainReductionDb=0,reverbChanged=False,stringRegeneration=False)
  rec=R.verify(s,out,x,extra);(R.REC/(s['id']+'.json')).write_text(json.dumps(rec,ensure_ascii=False,indent=1)+'\n')
  assert not rec['problems'],rec['problems'];print(s['id'],rec['integratedLUFS'],rec['truePeakDbtp'],'pianoDelta',extra['deltaToPianoRmsDb'],'repaired',len(extra['repairedNotes']),flush=True)
 check_pins()
