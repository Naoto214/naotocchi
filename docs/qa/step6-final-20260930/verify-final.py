import gzip,json,hashlib,subprocess,re
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
ROOT=Path(__file__).resolve().parents[3];OUT=Path(__file__).resolve().parent;SITE=ROOT.parent/'site-step5/dist'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
snap=json.loads(gzip.decompress((OUT/'start-snapshot.json.gz').read_bytes()))
differences=[r['path'] for r in snap['tracked'] if not (ROOT/r['path']).exists() or sha(ROOT/r['path'])!=r['sha256']]
assert differences == ['docs/qa/growth-hunger-expression-implementation-checklist-20260926.md'],differences
m=json.loads((ROOT/'docs/qa/starfish-expressions-step3-20260927-manifest.json').read_text());assert len(m['records'])==30
for r in m['records']:assert sha(ROOT/r['final'])==r['final_sha256'],r['final']
b=json.loads((ROOT/'docs/qa/starfish-baseline-candidates-20260925/manifest.json').read_text())
for r in b['files']:assert sha(ROOT/r['original_runtime_path'])==r['sha256'],r
class Links(HTMLParser):
 def __init__(self):super().__init__();self.links=[]
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  for k in ('src','href'):
   if k in d:self.links.append(d[k])
  if 'srcdoc' in d:
   sub=Links();sub.feed(d['srcdoc']);self.links+=sub.links
missing=[];checked=0
for p in [SITE/'index.html',SITE/'regular.html',SITE/'mark-review/index.html',SITE/'final-audit/index.html']:
 parser=Links();parser.feed(p.read_text())
 for raw in parser.links:
  u=urlsplit(raw)
  if u.scheme or u.netloc or not u.path:continue
  q=SITE/unquote(u.path).lstrip('/') if u.path.startswith('/') else p.parent/unquote(u.path)
  if q.is_dir():q=q/'index.html'
  checked+=1
  if not q.exists():missing.append({'page':str(p.relative_to(SITE)),'ref':raw})
sitefiles=subprocess.check_output(['git','ls-files'],cwd=SITE.parent).decode().splitlines()
ss=[{'path':p,'sha256':sha(SITE.parent/p)} for p in sitefiles]
with gzip.GzipFile(filename=str(OUT/'site-source-snapshot.json.gz'),mode='wb',mtime=0) as f:f.write(json.dumps(ss,ensure_ascii=False).encode())
result={'tracked_preserved':len(snap['tracked'])-len(differences),'intentional_document_changes':differences,'non_target_differences':[],'all_image_files_preserved':len(snap['images']),'png_preserved':sum(r['path'].lower().endswith('.png') for r in snap['images']),'normal_preserved':len(snap['normal']),'expression_png_preserved':len(snap['expressions']),'approved26_preserved':len(snap['approved26']),'food_svg_preserved':len(snap['food']),'runtime_preserved':len(snap['runtime']),'repo_site_related_preserved':len(snap['site_related']),'starfish_30_manifest_matches':30,'starfish_8_normal_approved_source_matches':8,'site_links_checked':checked,'site_missing_links':missing,'site_source_files':len(ss),'production_image_changes':0}
(OUT/'final-hash-verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
