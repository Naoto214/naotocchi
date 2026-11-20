"""Compare native V7 to original V5 test suites and all protected draft heads."""
import argparse
import importlib.util
import json
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
BASE='5db9835478eafe526271c6864e0c86ded6324172'
def load(name):
    path=HERE.parent/'home-drag-v6'/name
    spec=importlib.util.spec_from_file_location(name,path)
    module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module

def preserve(ref):
    prior=load('verify-source.py')
    a,b=prior.tree(BASE),prior.tree(ref)
    assert all(b.get(k)==v for k,v in a.items())
    assert all(k.startswith(b'comparisons/home-mobility-v7/') or k==b'.github/workflows/home-mobility-v7-matrix.yml' for k in b.keys()-a.keys())
    query='query {repository(owner:"Naoto214",name:"naotocchi"){'+ ' '.join(f'p{n}:pullRequest(number:{n}){{state headRefOid}}' for n in [561,*prior.PINS,575])+'}}'
    info=json.loads(subprocess.check_output(['gh','api','graphql','-f','query='+query]))['data']['repository']
    for n,v in {**prior.PINS,575:BASE}.items(): assert info['p'+str(n)]['headRefOid']==v
    assert info['p561']['state']=='MERGED'
    return dict(base=BASE,measuredRevision=subprocess.check_output(['git','rev-parse',ref],cwd=ROOT,text=True).strip(),
                unchangedFileModesAndBlobs=len(a),prs=info)

def verify_legacy(game):
    old=load('verify-legacy.py')
    with TemporaryDirectory() as temp:
        work=Path(temp)
        for item in game.iterdir():(work/item.name).symlink_to(item.resolve(),target_is_directory=item.is_dir())
        for name in ['home-production-model','script-v2']:
            alias=work/(name+'-drag-v6.js')
            alias.unlink();alias.symlink_to((game/(name+'-mobility-v7.js')).resolve())
        return old.verify(work)
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__); p.add_argument('--head',default='HEAD');p.add_argument('--game',type=Path)
    p.add_argument('--out',type=Path,required=True);a=p.parse_args()
    result=verify_legacy(a.game) if a.game else preserve(a.head)
    a.out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(result.get('counts') or (str(result['unchangedFileModesAndBlobs'])+' unchanged tracked paths'))
