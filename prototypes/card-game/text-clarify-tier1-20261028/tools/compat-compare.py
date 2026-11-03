"""compat-replay.mjs の main／ブランチ出力を比べ、項目ごとの一致数を出す。使い方: python3 compat-compare.py <main.json> <branch.json>"""
import json,sys
a=json.load(open(sys.argv[1]));b=json.load(open(sys.argv[2]))
out={}
for sec in ['saves','games']:
    assert a[sec].keys()==b[sec].keys()
    fields=sorted({f for v in a[sec].values() for f in v})
    out[sec]={'count':len(a[sec]),'equal':{f:sum(a[sec][k][f]==b[sec][k][f] for k in a[sec]) for f in fields}}
out['versions']={'saves':sorted({v['version'] for v in b['saves'].values()}),'games':sorted({k.split('/')[0] for k in b['games']})}
out['games_finished_and_restore_equal']=all(g['phase']=='finished' and g['restoredEqual'] for g in b['games'].values())
u=[g['used'] for g in b['games'].values()]
out['usage']={'lunar_played':sum(x['lunar'] for x in u),'submarine_by_choice':{c:sum(x['submarine'][c] for x in u) for c in '012'}}
print(json.dumps(out,ensure_ascii=False,indent=1))
