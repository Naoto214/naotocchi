"""455: read saved447 bytes only; does not execute games or certify admission."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools'))
from proxy_judgment_evidence_audit import build_sidecar,validate_sidecar,contract,canonical
MANIFEST_SHA='083486cb4c8b155897cb5d6719b152c3dc3e2de499cecffd6acd474266028cd6'

def build():
 source=ROOT/'data/proxy-equivalence-pilot-447/trajectories';p=source/'manifest.json'
 if hashlib.sha256(p.read_bytes()).hexdigest()!=MANIFEST_SHA:raise ValueError('saved manifest revision differs')
 m=json.loads(p.read_text());expected={f'probe-{n:02d}-{side}-first.json.gz' for n in (1,2) for side in ('a','b')}
 if set(m['files_sha256'])!=expected:raise ValueError('saved file inventory differs')
 runs=[]
 for name,digest in sorted(m['files_sha256'].items()):
  blob=(source/name).read_bytes()
  if hashlib.sha256(blob).hexdigest()!=digest:raise ValueError('saved source bytes differ')
  packet=json.loads(gzip.decompress(blob))
  for row in packet['rows']:
   run=row['run'];before=canonical(run);sidecar=build_sidecar(run)
   if validate_sidecar(sidecar,run) or before!=canonical(run):raise ValueError('sidecar validation or immutability differs')
   runs.append(sidecar)
 if len(runs)!=12 or sorted(r['run_id'] for r in runs)!=sorted(m['planned_ids']):raise ValueError('saved run inventory differs')
 sources=[Path(__file__),ROOT/'tools/proxy_judgment_evidence_audit.py',p]
 return dict(schema='saved_judgment_evidence_455.v1',contract=contract(),source_files_sha256=m['files_sha256'],
             sources_sha256={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sources},
             runs=runs,independent_balance_sample_count=0,new_matches=0,new_replays=0,policy_promoted=False)

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,required=True);out=parser.parse_args().output
 if out.exists():raise ValueError('output must not exist')
 report=build();out.mkdir(parents=True)
 (out/'audit.json.gz').write_bytes(gzip.compress(canonical(report),mtime=0))
 (out/'contract.json').write_bytes(canonical(contract()))
 summary=dict(saved_runs=len(report['runs']),recorded_decisions=sum(len(r['decisions']) for r in report['runs']),
              excluded_by_116=sum(r['evaluation']['status']=='excluded_by_116' for r in report['runs']),
              opportunity_coverage='not_reverified',legality_and_selection_evidence='not_reverified',
              experiment_design='not_assessed',independent_balance_sample_count=0,new_matches=0,new_replays=0,policy_promoted=False)
 (out/'summary.json').write_bytes(canonical(summary));print(json.dumps(summary,sort_keys=True))
