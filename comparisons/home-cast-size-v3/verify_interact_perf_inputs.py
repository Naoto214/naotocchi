"""Reconcile live press selections with the already-recorded performance input events."""
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parent
keys=('tapTarget','dragStart','unfinishedPress')
result={'method':'Observed expected resident at pointerdown, split by subsequent pointermove/up. Performance input aims at exposed original actor DOM. These are separate from the all-resident 3-point probe.',
        'sources':{}}
for path in sorted((ROOT/'evidence').glob('perf-focus-*.json')):
    raw=json.loads(path.read_text())
    summary=[]
    for row in raw['rows']:
        stats={key:[0,0] for key in keys}
        sequence=[]
        def finish():
            if not sequence:return
            down=sequence[0]
            group='unfinishedPress' if sequence[-1]['type']!='pointerup' else (
                  'dragStart' if any(e['type']=='pointermove' for e in sequence) else 'tapTarget')
            stats[group][0]+=int(down['selected']==down['expected'])
            stats[group][1]+=1
            sequence.clear()
        for event in row['inputs']:
            if event['type']=='pointerdown':finish();sequence.append(event)
            elif sequence:
                sequence.append(event)
                if event['type']=='pointerup':finish()
        finish()
        summary.append({'region':row['region'],'width':row['width'],'count':row['count'],
            'extra':row['extra'],'layout':row['layout'],**stats})
    result['sources'][path.name]=summary
out=ROOT/'evidence'/'input-presses.json'
out.write_text(json.dumps(result,ensure_ascii=False,indent=1)+'\n')
for key,rows in result['sources'].items():
    print(key,{field:[sum(row[field][i] for row in rows) for i in (0,1)] for field in keys})
