"""Separate named policy on the existing439 executor; no implicit promotion."""
import argparse
import copy
import gzip
import hashlib
import json
from pathlib import Path
import proxy_continuation_batch_runner as engine
import proxy_completed_comparison as saved
import proxy_resource_value_evaluation as metrics
from proxy_resource_value_integration import canonical
from proxy_equivalence_inputs import project_equivalence_view,build_input,source_manifest
from proxy_equivalence_selection import POLICY_ID,select_equivalence


def select_normal(envelope: dict, inventory: dict, problem: dict) -> dict:
 x=build_input(project_equivalence_view(envelope,problem['seed_context']['actor'],inventory['public_history']),inventory,problem,source_manifest())
 w=select_equivalence(x)
 return dict(policy_id=POLICY_ID,selected_candidate=w['selected_candidate'],choice=w,problem=copy.deepcopy(problem),
  selected_action=copy.deepcopy(w['selected_action']),candidate_set_complete=True,inventory=copy.deepcopy(inventory),context=copy.deepcopy(problem['seed_context']))


def validate_normal(record,envelope,inventory,problem):
 try:return [] if record==select_normal(envelope,inventory,problem) else ['normal choice/action binding differs']
 except (ValueError,KeyError,TypeError):return ['invalid normal equivalence input']


def run_path(initial,output_dir):
 prior={r['policy_id']:r for r in saved.load_inputs()[0]['results'] if r['path_id']==initial['path_id']};rows=[]
 for policy in (*engine.base.old.POLICIES,POLICY_ID):
  r=engine.run_route(initial,policy)
  if engine.validate_route(r,initial,policy):raise ValueError('independent replay differs')
  if policy in prior and r!=prior[policy]:raise ValueError('default trajectory differs from439')
  observed=metrics._route(engine.metric_shape(r))
  normalized=saved.normalized(r,observed) if r['completed'] else None
  rows.append(dict(run=r,independent_replay_verified=True,default_439_exact_match=policy in prior,observed=observed,normalized=normalized))
  print(initial['path_id'],policy,r['completed'],r['last_valid_event_seq'],r['stop'],flush=True)
 output_dir.mkdir(parents=True,exist_ok=True);raw=canonical(dict(path_id=initial['path_id'],rows=rows));blob=gzip.compress(raw,mtime=0)
 (output_dir/(initial['path_id']+'.json.gz')).write_bytes(blob)
 return rows


def summarize_paths(output_dir):
 files=sorted(output_dir.glob('probe-*.json.gz'));rows=[]
 for p in files:rows+=json.loads(gzip.decompress(p.read_bytes()))['rows']
 ids=[r['run']['run_id'] for r in rows]
 if len(ids)!=12 or len(set(ids))!=12:raise ValueError('expected three policies over four fixed routes')
 summary=dict(planned=12,default_controls=8,new_pilot_runs=4,completed=sum(r['run']['completed'] for r in rows),independent_replays=sum(r['independent_replay_verified'] for r in rows),
  default_439_exact_matches=sum(r['default_439_exact_match'] for r in rows),independent_balance_sample_count=0,policy_promoted=False,
  observations=[dict(run_id=r['run']['run_id'],policy_id=r['run']['policy_id'],completed=r['run']['completed'],stop=r['run']['stop'],normalized=r['normalized']) for r in rows])
 (output_dir/'summary.json').write_bytes(canonical(summary))
 (output_dir/'manifest.json').write_bytes(canonical(dict(files_sha256={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in files},planned_ids=sorted(ids))))
 return summary


def run_equivalence_routes(data_dir: Path, output_dir: Path) -> dict:
 for initial in engine.base.old.load_initial_routes(data_dir):run_path(initial,output_dir)
 return summarize_paths(output_dir)

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--path');p.add_argument('--summarize',action='store_true');a=p.parse_args()
 if a.summarize:print(json.dumps({k:v for k,v in summarize_paths(a.output).items() if k!='observations'},sort_keys=True))
 elif a.path:
  initial=next(i for i in engine.base.old.load_initial_routes() if i['path_id']==a.path);run_path(initial,a.output)
 else:run_equivalence_routes(engine.base.old.DATA,a.output)
