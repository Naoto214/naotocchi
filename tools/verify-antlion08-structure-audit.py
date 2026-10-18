#!/usr/bin/env python3
"""Verifies preservation and reproducibility of an audit with no candidate."""
from pathlib import Path
import subprocess,json,hashlib,re,base64
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/qa/antlion08-structure-20260928'
r=json.loads((OUT/'structure.json').read_text());checks=[]
def check(name,ok):
 assert ok,name
 checks.append(name)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
check('11 source images, selected tired',len(r['records'])==11 and r['representative']=='tired')
check('stop B, no candidate and no production writes',r['candidate_count']==r['production_images_changed']==r['baseline_images_changed']==0 and r['status']=='B_no_safe_complete_local_repair_established')
check('assets before-after identical',r['asset_hashes_before']==r['asset_hashes_after'])
check('all 2862 assets match',len(r['asset_hashes_before'])==2862 and all(sha(ROOT/p)==h for p,h in r['asset_hashes_before'].items()))
lock=json.loads((ROOT/'docs/qa/starfish-bubble-final-approval-20260928.json').read_text())
check('human approval A remains complete',lock['status']=='human_approved_complete' and not lock['step4_complete'])
check('all approved16 locked',len(lock['locked16'])==16 and all(sha(ROOT/p)==h for p,h in lock['locked16'].items()))
check('antlion08 ten originals and baseline unchanged',all(sha(ROOT/x['path'])==x['sha256']for x in r['records']))
source=r['source_head'];entries=subprocess.check_output(['git','ls-tree','-r','-z',source],cwd=ROOT).split(b'\0');expected={}
for ent in entries:
 if ent:
  meta,name=ent.split(b'\t',1);expected[name.decode()]=meta.decode().split()[2]
allowed={'docs/qa/growth-hunger-expression-implementation-checklist-20260926.md','docs/qa/step4-local-repair-20260927.md'}
paths=sorted(set(expected)-allowed)
actual=subprocess.check_output(['git','hash-object','--stdin-paths'],input=('\n'.join(paths)+'\n').encode(),cwd=ROOT).decode().splitlines()
check('all existing tracked files except two QA append-only notes byte preserved',len(actual)==len(paths) and all(expected[p]==h for p,h in zip(paths,actual)))
# QA note changes must be append-only to source A.
for p in sorted(allowed):
 old=subprocess.check_output(['git','show',source+':'+p],cwd=ROOT);check(p+' append-only', (ROOT/p).read_bytes().startswith(old))
protected=np.array(Image.open(OUT/'mask-protected-union.png'))>0;distal=np.array(Image.open(OUT/'mask-distal-trail-study.png'))>0
check('distal study excludes every protected pixel',not np.any(protected&distal))
check('distal 94 pixels exactly',int(distal.sum())==94)
check('mask OR matches named regions',np.array_equal(protected,np.logical_or.reduce([np.array(Image.open(OUT/('mask-'+k+'.png')))>0 for k in r['protection_polygons']])))
check('prior trial explicitly missing',not r['old_trial_image_available'] and '未取得' in (OUT/'comparison.html').read_text())
check('no candidate filename or runtime asset substitution',not list(OUT.glob('*candidate*.png')))
log=(OUT/'focused-test.log').read_text();pc=int(re.search(r'ℹ pass (\d+)',log)[1]);fc=int(re.search(r'ℹ fail (\d+)',log)[1])
check('focused 852 pass 0 fail',pc==852 and fc==0)
check('z-order regression included', '✔ the selected expression mark paints above illness sweat and character art' in log)
com=json.loads((OUT/'state-composite.json').read_text())
check('composite uses actual tired original',com['asset']=='assets/characters/expressions/antlion/08-tired.png' and com['asset_sha256']==sha(ROOT/com['asset']))
check('composite CSS and care CSS identical to runtime',com['css_sha256']==sha(ROOT/'pet-expression.css') and com['care_css_sha256']==sha(ROOT/'care-attention.css'))
check('all three Home sizes', [x['size']for x in com['records']]==[64,80,104])
# Re-run both producers; report and logs deliberately excluded, outputs must stay byte-identical.
ps=[p for p in OUT.iterdir()if p.suffix in {'.png','.svg','.json','.html'} and p.name!='verification.json'];before={p.name:sha(p)for p in ps}
subprocess.run(['python',str(ROOT/'tools/antlion08-structure-audit.py')],cwd=ROOT,check=True,stdout=subprocess.DEVNULL)
subprocess.run(['node',str(ROOT/'tools/antlion08-state-composite.cjs')],cwd=ROOT,check=True,stdout=subprocess.DEVNULL)
check('all derived images masks metadata HTML byte reproducible',all(sha(OUT/p)==h for p,h in before.items()))
check('assets still unchanged after repeat',all(sha(ROOT/p)==h for p,h in r['asset_hashes_before'].items()))
h=(OUT/'comparison.html').read_text();embedded=re.findall(r'data:image/png;base64,([A-Za-z0-9+/=]+)',h)
check('five embedded sheets exact',len(embedded)==5 and [base64.b64decode(v)for v in embedded]==[(OUT/p).read_bytes()for p in ['all11-originals.png','structure-masks.png','legs-closeup.png','comparison-sizes.png','all11-leg-regions.png']])
v=dict(source_head=source,checks_passed=len(checks),checks=checks,existing_files_verified=len(paths),assets_verified=2862,approved_locks=16,candidate_count=0,production_images_changed=0,baseline_images_changed=0,protected_region_changes=r['protected_changes'],change_bbox=None,reproducible_outputs=len(ps),output_sha256=before,focused=dict(passed=pc,failed=fc,log='focused-test.log'),full_test='not run',quick_mode='not run; initial failure cause still unresolved')
(OUT/'verification.json').write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v[k]for k in ['checks_passed','existing_files_verified','assets_verified','candidate_count','production_images_changed','reproducible_outputs','focused']},ensure_ascii=False))
