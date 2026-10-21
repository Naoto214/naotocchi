"""Run the predeclared jobs with bounded independent processes; resume completed jobs."""
import concurrent.futures, pathlib, subprocess, sys
root=pathlib.Path(__file__).resolve().parent
out=root/'results';out.mkdir(exist_ok=True)
jobs=sorted((root/'jobs').glob('*.json'))
if len(sys.argv)>1: jobs=[j for j in jobs if sys.argv[1] in j.name]
def run(j):
 if (out/j.name).exists():return j.stem+' already saved'
 with (out/(j.stem+'.log')).open('w') as f:
  subprocess.run(['node',str(root/'experiments.mjs'),str(j),str(out)],stdout=f,stderr=subprocess.STDOUT,check=True)
 return j.stem+' complete'
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for result in pool.map(run,jobs): print(result,flush=True)
