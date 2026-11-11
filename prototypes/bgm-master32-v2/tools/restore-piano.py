"""Restore pinned VSCO 2 CE dyn2 piano samples; retain acquired SHA256s."""
import pathlib,json,urllib.request,hashlib
R=pathlib.Path(__file__).resolve().parents[1];V1=R.parent/'bgm-master32-v1';(R/'samples').mkdir(exist_ok=True)
dest=R/'samples/piano-manifest.json';pinned=json.loads(dest.read_text()) if dest.exists() else None
sources=pinned or [dict(path=pathlib.Path(e['path']).name.replace('dyn1','dyn2'),url=e['url'].replace('dyn1','dyn2')) for e in json.loads((V1/'samples/manifest.json').read_text())['files'] if 'Player_dyn1' in e['path']]
for e in sources:
 p=R/'samples'/e['path'];data=p.read_bytes() if p.exists() else urllib.request.urlopen(e['url'],timeout=60).read();h=hashlib.sha256(data).hexdigest()
 if 'sha256' in e:assert e['sha256']==h
 p.write_bytes(data);e.update(sha256=h,bytes=len(data))
dest.write_text(json.dumps(sources,indent=2)+'\n');print('Pinned dyn2 piano:',len(sources))
