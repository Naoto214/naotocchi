"""Check the owner-readout-only home rerun without replacing any primary measurement."""
import argparse
from collections import Counter
import json
from pathlib import Path
import zipfile

import matrix_report_v10 as report
from matrix_worker_v10 import ARMS, history_aged, old, v9, validate


def read_home(directory,run):
    status=report.prior.github('run','view',run,'-R',report.prior.REPO,'--json','url,headSha,jobs')
    job=next(j for j in status['jobs'] if j['name']=='region (home)')
    old.require(job['conclusion']=='success','home measurement did not pass')
    artifacts=report.prior.github('api',f'repos/{report.prior.REPO}/actions/runs/{run}/artifacts?per_page=100')['artifacts']
    official=next(a for a in artifacts if a['name']=='mobility-v10-home')
    p=directory/f'mobility-v10-{run}-home.zip'
    sha=old.digest(p.read_bytes())
    old.require(official['digest']=='sha256:'+sha and official['size_in_bytes']==p.stat().st_size,'incorrect confirmation ZIP')
    cells={};metrics={a:Counter() for a in ARMS};tape,hist=v9.history(),history_aged()
    with zipfile.ZipFile(p) as z:
        m=json.loads(z.read('region.json'))
        names={f'home-{n}-{w}.json' for n in old.COUNTS for w in old.WIDTHS}
        old.require(m['complete'] and m['revision']==status['headSha'] and set(m['cells'])==names and
                    len(z.namelist())==21 and set(z.namelist())==names|{'region.json'},'wrong confirmation coverage')
        for n in names:
            blob=z.read(n);old.require(old.digest(blob)==m['cells'][n]['sha256'],'incorrect cell digest')
            c=validate(json.loads(blob),tape,hist);cells[n]=c
            for a,data in c['arms'].items():
                s=metrics[a];age=data['aged'];drop=age['drag']
                walk={r['key']:report.prior.resident(c,a,r,age['tracks'][r['key']],drop['scale'],300) for r in age['final']['residents']}
                who=next(r for r in age['final']['residents'] if r['key']==drop['key'])
                s['dualFailed']+=bool(who['ambientFailures'] and not who['ambientStarts'] and drop['issued'] and not drop['stepCount'])
                s['normalWalkers']+=sum(bool(r['normalCompletions']) for r in walk.values())
                s['agedArrival']+=report.terminal(drop)
                physical=report.prior.prior.metrics(report.prior.physical_rows(c,a))
                s.update({k:physical[k] for k in ['arrival','near4','tapSelected','unsafe','swept']})
                s.update({k:age['safety'][k] for k in report.prior.SAFETY})
    return cells,dict(run=run,revision=status['headSha'],bytes=p.stat().st_size,sha256=sha,artifact=official['id'],
        job=job['databaseId'],url=status['url']+'/artifacts/'+str(official['id']),entries=m['entries'],metrics=metrics)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    for prefix in ('primary','repeat'):
        p.add_argument('--'+prefix+'-run',required=True);p.add_argument('--'+prefix+'-archives',required=True,type=Path)
    p.add_argument('--out',required=True,type=Path);a=p.parse_args()
    first,one=read_home(a.primary_archives,a.primary_run)
    second,two=read_home(a.repeat_archives,a.repeat_run)
    old.require(one['entries']==two['entries'],'home entry bytes differ')
    frames=Counter()
    for n,c in first.items():
        other=second[n]
        for arm,d in c['arms'].items():
            e=other['arms'][arm]
            old.require(d['hashes']==e['hashes'] and d['opening']==e['opening'] and d['seed']==e['seed'],'native scripts/fixture differ')
            old.require(all(d['rows'][k].get('start')==e['rows'][k].get('start') and d['rows'][k].get('goal')==e['rows'][k].get('goal') for k in d['rows']),'opening touch tape changed')
            frames[arm]+=d['aged']['opening']==e['aged']['opening']
        for arm in ('v8','v9','v10'):
            old.require(c['shared']['v9']['replays'][arm]['scripts']==other['shared']['v9']['replays'][arm]['scripts'],'crossover bytes differ')
    report.prior.write_json(a.out,dict(primary=one,independentConfirmation=two,identicalOpeningAndLoadedScripts=20,
        identicalNatural300sFootprints=frames))
    print('Verified',two['sha256'],two['metrics']['v10'])


if __name__=='__main__':
    main()
