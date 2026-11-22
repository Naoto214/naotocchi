"""Verify this certified mid-life replay and save outcomes, last-exit changes and each individual's subsequent walks."""
import argparse
import gzip
import json
import math
from pathlib import Path
from matrix_worker_v12 import old,prior


def first_signature(records):
    return [[e.get(k) for k in ('type','clock','owner','goal','q','helper','stage','stages','found','accepted')] for e in records
            if e['type'] in ('plan','start','owner') and e.get('owner')=='companion:sekizou' and 68<e['clock']<95]


def departures(rows,initial):
    counts={k:{r:len(v) for r,v in lens.items()} for k,lens in rows.items()}
    losses={n:[k for k in rows if initial[k][n] and not rows[k][n]] for n in ('3','8','16')}
    return {'directions':counts,'lostLastExit':losses}


def own(r,scale):
    def length(a,b):
        return math.hypot(*((x-y)*s for x,y,s in zip(a,b,scale,strict=True)))
    completed=[t for t in r['trips'] if t['end'] is not None and not t['escape'] and length(t['from'],t['to'])>=8-1e-7
               and length(t['from'],t['goal'])-length(t['to'],t['goal'])>.75]
    return {'normalWalks':len(completed),'firstEnd':completed[0]['end'] if completed else None,
            'lastEnd':completed[-1]['end'] if completed else None,'afterRestoreRoutes':len(r['trips'])}


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--raw',type=Path,required=True)
    p.add_argument('--evidence',type=Path,default=Path(__file__).resolve().parent/'evidence')
    args=p.parse_args()
    source=json.loads((args.evidence/'matrix-river-state.json').read_bytes())
    result={}
    for arm in ('first','eight','default'):
        path=args.raw/('river-live-'+arm+'.json.gz')
        packed=path.read_bytes();data=json.loads(gzip.decompress(packed))
        result[arm]={'archiveSHA256':old.digest(packed),'scripts':data['scripts'],'start':source['opening']['state']['clock'],
                    'end':data['clock'],'sameHouseholdSHA256':data['restoredSHA256'],'seedAtEnd':data['seed'],
                    'nativeMatchedOriginal':first_signature(data['events'])==first_signature(source['nativeSignature']),
                    'failureCounts':data['safety'],'stoneEvents':[e for e in data['events'] if e.get('owner')=='companion:sekizou'],
                    'naturalFrames':[{'clock':r['clock'],'label':r['name'],**departures(r['exits'],data['frames'][0]['exits'])} for r in data['frames']],
                    'onlyParticipantsMoved':[{'label':r['name'],**departures(r['exits'],data['staged'][0]['exits'])} for r in data['staged']],
                    'resumedWalks':{k:own(t,source['opening']['scene']['scale'].values()) for k,t in data['ownTrips'].items()}}
    old.require(result['first']['nativeMatchedOriginal'] and len({v['sameHouseholdSHA256'] for v in result.values()})==1,'genuine case not reproduced')
    old.require(all(len(v['resumedWalks'])==28 for v in result.values()),'missing resident')
    result['eightAndDefaultMatched']={k:result['eight'][k]==result['default'][k] for k in
                                      ['stoneEvents','end','seedAtEnd','naturalFrames','resumedWalks']}
    (args.evidence/'matrix-river-replay.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
    for a in ('first','eight','default'):
        info=result[a];print(a,info['nativeMatchedOriginal'],info['sameHouseholdSHA256'],sum(v['normalWalks']>0 for v in info['resumedWalks'].values()))
    print('same eight and default',result['eightAndDefaultMatched'])


if __name__=='__main__':
    main()
