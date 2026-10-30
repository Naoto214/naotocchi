#!/usr/bin/env python3
"""Read-only re-aggregation of existing CPU match records (no re-run).
Sources: ../balance-verification-20261022-variety/runs/V1,V2 and ../deck-balance-20261025/runs/X.
Fields used: responseDecisions / responsesUsed (response windows with >=1 non-pass action; own+opponent turn mixed),
timeLeft (sum of own time at each own normal-phase pass), unaffordable, kinds.place/play/programPlay.
Usage: python3 tools/existing.py > results/existing-summary.json"""
import json,gzip,glob,os,collections
H=os.path.dirname(os.path.abspath(__file__))+'/../..'
SETS={'V1(10-22,中級×中級,1680)':'balance-verification-20261022-variety/runs/V1-shard*.jsonl.gz',
      'V2(10-22,初級×中級鏡像,840)':'balance-verification-20261022-variety/runs/V2-shard*.jsonl.gz',
      'X(10-25,現行7デッキ,480)':'deck-balance-20261025/runs/X-shard*.jsonl.gz'}
out={}
for name,pat in SETS.items():
    rows=[json.loads(l) for f in sorted(glob.glob(os.path.join(H,pat))) for l in gzip.open(f,'rt')]
    agg=collections.defaultdict(lambda:collections.Counter())
    for r in rows:
        if r['status']!='completed':continue
        for seat in 'AB':
            for key in [('diff',r['difficulty'][seat]),('deck',r['deck'][seat]+'/'+r['difficulty'][seat])]:
                c=agg[key];c['seats']+=1;c['turns']+=r['turns'][seat]
                c['windows']+=r['responseDecisions'][seat];c['used']+=r['responsesUsed'][seat]
                c['timeLeft']+=r['timeLeft'][seat];c['unaffordable']+=r['unaffordable'][seat]
                k=r['kinds'][seat];c['trapOrEquipPlace']+=0;c['plays']+=k.get('play',0)+k.get('programPlay',0)
    res={}
    for (kind,key),c in sorted(agg.items()):
        res.setdefault(kind,{})[key]={'seats':c['seats'],'windowsPerGame':round(c['windows']/c['seats'],2),'usedPerGame':round(c['used']/c['seats'],2),
          'useRate':round(c['used']/c['windows'],3) if c['windows'] else None,'timeLeftAtPassPerTurn':round(c['timeLeft']/c['turns'],2),
          'quickPlaysPerGame':round(c['plays']/c['seats'],2),'unaffordablePerTurn':round(c['unaffordable']/c['turns'],2)}
    out[name]=res
print(json.dumps(out,ensure_ascii=False,indent=1))
