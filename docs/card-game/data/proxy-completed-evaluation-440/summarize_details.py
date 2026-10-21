#!/usr/bin/env python3
"""Supplementary counts from saved440; no game execution or imputed stops."""
import collections
import gzip
import hashlib
import json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools'))
import proxy_resource_value_evaluation as metrics
HERE=Path(__file__).resolve().parent
raw=gzip.decompress((HERE/'shadow.json.gz').read_bytes())
saved=json.loads(raw)
rows=saved['results']; policies=('legacy_107_114_116','resource_value_pilot_v1')
compared=[r for r in rows if all(o['status']=='selected' for o in r['policies'].values())]
def records(subset,policy):
    return [dict(selection=r['policies'][policy]['choice']) for r in subset if r['policies'][policy]['status']=='selected']
def group(subset):
    matched=[r for r in subset if r['choice_changed'] is not None]
    return dict(planned=len(subset),compared=len(matched),unsupported=len(subset)-len(matched),
                selection_difference=metrics.rate(sum(r['choice_changed'] for r in matched),len(matched)),
                supported_shadow_choices={p:metrics._decision_counts(records(matched,p)) for p in policies})
left=records(compared,policies[0]);right=records(compared,policies[1]);pairs=list(zip(left,right))
both_seeded=[(a,b) for a,b in pairs if metrics._lottery(a) is not None and metrics._lottery(b) is not None]
view_counts=collections.Counter(r['public_input_sha256'] for r in rows)
result=dict(source_shadow_sha256=hashlib.sha256(raw).hexdigest(),planned=313,
    grouped_by_path={p:group([r for r in rows if r['path_id']==p]) for p in sorted({r['path_id'] for r in rows})},
    grouped_by_origin_and_path={origin:{p:group([r for r in rows if r['path_id']==p and r['observed_policy']==origin]) for p in sorted({r['path_id'] for r in rows})} for origin in policies},
    all_supported_counterfactuals={p:metrics._decision_counts(records(rows,p)) for p in policies},
    observed_trajectory_normal_choices={p:metrics._decision_counts(records([r for r in rows if r['observed_policy']==p],p)) for p in policies},
    seed_context_difference=metrics.rate(sum(metrics._seed_context(a)!=metrics._seed_context(b) for a,b in pairs),len(pairs)),
    selection_pool_difference=metrics.rate(sum(metrics._selection_pool(a)!=metrics._selection_pool(b) for a,b in pairs),len(pairs)),
    newly_seeded=metrics.rate(sum(metrics._lottery(a) is None and metrics._lottery(b) is not None for a,b in pairs),len(pairs)),
    no_longer_seeded=metrics.rate(sum(metrics._lottery(a) is not None and metrics._lottery(b) is None for a,b in pairs),len(pairs)),
    both_seeded_context_difference=metrics.rate(sum(metrics._seed_context(a)!=metrics._seed_context(b) for a,b in both_seeded),len(both_seeded)),
    both_seeded_pool_difference=metrics.rate(sum(metrics._lottery(a)!=metrics._lottery(b) for a,b in both_seeded),len(both_seeded)),
    order_invariance_status=dict(collections.Counter(v['status'] for r in rows for v in r['order_invariance'].values())),
    repeated_public_input_groups={k:v for k,v in view_counts.items() if v>1},
    shadow_unsupported_is_not_observed_game_stop=True,new_game_events=0,new_game_decisions=0,new_matches=0,independent_balance_sample_count=0,policy_promoted=False)
(HERE/'comparison-details.json').write_text(json.dumps(result,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ('grouped_by_origin_and_path','repeated_public_input_groups')},ensure_ascii=False,indent=2))
