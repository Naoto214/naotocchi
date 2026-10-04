"""Aggregate already verified replay evidence. Does not perform additional replays."""
import argparse
import hashlib
import json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools'))
from proxy_replay_evidence_audit import PATHS,SOURCE,MANIFEST_SHA,canonical,source_fingerprint

def summarize(directory):
 files=sorted(directory.glob('*.json'))
 if {p.stem for p in files}!=set(PATHS):raise ValueError('path inventory differs')
 manifest_raw=(SOURCE/'manifest.json').read_bytes()
 if hashlib.sha256(manifest_raw).hexdigest()!=MANIFEST_SHA:raise ValueError('saved manifest differs')
 manifest=json.loads(manifest_raw);fingerprint=source_fingerprint();runs=[]
 for p in files:
  value=json.loads(p.read_text())
  if value['path_id']!=p.stem or value['independent_saved_replays']!=3 or value['source_fingerprint']!=fingerprint:raise ValueError('source/path identity differs')
  if value['saved_manifest_sha256']!=MANIFEST_SHA or value['source_file_sha256']!=manifest['files_sha256'][p.stem+'.json.gz']:raise ValueError('saved source binding differs')
  runs+=value['results']
 if len(runs)!=12 or sorted(r['run_id'] for r in runs)!=sorted(manifest['planned_ids']):raise ValueError('run inventory differs')
 if any(r['exact_run_match'] is not True or r['balance_admitted'] is not None or r['opportunity_scope']!='existing_executor_only' for r in runs):raise ValueError('evidence scope differs')
 return dict(schema='saved_replay_summary_456.v1',saved_runs=12,independent_saved_replays=12,
             recorded_decisions=sum(r['decision_count'] for r in runs),events=sum(r['event_count'] for r in runs),snapshots=sum(r['snapshot_count'] for r in runs),
             excluded_by_116=sum(r['recorded_evaluation']['status']=='excluded_by_116' for r in runs),
             path_evidence_sha256={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in files},
             new_matches=0,independent_balance_sample_count=0,policy_promoted=False,opportunity_scope='existing_executor_only')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--paths',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
 if a.output.exists():raise ValueError('output exists')
 result=summarize(a.paths);a.output.write_bytes(canonical(result));print(json.dumps(result,sort_keys=True))
