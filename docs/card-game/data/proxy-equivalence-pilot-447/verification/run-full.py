import concurrent.futures,subprocess,pathlib,json,os
root=pathlib.Path.cwd();out=root/'docs/card-game/data/proxy-equivalence-pilot-447/verification/full';out.mkdir(exist_ok=True)
mods=sorted(p.stem for p in (root/'docs/card-game/tools').glob('test_proxy_*.py'))
(out/'manifest.json').write_text(json.dumps({'modules':mods,'module_count':len(mods),'execution':'one isolated subprocess per unittest module; six concurrent workers'},indent=2)+'\n')
code="""import unittest,sys,json
suite=unittest.defaultTestLoader.loadTestsFromName(sys.argv[1]);result=unittest.TextTestRunner(verbosity=1).run(suite)
print('RESULT_JSON '+json.dumps(dict(module=sys.argv[1],tests=result.testsRun,failures=len(result.failures),errors=len(result.errors),skipped=len(result.skipped))))
raise SystemExit(not result.wasSuccessful())
"""
def run(m):
 env=dict(os.environ,PYTHONPATH=str(root/'docs/card-game/tools'))
 r=subprocess.run(['python','-c',code,m],capture_output=True,text=True,env=env);s=r.stdout+r.stderr;(out/(m+'.log')).write_text(s)
 rows=[x[12:] for x in s.splitlines() if x.startswith('RESULT_JSON ')]
 d=json.loads(rows[0]) if len(rows)==1 else dict(module=m,tests=0,failures=0,errors=1,missing_result=True)
 d['exit_code']=r.returncode;return d
results=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 for r in pool.map(run,mods):
  results.append(r);(out/'progress.json').write_text(json.dumps(results,indent=2)+'\n')
  if r['exit_code']:print('FAILED',r,flush=True)
summary=dict(modules=len(results),tests=sum(r['tests'] for r in results),failures=sum(r['failures'] for r in results),errors=sum(r['errors'] for r in results),skipped=sum(r.get('skipped',0) for r in results),all_passed=all(r['exit_code']==0 for r in results))
(out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(summary,flush=True)
raise SystemExit(not summary['all_passed'])
