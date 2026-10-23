"""Real worker processes through the checkpoint supervisor (review 2bfbe209, M1).

Each row runs in a real child process started by the supervisor's own _Worker with the
real CHILD and the real attempt_runner, on the interpreter running these tests (the
edition's Python 3.12). Only the owner-approval gate is replaced inside the child: this
is a test environment and never a real approval. Row 1 runs the real engine end to end
(fixture test-1A, 512 steps, independent reconstruction). Other rows use a deterministic
stand-in for the engine so the crash, large-stderr and incomplete paths stay fast. The
results branch is pushed to a local bare repository, never to GitHub.
"""
import copy,gzip,hashlib,json,shutil,subprocess,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from test_proxy_mandatory_population_input import bundle as test_bundle
from test_proxy_population_checkpoint_resume import make_repo,git,BINDING
from proxy_mandatory_policy_contract import canonical
import proxy_population_checkpoint_supervisor as api
import proxy_population_checkpoint_ledger as ledger
import proxy_population_results_store as results

TOOLS=Path(__file__).resolve().parent

PREFIX='''import sys,os,json,hashlib
from pathlib import Path
sys.path.insert(0,sys.argv[1])
import proxy_population_attempt_runner as a
import proxy_population_checkpoint_ledger as ledger
from proxy_mandatory_policy_contract import canonical
a.ROOT=Path(%(card)r)
MODES=json.loads(%(modes)r)
# Test environment only: the owner-approval gate is replaced; the worker logic is real.
a.external_approval.require_operation_ready=lambda stage,**kw:dict(test_only=True)
a.lock.verify_git_binding=lambda *x,**k:dict(immutable_content_verified=True)
a.edition.audit_bundle_edition=lambda *x,**k:dict(bundle_edition_bound=True)
a.edition.verify=lambda *x,**k:dict(local_edition_verified=True)
a.authorization.audit_launch=lambda *x,**k:dict(launch_authorization_bound=True,consumption=dict(binding=dict(commit=x[8]),remote_publication=dict(fresh_remote_head_verified=True,test_only=True)),test_only=True)
real_run=a.run_after_external_approval
def stand_in(request,completed):
 mid=request['match_id'];seed=int(hashlib.sha256(mid.encode()).hexdigest()[:6],16)
 events=[dict(seq=i,action_type=('pass','use_play','resolve_event')[(seed+i)%%3],actor='AB'[(seed+i)%%2]) for i in range(1,6)]
 return dict(schema='bound_population_connected_runtime.v1',binding=dict(match_id=mid),supplied_bundle_sha256=hashlib.sha256(canonical(request['bundle'])).hexdigest(),
  connected_tools_sha256=ledger.tools_sha256(request['certificate']),reconstruction_step_limit=512,completed=completed,
  runtime=dict(decisions=[dict(selected_candidate='c'+str(seed%%4),decision_kind='normal_action')],events=events,final_envelope=dict(legacy_continuation=dict(game_state=dict(round=10,seed=seed))),result=dict(winner='AB'[seed%%2]) if completed else None,stop=None))
def run(**request):
 mode=MODES.get(str(request['schedule_index']),'stub')
 if mode=='crash':
  sys.stderr.write('synthetic crash\\n');sys.stderr.flush();os._exit(3)
 if mode=='stderr':
  sys.stderr.write('x'*(2*1024*1024));sys.stderr.flush()
 if mode in ('stub','stderr','incomplete'):
  completed=mode!='incomplete'
  a.connected.reconstruct=lambda b,m,l:stand_in(request,completed)
  a.admission.audit_match=lambda records,b,m:dict(execution_status='completed' if completed else 'incomplete',source_reconstructed_attempt_count=1,stand_in=True)
 return real_run(**request)
a.run_after_external_approval=run
'''


def tools_certificate():
 """An edition-shaped certificate whose tools hash equals the real connected fingerprint."""
 files={'tools/'+p.name:dict(sha256=hashlib.sha256(p.read_bytes()).hexdigest(),blob='0'*40) for p in sorted(TOOLS.glob('*.py'))}
 return dict(commit='1'*40,tree='2'*40,python=dict(version=sys.version.split()[0]),files=files)


