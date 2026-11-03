"""compat-replay.mjs の main／ブランチ出力を比べる。使い方: python3 compat-compare.py <main.json> <branch.json>"""
import json,sys
a=json.load(open(sys.argv[1]));b=json.load(open(sys.argv[2]))
out={}
for sec in ['saves','games']:
    common=sorted(set(a[sec])&set(b[sec]))
    out[sec]={'main_only':sorted(set(a[sec])-set(b[sec])),'branch_only':sorted(set(b[sec])-set(a[sec])),'common':len(common),
              'identical':sum(a[sec][k]==b[sec][k] for k in common),'different':[k for k in common if a[sec][k]!=b[sec][k]]}
for sec in ['saves','games']:
    common=sorted(set(a[sec])&set(b[sec]))
    out[sec]['fields_identical']={f:sum(a[sec][k].get(f)==b[sec][k].get(f) for k in common) for f in sorted({f for k in common for f in a[sec][k]})}
out['games_self_target_total']=sum(g['selfTargets'] for g in b['games'].values())
out['games_finished_and_restore_equal']=all(g['phase']=='finished' and g['restoredEqual'] for g in b['games'].values())
print(json.dumps(out,ensure_ascii=False,indent=1))
