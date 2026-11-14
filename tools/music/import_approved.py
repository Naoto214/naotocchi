"""One-time byte-preserving adoption from pinned PR549/550 artifacts. Never renders."""
import pathlib,sys,json,hashlib,subprocess,shutil
import numpy as np
from library import Library,atomic,sha,digest
ROOT=pathlib.Path(__file__).resolve().parents[2]
SOURCE_COMMIT='bea117b5e3bf763219d5ad226595d19dfed14f87'
MUSIC_COMMIT='01a55914244b8cf74f3cd467ef9b83beb23f8e13'
def main(src):
 if (ROOT/'music/library.json').exists():raise ValueError('library already exists; approved import cannot overwrite')
 src=pathlib.Path(src);base=src/'prototypes/bgm-v7-complete-20261114';audit=src/'prototypes/bgm-loudness-20261114'
 provenance={}
 def copy(source,dest,rel=None):
  rel=rel or str(source.relative_to(src));data=source.read_bytes();want=subprocess.check_output(['git','rev-parse',SOURCE_COMMIT+':'+rel],cwd=ROOT,text=True).strip();actual=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
  if actual!=want:raise ValueError('pinned Git blob mismatch '+rel)
  dest=ROOT/dest;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,dest);provenance[str(dest.relative_to(ROOT))]=sha(dest)
 for name in ['scores-v7.json','samples.json','HOME-LOCK.json','LICENSE-VSCO-CC0.txt','LICENSE-KARORYFER-CC0.txt']:
  copy(base/name,'music/provenance/'+name)
 copy(base/'placement.json','music/placements.json')
 copy(audit/'analysis/detailed32.json','music/provenance/loudness32.json')
 copy(src/'prototypes/bgm-v7-strings-20261114/final-audit/piano-sources.json','music/provenance/piano-sources.json')
 # Runtime game map is the reviewed integration, pinned to preview commit caa8335.
 p=pathlib.Path('/workspace/work/playtest/assets/bgm/placement.js')
 raw=subprocess.check_output(['node','-e',"require(process.argv[1]);process.stdout.write(JSON.stringify(globalThis.NAOTOCCHI_BGM_PLACEMENT.GAME_SONG))",str(p)],text=True)
 atomic(ROOT/'music/game-songs.json',json.loads(raw));provenance['music/game-songs.json']=sha(ROOT/'music/game-songs.json')
 atomic(ROOT/'music/extensions.json',{'rows':[],'gameSongs':{}})
 samples=json.loads((base/'samples.json').read_text())
 rights={}
 for sid,title,commit,url,licensefile in [('vsco','VSCO 2 Community Edition','440300901dfe9275fd84e0b7763af1f8443ae62e','https://versilian-studios.com/vsco-community/','LICENSE-VSCO-CC0.txt'),('karoryfer','Karoryfer x bigcat Cello — Kamila Borowiak','6fd75fbfc1dbb3109bf26220ba1adea46188a18b','https://github.com/sfzinstruments/karoryfer-bigcat.cello/tree/6fd75fbfc1dbb3109bf26220ba1adea46188a18b','LICENSE-KARORYFER-CC0.txt')]:
  rights[sid]={'name':title,'commit':commit,'license':'CC0-1.0','reviewed':True,'reference':url,'licenseFile':'music/provenance/'+licensefile,'licenseSha256':sha(ROOT/'music/provenance'/licensefile),'sampleManifest':'music/provenance/samples.json','sampleManifestSha256':sha(ROOT/'music/provenance/samples.json'),'adoptionReference':'PR549 approved by user for production2026-11-14'}
 atomic(ROOT/'music/sources.json',rights)
 scores=json.loads((base/'scores-v7.json').read_text());loud={t['id']:t for t in json.loads((audit/'analysis/detailed32.json').read_text())['tracks']};places=json.loads((base/'placement.json').read_text());tracks=[]
 major=np.array([6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88]);minor=np.array([6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17]);names=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']
 for s in scores:
  sid=s['id'];r=json.loads((base/'receipts'/(sid+'.json')).read_text());h=sid.startswith('home-');assets={}
  for typ,ext in [('aac','m4a'),('flac','flac'),('midi','mid')]:
   source=base/('midi' if typ=='midi' else 'audio')/(sid+'.'+ext);dest='assets/bgm/'+sid+'.m4a' if typ=='aac' else 'music/masters/'+sid+'/'+sid+'.'+ext
   copy(source,dest);actual=sha(ROOT/dest)
   if actual!=r[typ+'Sha256']:raise ValueError('receipt mismatch '+sid)
   assets[typ]={'path':dest,'sha256':actual,'bytes':(ROOT/dest).stat().st_size}
  copy(base/'receipts'/(sid+'.json'),'music/provenance/receipts/'+sid+'.json')
  melody=[e for e in s['events'] if e['role']=='melody'];weights=np.zeros(12)
  for e in melody:weights[e['midi']%12]+=e['dur']
  candidates=[(float(np.corrcoef(weights,np.roll(profile,k))[0,1]),names[k]+' '+mode) for mode,profile in [('major',major),('minor',minor)] for k in range(12)];estimate=max(candidates)
  cello=h or any(x.get('library')=='karoryfer' for x in r.get('nativeSourceUses',[]))
  instruments=sorted({e['instrument'] for e in s['events']});instruments+=['cello_chamber'] if cello and 'cello_chamber' not in instruments else []
  l=loud[sid];t={'id':sid,'title':s['title'],'uses':[x['rowId'] for x in places if sid in x['songs']],'kind':'jingle' if not s['loop'] else 'variation' if sid.startswith('var-') else 'bgm','bpm':s['bpm'],'meter':str(s['meter'])+'/4','key':{'declared':None,'estimate':estimate[1],'correlation':round(estimate[0],4),'basis':'Source score/MIDI has no declared key. Melody duration-weighted pitch-class Krumhansl major/minor profile estimate; not an authored tonal declaration.'},'duration':r['seconds'],'frames':r['frames'],'sampleRate':44100,'loop':{'enabled':s['loop'],'start':0,'end':r['frames']/44100},'assets':assets,'score':{'path':'music/provenance/scores-v7.json','sha256':sha(ROOT/'music/provenance/scores-v7.json'),'trackId':sid},'melody':{'notes':len(melody),'sha256':digest([[e['t'],e['midi'],e['dur']] for e in melody])},'arrangement':{'reference':'https://github.com/Naoto214/naotocchi/blob/'+MUSIC_COMMIT+'/prototypes/bgm-v7-complete-20261114/scores-v7.json','version':'B2+ locked' if h else 'V7 complete','receipt':'music/provenance/receipts/'+sid+'.json'},'instruments':instruments,'sources':['vsco','karoryfer'] if cello else ['vsco'],'sampleUsage':{'manifest':'music/provenance/samples.json','receiptNativeUses':'music/provenance/receipts/'+sid+'.json','note':'Home B2+ source piano audit plus frozen B2 strings; remaining28 receipt.nativeSourceUses lists exact recorded sources. No samples re-rendered.'},'individualGainDb':0,'measurements':{k:l[k] for k in ['integratedLUFS','truePeakDbtp','lraLU','momentaryMax','shortTermMax']},'status':'approved','history':[{'at':'2026-11-14','action':'V7 complete approved without audio change','sourcePR':549,'sourceCommit':MUSIC_COMMIT},{'at':'2026-11-14','action':'Production adoption; individual gain0dB; common gain0.36','sourcePR':550,'sourceCommit':SOURCE_COMMIT}]}
  tracks.append(t)
 L=Library(ROOT)
 for t in tracks:
  fp=L.validate(t);t['approval']={'reference':'User: V7 complete32 + PR550 formally adopted for production2026-11-14','fingerprint':fp,'at':'2026-11-14'}
  atomic(ROOT/'music/verification/tracks'/(t['id']+'.json'),{'success':True,'fingerprint':fp,'analysis':{'basis':'Imported passed PR549/550 measurements with exact pinned Git blob and SHA256 match; no new rendering or measurement claim','aac':t['measurements'],'originalReceipt':t['arrangement']['receipt']},'checkedAt':'2026-11-14'})
 atomic(ROOT/'music/library.json',{'version':1,'initialRelease':'V7-complete-B2plus','tracks':tracks})
 assert len(tracks)==32 and sum(t['melody']['notes'] for t in tracks)==3158 and len(places)==50
 atomic(ROOT/'music/approved32.lock.json',{'version':1,'musicCommit':MUSIC_COMMIT,'loudnessCommit':SOURCE_COMMIT,'tracks':{t['id']:digest(t) for t in tracks},'sources':{sid:digest(r) for sid,r in rights.items()},'files':provenance,'melodyNotes':3158,'placements':50})
 print('Adopted32: pinned Git blobs + receipts +3158notes/50rows. No audio transformed.')
if __name__=='__main__':main(sys.argv[1])
