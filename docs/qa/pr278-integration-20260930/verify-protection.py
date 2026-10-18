import hashlib,json,subprocess,re
from pathlib import Path
R=Path(__file__).resolve().parents[3];Q=Path(__file__).resolve().parent
read=lambda p:json.loads((R/p).read_text())
sha=lambda p:hashlib.sha256((R/p).read_bytes()).hexdigest()
base=read('docs/qa/pr278-integration-20260930/image-baseline.json')
for p,v in base['images'].items(): assert sha(p)==v['sha256'],p
locked=read('docs/qa/starfish-bubble-final-approval-20260928.json')['locked16'];rows=[]
for r in read('docs/qa/step4-local-repair-20260927.json')['records']:
 assert sha(r['path'])==r['after_sha256']==locked[r['path']];rows.append({'path':r['path'],'sha256':sha(r['path'])})
for r in read('docs/qa/antlion08-production-final-20260929/manifest.json')['records']:
 assert sha(r['production'])==sha(r['source'])==r['production_sha256'];rows.append({'path':r['production'],'sha256':sha(r['production']),'candidate':r['candidate_id']})
assert len(rows)==26
feature=subprocess.check_output(['git','ls-tree','-r','--name-only',base['head']],cwd=R).decode().splitlines()
protected=[p for p in feature if p.startswith('docs/') or p.startswith('tools/expression-') or p in ['pet-expression.js','pet-expression.css','emotion-state.js','character-world-master.v1.js','cast-bounds.js']]
# Main explicitly added to this document. All Expression documents remain exact.
protected.remove('docs/qa/pr278-integration-20260930/plan.md') if 'docs/qa/pr278-integration-20260930/plan.md' in protected else None
changes=[]
for p in protected:
 old=subprocess.check_output(['git','rev-parse',base['head']+':'+p],cwd=R).decode().strip();new=subprocess.check_output(['git','hash-object',p],cwd=R).decode().strip()
 if old!=new:changes.append(p)
assert changes==['docs/TEXT_STYLE.md'],changes
assert subprocess.check_output(['git','hash-object','docs/TEXT_STYLE.md'],cwd=R).strip()==subprocess.check_output(['git','rev-parse','origin/main:docs/TEXT_STYLE.md'],cwd=R).strip()
result={'images_preserved':len(base['images']),'png_preserved':sum(p.endswith('.png') for p in base['images']),'normal_preserved':sum(bool(re.fullmatch(r'assets/characters/[^/]+/\d\d.png',p)) for p in base['images']),'approved26':rows,'antlion08':10,'image_byte_changes':[],'protected_documents_resolvers_manifests':len(protected),'protected_changes':[], 'main_owned_document_update':'docs/TEXT_STYLE.md exact main RH-11 alias note'}
(Q/'image-verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print('Image/provenance protection PASS',result['images_preserved'])
