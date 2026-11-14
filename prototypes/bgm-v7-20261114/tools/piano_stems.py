"""Reconstruct V6 linear mix, prove it matches the preserved master, isolate piano.
No old files are written. Replay all four tracks in their original order so the
inherited sampler cache is identical. New strings use a separate fixed sampler.
"""
import pathlib,sys,os,json,hashlib,math
import numpy as np,soundfile as sf
ROOT=pathlib.Path(__file__).resolve().parents[1];V6=ROOT.parent/'bgm-v6-20261114'
sys.path.insert(0,str(V6/'tools'));import render_v6 as V
R,L=V.R,V.L;SR=L.SR
WORK=pathlib.Path(os.environ.get('V7_WORK_DIR','/workspace/work/v7-render'));WORK.mkdir(parents=True,exist_ok=True)
def mid_side(x,k):
 m=x.mean(1);s=(x[:,0]-x[:,1])*.5*k;return np.stack([m+s,m-s],1)
def reconstruct(s,lib):
 loop=s['loop'];n=round(s['period']*SR);buses={};rng=np.random.default_rng(int(hashlib.sha256(s['id'].encode()).hexdigest()[:8],16))
 for e in V.V4.performed(s)['events']:
  role=e['role'] if e['role'] in R.BUS else 'accompaniment';vel=e['vel']*10**(R.ROLE_DB[role]/20)
  if role not in ('melody','doubling','cadence'):vel*=1+.05*rng.standard_normal()
  x=lib.note(e['instrument'],e['midi'],e['dur'],vel,e.get('layer',1))
  jitter=0 if role in ('melody','doubling','percussion','cadence') else int(rng.normal(0,.003)*SR)
  start=round(e['t']*SR)+jitter;b=buses.setdefault((role,e['instrument']),np.zeros((n,2)))
  R.place(b,x.astype(np.float64),start,e.get('pan',0),R.BUS[role][2],loop)
 roles={};piano={}
 for (role,inst),b in buses.items():
  b=R.eq(b,R.INST_EQ.get(inst,[])+R.BUS[role][0],loop);roles[role]=roles.get(role,0)+b
  if inst=='piano':piano[role]=piano.get(role,0)+b
 ref=R.rms(roles['melody']);tgt=dict(R.BALANCE);tgt.update(R.FAMILY_BALANCE.get(s['family'],{}))
 for role,b in roles.items():
  if role=='melody':continue
  g=ref*10**(tgt.get(role,-10)/20)/max(R.rms(b),1e-12);roles[role]=b*g
  if role in piano:piano[role]*=g
 ir=R.room_ir(s['room'][0])
 def mix(parts):
  dry=np.zeros((n,2));send=np.zeros_like(dry)
  for role,b in parts.items():dry+=b;send+=b*R.BUS[role][1]
  return dry+R.convolve_loop(R.eq(send,[('hp',180),('peak',350,-2,.9)],loop),ir,loop)*s['room'][1]
 full=mix(roles);pn=mix(piano)
 full,corr,_=R.tonal_correction(full,loop,s['family']);k=V.V4._soft.get('sideScale',1.)
 # Recompute exact mono scaling (receipt stores only rounded 3 decimals).
 raw=mix(roles);m=raw.mean(1);side=(raw[:,0]-raw[:,1])*.5;sd=10*np.log10((side**2).mean()/((m**2).mean()+1e-20)+1e-20);k=min(1.,10**((-5-sd)/20))
 pn=R.eq(mid_side(pn,k),corr,loop)
 used=(sum(c[2] for c in corr if c[1]==3800),sum(c[2] for c in corr if c[1]==8000))
 full,corr2,_=R.tonal_correction(full,loop,s['family'],used);pn=R.eq(pn,corr2,loop)
 master,sr=sf.read(V6/'audio'/f"{s['id']}.flac");assert sr==SR and len(master)==n
 gain=float(np.sum(master*full)/np.sum(full*full));res=master-full*gain
 error=10*np.log10(np.mean(res**2)/(np.mean(master**2)+1e-30)+1e-30)
 if error>-65:raise ValueError(f"V6 reconstruction mismatch {s['id']}: {error:.1f} dB")
 return pn*gain,{'relativeErrorDb':round(float(error),2),'linearGain':gain,'v6MasterSha256':hashlib.sha256((V6/'audio'/f"{s['id']}.flac").read_bytes()).hexdigest()}
def build():
 scores=json.loads((V6/'scores-v6.json').read_text())[:4];lib=L.Library();results={}
 for s in scores:
  V.V4._soft['db']=V.V4.SOFTEN.get(s['id'],V.V4.SOFTEN_FAMILY.get(s['family'],0));saved=dict(R.FAMILY_BALANCE['home4'])
  if s['id']=='home-night':R.FAMILY_BALANCE['home4'].update(V.V4.NIGHT)
  try:x,rec=reconstruct(s,lib)
  finally:R.FAMILY_BALANCE['home4']=saved
  if s['id']=='home-night':x,_=sf.read(V6/'audio/home-night.flac')
  sf.write(WORK/f"{s['id']}-piano.wav",x,SR,subtype='FLOAT');rec['stemSha256']=hashlib.sha256((WORK/f"{s['id']}-piano.wav").read_bytes()).hexdigest();results[s['id']]=rec;print(s['id'],rec,flush=True)
 (ROOT/'piano-preservation.json').write_text(json.dumps(results,indent=2)+'\n')
if __name__=='__main__':build()
