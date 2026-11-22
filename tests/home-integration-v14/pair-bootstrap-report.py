"""Compare the two pinned native matrices, including every resident's coordinates at every phase."""
import argparse
from collections import Counter, defaultdict
import csv
import hashlib
import itertools
import json
from pathlib import Path
from regional import REGIONS, HEIGHT

PHASES=('opening','sync','walked','lifecycle','resized','reload','travel','returnTrip')
OBSERVED=('opening','resized','end','changed')


def phases(row):
    return {
        'opening':row['opening'],'resized':row['resized'],
        'end':row['observation']['end'],'changed':row['lifecycle']['changed']['rendered'],
    }


def visible(summary):
    result={**summary,'world':dict(summary['world'])}
    # Wall time advances during loading. Geometry, projection revision, load/error
    # state, model time, contact and every executed hop are still compared.
    result['world'].pop('animationTime')
    return result


def nested_changes(before,after,path='',acc=None):
    if acc is None:acc=Counter()
    if before==after:return acc
    if isinstance(before,dict) and isinstance(after,dict):
        for key in before.keys()|after.keys():
            # Preserve omitted-vs-null even when comparing nested rows.
            label=f'{path}.{key}' if path else key
            if key not in before or key not in after:acc[label]+=1
            else:nested_changes(before[key],after[key],label,acc)
    elif isinstance(before,list) and isinstance(after,list) and len(before)==len(after):
        for a,b in zip(before,after):nested_changes(a,b,path+'[]',acc)
    else:acc[path]+=1
    return acc


def index(folder,arm):
    rows={}
    for p in folder.rglob(f'*-{arm}.json'):
        row=json.loads(p.read_text())
        key=(row['region'],row['count'],row['width'])
        if key in rows:raise ValueError(f'Duplicate {key}')
        rows[key]=p
    return rows


def main():
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument('before',type=Path);cli.add_argument('after',type=Path);cli.add_argument('out',type=Path)
    cli.add_argument('--before-sha',required=True);cli.add_argument('--after-sha',required=True)
    cli.add_argument('--before-run',type=int,required=True);cli.add_argument('--after-run',type=int,required=True)
    cli.add_argument('--arm',choices=('candidate','production'),default='candidate')
    args=cli.parse_args();before=index(args.before,args.arm);after=index(args.after,args.arm)
    tested_phases=PHASES if args.arm=='candidate' else PHASES[:-1]
    state_keys=('first','restored','reloaded','evolved')+(('returnGate',) if args.arm=='candidate' else ())
    expected=set(itertools.product(REGIONS,(1,4,10,20,28),HEIGHT))
    if before.keys()!=expected or after.keys()!=expected:raise ValueError('Incomplete regional inputs')
    collection_changes=Counter()
    table=[];changed=[];fieldCounts=defaultdict(Counter);hashes={};maxScreen=defaultdict(float)
    for key in sorted(expected):
        a,b=(json.loads(r[key].read_text()) for r in (before,after));reg,n,w=key
        for arm,row in [('before',a),('after',b)]:
            if hashes.setdefault(arm,row['sources'])!=row['sources']:raise ValueError(f'Inconsistent {arm} runtime')
        pa,pb=a['placements'],b['placements']
        if set(pa)!=set(tested_phases) or set(pb)!=set(tested_phases):raise ValueError(f'Incomplete phases in {key}')
        cell=dict(region=reg,count=n,width=w,height=HEIGHT[w])
        observations=[]
        for phase in tested_phases:
            prev,now=pa[phase],pb[phase]
            if args.arm=='production':
                for old_foot,new_foot in zip(prev['feet'],now['feet'],strict=True):
                    assert old_foot['key']==new_foot['key']
                    for field in ('solverScreen','surface'):
                        if field not in old_foot and field in new_foot:
                            new_foot.pop(field)
                            collection_changes[field]+=1
            cell[phase]=prev==now
            if not cell[phase]:
                detail=nested_changes(prev,now)
                fieldCounts[phase].update(detail)
                feet={r['key']:r for r in prev['feet']}
                for r in now['feet']:
                    old=feet.get(r['key'])
                    if old:
                        distance=sum((x-y)**2 for x,y in zip(old['screen'],r['screen']))**.5
                        maxScreen[phase]=max(maxScreen[phase],distance)
                observations.append(dict(check=phase,changedFields=dict(detail)))
        ta,tb=a['observation']['trace'],b['observation']['trace']
        checks={
            'touch':([a['target'],a['tap'],a['observation']['trusted'],ta['commands']],
                     [b['target'],b['tap'],b['observation']['trusted'],tb['commands']]),
            'walk':(ta,tb),'retry':(a.get('alternate'),b.get('alternate')),
            'state':([a['lifecycle'][k] for k in state_keys]+[a['lifecycle']['changed']['state']],
                     [b['lifecycle'][k] for k in state_keys]+[b['lifecycle']['changed']['state']]),
            'question':(a['lifecycle']['conversation'],b['lifecycle']['conversation']),
            'errors':(a['errors'],b['errors']),
        }
        if args.arm=='production' and a.get('alternate') is None and b.get('alternate') is None:
            checks.pop('retry')
        for name,(old,new) in checks.items():
            cell[name]=old==new
            if old!=new:
                detail=nested_changes(old,new)
                fieldCounts[name].update(detail)
                observations.append(dict(check=name,changedFields=dict(detail),**({'before':old,'after':new} if name=='question' else {})))
        for which in OBSERVED:
            old,new=visible(phases(a)[which]),visible(phases(b)[which])
            field='render'+which.title();cell[field]=old==new
            if old!=new:
                detail=nested_changes(old,new)
                fieldCounts[field].update(detail)
                observations.append(dict(check=field,changedFields=dict(detail)))
        cell['beforeRawSha256']=hashlib.sha256(before[key].read_bytes()).hexdigest()
        cell['afterRawSha256']=hashlib.sha256(after[key].read_bytes()).hexdigest()
        table.append(cell)
        if observations:changed.append(dict(region=reg,count=n,width=w,observations=observations))
    summary=dict(before=args.before_sha,after=args.after_sha,runs=[args.before_run,args.after_run],cells=len(table),
        exactMatches={k:sum(r[k] for r in table) for k in table[0] if isinstance(table[0][k],bool)},
        differentFields=fieldCounts,maxScreenFootDeltaPx=maxScreen,exceptions=changed,runtimeSha256=hashes)
    if collection_changes:summary['newObservationsAbsentFromOriginal']=dict(collection_changes)
    args.out.mkdir(exist_ok=True,parents=True)
    (args.out/'equivalence.json').write_text(json.dumps(summary,indent=2)+'\n')
    with (args.out/'matched-cells.csv').open('w') as f:
        wr=csv.DictWriter(f,fieldnames=table[0],lineterminator='\n');wr.writeheader();wr.writerows(table)
    print(json.dumps({k:summary[k] for k in ('cells','exactMatches','differentFields','maxScreenFootDeltaPx')},indent=2))


if __name__=='__main__':
    main()
