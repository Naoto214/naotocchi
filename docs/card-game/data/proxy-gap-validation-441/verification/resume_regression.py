"""Resume only tests lacking an explicit PASS in the interrupted, unchanged-source run."""
import hashlib,json,re,sys,subprocess,unittest,time
from pathlib import Path
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
sys.path.insert(0,str(ROOT/'tools'))
from run_proxy_regression_410 import RecordingResult,save
OLD=HERE/'full'
NEW=HERE/'full-resumed'
def source_ok(m):
    return all(hashlib.sha256((ROOT/'tools'/(n+'.py')).read_bytes()).hexdigest()==h for n,h in m['source_sha256'].items())
if len(sys.argv)>1:
    i=int(sys.argv[1]); ids=json.loads((NEW/'manifest.json').read_text())['workers'][i]
    suite=unittest.defaultTestLoader.loadTestsFromNames(ids)
    start=time.monotonic();r=unittest.TextTestRunner(verbosity=2,resultclass=RecordingResult).run(suite)
    save(NEW/f'worker-{i}.json',dict(planned_ids=ids,started_ids=r.started,finished_ids=r.finished,status=r.status,successful=r.wasSuccessful(),seconds=time.monotonic()-start))
    sys.exit(0 if r.wasSuccessful() else 1)
m=json.loads((OLD/'manifest.json').read_text());assert source_ok(m)
planned=[t for w in m['workers'] for t in w['planned_ids']]
passed=[]; evidence={}
for i,w in enumerate(m['workers']):
    p=OLD/f'worker-{i}.log'; text=p.read_text()
    segments=re.findall(r'^\S+ \(([^)]+)\) \.\.\. (.*?)(?=^test\S+ \(|\Z)',text,re.M|re.S)
    rows=[test_id for test_id,body in segments if body.rstrip().splitlines()[-1:] == ['ok'] or body == 'ok\n']
    assert rows==w['planned_ids'][:len(rows)], 'not an exact completed prefix'
    passed.extend(rows);evidence[p.name]=hashlib.sha256(p.read_bytes()).hexdigest()
assert len(passed)==len(set(passed))
remaining=[t for t in planned if t not in set(passed)]
# Keep each test class together so unittest class fixtures preserve their semantics.
groups={}
for t in remaining:groups.setdefault(t.rsplit('.',1)[0],[]).append(t)
workers=[[] for _ in range(8)]
for j,group in enumerate(groups.values()):workers[j%8].extend(group)
NEW.mkdir(exist_ok=True)
save(NEW/'manifest.json',dict(prior_manifest_sha256=hashlib.sha256((OLD/'manifest.json').read_bytes()).hexdigest(),prior_log_sha256=evidence,prior_completed_pass_ids=passed,workers=workers,remaining_count=len(remaining)))
handles=[(NEW/f'worker-{i}.log').open('w') for i in range(8)]
processes=[subprocess.Popen([sys.executable,str(Path(__file__).resolve()),str(i)],stdout=h,stderr=subprocess.STDOUT) for i,h in enumerate(handles)]
codes=[p.wait() for p in processes]
for h in handles:h.close()
rows=[json.loads((NEW/f'worker-{i}.json').read_text()) for i in range(8)]
started=passed+[t for r in rows for t in r['started_ids']];finished=passed+[t for r in rows for t in r['finished_ids']]
statuses={t:['pass'] for t in passed}
for r in rows:statuses.update(r['status'])
checks=dict(all_resumed_exit_zero=all(c==0 for c in codes),all_resumed_workers_successful=all(r['successful'] for r in rows),exact_started_coverage=sorted(started)==sorted(planned),exact_finished_coverage=sorted(finished)==sorted(planned),no_duplicates=len(started)==len(set(started)) and len(finished)==len(set(finished)),all_pass_no_skip=len(statuses)==len(planned) and all(s==['pass'] for s in statuses.values()),source_unchanged=source_ok(m),prior_logs_unchanged=all(hashlib.sha256((OLD/n).read_bytes()).hexdigest()==h for n,h in evidence.items()))
summary=dict(method='Explicit PASS prefixes from interrupted unchanged-source run plus isolated remaining-test execution; original worker exits unavailable, not asserted.',checks=checks,success=all(checks.values()),modules=len(m['modules']),planned=len(planned),prior_completed=len(passed),resumed=len(remaining),started=len(started),finished=len(finished),resumed_worker_exit_codes=codes,non_pass={t:s for t,s in statuses.items() if s!=['pass']})
save(NEW/'summary.json',summary);print(json.dumps(summary,indent=2));sys.exit(0 if summary['success'] else 1)
