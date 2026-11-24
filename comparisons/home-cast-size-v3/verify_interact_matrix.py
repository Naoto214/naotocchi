"""Condense observed V5 tap and short-path samples, preserving original denominators."""
import argparse
import json
import math
from pathlib import Path
import re
import subprocess

EXTRAS=(0,5,10,15,20)
ROLES=('pet','partner','companion')
PHASES={'initial':None,'after8':'moved','after30':'later'}

def actual_plan(table,width,region,count,extra):
    group=table.get(str(width),{}).get(region,{}).get(str(count))
    ix=group['mode'][extra//5-1] if extra and group else -1
    return group['choices'][ix] if ix>=0 else {}

def read_fixture(path):
    data=json.loads(path.read_text())
    width,region,count=path.stem.split('-')[:3]
    return int(width),region,int(count),data

def extract(fixture,gains=EXTRAS):
    result={}
    initial={a['key']:a['native'][:2] for a in fixture['actors']}
    for name,sub in PHASES.items():
        phase=fixture.get(sub,{}) if sub else fixture
        if not phase.get('taps') or not phase.get('input'):continue
        taps={gain:[*[p for role in ROLES for p in row['roles'][role]],len(row['zero'])]
              for gain,row in phase['taps'].items() if int(gain) in gains}
        stats=phase['modelStats']
        events=phase['events']
        displaced=sum(math.dist(a['native'][:2],initial[a['key']])>=1 for a in phase['actors'])
        result[name]={'taps':taps,'direct':phase['input'],'autonomy':[
            round(stats['clock'],2),round(stats['distance'],2),displaced,stats['moves'],stats['turns'],
            events.get('arrive',0),events.get('social',0),events.get('proximity',0)]}
    return result

def scan(args):
    table=json.loads(args.plans.read_text()) if args.plans else {}
    modes=json.loads((args.groups/'modes.json').read_text()) if args.groups and (args.groups/'modes.json').is_file() else {}
    verified={}
    if args.game:
        command=['node',str(Path(__file__).with_name('geometry_seat_modes.cjs')),str((args.game/'limit-seating.js').resolve())]
        modes=json.loads(subprocess.check_output(command))
        verified=json.loads(subprocess.check_output([*command,'--hints']))
    data={'tapColumns':['heroCorrect','heroAttempted','partnerCorrect','partnerAttempted',
                        'companionCorrect','companionAttempted','residentsMissingAllThree'],
          'autonomyColumns':['nativeSeconds','nativeTotalPathDistance','residentsDisplacedAtLeastOneNativeUnitSinceStart','modelMoveCount','modelTurnCount','arriveEvents','socialEvents','proximityEvents'],
          'direct':'Two 8-direction masks at 4,12 CSS px per present role. Each set bit is a clear straight line to the exact target.',
          'cases':{},'browserByMeasuredCase':{}}
    for path in sorted(args.fixed.glob('*.json')):
        if not re.fullmatch(r'\d+-[a-z_]+-\d+',path.stem):continue
        w,r,n,f=read_fixture(path); phases=extract(f)
        if phases:
            key=f'{w}/{r}/{n}/fixed'
            data['cases'][key]=phases
            data['browserByMeasuredCase'][key]=f.get('browser','version not captured')
    for gain,sourcedir in args.optimized:
        for path in sorted(Path(sourcedir).glob('*.json')):
            if not re.fullmatch(r'\d+-[a-z_]+-\d+',path.stem):continue
            w,r,n,f=read_fixture(path); phases=extract(f)
            if not phases:continue
            key=f'{w}/{r}/{n}/optimized/{gain}'
            data['cases'][key]=phases
            data['browserByMeasuredCase'][key]=f.get('browser','version not captured')
    if args.groups:
        for subject,choices in modes.items():
            w,region,n=subject.split('-')
            for gain in set(choices.values())-{0}:
                path=args.groups/str(gain)/(subject+'.json')
                if not path.is_file():continue
                datum=json.loads(path.read_text())
                if verified and datum.get('hints')!=verified[subject][str(gain)]:continue
                applicable=[int(extra) for extra,representative in choices.items() if representative==gain]
                phases=extract(datum,applicable)
                if phases:
                    key=f'{w}/{region}/{n}/optimized/{gain}'
                    data['cases'][key]=phases
                    data['browserByMeasuredCase'][key]=datum.get('browser','version not captured')
    # Distinguish identical V2 hints from genuine trial observations.
    aliases={}
    for key in list(data['cases']):
        if not key.endswith('/fixed'):continue
        w,region,n,layout=key.split('/')
        for extra in EXTRAS:
            target=f'{w}/{region}/{n}/optimized/{extra}'
            if target in data['cases']:continue
            representative=modes.get(f'{w}-{region}-{n}',{}).get(str(extra))
            if representative is not None:
                group_key=key if representative==0 else f'{w}/{region}/{n}/optimized/{representative}'
                if group_key in data['cases']:aliases[target]=group_key
                continue
            plan=actual_plan(table,w,region,n,extra)
            if (not extra or args.plans) and not plan:
                aliases[target]=key
                continue
            for alt in EXTRAS:
                other=f'{w}/{region}/{n}/optimized/{alt}'
                if other in data['cases'] and actual_plan(table,w,region,n,alt)==plan:
                    aliases[target]=other;break
    data['sameNativeSeatsAs']=aliases
    if args.require_complete:
        from verify_interact_routes import HEIGHT,REGIONS
        missing=[]
        totals={}
        for w in HEIGHT:
            for region in REGIONS:
                for n in (1,4,10,20,28):
                    for layout in ('fixed','optimized'):
                        for extra in EXTRAS:
                            key=f'{w}/{region}/{n}/{layout}'+(f'/{extra}' if layout=='optimized' else '')
                            result=data['cases'].get(aliases.get(key,key),{})
                            for phase in (['initial','after8','after30'] if n==28 else ['initial','after8']):
                                sample=result.get(phase,{})
                                taps=sample.get('taps',{}).get(str(extra),[])
                                if len(taps)!=7 or sum(taps[i] for i in (1,3,5))!=3*n or not sample.get('autonomy'):
                                    missing.append((key,extra,phase))
                                    continue
                                totals[phase]=totals.get(phase,0)+1
        if missing:
            raise ValueError(f'{len(missing)} incomplete observations; first examples {missing[:5]}')
        data['coveredObservationsByPhase']=totals
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(data,separators=(',',':'),ensure_ascii=False)+'\n')
    print('Measured layout fixtures',len(data['cases']),'identical seed aliases',len(aliases))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--fixed',required=True,type=Path)
    p.add_argument('--optimized',nargs=2,action='append',default=[],metavar=('GAIN','FIXTURE_DIR'))
    p.add_argument('--groups',type=Path,help='directory of width-region-count-choiceIndex optimized fixtures')
    p.add_argument('--game',type=Path,help='built V3 game to authenticate optimized opening hint arrays')
    p.add_argument('--plans',type=Path);p.add_argument('--out',type=Path,required=True)
    p.add_argument('--require-complete',action='store_true',help='require all 2,600 initial and eight-second conditions, plus 520 thirty-second 28-resident conditions')
    scan(p.parse_args())
