"""Package only the trial runtime plus hash-verified baseline art. No production writes."""
import concurrent.futures,hashlib,json,pathlib,re,shutil,subprocess,sys,urllib.request
root=pathlib.Path(__file__).resolve().parents[3]
site=pathlib.Path(sys.argv[1]);dest=site/'dist';game=root/'prototypes/card-game';target=dest/'prototypes/card-game'
target.mkdir(parents=True,exist_ok=True)
for p in game.iterdir():
 if p.is_file() and p.suffix in ('.mjs','.css','.html','.md'):shutil.copy2(p,target/p.name)
shutil.copytree(game/'ui-assets',target/'ui-assets',dirs_exist_ok=True)
base='fe6fd8a308df5ff0147d00bc0b6abd2ff0fceca7'
paths=re.findall(r'"\.\./\.\./(assets/[^"\n]+)"',(game/'ui-art.mjs').read_text())+['assets/characters/egg/intact.png']
rows=subprocess.check_output(['git','ls-tree','-r',base,'--',*paths],cwd=root,text=True).splitlines()
expected={row.split('\t')[1]:row.split()[2] for row in rows}
def download(path):
 out=dest/path
 if out.exists():data=out.read_bytes()
 else:
  with urllib.request.urlopen(f'https://raw.githubusercontent.com/Naoto214/naotocchi/{base}/{path}',timeout=60) as r:data=r.read()
 actual=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
 if actual!=expected[path]:raise ValueError('Asset mismatch: '+path)
 if not data.startswith(b'\x89PNG\r\n\x1a\n'):raise ValueError('Invalid PNG: '+path)
 out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(data)
 return {'path':path,'gitBlob':actual,'bytes':len(data)}
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:assets=list(pool.map(download,paths))
(dest/'index.html').write_text('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=./prototypes/card-game/"><title>なおとっち CPU対戦</title><a href="./prototypes/card-game/">CPU対戦を開く</a></html>')
manifest=site/'.openai/hosting.json';m=json.loads(manifest.read_text());m['static']={'directory':'dist'};manifest.write_text(json.dumps(m,indent=2)+'\n')
record={'baseArtCommit':base,'assets':assets,'count':len(assets),'bytes':sum(x['bytes'] for x in assets),'dedicated452ArtIncluded':False}
(game/'cpu-evidence/site-assets.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({'files':len(list(dest.rglob('*'))),'assets':len(assets),'bytes':record['bytes']}))
