#!/usr/bin/env python3
"""Verify existing bytes and deterministic read-only follow-up QA."""
from pathlib import Path
import hashlib,json,subprocess,re
R=Path(__file__).resolve().parents[1];O=R/'docs/qa/antlion08-followup-20260928'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
start=json.loads((O/'start-hashes.json').read_text())
changed=[p for p,h in start.items() if not (R/p).exists() or sha(R/p)!=h]
assert not changed,changed
def generate():
 subprocess.run(['python',str(R/'tools/antlion08-followup-audit.py')],cwd=R,check=True,capture_output=True)
 return {str(p.relative_to(O)):sha(p) for p in sorted(O.iterdir()) if p.suffix in ['.svg','.html'] or p.name=='measurements.json'}
a=generate();b=generate();assert a==b,'non-reproducible QA'
assert all(sha(R/p)==h for p,h in start.items()),'existing file changed during QA'
log=(O/'focused-test.log').read_text()
assert all(re.search(r'(?m)^[#ℹ] '+name+r' '+str(n)+r'$',log) for name,n in [('tests',852),('pass',852),('fail',0)]),'focused test incomplete'
subprocess.run(['git','diff','--check'],cwd=R,check=True)
v={'source_head':'3126a7ce9e6c17a1c2ee3208c3be6dcea1b13b8f','existing_tracked_files_unchanged':len(start),'image_asset_changes':0,'candidate_png_changes':0,'runtime_changes':0,'normal_D4_candidates9_approved16':'SHA-256 preserved within complete tracked-file manifest','generated_qa_files_reproducible':len(a),'focused_tests':852,'focused_pass':852,'focused_fail':0,'full_test':'今回未実行','quick_mode':'今回未実行・既知初回FAIL追跡継続','diff_check':'PASS','human_approval':False,'step4_complete':False,'readability_summary':{'A':0,'B':10,'C':0,'basis':'64/80px-weighted observer QA, not a blinded recognition test'}}
(O/'verification.json').write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n');print(json.dumps(v,ensure_ascii=False))
