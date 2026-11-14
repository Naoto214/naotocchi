"""Independently check AAC decoding at timeline origin (FFmpeg applies MP4 priming).
Legacy half-second unnormalised correlation can prefer a louder periodic cycle.
This verifier never rewrites audio or home receipts; repair only that diagnosed field.
"""
import sys,json,numpy as np
from scipy.signal import correlate
from render import ROOT,R,sha

def measure(sid):
 f=R.decode(ROOT/'audio'/(sid+'.flac'));a=R.decode(ROOT/'audio'/(sid+'.m4a'));n=min(len(f),len(a));assert len(a)>=len(f)
 # Both stereo channels and complete duration; also check startup timing independently.
 corr=float(np.corrcoef(f[:n].mean(1),a[:n].mean(1))[0,1]);m=min(n,4*44100)
 c=correlate(a[:m].mean(1),f[:m].mean(1),method='fft');lag=int(np.argmax(c)-(m-1))
 assert corr>=.98,(sid,corr);assert abs(lag)<=1,(sid,lag)
 st=R.loudness(ROOT/'audio'/(sid+'.m4a'));assert float(st['input_tp'])<=-1,(sid,'AAC true peak');assert not np.any(np.abs(a)>=.9999),(sid,'AAC clipping')
 return {'id':sid,'aacFlacCorrelation':corr,'startupLagFrames':lag,'aacTruePeakDbtp':float(st['input_tp']),'aacIntegratedLUFS':float(st['input_i']),'aacFrames':len(a),'flacFrames':len(f),'method':'FFmpeg MP4 priming applied, full-length zero-lag correlation + four-second FFT timing'}
if __name__=='__main__':
 repair='--repair-alignment' in sys.argv;ids=[v for v in sys.argv[1:] if not v.startswith('--')];ids=ids or [s['id'] for s in json.loads((ROOT/'scores-v7.json').read_text())];out=[]
 for sid in ids:
  result=measure(sid);out.append(result)
  if repair:
   assert not sid.startswith('home-'),'Home receipt immutable'
   p=ROOT/'receipts'/(sid+'.json');r=json.loads(p.read_text());assert r['problems']==['AAC と FLAC の 相関が 低い']
   assert sha(ROOT/'audio'/(sid+'.flac'))==r['flacSha256'] and sha(ROOT/'audio'/(sid+'.m4a'))==r['aacSha256']
   r['legacyAlignmentCorrelation']=r['aacFlacCorrelation'];r['aacFlacCorrelation']=round(result['aacFlacCorrelation'],4);r['aacAlignmentVerification']=result;r['problems']=[];p.write_text(json.dumps(r,ensure_ascii=False,indent=1)+'\n')
  print(sid,'PASS',round(result['aacFlacCorrelation'],6),'lag',result['startupLagFrames'],flush=True)
 if not repair:(ROOT/'verification/encoded-audio.json').write_text(json.dumps(out,indent=1)+'\n')
