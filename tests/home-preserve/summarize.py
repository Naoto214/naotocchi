"""Fold native paired JSON archives into a complete condition ledger; retain every failed input."""
import argparse
import csv
from collections import Counter
import gzip
import json
from pathlib import Path
import zipfile

REGIONS='home forest river_lake city countryside mountain snow sea jungle desert deepsea star_stop memory_lake'.split()
COUNTS=[1,4,10,20,28]
WIDTHS=[320,375,390,430]


def load(archives):
    observations={}
    errors={}
    for path in sorted(archives.glob('*.zip')):
        with zipfile.ZipFile(path) as z:
            for name in z.namelist():
                if name.endswith('summary.json'):
                    for row in json.loads(z.read(name)):
                        if 'error' in row:errors[row['case']]=row['error']
                if name.endswith('.json.gz'):
                    data=json.loads(gzip.decompress(z.read(name)))
                    case=name.rsplit('/',1)[-1][:-8]
                    if case in observations:raise ValueError('Duplicate '+case)
                    observations[case]=data
    return observations,errors


def summarise(data):
    r=data['runs'];c=data['comparison']
    row={}
    for arm,label in [('production','base'),('candidate','trial')]:
        run=r[arm];m=c['base' if label=='base' else 'candidate']; trace=run['observation']['trace']
        for key in ['drag','auto','walkers','distance','contacts','terrain','occlusion','speed','tap','trusted']:
            row[label+'_'+key]=m[key]
        row[label+'_target']=run['target'] and run['target']['key']
        row[label+'_moved']=sum(cmd['name']=='move' and bool(cmd['ok']) for cmd in m['commands'])
        row[label+'_walkers']=len(trace['walkers'])
        row[label+'_autonomousKinds']=','.join(sorted(k for k in trace['sourceHops'] if k!='drag'))
        for phase,p in run['placements'].items():
            row[label+'_'+phase+'Contacts']=len(p['contacts'])
    for phase,diffs in c['differences'].items():
        row[phase+'Diffs']=len(diffs)
    first=r['production']['placements']['opening']
    second=r['candidate']['placements']['opening']
    by_key={a['key']:a for a in second['feet']}
    original=r['production']['observation']['trace']
    candidate=r['candidate']['observation']['trace']
    row['residentDistancesEqual']=original['walkers']==candidate['walkers']
    row['originalSweptWitnesses']='|'.join(f"{w['actor']}/{w['peer']}/{w['source']}" for w in original.get('witnesses',[]))
    for arm,label in [('production','base'),('candidate','trial')]:
        life=r[arm]['lifecycle']
        row[label+'_conversation']=life['conversation']
        row[label+'_evolved']=life['evolved']
        row[label+'_equippedNight']=life['changed']['state'][2:4]==['ribbon','night']
        row[label+'_restoredReload']=life['restored']==life['reloaded']
        row[label+'_travelAndReturn']=life['returnGate']['accepted'] and r[arm]['placements']['returnTrip']['region']==r[arm]['region']
        opened=r[arm]['placements']['opening']
        row[label+'_openingOutsidePaintedGround']=sum(not a['painted'] for a in opened['feet'])
        row[label+'_openingOutsideNavigation']=sum(not a['valid'] for a in opened['feet'])
    row['openingRosterOrderEqual']=[a['key'] for a in first['feet']]==[a['key'] for a in second['feet']]
    row['openingCameraExact']=all(first[k]==second[k] for k in ['camera','frame','cover'])
    row['openingPaintExact']=first['paintedFrame']==second['paintedFrame']
    for field in ['actual','stage','screen','imageSize','size']:
        deltas=[abs(x-y) for a in first['feet'] if a['key'] in by_key for x,y in zip(a[field] or [],by_key[a['key']][field] or [])]
        row['openingMax_'+field]=max(deltas,default=0)
    row['openingDisplayExact']=all(a['key'] in by_key and all(a[k]==by_key[a['key']][k] for k in ['display','layer','image','visible'])
                                   for a in first['feet'])
    # Reevaluate the historical symmetric conversation flag from the two original booleans.
    losses=list(c['losses']);gains=list(c.get('gains',[]))
    if r['production']['lifecycle']['conversation'] is False and r['candidate']['lifecycle']['conversation'] is True:
        if 'conversation' in losses:losses.remove('conversation')
        if 'conversation' not in gains:gains.append('conversation')
    row['losses']=','.join(losses)
    row['gains']=','.join(gains)
    return row


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('archives',type=Path);p.add_argument('out',type=Path)
    args=p.parse_args();args.out.mkdir(parents=True,exist_ok=True)
    observations,errors=load(args.archives)
    rows=[];missing=[];losses=Counter();gains=Counter()
    for region in REGIONS:
        for n in COUNTS:
            for w in WIDTHS:
                case=f'{region}-{n}-{w}'
                if case not in observations:
                    missing.append(case);continue
                row=summarise(observations[case])
                rows.append(dict(region=region,count=n,width=w,**row))
                losses.update(x for x in row['losses'].split(',') if x)
                gains.update(x for x in row['gains'].split(',') if x)
    if rows:
        with (args.out/'cells.csv').open('w') as f:
            writer=csv.DictWriter(f,fieldnames=list(rows[0]),lineterminator="\n");writer.writeheader();writer.writerows(rows)
    summary=dict(planned=260,observed=len(rows),missing=missing,errors=errors,lossTotals=dict(losses),gainTotals=dict(gains),
                 openingEqual=sum(r['openingDiffs']==0 for r in rows))
    exactFields=['actual','stage','screen','imageSize','size']
    summary['openingExact']=sum(all(r[k] for k in ['openingRosterOrderEqual','openingCameraExact','openingPaintExact','openingDisplayExact'])
                                and all(r['openingMax_'+k]==0 for k in exactFields) for r in rows)
    summary['maxOpeningDelta']={k:max((r['openingMax_'+k] for r in rows),default=None) for k in exactFields}
    for field in ['drag','auto','contacts','moved','walkers','speed','terrain','occlusion']:
        values=[(r['base_'+field],r['trial_'+field]) for r in rows]
        summary[field]=dict(basePositive=sum(a>0 for a,b in values),trialPositive=sum(b>0 for a,b in values),
                            gains=sum(a==0 and b>0 for a,b in values),losses=sum(a>0 and b==0 for a,b in values),
                            higher=sum(b>a for a,b in values),lower=sum(b<a for a,b in values),
                            baseTotal=sum(a for a,b in values),trialTotal=sum(b for a,b in values))
    for label in ('base','trial'):
        for field in ('conversation','evolved','equippedNight','restoredReload','travelAndReturn'):
            summary.setdefault('lifecycle',{}).setdefault(field,{})[label]=sum(r[label+'_'+field] for r in rows)
    summary['contactFreeMovement']=dict(
        matched=sum(not r['base_contacts'] and r['residentDistancesEqual'] for r in rows),
        differed=sum(not r['base_contacts'] and not r['residentDistancesEqual'] for r in rows),
        protectedContactCells=sum(r['base_contacts']>0 for r in rows))
    phases=('opening','sync','walked','lifecycle','resized','reload','travel','returnTrip')
    summary['staticOverlap']={phase:{label:{'cells':sum(bool(r[label+'_'+phase+'Contacts']) for r in rows),
                                            'pairs':sum(r[label+'_'+phase+'Contacts'] for r in rows)} for label in ('base','trial')}
                              for phase in phases}
    (args.out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    print(json.dumps({k:v for k,v in summary.items() if k not in ['missing','errors']}))


if __name__=='__main__':main()
