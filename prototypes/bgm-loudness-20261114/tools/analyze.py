"""Read-only master analysis. Hypothetical speaker transfer functions, never device measurements."""
import pathlib,json,hashlib,subprocess,re,concurrent.futures,numpy as np
from scipy.signal import welch,butter,sosfilt
ROOT=pathlib.Path(__file__).resolve().parents[1];MASTER=ROOT.parent/'bgm-v7-complete-20261114';SR=44100
BASE=json.loads((ROOT/'analysis/baseline-measurements.json').read_text());aac=[r for r in BASE['results'] if r['extension']=='m4a'];flac={r['id']:r for r in BASE['results'] if r['extension']=='flac'}
SCORES={s['id']:s for s in json.loads((MASTER/'scores-v7.json').read_text())}
BANDS=[(20,80),(80,250),(250,1000),(1000,4000),(4000,10000),(10000,20000)]
# Generic linear magnitude sensitivity brackets. Unity in midband, no auto-normalization or distortion.
MODELS={'wide_120_12k':(120,12000),'small_250_8k':(250,8000),'limited_400_6k':(400,6000)}
def decode(p):
 b=subprocess.run(['ffmpeg','-nostdin','-v','error','-i',str(p),'-f','f32le','-ar',str(SR),'-ac','2','-'],capture_output=True,check=True).stdout
 return np.frombuffer(b,np.float32).reshape(-1,2)
def meter(x):
 z=subprocess.run(['ffmpeg','-nostdin','-hide_banner','-nostats','-f','f32le','-ar',str(SR),'-ac','2','-i','-','-af','ebur128=peak=true','-f','null','-'],input=np.asarray(x,np.float32).tobytes(),capture_output=True,check=True).stderr.decode();s=z.rsplit('Summary:',1)[1]
 return {'integratedLUFS':float(re.search(r'I:\s*([-\d.]+) LUFS',s)[1]),'truePeakDbtp':float(re.search(r'Peak:\s*([-\d.]+) dBFS',s)[1]),'lraLU':float(re.search(r'LRA:\s*([-\d.]+) LU',s)[1])}
def part(frames,a,b):
 f=[q for q in frames if a<=q['t']<b];m=[q['M'] for q in f if q['t']>=.399 and q['M']>-70];s=[q['S'] for q in f if q['t']>=2.99 and q['S']>-70]
 return {'start':round(a,3),'end':round(b,3),'momentaryMedian':round(float(np.median(m)),2) if m else None,'momentaryMax':max(m) if m else None,'shortTermMedian':round(float(np.median(s)),2) if s else None,'shortTermMax':max(s) if s else None}
def run(r):
 sid=r['id'];p=MASTER/'audio'/(sid+'.m4a');assert hashlib.sha256(p.read_bytes()).hexdigest()==r['sha256'];fp=MASTER/'audio'/(sid+'.flac');assert hashlib.sha256(fp.read_bytes()).hexdigest()==flac[sid]['sha256']
 x=decode(p);x=x[:round(r['seconds']*SR)] # playback truncates padding to catalog duration, same loop region
 mono=x.mean(axis=1);dual=np.repeat(mono[:,None],2,axis=1);f,ps=welch(x,fs=SR,nperseg=8192,axis=0);ps=ps.mean(axis=1);_,pm=welch(mono,fs=SR,nperseg=8192);total=ps[(f>=20)&(f<20000)].sum();bands=[]
 for lo,hi in BANDS:
  mask=(f>=lo)&(f<hi);energy=ps[mask].sum();bands.append({'hz':[lo,hi],'stereoEnergyPct':round(float(100*energy/total),3),'monoLossDb':round(float(10*np.log10((pm[mask].sum()+1e-20)/(energy+1e-20))),3)})
 native=meter(x);mm=meter(dual);models={}
 for name,(hp,lp) in MODELS.items():
  sos=np.vstack([butter(2,hp,fs=SR,btype='highpass',output='sos'),butter(2,lp,fs=SR,btype='lowpass',output='sos')]);y=sosfilt(sos,dual,axis=0);v=meter(y);v['deltaVsOriginalLU']=round(v['integratedLUFS']-native['integratedLUFS'],2);models[name]=v
 frames=r['frames'];climax=max((q for q in frames if q['t']>=2.99),key=lambda q:q['S'])['t'];D=r['seconds'];span=min(8,D/3)
 result={k:v for k,v in r.items() if k!='frames'};result.update(playbackRegion=native,flacMeter={k:flac[sid][k] for k in ['integratedLUFS','truePeakDbtp','lraLU']},aacFlacIntegratedDelta=round(r['integratedLUFS']-flac[sid]['integratedLUFS'],2),bandEnergy=bands,mono={**mm,'integratedDeltaLU':round(mm['integratedLUFS']-native['integratedLUFS'],2),'rmsDeltaDb':round(float(10*np.log10(np.mean(mono**2)/np.mean(x**2))),3),'channelCorrelation':round(float(np.corrcoef(x.T)[0,1]),4)},speakerModels=models,sections={'intro':part(frames,0,span),'normal':part(frames,span,D-span),'climax':part(frames,max(0,climax-3),climax+.001),'ending':part(frames,D-span,D+.01)},crestDb=round(float(20*np.log10(np.max(np.abs(x))/np.sqrt(np.mean(x**2)))),3),individualGainDb=0)
 ev=SCORES[sid]['events'];result['scoreInstrumentRoles']={role:sorted({e['instrument'] for e in ev if e['role']==role}) for role in sorted({e['role'] for e in ev})};result['polyphonyNote']='Score role/instrument labels only; no separated-stem masking estimate. Cellos bass in five lyrical tracks uses Karoryfer per receipt.'
 print(sid,'mono',result['mono']['integratedDeltaLU'],'models',[v['deltaVsOriginalLU'] for v in models.values()],flush=True);return result
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:results=list(pool.map(run,aac))
 out={'method':{'meter':'FFmpeg7.1.5 ebur128 / EBU R128 / BS.1770 K-weighted stereo energy','integratedGate':'400ms blocks,100ms step, absolute -70LUFS and relative -10LU; implementation ffmpeg ebur128','momentary':'400ms,100ms reporting; no loudness gating on displayed M','shortTerm':'3s,100ms reporting; first incomplete windows excluded; P10/P90 uses values >= max(-70,I-20) (descriptive selection, not Integrated gating)','lra':'EBU LRA:3s short-term distribution; absolute -70 and relative -20LU gate;10th–95th percentiles; short jingles indicative only','truePeak':'FFmpeg ebur128 peak=true resampling; analysis rounding0.1dB, not hardware voltage','spectrum':'Welch Hann8192 samples at44100Hz,50% overlap; band fraction of20Hz–20kHz unweighted energy; stereo mean power','mono':'arithmetic(L+R)/2 copied to two channels for equal channel-count loudness comparison; not a measured device downmix','speakerModels':MODELS,'speakerFilter':'mono + cascaded2nd-order Butterworth HP and LP, forward causal linear filter, no level normalization; generic hypotheses, NOT iPhone-specific curves or measured outputs','sections':'intro/end=min(8s,duration/3); normal middle; climax=max3s short-term window (numerical loudest window, not an authored emotional climax)','sourcePreservation':'64 SHA256 verified; no source writes; AAC padding trimmed only in analysis to playback catalog period','maskingLimit':'mixed-master spectra cannot isolate instruments or solve perceptual masking; no inferred per-instrument correction'},'tracks':results};(ROOT/'analysis/detailed32.json').write_text(json.dumps(out,ensure_ascii=False,indent=1)+'\n')
