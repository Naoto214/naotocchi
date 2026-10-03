"""Read-only responsibility audit. Does not complete or extend legacy selection."""
import collections
import gzip
import hashlib
import itertools
import json
from pathlib import Path
from proxy_normal_decision_hardening import compare_candidates, PRIORITY_ORDER
from proxy_resource_value_comparison import validate_problem

DATA=Path(__file__).resolve().parents[1]/'data'
SHADOW_DIR=DATA/'proxy-completed-evaluation-440'
LEGACY='legacy_107_114_116'


def load_checked(directory,expected_raw=None,filename='shadow.json.gz'):
    directory=Path(directory);manifest=json.loads((directory/'manifest.json').read_bytes())
    blob=(directory/filename).read_bytes();raw=gzip.decompress(blob)
    if hashlib.sha256(blob).hexdigest()!=manifest['compressed_sha256'] or hashlib.sha256(raw).hexdigest()!=(expected_raw or manifest['raw_sha256']):raise ValueError('artifact hash mismatch')
    return json.loads(raw)


def classify(row,details):
    p=row['problem'];errors=validate_problem(p)
    if errors:raise ValueError(str(errors))
    if sorted(d['candidate_id'] for d in details)!=p['legal_candidate_ids']:raise ValueError('inventory coverage differs')
    scores={s['candidate_id']:dict(s,value_comparison_to={}) for s in p['candidates']}
    upper=max(tuple(s[k] for k in PRIORITY_ORDER[:4]) for s in scores.values())
    frontier=sorted(cid for cid,s in scores.items() if tuple(s[k] for k in PRIORITY_ORDER[:4])==upper)
    byid={d['candidate_id']:d for d in details}
    types={byid[c]['action_type'] for c in frontier}
    certs=[pair['safe_placement']['candidate_id'] for pair in p['pairs'] if pair['kind']=='certified_safe_free_development']
    if types=={'challenge','pass'}:group='challenge_and_pass'
    elif types=={'challenge','place_companion','pass'} and certs:group='safe_development_and_challenge'
    elif types=={'place_partner','pass'} and not certs:group='uncertified_partner_arrival'
    else:raise ValueError('unclassified legacy boundary: '+str(types))
    comparisons=[dict(left_id=a,right_id=b,result=compare_candidates(scores[a],scores[b])) for a,b in itertools.combinations(frontier,2)]
    if any(c['result']['winner']!='unresolved' for c in comparisons):raise ValueError('not the audited unresolved boundary')
    blockers=[dict(candidate_id=c,action_type=byid[c]['action_type'],card_id=byid[c]['card_id'],payment_time=scores[c]['payment_time']) for c in frontier if byid[c]['action_type']=='challenge']
    return dict(shadow_id=row['shadow_id'],source_run_id=row['source_run_id'],source_event_seq=row['source_event_seq'],source_envelope_sha256=row['source_envelope_sha256'],observed_policy=row['observed_policy'],legacy_reason=row['policies'][LEGACY]['reason'],group=group,stage_four_frontier=frontier,certified_free_development=certs,blocking_candidates=blockers,unresolved_comparisons=comparisons,selected_candidate=None,disposition='preserved_legacy_evidence_boundary',implementation_defect_established=False,required_evidence='legacy resource relations / applicable fallback scope and context; do not substitute 414 frontier',source_refs=['114-normal-decision-protocol-hardening.md','116-normal-decision-fallback-contract.md','tools/proxy_continuation_candidates.py','tools/proxy_continuation_batch.py'])


def audit_saved():
    shadow=load_checked(SHADOW_DIR)
    paired=load_checked(DATA/'proxy-continuation-batch-439',filename='paired.json.gz')
    decisions={(run['run_id'],d['event_seq']):d for run in paired['results'] for d in run['decisions'] if 'inventory' in d}
    rows=[]
    for row in shadow['results']:
        if row['policies'][LEGACY]['status']!='unsupported':continue
        d=decisions[(row['source_run_id'],row['source_event_seq'])]
        if row['problem']!=d['problem']:raise ValueError('439/440 problem mismatch')
        rows.append(classify(row,d['inventory']['legal_candidate_details']))
    if len(rows)!=72 or len({r['shadow_id'] for r in rows})!=72:raise ValueError('unsupported coverage differs')
    return dict(schema='naotocchi.card_game.legacy_limits_audit.v1',planned_normal=313,compared_unchanged=241,unsupported=len(rows),groups=dict(sorted(collections.Counter(r['group'] for r in rows).items())),rows=rows,new_game_stops=0,new_policy_selections=0,policy_promoted=False,independent_balance_sample_count=0)
