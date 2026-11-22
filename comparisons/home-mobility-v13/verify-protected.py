"""Check all protected blobs and PR refs or execute the native legacy suites against one arm."""
import argparse,importlib.util,json,subprocess
from pathlib import Path
here=Path(__file__).resolve().parent
root=here.parents[1]
spec=importlib.util.spec_from_file_location('protected_v12',here.parent/'home-mobility-v12/verify-protected.py')
legacy=importlib.util.module_from_spec(spec);spec.loader.exec_module(legacy)
base='bff63b9db6fd22334fbf776090a318bc671ce5aa'
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--arm',choices=['v13-'+s for s in ('a','b','c','d','d-curve','foot')]);p.add_argument('--game',type=Path);p.add_argument('--out',type=Path,required=True)
args=p.parse_args()
if args.arm:
    result=legacy.native_tests(args.game,args.arm)
else:
    source=legacy.read_module('verify-source.py')
    before,after=source.tree(base),source.tree('HEAD')
    assert all(after.get(k)==v for k,v in before.items())
    kinds=('matrix','fairness','performance','atlas')
    workflows={'.github/workflows/home-mobility-v13-'+k+'.yml' for k in kinds}
    additions=[p.decode() for p in after.keys()-before.keys()]
    assert all(p.startswith('comparisons/home-mobility-v13/') or p in workflows for p in additions)
    report=json.loads((here.parent/'home-mobility-v12/evidence/owner-evidence.json').read_bytes())
    refs=report['protectedGameAtMeasurementReport']['protectedPRs']
    pins={k:v['headRefOid'] for k,v in refs.items()}
    pins['p582']=base
    fields=' '.join(k+':pullRequest(number:'+k[1:]+'){headRefOid state}' for k in pins)
    cmd=['gh','api','graphql','-f','query=query {repository(owner:"Naoto214",name:"naotocchi"){'+fields+'}}']
    current=json.loads(subprocess.check_output(cmd,cwd=root))['data']['repository']
    assert all(current[k]['headRefOid']==v for k,v in pins.items())
    result=dict(base=base,head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),unchangedBlobs=len(before),extraFiles=len(additions),protectedPRs=current)
args.out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(args.arm or 'protected tree',result.get('counts') or result['unchangedBlobs'])
