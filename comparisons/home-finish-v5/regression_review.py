"""Verify retained main source blobs and compare the four live PRs with their pinned heads."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess

ROOT=Path(__file__).resolve().parents[2]
BASE='526b326d16717fca46ce585fc32638e8b852d15d'
SHIPPED='38b4e9d0c8ed4cacdfc1cc6c072a7a9e62e5c053'
PINS={567:'fae83a21915f9ada92f4ac13ac1aaacd397e333d',568:'2935622edf9ccdc6f8a36f2297dd86b789022b87',
      569:'28628cf336a8ed92efe4e9e197ca03298b798a1e',570:'e07d2cc53eca36ff23e02142ab385d6001e0521b'}


def git(*args):
    return subprocess.check_output(['git','-C',str(ROOT),*args])


def tree(rev):
    return {name.decode():meta.decode() for meta,name in (e.split(b'\t',1) for e in git('ls-tree','-rz',rev).split(b'\0') if e)}


def verify(head):
    before=tree(BASE)
    after=tree(head)
    missing=before.keys()-after.keys()
    assert not missing, missing
    changed={name for name,blob in before.items() if after[name]!=blob}
    assert not changed, sorted(changed)
    additions=after.keys()-before.keys()
    assert all(n.startswith(('comparisons/home-finish-v5/','.github/workflows/home-finish-v5')) for n in additions), sorted(additions)
    query='query {repository(owner:"Naoto214",name:"naotocchi"){'+ ' '.join(
        f'p{n}:pullRequest(number:{n}){{state isDraft mergedAt headRefOid mergeCommit{{oid}} url changedFiles}}' for n in [561,*PINS])+'}}'
    repo=json.loads(subprocess.check_output(['gh','api','graphql','-f','query='+query]))['data']['repository']
    native=repo.pop('p561')
    assert native['state']=='MERGED' and native['mergeCommit']['oid']==SHIPPED
    peers={}
    for number,pin in PINS.items():
        state=repo[f'p{number}']
        assert state['headRefOid']==pin and state['state']=='OPEN' and state['isDraft'], state
        documents=subprocess.check_output(['gh','api','--paginate',
            f'repos/Naoto214/naotocchi/pulls/{number}/files?per_page=100',
            '--jq','.[] | {filename: .filename, previous_filename: .previous_filename} | @json'])
        files=[json.loads(line) for line in documents.splitlines() if line]
        assert len(files)==state['changedFiles'],number
        names={name for row in files for name in (row.get('previous_filename'),row['filename']) if name}
        overlap=sorted(names & (changed|additions))
        peers[number]={**state,'candidateOverlap':overlap}
    return {'checkedAt':datetime.now(timezone.utc).isoformat(),'mainBase':BASE,'candidate':git('rev-parse',head).decode().strip(),
            'mainFiles':len(before),'retainedMainBlobs':len(before)-len(changed),'changedOriginalFiles':sorted(changed),
            'movementV5':native,'priorPRs':peers}


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--head',default='HEAD')
    p.add_argument('--out',type=Path,required=True)
    a=p.parse_args()
    result=verify(a.head)
    a.out.write_text(json.dumps(result,indent=2)+'\n')
    print('Preserved',result['retainedMainBlobs'],'of',result['mainFiles'],'source paths. Overlaps:',
          {n:p['candidateOverlap'] for n,p in result['priorPRs'].items()})
