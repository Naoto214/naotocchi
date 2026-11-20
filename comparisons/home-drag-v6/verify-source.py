"""Compare tracked trees with the accepted V5 base, including file modes and prior drafts."""
from argparse import ArgumentParser
from datetime import datetime,timezone
import json
from pathlib import Path
from subprocess import check_output

BASE = 'a0df9061c26dde237158ba3423dd4732ca8bec42'
PINS = {567:'fae83a21915f9ada92f4ac13ac1aaacd397e333d',568:'2935622edf9ccdc6f8a36f2297dd86b789022b87',
        569:'28628cf336a8ed92efe4e9e197ca03298b798a1e',570:'e07d2cc53eca36ff23e02142ab385d6001e0521b',572:BASE}
ROOT = Path(__file__).resolve().parents[2]

def tree(ref):
    entries = check_output(['git','-C',str(ROOT),'ls-tree','-rz',ref]).split(b'\0')
    pairs = (line.split(b'\t',1) for line in entries if line)
    return {name:metadata for metadata,name in pairs}

def verify(ref):
    old,current = tree(BASE),tree(ref)
    changed = [p.decode() for p in old if old[p]!=current.get(p)]
    assert not changed,changed
    extra = [p.decode() for p in current.keys()-old.keys()]
    assert all(p.startswith('comparisons/home-drag-v6/') or p=='.github/workflows/home-drag-v6-matrix.yml' for p in extra),extra
    query = 'query {repository(owner:"Naoto214",name:"naotocchi"){'+ ' '.join(
        f'p{k}:pullRequest(number:{k}){{state isDraft headRefOid}}' for k in PINS)+'}}'
    repo=json.loads(check_output(['gh','api','graphql','-f','query='+query]))['data']['repository']
    peers={}
    for n,expected in PINS.items():
        state=repo['p'+str(n)]
        assert state['headRefOid']==expected, (n,state)
        peers[n]=state
    return {'verifiedAt':datetime.now(timezone.utc).isoformat(),'reference':BASE,
            'candidate':check_output(['git','-C',str(ROOT),'rev-parse',ref],text=True).strip(),
            'originalFiles':len(old),'originalModeAndContentIdentical':len(old)-len(changed),'priorDrafts':peers}

if __name__=='__main__':
    parser=ArgumentParser(description=__doc__)
    parser.add_argument('--head',default='HEAD');parser.add_argument('--out',required=True,type=Path)
    args=parser.parse_args()
    report=verify(args.head);args.out.write_text(json.dumps(report,indent=2)+'\n')
    print('Protected',report['originalFiles'],'V5 files and verified',len(report['priorDrafts']),'Draft PR heads')
