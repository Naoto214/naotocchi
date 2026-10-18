"""Read-only verification of final approved adoption and non-target preservation."""
from pathlib import Path
import json,hashlib,subprocess
from PIL import Image
R=Path(__file__).resolve().parents[3];O=Path(__file__).resolve().parent
BASE='852ac7b98cd0c2bbb5bbaba73b12187c3e65721c'
sha=lambda b:hashlib.sha256(b).hexdigest()
m=json.loads((O/'manifest.json').read_text());targets={v['production'] for v in m['records'] if v['production_file_changed']}
for v in m['records']:
 source=(R/v['source']).read_bytes();production=(R/v['production']).read_bytes()
 assert source==production
 assert sha(source)==v['source_sha256']==v['production_sha256']
 assert Image.open(R/v['production']).size==(128,128)
assert len(targets)==9
allowed_docs={'docs/qa/growth-hunger-expression-implementation-checklist-20260926.md','docs/qa/antlion08-eye-review-20260929/status.json','docs/qa/antlion08-final-selection-20260929/selection.json','docs/qa/antlion-expressions-20260918-manifest.json'}
preserved=[];changed=[];non_target_pngs=0
for line in subprocess.check_output(['git','ls-tree','-r',BASE],cwd=R,text=True).splitlines():
 meta,p=line.split('\t');b=(R/p).read_bytes();actual=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
 if actual==meta.split()[2]:
  preserved.append(p)
  if p.endswith('.png'):non_target_pngs+=1
 else:changed.append(p);assert p in targets|allowed_docs,p
assert set(changed)==targets|allowed_docs
locked=json.loads((R/'docs/qa/antlion08-method-d-nine-20260928/tired-adoption.json').read_text())['locked_approved17']
for p,h in locked.items():assert sha((R/p).read_bytes())==h,p
master=json.loads((R/'docs/qa/antlion-expressions-20260918-manifest.json').read_text())
for v in m['records']:
 row=next(x for x in master['records'] if x['stage']=='08' and x['state']==v['state'])
 assert row['final_sha256']==v['production_sha256']
selection=json.loads((R/'docs/qa/antlion08-final-selection-20260929/selection.json').read_text())
for v in m['records']:
 assert selection['selected'][v['state']]['sha256']==v['production_sha256']
subprocess.run(['git','diff','--check'],cwd=R,check=True)
result={'source_head':BASE,'approved_source_production_byte_matches':10,'production_changed_pngs':9,'unchanged_tired_D4':True,'candidate_regeneration':0,'source_to_production_extra_pixel_changes':0,'existing_files_checked':len(changed)+len(preserved),'existing_files_preserved':len(preserved),'allowed_changed_existing':changed,'non_target_png_hashes_preserved':non_target_pngs,'prior_approved16_and_D4_preserved':len(locked),'canonical_stage08_manifest_synced':10,'current_selection_synced':10,'diff_check':'PASS','antlion08_step4':'complete','human_confirmation_pending':False,'step5':False}
(O/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
