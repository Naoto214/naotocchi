"""Full proxy suite partitioned across isolated processes, never runtime threads."""
import json,subprocess,sys,unittest
from pathlib import Path
HERE=Path(__file__).resolve().parent
TOOLS=HERE.parents[2]/'tools'
WORKERS=6

def main():
 modules=sorted(p.stem for p in TOOLS.glob('test_proxy*.py'))
 if len(sys.argv)==3 and sys.argv[1]=='--worker':
  index=int(sys.argv[2]);sys.path.insert(0,str(TOOLS))
  suite=unittest.defaultTestLoader.loadTestsFromNames(modules[index::WORKERS])
  result=unittest.TextTestRunner(verbosity=2).run(suite)
  (HERE/f'full-proxy-worker-{index}.json').write_text(json.dumps(dict(worker=index,modules=modules[index::WORKERS],tests=result.testsRun,failures=len(result.failures),errors=len(result.errors),skipped=len(result.skipped),successful=result.wasSuccessful()),indent=2)+'\n')
  return 0 if result.wasSuccessful() else 1
 jobs=[]
 for index in range(WORKERS):
  log=(HERE/f'full-proxy-worker-{index}.txt').open('w')
  jobs.append((subprocess.Popen([sys.executable,str(Path(__file__).resolve()),'--worker',str(index)],stdout=log,stderr=subprocess.STDOUT),log))
 codes=[]
 try:
  for process,log in jobs:codes.append(process.wait());log.close()
 finally:
  for process,log in jobs:
   if process.poll() is None:process.terminate();process.wait()
   log.close()
 result=dict(workers=WORKERS,module_count=len(modules),exit_codes=codes,successful=all(c==0 for c in codes))
 (HERE/'full-proxy-summary.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
 return 0 if result['successful'] else 1
if __name__=='__main__':raise SystemExit(main())
