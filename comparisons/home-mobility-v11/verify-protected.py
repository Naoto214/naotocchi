"""Verify the V11 build against #580, or exercise the inherited movement and save suites."""
import argparse
import importlib.util
import json
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
BASE='ed671e26f5599cebf5aa1a8020d50a5f43dbf076'
WORKFLOWS={'.github/workflows/home-mobility-v11-'+kind+'.yml' for kind in ('matrix','fairness','performance')}

def read_module(name):
    file=HERE.parent/'home-drag-v6'/name
    spec=importlib.util.spec_from_file_location('protected_game',file)
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

def check_source(head):
    old=read_module('verify-source.py')
    before,after=old.tree(BASE),old.tree(head)
    assert all(after.get(path)==obj for path,obj in before.items())
    additions=[path.decode() for path in after.keys()-before.keys()]
    assert all(p.startswith('comparisons/home-mobility-v11/') or p in WORKFLOWS for p in additions)
    previous=json.loads((HERE.parent/'home-mobility-v10/evidence/protected-runtime.json').read_bytes())
    pins={k:v['headRefOid'] for k,v in previous['protectedPRs'].items()}
    pins['p580']=BASE
    fields=' '.join(key+':pullRequest(number:'+key[1:]+'){headRefOid state}' for key in pins)
    query='query {repository(owner:"Naoto214",name:"naotocchi"){'+fields+'}}'
    remote=json.loads(subprocess.check_output(['gh','api','graphql','-f','query='+query],cwd=ROOT))['data']['repository']
    assert all(remote[k]['headRefOid']==v for k,v in pins.items())
    return dict(reference=BASE,candidate=subprocess.check_output(['git','rev-parse',head],cwd=ROOT,text=True).strip(),
                protectedPaths=len(before),addedFiles=len(additions),protectedPRs=remote)

def native_tests(game,arm):
    with TemporaryDirectory() as temporary:
        out=Path(temporary)
        for item in game.iterdir():
            (out/item.name).symlink_to(item.resolve(),target_is_directory=item.is_dir())
        for short,name in {'home-production-model':'home-production-model-mobility-'+arm+'.js',
                           'script-v2':'script-v2-mobility-v7.js'}.items():
            dest=out/(short+'-drag-v6.js')
            dest.unlink()
            dest.symlink_to((game/name).resolve())
        return read_module('verify-legacy.py').verify(out)

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--game',type=Path)
    parser.add_argument('--arm',choices=['v11','v11-foot'],default='v11')
    parser.add_argument('--head',default='HEAD')
    parser.add_argument('--out',type=Path,required=True)
    args=parser.parse_args()
    result=native_tests(args.game,args.arm) if args.game else check_source(args.head)
    args.out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(result.get('counts') or result['protectedPaths'])
