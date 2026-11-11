import json,pathlib,copy,shutil,hashlib,math
R=pathlib.Path(__file__).resolve().parents[1];V1=R.parent/'bgm-master32-v1'
a=json.loads((V1/'scores.json').read_text());h=json.loads((V1/'home-scores-original.json').read_text());catalog=json.loads((V1/'catalog.json').read_text())['tracks']
for s,t in zip(h,catalog[:4]):
 s['id']=t['id'];s.update(family='home',loop=True,duration=t['duration'],targetLUFS=t['integratedLUFS'])
a=h+a
analysis={x['id']:x for x in json.loads((R/'analysis-v1.json').read_text()) if x['format']=='flac'}
plans=[]
for s in a:
 m=analysis[s['id']];b=m['bands'];low=b['body']+b['lowMid'];soft=s['family'] in ['sleep','farewell','memory'] or s['id'] in ['lullaby-a','bgm-farewell','home-night','board-b','poyo-2']
 # Individual measurements determine cuts; no master treble boost.
 cut=round(-min(4.5,max(1.0,(low-.32)*10+1.3)),2)
 plan=dict(id=s['id'],family=s['family'],lowMidShare=low,accompanimentCutDb=cut,cutHz=320 if b['body']>b['lowMid'] else 480,roomWet=.07 if soft else .045,roomLowpassHz=4600 if soft else 6200,soft=soft,reason='伴奏の中低域を整理し、録音のアタックを保つ。'+('静かな用途のため高域は控えめ。' if soft else '残響の低域を除き、主旋律との重なりを軽減。'))
 plans.append(plan)
 for i,e in enumerate(s['events']):
  # Exact melody onset, pitch and duration are immutable. Only dynamics change.
  phrase=1+.035*math.sin(2*math.pi*e['t']/(60/s['bpm']*s['meter']*4))
  e['vel']*=phrase
  if e['role']!='melody':
   if e['instrument']=='strings':e['vel']*=.74
   if e['instrument']=='piano' and e['midi']<60:e['vel']*=.84
   e['pan']=max(-.42,min(.42,e.get('pan',0)*1.18))
(R/'scores.json').write_text(json.dumps(a,ensure_ascii=False,separators=(',',':'))+'\n')
(R/'mix-plan.json').write_text(json.dumps(plans,ensure_ascii=False,indent=2)+'\n')
shutil.copyfile(V1/'placement.json',R/'placement.json')
for p in (V1/'midi').glob('*.mid'):shutil.copyfile(p,R/'midi'/p.name)
lock={str(p.relative_to(V1)):hashlib.sha256(p.read_bytes()).hexdigest() for p in V1.rglob('*') if p.is_file() and '.wav'!=p.suffix and '__pycache__' not in str(p)}
(R/'source-lock.json').write_text(json.dumps({'commit':'9e76a71546882233b499e80391613868ae947612','files':lock},indent=2)+'\n')
print('32 scores; melody timing untouched; 32 original MIDI and placement copied')
