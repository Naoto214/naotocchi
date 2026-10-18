#!/usr/bin/env python3
"""Independent preservation/diff checks and same-method density measurement."""
from pathlib import Path
import ast, base64, csv, hashlib, json, re, subprocess, sys
import numpy as np
from PIL import Image
from scipy import ndimage
R=Path(__file__).resolve().parents[1]
O=R/'docs/qa/antlion08-limited-candidates-20260928'
BASE='9a0ff51d5da45e65b6b21db63320c807350c048d'
sha=lambda b:hashlib.sha256(b).hexdigest()
prior=json.loads((R/'docs/qa/antlion08-followup-20260928/start-hashes.json').read_text())
tracked=subprocess.check_output(['git','ls-tree','-r','--name-only',BASE],cwd=R,text=True).splitlines()
assert len(tracked)==3919
for p in tracked:
    expected=prior.get(p)
    if expected is None:expected=sha(subprocess.check_output(['git','show',f'{BASE}:{p}'],cwd=R))
    assert sha((R/p).read_bytes())==expected,p

# Execute only the existing pure mask/crop definitions, not its artifact-writing entrypoint.
tree=ast.parse((R/'tools/antlion08-size-density-audit.py').read_text())
scope={'np':np,'ndimage':ndimage}
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ['masks','crop']],type_ignores=[]),'<canonical-density-functions>','exec'),scope)
masks,crop=scope['masks'],scope['crop']
def measure(p):
    a=np.array(Image.open(p).convert('RGBA'));l,particle,t,ids=masks(a)
    q=particle[59:118,8:62];ll=l[59:118,8:62]
    # Independent direct sliding-window count (not integral-image implementation).
    peak=max(int(q[y:y+12,x:x+12].sum()) for y in range(q.shape[0]-11) for x in range(q.shape[1]-11))
    pp=int(particle[95:118,8:35].sum());tt=int(t[95:118,8:35].sum())
    return {'particle_components':len(set(ll[q].tolist())),'particle_pixels':int(q.sum()),'occupied_area_px2':int(q.sum()),'coverage_pct':float(q.mean()*100),'max_local_12x12_pixels':peak,'max_local_12x12_pct':peak/144*100,'corridor_particle_pixels':pp,'corridor_trail_pixels':tt,'corridor_particle_to_trail_ratio':pp/tt,'rear_particles_to_corridor_trail_ratio':int(q.sum())/tt}
previous=json.loads((R/'docs/qa/antlion08-size-density-20260928/density.json').read_text())
metrics={}
for state,v in previous['assets'].items():
    got=measure(R/v['path'])
    assert all(got[k]==previous['metrics'][state][k] for k in got),(state,got)
    metrics[state]=got
metrics['critical_candidate']=measure(O/'candidates/critical-particles.png')
(O/'density.json').write_text(json.dumps({'method_source':'tools/antlion08-size-density-audit.py','rear_roi':[8,59,62,118],'trail_proxy_roi':[8,95,35,118],'existing_11_match_previous':True,'metrics':metrics,'limits':previous['method']},ensure_ascii=False,indent=2)+'\n')
with (O/'density.csv').open('w') as f:
    w=csv.writer(f,lineterminator='\n');keys=list(metrics['normal']);w.writerow(['state']+keys)
    for s,m in metrics.items():w.writerow([s]+[m[k] for k in keys])
audit=json.loads((O/'pixel-audit.json').read_text())
for state,new in [('strained','strained-face'),('critical','critical-particles')]:
    a=np.array(Image.open(R/f'docs/qa/antlion08-method-d-nine-20260928/candidates/{state}.png').convert('RGBA'))
    b=np.array(Image.open(O/f'candidates/{new}.png').convert('RGBA'))
    diff=np.any(a!=b,axis=2);ys,xs=np.where(diff)
    assert sha((O/f'candidates/{new}.png').read_bytes())==audit[state]['candidate_sha256']
    assert {(int(x),int(y)) for y,x in zip(ys,xs)}=={tuple(v['xy']) for v in audit[state]['changes']}
    if state=='strained':
        assert len(xs)==15 and all(100<=x<105 and 63<=y<66 for x,y in zip(xs,ys))
        assert np.array_equal(a[:,:,3],b[:,:,3])
        assert measure(O/f'candidates/{new}.png')==metrics['strained']
    else:
        assert len(xs)==30 and np.array_equal(a[:,:,:3],b[:,:,:3])
        assert np.all(a[diff,3]==255) and np.all(b[diff,3]==0)
        l,n=ndimage.label(a[:,:,3]>0,np.ones((3,3)));sz=np.bincount(l.ravel());main=sz[1:].argmax()+1
        assert not diff[l==main].any()
        assert len(set(l[diff].tolist()))==18
        for k in set(l[diff].tolist()):assert diff[l==k].all()
        # All nondeleted pixels (including transparent RGB) byte-identical.
        assert np.array_equal(a[~diff],b[~diff])
assert len(list((O/'candidates').glob('*.png')))==2
def generated_hashes():
    return {str(p.relative_to(O)):sha(p.read_bytes()) for p in O.rglob('*') if p.is_file() and p.name not in ['verification.json','density.json','density.csv','report.md','prompts.md','focused-test.log']}
before=generated_hashes()
subprocess.run(['node','tools/antlion08-limited-candidates.cjs'],cwd=R,check=True,capture_output=True)
subprocess.run(['node','tools/antlion08-limited-comparison.cjs'],cwd=R,check=True,capture_output=True)
assert generated_hashes()==before,'reproduction mismatch'
log=Path(sys.argv[1]).read_text()
assert all(re.search(r'(?m)^[#ℹ] '+name+r' '+str(n)+r'$',log) for name,n in [('tests',852),('pass',852),('fail',0)])
subprocess.run(['git','diff','--check'],cwd=R,check=True)
subprocess.run(['git','diff','--exit-code',BASE,'--',*tracked],cwd=R,check=True,capture_output=True)
result={'source_head':BASE,'existing_files_sha256_preserved':3919,'candidate_count':2,'strained_changed_pixels':15,'strained_outside_mouth_changed':0,'strained_alpha_changed':0,'strained_particles_metrics_unchanged':True,'critical_removed_components':18,'critical_removed_pixels':30,'critical_rgb_changed':0,'critical_body_trail_changed':0,'critical_other_pixels_changed':0,'prior_11_metrics_reproduced':True,'candidate_and_figures_reproducible':True,'focused_tests':852,'focused_pass':852,'focused_fail':0,'full_test':'not run','actual_home':'not checked','human_approval':False,'production_replacement':False,'artifact_sha256':{str(p.relative_to(O)):sha(p.read_bytes()) for p in O.rglob('*') if p.is_file() and p.name!='verification.json'}}
(O/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='artifact_sha256'}));print(json.dumps(metrics['critical_candidate']))
