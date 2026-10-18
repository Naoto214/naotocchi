#!/usr/bin/env python3
"""QA checks for the read-only 08 audit; requires source and pre-repair commits locally."""
from pathlib import Path
import json,hashlib,subprocess,io,re,base64
import numpy as np
from PIL import Image
from scipy.ndimage import label
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/qa/starfish08-coordinate-20260928'
r=json.loads((OUT/'measurements.json').read_text());checks=[]
def check(name,ok):
 assert ok,name
 checks.append(name)
def blob(ref,p):return subprocess.check_output(['git','show',ref+':'+p],cwd=ROOT)
check('55 unique identities',len({(x['key'],x['id'])for x in r['measurements']})==55)
check('2862 asset hashes start=end',r['asset_hashes_before']==r['asset_hashes_after'] and len(r['asset_hashes_before'])==2862)
check('current assets match audit start',all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h for p,h in r['asset_hashes_before'].items()))
check('all tracked assets byte-match source commit',all(blob(r['source_head'],p)==(ROOT/p).read_bytes()for p in r['asset_hashes_before']))
rep=json.loads((ROOT/'docs/qa/step4-local-repair-20260927.json').read_text())
check('16 approved images remain locked',len(rep['records'])==16 and all(hashlib.sha256((ROOT/x['path']).read_bytes()).hexdigest()==x['after_sha256']for x in rep['records']))
check('antlion08 all ten remain pre-repair originals',all(blob(rep['source_head'],f'assets/characters/expressions/antlion/08-{k}.png')==(ROOT/f'assets/characters/expressions/antlion/08-{k}.png').read_bytes()for k in [x['key']for x in r['images'][1:]]))
ref=np.array(Image.open(ROOT/r['images'][0]['path']).convert('RGBA'));ll,_=label(ref[:,:,3]>0);tiny=ll==ll[93,106]
check('B5 reference 45 pixels',int(tiny.sum())==45)
provenance=[]
for im in r['images'][1:]:
 key=im['key'];raw=(ROOT/im['path']).read_bytes();a=np.array(Image.open(io.BytesIO(raw)).convert('RGBA'))
 prev=np.array(Image.open(io.BytesIO(blob(rep['source_head'],im['path']))).convert('RGBA'))
 changed=np.any(a!=prev,axis=2);copy=tiny&(prev[:,:,3]==0)
 check(key+' repair changed only previously-transparent B5 pixels',np.array_equal(changed,copy))
 check(key+' copied source RGBA without transform',np.array_equal(a[copy],ref[copy]))
 check(key+' existing four bubbles/body unchanged by repair',np.array_equal(a[~copy],prev[~copy]))
 b=next(x for x in r['measurements']if x['key']==key and x['id']=='B5')
 check(key+' unique B5 template placement is (0,0)',b['B5_template_best_shifts']==[[0,0]])
 provenance.append(dict(key=key,restored_pixels=int(copy.sum()),protected_contact_pixels=int((tiny&~copy).sum())))
check('all registration optima unique',all(len(x['registration_ties'])==1 for x in r['images']))
for x in r['measurements']:
 check(x['key']+'/'+x['id']+' center delta identity',all(x['delta_relative_center'][q]==x['delta_abs_center'][q]+next(i for i in r['images']if i['key']==x['key'])['registration_to_normal'][q]for q in range(2)))
h=(OUT/'comparison.html').read_text(); embeds=re.findall(r'data:image/png;base64,([A-Za-z0-9+/=]+)',h)
check('seven embedded QA sheets exact',len(embeds)==7 and [base64.b64decode(s)for s in embeds]==[(OUT/f'B{i}-comparison.png').read_bytes()for i in range(1,6)]+[(OUT/'registered-overlays.png').read_bytes(),(OUT/'core-only.png').read_bytes()])
# PNG sheets are derived evidence, not assets. Check source files still match after all checks.
check('final asset hashes still unchanged',all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h for p,h in r['asset_hashes_before'].items()))
log=(OUT/'focused-test.log').read_text();passed=int(re.search(r'ℹ pass (\d+)',log)[1]);failed=int(re.search(r'ℹ fail (\d+)',log)[1]);check('focused log 256 pass / 0 fail',passed==256 and failed==0)
v=dict(source_head=r['source_head'],pre_repair_head=rep['source_head'],checks_passed=len(checks),checks=checks,repair_provenance=provenance,image_asset_changes=0,focused_test=dict(command='node --test tests/pet-expression-assets-test.cjs',pass_count=passed,fail_count=failed,log='focused-test.log'),limitations=['full joined contour cannot be uniquely segmented from alpha; blue-core metrics are exact for the declared selector','body silhouette changes, so rigid registration does not establish a unique physical local anchor','no tolerance or repair authorization inferred'])
(OUT/'verification.json').write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'checks_passed':len(checks),'image_asset_changes':0,'repair_provenance':provenance}))
