"""Analysis-only mixtures following unmodified player schedules. No music file writes."""
from analyze import ROOT,MASTER,decode,SR,meter
import numpy as np,json,subprocess,re,concurrent.futures
rows={r['id']:r for r in json.loads((ROOT/'analysis/detailed32.json').read_text())['tracks']}
CASES=[]
def case(label,a,b,kind='crossfade',old=.36,new_before=.36,new_after=.36,duck=None,delay=0):CASES.append(dict(label=label,a=a,b=b,kind=kind,old=old,newBefore=new_before,newAfter=new_after,duck=duck,delay=delay))
for a,b in [('home-morning','home-day'),('home-day','home-evening'),('home-evening','home-night'),('home-night','home-morning')]:case(a+' → '+b,a,b)
for b in ['poyo-1','koro-1','card-2']:case('home → '+b,'home-day',b,'navigation',new_before=.9)
for b in ['game-1','bgm-game','poyo-2','lullaby-a','event-2','kisetsu','bgm-farewell']:case('home → '+b,'home-day',b)
for a in ['game-1','bgm-game','lullaby-a']:case(a+' → home',a,'home-day')
for a in ['poyo-1','koro-1','card-2']:case(a+' → home',a,'home-day','return_navigation',old=.9)
for a,b in [('card-2','var-card-win'),('card-2','jingle-card-lose'),('poyo-1','var-poyo-clear'),('koro-1','var-koro-goal')]:case(a+' → '+b,a,b,'jingle_then',old=.9,new_before=.9)
case('card normal → late','card-2','var-card-late',old=.9,new_before=.9)
case('poyo normal → chapter','poyo-1','var-poyo-chapter',old=.9,new_before=.9)
case('koro normal → album','koro-1','var-koro-album',old=.9,new_before=.9)
case('home + hatch','home-day','var-ohayo-hatch2','overlay',duck=-14)
case('home + achievement','home-day','jingle-achieve','overlay',duck=-10,delay=.35)
def summary_timeline(x):
 out=meter(x);log=subprocess.run(['ffmpeg','-hide_banner','-nostats','-f','f32le','-ar',str(SR),'-ac','2','-i','-','-af','ebur128','-f','null','-'],input=np.asarray(x,np.float32).tobytes(),capture_output=True,check=True).stderr.decode()
 frames=[{'t':round(float(t)-4,3),'M':float(m),'S':float(s)} for t,m,s in re.findall(r't:\s*([\d.]+).*?M:\s*([-\d.]+) S:\s*([-\d.]+)',log)]
 def vals(a,b,k):return [f[k] for f in frames if a<=f['t']<b and f[k]>-70]
 out.update(beforeMomentaryMedian=float(np.median(vals(-3.5,-.2,'M'))),afterMomentaryMedian=float(np.median(vals(1.3,min(4,len(x)/SR-4),'M'))),boundaryMomentaryMin=min(vals(0,1.3,'M')),boundaryMomentaryMax=max(vals(0,1.3,'M')),windowShortTermMax=max(vals(0,len(x)/SR,'S')),frames=frames)
 return out
def run(c):
 a=decode(MASTER/'audio'/(c['a']+'.m4a'))[:round(rows[c['a']]['seconds']*SR)];b=decode(MASTER/'audio'/(c['b']+'.m4a'))[:round(rows[c['b']]['seconds']*SR)];D=max(10,len(b)/SR+c['delay']+1) if c['kind'] in ('overlay','jingle_then') else 10
 t=np.arange(round((4+D)*SR))/SR-4;mid=len(a)//2;old=a[(np.arange(len(t))+mid-4*SR)%len(a)].copy();new=np.zeros_like(old);start=round((4+c['delay'])*SR);n=len(new)-start
 if rows[c['b']]['loop']:new[start:]=b[np.arange(n)%len(b)]
 else:new[start:start+min(n,len(b))]=b[:min(n,len(b))]
 if c['kind']=='overlay':
  end=c['delay']+len(b)/SR;g=np.where(t<0,1,np.where(t<.2,1+(10**(c['duck']/20)-1)*t/.2,np.where(t<end,10**(c['duck']/20),np.where(t<end+1,10**(c['duck']/20)+(1-10**(c['duck']/20))*(t-end),1))));newenv=np.ones(len(t))
 else:
  fade=.9 if c['kind']=='crossfade' else .25 if c['kind']=='jingle_then' else 0
  g=np.where(t<0,1,np.where(t<fade,1-(1-.0001)*t/max(fade,1e-6),np.where(t<fade+.05,.0001,0))) if fade else (t<0).astype(float)
  newenv=np.ones(len(t)) if c['kind']=='jingle_then' else np.clip(.0001+(1-.0001)*t/1.2,.0001,1)
 old*=g[:,None];new*=newenv[:,None];afterOld=.36 if c['old']==.9 else c['old'];before=old*c['old']+new*c['newBefore'];after=old*afterOld+new*c['newAfter'];bm=summary_timeline(before);am=summary_timeline(after)
 result={**c,'representativeSourceOffset':round(mid/SR,3),'before':bm,'after':am,'steadyDeltaBeforeLU':round(rows[c['b']]['integratedLUFS']+20*np.log10(c['newBefore'])-rows[c['a']]['integratedLUFS']-20*np.log10(c['old']),2),'steadyDeltaAfterLU':round(rows[c['b']]['integratedLUFS']+20*np.log10(c['newAfter'])-rows[c['a']]['integratedLUFS']-20*np.log10(afterOld),2)}
 assert am['truePeakDbtp']<-1
 print(c['label'],result['steadyDeltaBeforeLU'],'→',result['steadyDeltaAfterLU'],'TP',am['truePeakDbtp'],flush=True);return result
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:r=list(pool.map(run,CASES))
 (ROOT/'analysis/transitions.json').write_text(json.dumps({'assumptions':'Representative old audio position50% of track; t=0 transition, incoming source at0. Existing player linear fade in1.2s/out0.9s; jingle then old fade0.25s; navigation has no cross-document audio overlap (loading silence excluded); overlay duck0.2s and restore1s, actual duck/delay settings. Includes correlated waveform summation, not LUFS arithmetic for overlap. Scene-dependent source position may change transient readings; these are reproducible scenarios, not all possible user timings. Speech duck ratio0.04/0.28 preserves -16.90dB BGM and SFX0.9→0.45; unchanged.', 'cases':r},ensure_ascii=False,indent=1)+'\n')
