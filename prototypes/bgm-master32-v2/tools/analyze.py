"""Measured spectral balance, decoded codec difference and a non-device phone proxy."""
import pathlib,json,subprocess,hashlib,concurrent.futures
import numpy as np
from scipy.signal import welch,butter,sosfilt
R=pathlib.Path(__file__).resolve().parents[1];V1=R.parent/'bgm-master32-v1'
def decode(p):
 sr=int(subprocess.check_output(['ffprobe','-v','error','-select_streams','a:0','-show_entries','stream=sample_rate','-of','csv=p=0',str(p)]))
 a=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-f','f32le','-ac','2','-']),np.float32).reshape(-1,2)
 return sr,a

def inspect(task):
 t,root,ext=task;p=root/'audio'/(t['id']+'.'+ext);sr,a=decode(p);n=round(t['duration']*sr);padding=len(a)-n
 assert -2<=padding<=2048,(str(p),padding)
 a=a[:n];assert np.isfinite(a).all();mono=a.mean(axis=1);rms=float(np.sqrt(np.mean(a*a)));mr=float(np.sqrt(np.mean(mono*mono))/rms)
 f,power=welch(mono,fs=sr,nperseg=4096);total=sum(power);bands={name:float(sum(power[(f>=lo)&(f<hi)])/total) for name,lo,hi in [('sub',0,120),('body',120,300),('lowMid',300,800),('presence',800,4000),('air',4000,12000)]}
 s=subprocess.run(['ffmpeg','-hide_banner','-i',str(p),'-af','loudnorm=I=-23:TP=-2:LRA=11:print_format=json','-f','null','-'],capture_output=True,text=True,check=True).stderr;l=json.JSONDecoder().raw_decode(s[s.rfind('{'):])[0]
 phone=sosfilt(butter(2,[250,7000],btype='bandpass',fs=sr,output='sos'),mono)
 w=round(sr*.01);env=np.sqrt(np.mean(mono[:len(mono)//w*w].reshape(-1,w)**2,axis=1));flux=float(np.mean(np.maximum(0,np.diff(env)))/(np.mean(env)+1e-12))
 return dict(id=t['id'],format=ext,sampleRate=sr,duration=len(a)/sr,encoderPaddingFrames=padding,LUFS=float(l['input_i']),truePeakDbTP=float(l['input_tp']),LRA=float(l['input_lra']),samplePeakDbFS=float(20*np.log10(np.max(abs(a)))),clipSamples=int(np.sum(abs(a)>=1)),monoRatio=mr,joinJump=float(max(abs(a[0]-a[-1]))),boundaryRmsRatio=float(np.sqrt(np.mean(a[:round(.02*sr)]**2))/(np.sqrt(np.mean(a[-round(.02*sr):]**2))+1e-12)),bands=bands,spectralCentroidHz=float(sum(f*power)/total),attackFlux=flux,phoneProxyEnergyRatio=float(np.sqrt(np.mean(phone*phone))/(np.sqrt(np.mean(mono*mono))+1e-12)),sha256=hashlib.sha256(p.read_bytes()).hexdigest(),bytes=p.stat().st_size)
if __name__=='__main__':
 import sys
 tracks=json.loads((V1/'catalog.json').read_text())['tracks'];root=V1 if '--v1' in sys.argv else R
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:r=list(pool.map(inspect,[(t,root,e) for t in tracks for e in ['flac','m4a']]))
 (R/('analysis-v1.json' if root==V1 else 'analysis-v2.json')).write_text(json.dumps(r,indent=2)+'\n')
 print(json.dumps({'files':len(r),'maxTP':max(x['truePeakDbTP'] for x in r),'minMono':min(x['monoRatio'] for x in r),'clips':sum(x['clipSamples'] for x in r)}))
