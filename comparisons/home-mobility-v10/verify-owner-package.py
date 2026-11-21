"""Prove that the owner statistics correction changes only observed comparison HTML and its readout."""
import argparse
import hashlib
import json
from pathlib import Path

DIRECT='game/telemetry-mobility-v10.js'
OWNER='game/telemetry-mobility-v10-owner.js'
ARMS=('v8','v9','v9-seats','v10','v10-seats','v10-reference')

def hashes(root):
    return {p.relative_to(root).as_posix():hashlib.sha256(p.read_bytes()).hexdigest()
            for p in root.rglob('*') if p.is_file()}

def verify(before, after):
    base,current=hashes(before),hashes(after)
    wrappers=['game/mobility-v10-compare-'+arm+'.html' for arm in ARMS]
    assert set(current)-set(base)=={OWNER} and set(base)<=set(current)
    altered={n for n in base if base[n]!=current[n]}
    assert altered=={*wrappers,'v10/diagnostics.mjs'},altered
    old_tag=DIRECT.removeprefix('game/')+'?v='+base[DIRECT][:12]
    new_tag=OWNER.removeprefix('game/')+'?v='+current[OWNER][:12]
    for entry in wrappers:
        html=(before/entry).read_text()
        assert html.count(old_tag)==1 and html.replace(old_tag,new_tag)==(after/entry).read_text()
    relevant={n:h for n,h in current.items() if n in (DIRECT,OWNER) or n.startswith('game/home-production-model-mobility-v10') or n.startswith('game/home-production-diorama-mobility-v10') or n in ['game/mobility-'+a+'.html' for a in ARMS]}
    return dict(measuredGameCommit='fdd2b1bcf6b156de0daeb5c1ab46295c681921f1',
            identicalFiles=len(base)-len(altered),newObserver=OWNER,wrappersWithOnlyObserverURLReplaced=wrappers,
            updatedReadout='v10/diagnostics.mjs',nativeAndOwnerDigests=relevant)

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('measured',type=Path)
    parser.add_argument('owner',type=Path)
    parser.add_argument('output',type=Path)
    options=parser.parse_args()
    result=verify(options.measured,options.owner)
    options.output.write_text(json.dumps(result,indent=2)+'\n')
    print(result['identicalFiles'],'files identical and',len(result['wrappersWithOnlyObserverURLReplaced']),'wrappers verified')
