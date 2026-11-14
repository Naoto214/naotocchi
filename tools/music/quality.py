"""Read-only audio/MIDI validation; no render, normalize or source writes."""
import json,subprocess,re
import numpy as np
from scipy.signal import correlate,correlation_lags
import mido
VERSION='music-quality-1'
def decode(path):
 p=subprocess.run(['ffmpeg','-nostdin','-v','error','-i',str(path),'-ar','44100','-ac','2','-f','f32le','-'],capture_output=True,check=True)
 return np.frombuffer(p.stdout,dtype=np.float32).reshape(-1,2)
def meter(path):
 p=subprocess.run(['ffmpeg','-nostdin','-hide_banner','-nostats','-i',str(path),'-af','ebur128=peak=true','-f','null','-'],capture_output=True,check=True)
 text=p.stderr.decode();summary=text.rsplit('Summary:',1)[1]
 out={'integratedLUFS':float(re.search(r'I:\s*([-\d.]+) LUFS',summary)[1]),'truePeakDbtp':float(re.search(r'Peak:\s*([-\d.]+)',summary)[1]),'lraLU':float(re.search(r'LRA:\s*([-\d.]+)',summary)[1])}
 ms=re.findall(r't:\s*([\d.]+).*?M:\s*([-\d.]+)\s+S:\s*([-\d.]+)',text)
 mv=[float(m) for t,m,s in ms if float(t)>=.399];out['momentaryMax']=max(mv) if mv else None
 vals=[float(s) for t,m,s in ms if float(t)>=2.99];out['shortTermMax']=max(vals) if vals else None
 return out
def analyze(root,track,policy):
 paths={k:root/v['path'] for k,v in track['assets'].items()};a=decode(paths['aac']);f=decode(paths['flac']);sr=44100
 if not len(a) or not len(f):raise ValueError('empty audio')
 if abs(len(a)-len(f))/sr>policy['maximumDurationDeltaSeconds']:raise ValueError('AAC/FLAC duration integrity')
 if abs(len(f)/sr-track['duration'])>1/sr+.00001:raise ValueError('FLAC frame duration mismatch')
 if len(f)!=track['frames']:raise ValueError('FLAC frames mismatch')
 # Find codec delay over at most10seconds, then compare the full aligned recording.
 n=min(len(a),len(f),sr*10);am=a[:n].mean(axis=1);fm=f[:n].mean(axis=1)
 cc=correlate(am,fm,method='fft');lags=correlation_lags(n,n);mask=abs(lags)<=policy['alignmentSearchSamples'];lag=int(lags[mask][np.argmax(cc[mask])])
 aa=a[max(lag,0):];ff=f[max(-lag,0):];n=min(len(aa),len(ff));aa=aa[:n].astype(np.float64);ff=ff[:n].astype(np.float64)
 denom=np.linalg.norm(aa)*np.linalg.norm(ff);cor=float(np.sum(aa*ff)/denom) if denom else 0
 if cor<policy['minimumCodecCorrelation']:raise ValueError(f'AAC/FLAC correlation integrity {cor:.6f}')
 rms=float(10*np.log10(np.mean(aa*aa)/max(np.mean(ff*ff),1e-20)))
 if abs(rms)>policy['maximumCodecRmsDeltaDb']:raise ValueError('AAC/FLAC RMS mismatch')
 clipped=int(np.count_nonzero(abs(a)>=1)+np.count_nonzero(abs(f)>=1))
 if clipped>policy['maximumClippedSamples']:raise ValueError('clipped samples')
 meters={k:meter(paths[k]) for k in ['aac','flac']}
 if max(x['truePeakDbtp'] for x in meters.values())>policy['maximumTruePeakDbtp']:raise ValueError('true peak exceeds headroom policy')
 midi=mido.MidiFile(paths['midi']);notes=sum(1 for tr in midi.tracks for e in tr if e.type=='note_on' and e.velocity>0)
 if not notes:raise ValueError('MIDI has no notes')
 score=json.loads((root/track['score']['path']).read_text())
 if isinstance(score,list):score=next((s for s in score if s.get('id')==track['score'].get('trackId')),None)
 if not isinstance(score,dict) or not isinstance(score.get('events'),list):raise ValueError('invalid score events')
 expected=sorted((float(e['t']),int(e['midi'])) for e in score['events'])
 elapsed=0;actual=[]
 for e in midi:
  elapsed+=e.time
  if e.type=='note_on' and e.velocity>0:actual.append((elapsed,e.note))
 actual.sort()
 if len(actual)!=len(expected) or any(p!=q or abs(t-u)>.025 for (t,p),(u,q) in zip(actual,expected)):raise ValueError('MIDI note pitch/order/onset differs from score')
 loop={'enabled':track['loop']['enabled']}
 if loop['enabled']:
  start=round(track['loop']['start']*sr);end=round(track['loop']['end']*sr)
  for name,x in [('flac',f),('aac',a)]:
   if end>len(x) or start>=end:raise ValueError('loop out of decoded range')
   jump=float(np.max(abs(x[start]-x[end-1])));typical=float(np.percentile(abs(np.diff(x[start:end],axis=0)),99.9));limit=max(policy['loopJumpFloor'],policy['loopJumpStepMultiplier']*typical)
   if jump>limit:raise ValueError(f'{name} loop discontinuity {jump:.6f}>{limit:.6f}')
   loop[name]={'jump':jump,'typicalStep999':typical,'limit':limit}
 return {'method':'FFmpeg ebur128 / BS.1770; M400ms S3s; I absolute-70 relative-10; LRA relative-20','aac':meters['aac'],'flac':meters['flac'],'codecCorrelation':cor,'codecDelaySamples':lag,'codecRmsDeltaDb':rms,'clippedSamples':clipped,'midiNoteOnCount':notes,'loop':loop,'toolVersion':VERSION}
