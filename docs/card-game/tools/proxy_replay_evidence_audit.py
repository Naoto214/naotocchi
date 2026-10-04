"""456 replay adapter: source-bound execution equivalence, never sample admission."""
import gzip
import hashlib
import json
from pathlib import Path
from proxy_judgment_evidence_audit import canonical,sha,build_sidecar

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'data/proxy-equivalence-pilot-447/trajectories'
MANIFEST_SHA='083486cb4c8b155897cb5d6719b152c3dc3e2de499cecffd6acd474266028cd6'
PATHS=tuple(f'probe-{n:02d}-{side}-first' for n in (1,2) for side in ('a','b'))

def compare_replayed(saved,replayed):
 for run in (saved,replayed):
  if type(run) is not dict or run.get('completed') is not True or run.get('stop') is not None:raise ValueError('run missing, stopped or incomplete')
  for key in ('run_id','policy_id','path_id'):
   if type(run.get(key)) is not str or not run[key]:raise ValueError('run identity missing')
  for key in ('decisions','events','snapshots'):
   if type(run.get(key)) is not list:raise ValueError('run inventory missing')
 if canonical(saved)!=canonical(replayed):raise ValueError('independent replay differs')
 return dict(run_id=saved['run_id'],policy_id=saved['policy_id'],path_id=saved['path_id'],exact_run_match=True,
             run_sha256=sha(saved),decisions_sha256=sha(saved['decisions']),events_sha256=sha(saved['events']),snapshots_sha256=sha(saved['snapshots']),
             decision_count=len(saved['decisions']),event_count=len(saved['events']),snapshot_count=len(saved['snapshots']),
             opportunity_scope='existing_executor_only',balance_admitted=None)

def load_saved_path(path_id):
 if path_id not in PATHS:raise ValueError('unknown saved path')
 raw=(SOURCE/'manifest.json').read_bytes()
 if hashlib.sha256(raw).hexdigest()!=MANIFEST_SHA:raise ValueError('saved manifest revision differs')
 manifest=json.loads(raw);name=path_id+'.json.gz';blob=(SOURCE/name).read_bytes()
 if hashlib.sha256(blob).hexdigest()!=manifest['files_sha256'][name]:raise ValueError('saved bytes differ')
 packet=json.loads(gzip.decompress(blob));runs=[r['run'] for r in packet['rows']]
 expected=sorted(i for i in manifest['planned_ids'] if i.endswith(':'+path_id))
 if len(runs)!=3 or sorted(r['run_id'] for r in runs)!=expected or packet['path_id']!=path_id:raise ValueError('saved inventory differs')
 return runs

def source_fingerprint():
 paths=list((ROOT/'tools').glob('*.py'))+[SOURCE/'manifest.json']
 return {str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(paths)}

def audit_saved_path(path_id):
 # No saved decision/action is passed to the executor; reconstruct its signed initial route.
 import proxy_continuation_batch_runner as engine
 before=source_fingerprint();runs=load_saved_path(path_id)
 initials=engine.base.old.load_initial_routes()
 initial=next(i for i in initials if i['path_id']==path_id)
 results=[]
 for saved in runs:
  original=sha(saved)
  replayed=engine.run_route(initial,saved['policy_id'])
  evidence=compare_replayed(saved,replayed)
  if sha(saved)!=original:raise ValueError('saved source mutated')
  audit=build_sidecar(saved)
  evidence.update(recorded_evaluation=audit['evaluation'],kind_counts=audit['counts'],
                  candidate_and_selection_evidence='regenerated_under_existing_executor',
                  seed_proof_evidence='regenerated_under_existing_executor',
                  global_legality='not_certified',strategy_optimality='not_certified',experiment_design='not_assessed')
  results.append(evidence)
 if source_fingerprint()!=before:raise ValueError('source changed during replay')
 return dict(schema='saved_replay_evidence_456.v1',path_id=path_id,source_fingerprint=before,
             saved_manifest_sha256=MANIFEST_SHA,source_file_sha256=hashlib.sha256((SOURCE/(path_id+'.json.gz')).read_bytes()).hexdigest(),
             independent_saved_replays=len(results),new_matches=0,policy_promoted=False,independent_balance_sample_count=0,results=results)