class RealWorkerHarness:
 def __init__(self,root):
  self.root=Path(root);self.repo,self.claim=make_repo(self.root);self.card=self.repo/'docs/card-game';self.bundle=test_bundle()
  self.claim_tree=git(self.repo,'rev-parse','HEAD^{tree}');self.publication=git(self.repo,'rev-parse','HEAD^');self.cert=tools_certificate()
  self.remote=self.root/'results.git';git(self.root,'init','-q','--bare',str(self.remote))
 def run(self,resume,destination,modes,workspace='ws'):
  child=PREFIX%dict(card=str(self.card),modes=json.dumps({str(k):v for k,v in modes.items()}))+api.CHILD
  ps=[patch.object(api,'ROOT',self.card),patch.object(api,'CHILD',child),patch.object(api,'POLL_SECONDS',0.2),
   patch.object(api.external_approval,'require_operation_ready',return_value=dict(test_only=True)),
   patch.object(api.authorization,'audit_launch',return_value=dict(launch_authorization_bound=True,consumption=dict(remote_publication=dict(fresh_remote_head_verified=True)),test_only=True)),
   patch.object(api.edition,'verify',return_value=dict(local_edition_verified=True)),patch.object(api.edition,'audit_bundle_edition',return_value=dict(bundle_edition_bound=True)),
   patch.object(api.lock,'verify_git_binding',return_value=dict(immutable_content_verified=True))]
  for p in ps:p.start()
  try:return api.run_after_external_approval(self.bundle,dict(commit='1'*40,tree='2'*40),self.cert,self.repo,512,self.card/'data'/destination,'unit-reference-not-approval',
   comment_id=1,claim_commit=self.claim,claim_tree=self.claim_tree,execution_binding=BINDING,resume=resume,store_workspace=self.root/workspace,results_remote=str(self.remote))
  finally:
   for p in ps:p.stop()
 def store(self,generation,workspace='ws'):
  return results.Store(self.repo,api.first_generation_resume(self.publication,1)['attempt_id'],self.root/workspace,remote=str(self.remote),generation=generation)
 def resume(self,generation,parallelism):
  return api.prepare_resume(self.repo,self.bundle,self.cert,dict(comment_id=1,commit=self.claim,tree=self.claim_tree),generation,self.store(generation),parallelism)
 def saved(self):
  store=self.store(0,'reader');head=store.remote_head()
  subprocess.run(['git','-C',str(self.repo),'fetch','-q',str(self.remote),'refs/heads/'+store.branch],check=True)
  return store.load_rows(head)


class RealWorkerTests(unittest.TestCase):
 def setUp(self):
  self.directory=tempfile.TemporaryDirectory();self.addCleanup(self.directory.cleanup);self.h=RealWorkerHarness(self.directory.name)

 def test_real_process_paths_large_stderr_crash_and_exit_codes(self):
  report=self.h.run(api.first_generation_resume(self.h.publication,2),'gen0',{1:'stderr',2:'crash'})
  rows=report['planned_rows']
  self.assertEqual(rows[0]['execution_status'],'completed');self.assertTrue(rows[0]['persisted'])
  self.assertEqual(rows[1]['execution_status'],'record_unverified');self.assertIn('worker process failed',rows[1]['stop_reason'])
  control=json.loads((self.h.card/'data/gen0/result-0001.json').read_text());self.assertEqual(control['returncode'],0);self.assertEqual(control['stderr_bytes'],2*1024*1024)
  failed=json.loads((self.h.card/'data/gen0/result-0002.json').read_text());self.assertEqual(failed['returncode'],3)
  self.assertEqual(sorted(self.h.saved()),[1]);self.assertEqual(report['status'],'stopped')

 def test_real_engine_row_checkpoint_and_two_resumes(self):
  # Generation 0: row 1 is the real engine (test-1A), row 2 a stand-in, row 3 crashes.
  report=self.h.run(api.first_generation_resume(self.h.publication,2),'gen0',{1:'engine',2:'stub',3:'crash'})
  self.assertEqual([r['execution_status'] for r in report['planned_rows'][:3]],['completed','completed','record_unverified'],report['planned_rows'][:3])
  saved=self.h.saved();self.assertEqual(sorted(saved),[1,2])
  entry,receipt,compressed,start=saved[1]
  record=json.loads(gzip.decompress(compressed));self.assertTrue(record['completed']);self.assertEqual(record['binding']['match_id'],'test-1A')
  self.assertEqual(entry['play']['event_count'],len(record['runtime']['events']));self.assertEqual(json.loads(receipt)['execution_status'],'completed')
  self.assertEqual(json.loads(start)['launch_authorization']['consumption']['binding']['commit'],self.h.claim)
  # Container loss: the workspace and the run directory are gone; a new generation re-verifies the saved bytes.
  shutil.rmtree(self.h.root/'ws');shutil.rmtree(self.h.card/'data/gen0')
  resume1,plan1=self.h.resume(1,2);self.assertEqual((resume1['completed_rows'],plan1['next_schedule_index']),(2,3))
  report=self.h.run(resume1,'gen1',{3:'stderr',4:'stub',5:'incomplete'})
  self.assertEqual(report['reused_rows'],2);self.assertEqual(report['persisted_rows'],2);self.assertEqual(report['planned_rows'][4]['execution_status'],'incomplete')
  # Generation 2 in the same container (no cleanup), four workers; row 8 crashes.
  resume2,plan2=self.h.resume(2,4);self.assertEqual((resume2['completed_rows'],plan2['next_schedule_index']),(4,5))
  report=self.h.run(resume2,'gen2',{8:'crash'})
  saved=self.h.saved();self.assertEqual(sorted(saved),[1,2,3,4,5,6,7])
  self.assertEqual([saved[i][0]['resume_generation'] for i in range(1,8)],[0,0,1,1,2,2,2])
  self.assertTrue(all(saved[i][0]['previous_entry_sha256']==saved[i-1][0]['entry_sha256'] for i in range(2,8)))
  later=[r['execution_status'] for r in report['planned_rows'][8:12]]
  self.assertTrue(all(s in ('completed_not_saved','not_executed','record_unverified') for s in later),later)
  self.assertEqual(report['planned_rows'][7]['execution_status'],'record_unverified')
  # The saved real record re-verifies independently of the supervisor that wrote it.
  descriptor=ledger.attempt_descriptor(resume2['attempt_id'],self.h.bundle,self.h.cert,dict(comment_id=1,commit=self.h.claim,tree=self.h.claim_tree))
  self.assertEqual(ledger.verify_ledger(saved,descriptor,self.h.bundle)['completed_rows'],7)


if __name__=='__main__':unittest.main()
