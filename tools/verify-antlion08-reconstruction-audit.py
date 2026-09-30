#!/usr/bin/env python3
"""Preservation/reproducibility gate for read-only reconstruction feasibility QA."""
from pathlib import Path
import subprocess,json,hashlib,re,base64,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/qa/antlion08-reconstruction-20260928'
r=json.loads((OUT/'measurements.json').read_text());checks=[]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def ck(n,v):
 assert v,n
 checks.append(n)
ck('no candidate, assets or runtime edits',r['candidate_count']==r['asset_changes']==r['runtime_changes']==0)
ck('2862 assets start/end unchanged',len(r['asset_hashes_before'])==2862 and r['asset_hashes_before']==r['asset_hashes_after'])
ck('current assets equal starting snapshot',all(sha(ROOT/p)==h for p,h in r['asset_hashes_before'].items()))
locks=json.loads((ROOT/'docs/qa/starfish-bubble-final-approval-20260928.json').read_text())
ck('approved16 locked',len(locks['locked16'])==16 and all(sha(ROOT/p)==h for p,h in locks['locked16'].items()))
ck('approval final and step4 incomplete',locks['status']=='human_approved_complete' and not locks['step4_complete'])
ck('normal and all10 expression originals preserved',len(r['records'])==11 and all(sha(ROOT/x['path'])==x['sha256']for x in r['records']))
# Every old file, not just runtime: no previous QA is silently rewritten.
ents=subprocess.check_output(['git','ls-tree','-r','-z',r['source_head']],cwd=ROOT).split(b'\0');expected={}
for e in ents:
 if e:
  meta,name=e.split(b'\t');expected[name.decode()]=meta.decode().split()[2]
ps=sorted(expected);actual=subprocess.check_output(['git','hash-object','--stdin-paths'],input=('\n'.join(ps)+'\n').encode(),cwd=ROOT).decode().splitlines()
ck('all source tracked blobs including runtime and old QA unchanged',len(actual)==len(ps) and all(expected[p]==h for p,h in zip(ps,actual)))
ck('face support not misrepresented as safe extraction',r['face']['outline_contact_pixels']>0 and '安全な顔抽出maskではない' in r['face']['meaning'])
ck('nonface partitions exhaustive',sum(r['nonface'][k]for k in ['rgba_exact','shared_occupancy_different_rgba','silhouette_difference'])==r['nonface']['occupied_union'])
ck('global registration measures all10, four face-free ROIs',len(r['registration']['global_fits'])==10 and len(r['registration']['local_tired_fits'])==4)
ck('no optimizer fit worsens measured integer seed',all(x['rigid_tired_to_normal']['chamfer_px']<=x['translation_chamfer_px']+1e-6 for x in list(r['registration']['global_fits'].values())+list(r['registration']['local_tired_fits'].values())))
ck('topology normal26 tired2',r['components'][0]['component_count']==26 and r['components'][5]['component_count']==2)
ck('no standalone candidate PNG',not list(OUT.glob('*.png')))
log=(OUT/'focused-test.log').read_text();passed=int(re.search(r'ℹ pass (\d+)',log)[1]);failed=int(re.search(r'ℹ fail (\d+)',log)[1])
ck('focused852 pass0fail',passed==852 and failed==0)
ck('z-order regression ran','✔ the selected expression mark paints above illness sweat and character art' in log)
ck('14 valid annotated SVG sheets',len(r['sheets'])==14 and all(ET.parse(OUT/p).getroot().tag.endswith('svg')for p in r['sheets']))
# HTML embeds exact sheets so reviewing it does not depend on network assets.
h=(OUT/'comparison.html').read_text();data=re.findall(r'data:image/svg\+xml;base64,([A-Za-z0-9+/=]+)',h)
ck('HTML contains exact14 sheets',len(data)==14 and [base64.b64decode(x)for x in data]==[(OUT/p).read_bytes()for p in r['sheets']])
outputs=r['sheets']+['measurements.json','comparison.html'];pre={p:sha(OUT/p)for p in outputs}
subprocess.run(['python',str(ROOT/'tools/antlion08-reconstruction-audit.py')],cwd=ROOT,check=True,stdout=subprocess.DEVNULL)
ck('16 derived outputs byte reproducible',all(sha(OUT/p)==h for p,h in pre.items()))
ck('all assets unchanged after repeat',all(sha(ROOT/p)==h for p,h in r['asset_hashes_before'].items()))
subprocess.run(['git','diff','--check'],cwd=ROOT,check=True);ck('git diff --check',True)
v=dict(source_head=r['source_head'],checks_passed=len(checks),checks=checks,source_tracked_files_verified=len(ps),assets_verified=2862,approved16_preserved=True,normal_and_antlion10_preserved=True,candidate_count=0,production_png_changes=0,runtime_changes=0,reproducible_outputs=pre,focused=dict(passed=passed,failed=failed),full_test='not run',quick_mode='not run; initial failure cause unresolved',actual_browser='not checked',verdict='成立困難; no candidate; human review pending')
(OUT/'verification.json').write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v[k]for k in ['checks_passed','source_tracked_files_verified','assets_verified','candidate_count','runtime_changes','focused']},ensure_ascii=False))
