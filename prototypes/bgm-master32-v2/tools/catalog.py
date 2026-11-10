import pathlib,json,hashlib
R=pathlib.Path(__file__).resolve().parents[1];V1=R.parent/'bgm-master32-v1'
c=json.loads((V1/'catalog.json').read_text());a={};
for version in ['v1','v2']:
 for x in json.loads((R/('analysis-'+version+'.json')).read_text()):a[version,x['id'],x['format']]=x
plans={p['id']:p for p in json.loads((R/'mix-plan.json').read_text())};out=[]
for t in c['tracks']:
 row={k:t[k] for k in ['number','id','title','usage','category','bpm','meter','bars','repeats','loop','placementRows']};row['versions']={};target=min(a['v1',t['id'],'m4a']['LUFS'],a['v2',t['id'],'m4a']['LUFS'],a['v1',t['id'],'flac']['LUFS'],a['v2',t['id'],'flac']['LUFS'])
 for v in ['v1','v2']:
  m=a[v,t['id'],'m4a'];f=a[v,t['id'],'flac'];prefix='v1-audio' if v=='v1' else 'audio'
  row['versions'][v]=dict(audio=f'{prefix}/{t["id"]}.m4a',master=f'{prefix}/{t["id"]}.flac',duration=t['duration'],sampleRate=m['sampleRate'],gainDb=round(target-m['LUFS'],3),masterGainDb=round(target-f['LUFS'],3),LUFS=m['LUFS'],sha256=m['sha256'],bytes=m['bytes'])
 row['change']=plans[t['id']]['reason'];out.append(row)
(R/'catalog.json').write_text(json.dumps(dict(version=2,sourcePR=536,sourceCommit='9e76a71546882233b499e80391613868ae947612',featured=['home-morning','poyo-1','koro-1','card-2','board-b','var-flight'],tracks=out),ensure_ascii=False,indent=2)+'\n')
print('Catalog: 32 tracks, 6 featured; per-codec attenuation only')
