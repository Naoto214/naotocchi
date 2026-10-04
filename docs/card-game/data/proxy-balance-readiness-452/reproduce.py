"""Read-only census of saved 447 runs; not a balance admission validator."""
import argparse
from collections import Counter
import gzip
import hashlib
import json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools'))
from proxy_continuation_batch_runner import metric_shape
from proxy_resource_value_evaluation import _route,_decision

def canonical(x):return (json.dumps(x,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def build():
 source=ROOT/'data/proxy-equivalence-pilot-447/trajectories'
 manifest=json.loads((source/'manifest.json').read_text())
 expected={f'probe-{n:02d}-{side}-first.json.gz' for n in (1,2) for side in ('a','b')}
 assert set(manifest['files_sha256'])==expected
 rows=[];sources=[source/'manifest.json',Path(__file__),ROOT/'tools/proxy_continuation_batch_runner.py',ROOT/'tools/proxy_resource_value_evaluation.py',ROOT/'data/proxy-normal-decision-fallback-contract-116-20260918.json']
 for name in sorted(expected):
  p=source/name;assert digest(p)==manifest['files_sha256'][name];sources.append(p)
  packet=json.loads(gzip.decompress(p.read_bytes()));assert len(packet['rows'])==3
  for saved in packet['rows']:
   run=saved['run'];projected=metric_shape(run);observed=_route(projected)
   assert observed==saved['observed']
   assert run['completed'] and run['stop'] is None and saved['independent_replay_verified']
   counts={k:observed[k] for k in ('normal','mandatory','response')}
   assert sum(v['valid'] for v in counts.values())==len(run['decisions'])
   detail=[]
   for d in projected['decisions']:
    record=_decision(d)
    if record.get('resolution_mode') not in ('seeded_fallback','response_seeded_fallback'):continue
    context=record.get('seed_context') or d.get('context') or {}
    proof=record.get('seed_proof') or {}
    material=proof.get('seed_material') or []
    kind=(material[7] if d['decision_kind']=='normal_action' and len(material)>7 else None) or record.get('seed_context',{}).get('choice_kind') or d.get('choice_kind') or context.get('choice_kind')
    assert kind is not None
    detail.append((d['decision_kind'],kind))
   classified=Counter(detail)
   assert len(detail)==sum(v['fallback']['count'] for v in counts.values())
   assert run['independent_balance_sample_count']==0 and run['policy_promoted'] is False
   rows.append(dict(run_id=run['run_id'],path_id=run['path_id'],policy_id=run['policy_id'],completed=True,saved_independent_replay_verified=True,counts=counts,seeded_choice_kinds=[dict(decision_kind=k[0],choice_kind=k[1],count=v) for k,v in sorted(classified.items())],excluded_by_116=True,independent_balance_sample_count=0))
 assert sorted(r['run_id'] for r in rows)==sorted(manifest['planned_ids']) and len(rows)==12
 policies={}
 for policy in sorted({r['policy_id'] for r in rows}):
  selected=[r for r in rows if r['policy_id']==policy];assert len(selected)==4
  policies[policy]={k:{field:sum(r['counts'][k][field]['count'] if field!='valid' else r['counts'][k]['valid'] for r in selected) for field in ('valid','fallback','strategic_unresolved')} for k in ('normal','mandatory','response')}
 for pattern in ('111-*.md','114-*.md','116-*.md','119-*.md','414-*.md','443-*.md','445-*.md','450-*.md','451-*.md'):
  matches=list(ROOT.glob(pattern));assert len(matches)==1;sources+=matches
 return dict(schema='balance_readiness_saved_census.v1',purpose='exclusion_evidence_only_not_admission_certification',runs=rows,by_policy=policies,saved_runs=12,new_runs=0,independent_balance_sample_count=0,policy_promoted=False,sources_sha256={str(p.relative_to(ROOT)):digest(p) for p in sources})
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);out=p.parse_args().output
 if out.exists():raise ValueError('output already exists')
 result=build();out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(canonical(result));print(json.dumps(result['by_policy'],ensure_ascii=False,sort_keys=True))
