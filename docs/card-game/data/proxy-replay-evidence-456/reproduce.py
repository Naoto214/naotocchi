import argparse
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools'))
from proxy_replay_evidence_audit import audit_saved_path,canonical
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--path',required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
 if a.output.exists():raise ValueError('output exists')
 report=audit_saved_path(a.path);a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_bytes(canonical(report))
 print(a.path,len(report['results']),'saved independent replays match',flush=True)
