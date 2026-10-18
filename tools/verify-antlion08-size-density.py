#!/usr/bin/env python3
"""Verify audit artifacts and preservation; no source-image writes."""
from pathlib import Path
import base64, csv, hashlib, json, re, subprocess, sys
import numpy as np
from PIL import Image

R=Path(__file__).resolve().parents[1]
O=R/'docs/qa/antlion08-size-density-20260928'
BASE='f1707cc65fb638bc5128ec0151b8c8f5d67d9a32'
sha=lambda b:hashlib.sha256(b).hexdigest()
old=json.loads((R/'docs/qa/antlion08-followup-20260928/start-hashes.json').read_text())
tracked=subprocess.check_output(['git','ls-tree','-r','--name-only',BASE],cwd=R,text=True).splitlines()
assert len(tracked)==3905
for p in tracked:
    expected=old.get(p)
    if expected is None:
        expected=sha(subprocess.check_output(['git','show',f'{BASE}:{p}'],cwd=R))
    assert sha((R/p).read_bytes())==expected,p
def generate():
    subprocess.run([sys.executable,str(R/'tools/antlion08-size-density-audit.py')],cwd=R,check=True,capture_output=True)
    return {p.name:sha(p.read_bytes()) for p in O.iterdir() if p.name!='verification.json'}
a=generate();b=generate();assert a==b
d=json.loads((O/'density.json').read_text());m=d['metrics']
assert len(m)==11
rows=list(csv.DictReader((O/'density.csv').open()))
assert len(rows)==11
for row in rows:
    for k,v in row.items():
        if k!='state':assert float(v)==m[row['state']][k],(row['state'],k)
for state,v in m.items():
    assert v['alpha_values']==[0,255]
    assert v['particle_pixels']==v['occupied_area_px2']
    assert sum(x['pixels'] for x in v['local_grid'])==v['particle_pixels']
    assert all(x['rear_particle_pixels']==v['particle_pixels'] for x in v['span_threshold_sensitivity'].values())
    assert v['corridor_particle_to_trail_ratio']==v['corridor_particle_pixels']/v['corridor_trail_pixels']
    assert v['max_local_12x12_pct']==v['max_local_12x12_pixels']/144*100
source_bytes={(R/v['path']).read_bytes() for v in d['assets'].values()}
for file in ['body-128.svg','body-104.svg','body-80.svg','body-64.svg','faces-enlarged.svg','rear.svg']:
    embedded=re.findall(r'data:image/png;base64,([^" ]+)',(O/file).read_text())
    assert len(embedded)==11
    assert {base64.b64decode(x) for x in embedded}==source_bytes,file
log=Path(sys.argv[1]).read_text()
assert all(re.search(r'(?m)^[#ℹ] '+name+r' '+str(n)+r'$',log) for name,n in [('tests',852),('pass',852),('fail',0)])
subprocess.run(['git','diff','--check'],cwd=R,check=True)
subprocess.run(['git','diff','--exit-code',BASE,'--',*tracked],cwd=R,check=True,capture_output=True)
result={'source_head':BASE,'existing_files_sha256_preserved':3905,'original_preservation_manifest':3873,
        'previous_audit_files_preserved':32,'source_image_changes':0,'runtime_changes':0,
        'generated_twice_identical':True,'embedded_source_pngs_identical':True,'csv_json_match':True,
        'span_threshold_10_12_16_stable':True,'focused_tests':852,'focused_pass':852,'focused_fail':0,
        'full_test':'not run','actual_home':'not checked','human_approval':False,'candidate_replacement':False,
        'audit_artifact_sha256':b}
(O/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='audit_artifact_sha256'}))
