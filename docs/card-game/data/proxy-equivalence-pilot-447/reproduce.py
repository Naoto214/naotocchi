"""Generate447 into an empty new directory, never overwrite historical results."""
import argparse
import concurrent.futures
import json
from pathlib import Path
import subprocess
import sys
ROOT=Path(__file__).resolve().parents[4]
sys.path.insert(0,str(ROOT/'docs/card-game/tools'))
from proxy_equivalence_evaluation import evaluate_saved,validate_saved
from proxy_equivalence_trajectory import summarize_paths
from proxy_resource_value_integration import canonical

def reproduce(output):
 output=output.resolve()
 if output.exists() and any(output.iterdir()):raise ValueError('output must be empty')
 evaluate_saved(ROOT,output)
 errors=validate_saved(output,ROOT)
 if errors:raise ValueError('; '.join(errors))
 paths=('probe-01-a-first','probe-01-b-first','probe-02-a-first','probe-02-b-first')
 def run(path):
  subprocess.run([sys.executable,str(ROOT/'docs/card-game/tools/proxy_equivalence_trajectory.py'),'--path',path,'--output',str(output/'trajectories')],cwd=ROOT,check=True)
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(run,paths))
 summarize_paths(output/'trajectories')
 print(json.dumps(dict(output=str(output),validated=True,policy_promoted=False),sort_keys=True))
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,required=True)
 reproduce(parser.parse_args().output)
