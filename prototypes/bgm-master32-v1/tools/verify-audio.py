"""Decode every delivery and master; measure the actual encoded output, not assumptions."""
import json,pathlib,subprocess,hashlib,concurrent.futures,sys
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[1]
def inspect(task):
 s,ext=task;p=ROOT/'audio'/(s['id']+'.'+ext)
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(p)]))['streams'][0]
 sr=int(probe['sample_rate']);ch=int(probe['channels']);assert ch==2
 x=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-f','f32le','-']),np.float32).reshape(-1,ch)
 expected=round(s['duration']*sr);assert len(x)>=expected-2,(s['id'],ext,len(x),expected)
 assert len(x)-expected<=2048,(s['id'],ext,'excess padding')
 x=x[:expected];assert np.isfinite(x).all()
 peak=float(np.max(abs(x)));assert peak>1e-5
 text=subprocess.run(['ffmpeg','-hide_banner','-i',str(p),'-af','loudnorm=I=-23:TP=-2:LRA=11:print_format=json','-f','null','-'],capture_output=True,text=True,check=True).stderr
 loud=json.loads(text[text.rfind('{'):]);tp=float(loud['input_tp']);lufs=float(loud['input_i'])
 assert tp<=-2,(s['id'],ext,'true peak',tp)
 join=float(np.max(abs(x[0]-x[-1])));rms=float(np.sqrt(np.mean(x*x)));mono=np.mean(x,axis=1);monorms=float(np.sqrt(np.mean(mono*mono)))
 assert monorms/rms>.70,(s['id'],'mono cancellation')
 if s['loop']:assert join<.025,(s['id'],ext,'join click',join)
 assert abs(lufs-s['integratedLUFS'])<1.0,(s['id'],ext,'loudness mismatch',lufs)
 window=round(sr*.1);r=np.sqrt(np.mean(x[:len(x)//window*window].reshape(-1,window,2)**2,axis=(1,2)))
 run=longest=0
 for silent in r<10**(-65/20):run=run+1 if silent else 0;longest=max(run,longest)
 assert longest*.1<3.5,(s['id'],'unexpected silence',longest)
 return {'id':s['id'],'format':ext,'sampleRate':sr,'channels':ch,'framesDecoded':len(x),'encoderPaddingFrames':int(probe.get('duration_ts',expected))-expected,'integratedLUFS':lufs,'truePeakDbTP':tp,'samplePeakDbFS':round(20*np.log10(peak),3),'loudnessRange':float(loud['input_lra']),'loopJoinJump':join,'monoRatio':round(monorms/rms,4),'longestSilenceSeconds':round(longest*.1,2),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
if __name__=='__main__':
 tracks=json.loads((ROOT/'catalog.json').read_text())['tracks'];tasks=[(s,e) for s in tracks for e in ['m4a','flac']]
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:report=list(pool.map(inspect,tasks))
 (ROOT/'decoded-metrics.json').write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps({'filesVerified':len(report),'playbackBytes':sum(r['bytes'] for r in report if r['format']=='m4a'),'worstTruePeak':max(r['truePeakDbTP'] for r in report),'largestLoopJoin':max(r['loopJoinJump'] for r in report if next(s for s in tracks if s['id']==r['id'])['loop']),'minMonoRatio':min(r['monoRatio'] for r in report)},indent=2))
