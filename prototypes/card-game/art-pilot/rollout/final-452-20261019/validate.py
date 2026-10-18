"""Read-only validation of all deliverable art, previews and protected originals."""
from pathlib import Path
import csv,json,hashlib,collections
from PIL import Image
out=Path(__file__).resolve().parent;p=out.parent.parent;root=p.parents[2]
def gitsha(b):return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
inv=json.loads((p/'inventory-452.json').read_text());rows=inv['cards'];ids=[r['card_id']for r in rows]
csvrows=list(csv.DictReader((p/'inventory-452.csv').open(encoding='utf-8-sig')));assert [r['card_id']for r in csvrows]==ids
assert len(ids)==len(set(ids))==452
prov=json.loads((p/'provenance.json').read_text());ps={c['id']:c for c in prov['cards']};assert len(prov['cards'])==len(ps)==452 and set(ps)==set(ids)
deck=json.loads((out/'deck-manifest.json').read_text())['cards'];assert set(e['id']for e in deck)==set(ids) and len(deck)==452
hashes=[];files=[]
for e in deck:
 for key,size in [('illustration',(1536,1024)),('preview',(600,900)),('small80',(80,120)),('small110',(110,165))]:
  path=p/e[key];b=path.read_bytes()
  with Image.open(path) as im:assert im.format=='PNG' and im.size==size;im.load()
  sha=hashlib.sha256(b).hexdigest();files.append({'id':e['id'],'kind':key,'path':e[key],'dimensions':size,'sha256':sha,'git_blob':gitsha(b)})
  if key=='illustration':assert sha==ps[e['id']]['sha256']==e['sha256'];hashes.append(sha)
assert len(set(hashes))==452
baseline=json.loads((p/'rollout/protected46-baseline.json').read_text());protected=[]
for e in baseline['files']:
 b=(root/e['path']).read_bytes();assert gitsha(b)==e['sha'];protected.append(e['path'])
assert len(protected)==184
species=collections.defaultdict(list)
for r in rows:
 assert r['production_status'] in ('complete_qa','approved_art')
 if r['internal_category']=='main':species[r['card_id'][2:-3]].append(r['card_id'])
assert len(species)==31
for key,cs in species.items():assert cs==[f'M-{key}-{i:02}'for i in range(1,9)]
qa=json.loads((out/'browser-qa.json').read_text());assert qa['pass'] and len(qa['checks'])==452 and set(c['id']for c in qa['checks'])==set(ids)
progress=json.loads((p/'rollout/progress.json').read_text());assert progress['completed']==452 and progress['remaining']==0 and not progress['repair_pending_ids']
lot_checks=[]
for q in (p/'rollout').rglob('browser-qa.json'):
 if q.parent==out:continue
 x=json.loads(q.read_text());lot_checks.append({'path':q.relative_to(p).as_posix(),'pass':x.get('pass')})
# Historical failed candidate reports remain archived; current per-ID final checks are authoritative.
result={'pass':True,'completed':452,'remaining':0,'repair_pending':0,'categories':dict(collections.Counter(r['internal_category']for r in rows)),'illustration_count':452,'preview600_count':452,'preview80_count':452,'preview110_count':452,'png_files_checked':len(files),'duplicate_art_hashes':0,'protected_original_files_byte_identical':len(protected),'main_species':dict(species),'browser_all452':qa['pass'],'mobile':qa['mobile'],'physical_iPhone_Safari':False,'integration_performed':False,'files':files,'lot_browser_records':lot_checks}
(out/'final-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items()if k not in ['files','main_species','lot_browser_records']}))
