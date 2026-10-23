"""Checkpoint/resume contract: ledger, results branch and supervisor recovery scenarios.

Mock workers and a local bare "remote" only. No production approval, no game,
no fixed-400 result. The real gate (live owner comment, claim commit, edition)
is patched exactly as the existing supervisor tests patch it.
"""
import copy,gzip,hashlib,json,os,shutil,subprocess,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from test_proxy_mandatory_population_input import bundle as test_bundle
from proxy_mandatory_policy_contract import canonical
import proxy_population_checkpoint_ledger as ledger
import proxy_population_results_store as results
import proxy_population_checkpoint_supervisor as api
import proxy_population_external_approval as approval

CERT=dict(commit='1'*40,tree='2'*40,python=dict(version='3.12.14'),files={'tools/proxy_population_runtime.py':dict(sha256='a'*64,blob='b'*40),'tools/x.py':dict(sha256='c'*64,blob='d'*40),'01-core-rules.md':dict(sha256='e'*64,blob='f'*40)})
BINDING=dict(binding=dict(test_only=True),binding_receipt=dict(commit='3'*40,tree='4'*40,path='x/binding.json',blob='5'*40,canonical_sha256='6'*64))


def git(cwd,*args,env=None):
 return subprocess.check_output(['git','-C',str(cwd),*args],stderr=subprocess.STDOUT,env=env).decode().strip()


def make_repo(root):
 """A tiny repository with one protected directory and a local bare origin."""
 repo=root/'repo';(repo/'docs/card-game/data/proxy-population-approval-consumption').mkdir(parents=True)
 (repo/'docs/card-game/data/proxy-population-approval-consumption/0.json').write_text('{}')
 git(repo,'init','-q','-b','work');git(repo,'config','user.email','t@t');git(repo,'config','user.name','t')
 git(repo,'add','.');git(repo,'commit','-q','-m','base')
 bare=root/'origin.git';git(root,'init','-q','--bare',str(bare));git(repo,'remote','add','origin',str(bare));git(repo,'push','-q','origin','work')
 return repo,git(repo,'rev-parse','HEAD')


def mock_record(request,completed=True):
 """Deterministic per-match play so independent runs produce identical checkpoints."""
 mid=request['match_id'];seed=int(hashlib.sha256(mid.encode()).hexdigest()[:6],16)
 events=[dict(seq=i,action_type=('pass','use_play','resolve_event')[(seed+i)%3],actor='AB'[(seed+i)%2],game_state_after_sha256=hashlib.sha256((mid+str(i)).encode()).hexdigest()) for i in range(1,8)]
 decisions=[dict(selected_candidate='c'+str((seed+i)%4),decision_kind='normal_action') for i in range(4)]
 final=dict(round=10,turn_player='A',players=dict(A=dict(growth=seed%100),B=dict(growth=(seed//7)%100)),cards={})
 return dict(schema='bound_population_connected_runtime.v1',binding=dict(match_id=mid,group_id=mid.rsplit('-',1)[0] if '-' in mid else mid),supplied_bundle_sha256=hashlib.sha256(canonical(request['bundle'])).hexdigest(),
  connected_tools_sha256=ledger.tools_sha256(request['certificate']),reconstruction_step_limit=512,completed=completed,
  runtime=dict(decisions=decisions,events=events,final_envelope=dict(legacy_continuation=dict(game_state=final)),result=dict(winner='A' if seed%2 else 'B') if completed else None,stop=None if completed else dict(detail='mock stop')))


class FakeWorker:
 def __init__(self,request,repository,behaviour):
  self.stdout=b'';self.stderr=b'';self.returncode=0;target=Path(request['destination'])
  mode=behaviour(request)
  if mode=='signal':raise KeyboardInterrupt('container restart equivalent')
  if mode=='launch_failure':raise OSError('synthetic child launch failure')
  target.mkdir()
  if mode=='killed':(target/'partial.txt').write_text('killed mid-row');self.returncode=-9;self.stderr=b'Killed';return
  record=mock_record(request,completed=(mode!='incomplete'));raw=canonical(record);compressed=gzip.compress(raw,mtime=0)
  (target/'start.json').write_bytes(canonical(dict(schema='conditional_population_attempt_start.v1',match_id=request['match_id'],test_only=True)))
  (target/'record.json.gz').write_bytes(compressed)
  receipt=dict(schema='conditional_population_attempt_receipt.v1',match_id=request['match_id'],execution_status='completed' if record['completed'] else 'incomplete',source_reconstructed=True,record_sha256=hashlib.sha256(raw).hexdigest(),compressed_sha256=hashlib.sha256(compressed).hexdigest(),admission=dict(test_only=True),external_approval_verified=False,input_lock_verified=False,ready_for_execution=False,policy_promoted=False,independent_balance_sample_count=0)
  body=canonical(receipt);(target/'receipt.json').write_bytes(body);self.stdout=canonical(dict(receipt_sha256=hashlib.sha256(body).hexdigest()))
 def poll(self):return self.returncode
 def finish(self):return self.returncode
 def terminate(self):pass


class Harness:
 def __init__(self,case,root):
  self.case=case;self.root=Path(root);self.repo,self.claim=make_repo(self.root);self.card=self.repo/'docs/card-game';self.bundle=test_bundle();self.calls=[]
  self.claim_tree=git(self.repo,'rev-parse','HEAD^{tree}')
 def patches(self,behaviour,extra=()):
  def launch(request,repository):self.calls.append(request['schedule_index']);return FakeWorker(request,repository,behaviour)
  return [patch.object(api,'ROOT',self.card),patch.object(api.external_approval,'require_operation_ready',return_value=dict(test_only=True)),
   patch.object(api.authorization,'audit_launch',return_value=dict(launch_authorization_bound=True,consumption=dict(remote_publication=dict(fresh_remote_head_verified=True)),test_only=True)),
   patch.object(api.edition,'verify',return_value=dict(local_edition_verified=True)),patch.object(api.edition,'audit_bundle_edition',return_value=dict(bundle_edition_bound=True)),
   patch.object(api.lock,'verify_git_binding',return_value=dict(immutable_content_verified=True)),patch.object(api,'_launch',side_effect=launch),patch.object(api,'POLL_SECONDS',0)]+list(extra)
 def run(self,resume,destination,behaviour,cert=CERT,bundle=None,extra=(),workspace='ws'):
  ps=self.patches(behaviour,extra)
  for p in ps:p.start()
  try:return api.run_after_external_approval(bundle or self.bundle,dict(commit='1'*40,tree='2'*40),cert,self.repo,512,self.card/'data'/destination,'unit-reference-not-approval',comment_id=1,claim_commit=self.claim,claim_tree=self.claim_tree,execution_binding=BINDING,resume=resume,store_workspace=self.root/workspace)
  finally:
   for p in ps:p.stop()
 def store(self,attempt,workspace='ws'):return results.Store(self.repo,attempt,self.root/workspace)
 def gen0(self,parallelism=2):return api.first_generation_resume(self.claim,parallelism)
 def resume(self,generation,parallelism=2,cert=CERT,bundle=None,workspace='ws-fresh'):
  shutil.rmtree(self.root/'ws',ignore_errors=True) # a lost container keeps no workspace
  resume,plan=api.prepare_resume(self.repo,bundle or self.bundle,cert,dict(comment_id=1,commit=self.claim,tree=self.claim_tree),generation,self.store(api.first_generation_resume(self.claim,1)['attempt_id'],workspace),parallelism)
  return resume,plan
 def rows_on_branch(self,attempt):
  store=self.store(attempt,'reader');head=store.remote_head()
  if head is None:return {}
  subprocess.run(['git','-C',str(self.repo),'fetch','-q','origin','refs/heads/'+store.branch],check=True)
  return store.load_rows(head)


def stop_at(index,mode='incomplete'):
 return lambda request:mode if request['schedule_index']==index else 'ok'


class CheckpointResumeTests(unittest.TestCase):
 def setUp(self):
  self.directory=tempfile.TemporaryDirectory();self.h=Harness(self,self.directory.name);self.addCleanup(self.directory.cleanup)

 def test_01_one_row_completed_then_stop_is_checkpointed_once(self):
  report=self.h.run(self.h.gen0(1),'gen0',stop_at(2))
  self.assertEqual(report['status'],'stopped');self.assertEqual((report['completed_rows'],report['persisted_rows'],report['not_executed_rows']),(1,1,398))
  self.assertEqual(report['planned_rows'][0]['execution_status'],'completed');self.assertEqual(report['planned_rows'][1]['execution_status'],'incomplete')
  rows=self.h.rows_on_branch(report['attempt_id']);self.assertEqual(sorted(rows),[1])
  entry=rows[1][0];self.assertEqual((entry['schedule_index'],entry['match_id'],entry['completed'],entry['resume_generation']),(1,'test-1A',True,0))
  self.assertEqual(self.h.calls,[1,2]);self.assertFalse((self.h.card/'data/gen0/request-0003.json').exists())

 def test_02_process_killed_mid_row_keeps_prior_checkpoint_and_stops(self):
  report=self.h.run(self.h.gen0(1),'gen0',stop_at(2,'killed'))
  self.assertEqual(report['planned_rows'][1]['execution_status'],'record_unverified');self.assertIn('worker process failed',report['planned_rows'][1]['stop_reason'])
  self.assertEqual(sorted(self.h.rows_on_branch(report['attempt_id'])),[1]);self.assertTrue((self.h.card/'data/gen0/attempt-0002/partial.txt').exists())
  self.assertEqual(report['status'],'stopped');self.assertEqual(self.h.calls,[1,2])

 def test_03_container_loss_then_approved_resume_reuses_verified_rows(self):
  with self.assertRaises(KeyboardInterrupt):self.h.run(self.h.gen0(1),'gen0',stop_at(3,'signal'))
  first=json.loads((self.h.card/'data/gen0/supervisor.json').read_text());attempt=first['attempt_id']
  self.assertEqual(first['persisted_rows'],2);self.assertEqual(sorted(self.h.rows_on_branch(attempt)),[1,2])
  resume,plan=self.h.resume(1)
  self.assertEqual((resume['completed_rows'],plan['next_schedule_index'],resume['resume_generation']),(2,3,1))
  self.h.calls.clear();report=self.h.run(resume,'gen1',lambda r:'ok',workspace='ws-fresh')
  self.assertEqual(report['status'],'completed_fixed_schedule');self.assertEqual((report['reused_rows'],report['completed_rows'],report['persisted_rows']),(2,398,398))
  self.assertEqual(self.h.calls[:3],[3,4,5]);self.assertNotIn(1,self.h.calls);self.assertNotIn(2,self.h.calls)
  self.assertEqual(report['planned_rows'][0]['execution_status'],'reused_verified_checkpoint');self.assertEqual(report['planned_rows'][0]['resume_generation'],0)
  rows=self.h.rows_on_branch(attempt);self.assertEqual(len(rows),400);self.assertEqual(rows[3][0]['resume_generation'],1);self.assertEqual(rows[3][0]['previous_entry_sha256'],rows[2][0]['entry_sha256'])

 def test_04_corrupted_saved_record_blocks_resume(self):
  self.h.run(self.h.gen0(1),'gen0',stop_at(3));attempt=api.first_generation_resume(self.h.claim,1)['attempt_id']
  self._tamper(attempt,lambda ws:(ws/results.row_prefix(attempt)/'0001'/'record.json.gz').write_bytes(gzip.compress(b'{"tampered":true}')))
  with self.assertRaisesRegex(ValueError,'checkpoint record bytes differ|checkpoint'):self.h.resume(1)

 def test_05_missing_evidence_file_blocks_resume(self):
  self.h.run(self.h.gen0(1),'gen0',stop_at(3));attempt=api.first_generation_resume(self.h.claim,1)['attempt_id']
  self._tamper(attempt,lambda ws:(ws/results.row_prefix(attempt)/'0002'/'receipt.json').unlink())
  with self.assertRaisesRegex(ValueError,'evidence incomplete'):self.h.resume(1)

 def test_06_different_edition_cannot_reuse_rows(self):
  self.h.run(self.h.gen0(1),'gen0',stop_at(3))
  other=copy.deepcopy(CERT);other['commit']='9'*40
  with self.assertRaisesRegex(ValueError,'checkpoint entry differs'):self.h.resume(1,cert=other)

 def test_07_different_manifest_cannot_reuse_rows(self):
  self.h.run(self.h.gen0(1),'gen0',stop_at(3))
  other=copy.deepcopy(self.h.bundle);other['groups'][0]['seed_A']='0'*64
  with self.assertRaisesRegex(ValueError,'checkpoint'):self.h.resume(1,bundle=other)

 def test_08_consumed_attempt_cannot_restart_as_generation_zero_and_stale_reference_is_refused(self):
  self.h.run(self.h.gen0(1),'gen0',stop_at(3))
  with self.assertRaisesRegex(ValueError,'results branch already exists'):self.h.run(self.h.gen0(1),'gen0-again',lambda r:'ok',workspace='ws-again')
  resume,_=self.h.resume(1);attempt=resume['attempt_id']
  self._tamper(attempt,lambda ws:(ws/'extra.txt').write_text('moved on'))  # the branch moves after the approval reference was fixed
  with self.assertRaisesRegex(ValueError,'results branch head differs|moved since'):self.h.run(resume,'gen1',lambda r:'ok',workspace='ws-stale')

 def test_09_duplicate_rows_are_refused(self):
  self.h.run(self.h.gen0(1),'gen0',stop_at(3));attempt=api.first_generation_resume(self.h.claim,1)['attempt_id']
  rows=self.h.rows_on_branch(attempt);duplicate=dict(rows);duplicate[7]=rows[1]
  descriptor=ledger.attempt_descriptor(attempt,self.h.bundle,CERT,dict(comment_id=1,commit=self.h.claim,tree=self.h.claim_tree))
  with self.assertRaisesRegex(ValueError,'not the scheduled match|duplicate'):ledger.verify_ledger(duplicate,descriptor,self.h.bundle)
  store=self.h.store(attempt,'dup');store.prepare(self.h.claim,expected_head=store.remote_head())
  with self.assertRaisesRegex(results.PersistError,'already recorded'):store.append_row(1,self.h.card/'data/gen0/attempt-0001',rows[1][0])

 def test_10_crash_during_save_leaves_row_unsaved_and_resume_reruns_it(self):
  real=results.Store.append_row
  def crash(store,index,row_dir,entry):
   if index==2:raise KeyboardInterrupt('crash while saving')
   return real(store,index,row_dir,entry)
  with self.assertRaises(KeyboardInterrupt):self.h.run(self.h.gen0(1),'gen0',lambda r:'ok',extra=[patch.object(results.Store,'append_row',crash)])
  report=json.loads((self.h.card/'data/gen0/supervisor.json').read_text())
  self.assertEqual(report['planned_rows'][1]['execution_status'],'persist_failed');self.assertEqual(sorted(self.h.rows_on_branch(report['attempt_id'])),[1])
  resume,plan=self.h.resume(1);self.assertEqual(plan['next_schedule_index'],2);self.assertEqual(resume['completed_rows'],1)

 def test_11_push_failure_stops_the_run_and_keeps_local_evidence(self):
  attempt=api.first_generation_resume(self.h.claim,1)['attempt_id']
  def break_remote(request):
   if request['schedule_index']==2:git(self.h.repo,'remote','set-url','origin',str(self.h.root/'missing.git'))
   return 'ok'
  with patch.object(results,'PUSH_ATTEMPTS',1):report=self.h.run(self.h.gen0(1),'gen0',break_remote)
  self.assertEqual(report['status'],'stopped');self.assertEqual(report['planned_rows'][1]['execution_status'],'persist_failed');self.assertIn('push failed',report['planned_rows'][1]['stop_reason'])
  self.assertTrue((self.h.card/'data/gen0/attempt-0002/record.json.gz').exists());self.assertEqual(self.h.calls,[1,2]);self.assertEqual(report['unsaved_completed_rows'],1)

 def test_12_resumed_schedule_equals_an_uninterrupted_run(self):
  with self.assertRaises(KeyboardInterrupt):self.h.run(self.h.gen0(2),'gen0',stop_at(5,'signal'))
  resume,_=self.h.resume(1,parallelism=3);report=self.h.run(resume,'gen1',lambda r:'ok',workspace='ws-fresh')
  self.assertEqual(report['status'],'completed_fixed_schedule')
  resumed=self.h.rows_on_branch(resume['attempt_id'])
  other=Harness(self,tempfile.mkdtemp(dir=self.directory.name));straight=other.run(other.gen0(4),'straight',lambda r:'ok')
  self.assertEqual(straight['status'],'completed_fixed_schedule');direct=other.rows_on_branch(straight['attempt_id'])
  self.assertEqual(len(resumed),400);self.assertEqual([resumed[i][0]['play'] for i in range(1,401)],[direct[i][0]['play'] for i in range(1,401)])
  self.assertEqual([resumed[i][0]['match_id'] for i in range(1,401)],list(self.h.bundle['execution_order']))

 def test_13_later_rows_after_a_stop_are_not_checkpointed_out_of_order(self):
  report=self.h.run(self.h.gen0(3),'gen0',stop_at(2))
  self.assertEqual(sorted(self.h.rows_on_branch(report['attempt_id'])),[1])
  later=[r['execution_status'] for r in report['planned_rows'][2:4]]
  self.assertTrue(all(s in ('completed_not_saved','not_executed') for s in later),later);self.assertEqual(report['completed_rows'],1)

 def test_14_protected_originals_must_be_unmodified(self):
  self.assertTrue(api.verify_protected(self.h.repo)['checked'])
  (self.h.repo/'docs/card-game/data/proxy-population-approval-consumption/0.json').write_text('{"changed":1}')
  with self.assertRaisesRegex(ValueError,'protected path modified'):api.verify_protected(self.h.repo)

 def _tamper(self,attempt,mutate):
  ws=self.h.root/'tamper';git(self.h.repo,'fetch','-q','origin','refs/heads/'+results.branch_name(attempt))
  git(self.h.repo,'worktree','add','-q','--detach',str(ws),'FETCH_HEAD');mutate(ws)
  git(ws,'add','-A');git(ws,'-c','user.email=t@t','-c','user.name=t','commit','-q','-m','tamper');git(ws,'push','-q','origin','HEAD:refs/heads/'+results.branch_name(attempt))


class ResumeRequestTests(unittest.TestCase):
 def request(self):
 # A syntactically complete v3 launch request; the real builder is exercised by the launch-authorization tests.
  resume=dict(attempt_id='fixed400-'+'a'*12,resume_generation=1,original_claim=dict(comment_id=5,commit='b'*40,tree='c'*40),results_ref=dict(branch='fixed400-results/fixed400-'+'a'*12,commit='d'*40,tree='e'*40),checkpoint_sha256='f'*64,completed_rows=3,pending_schedule_indices_sha256='1'*64,parallelism=4,owner_approved_manual_resume=True)
  target=dict(manifest_sha256='2'*64,receipt_sha256='3'*64,execution_binding_sha256='4'*64,binding_receipt_sha256='5'*64,original_package_receipt_sha256='6'*64,old_edition=dict(commit='7'*40,tree='8'*40,sha256='9'*64),execution_order=['m'+str(i) for i in range(400)],reconstruction_step_limit=512,automatic_retry_allowed=False,automatic_resume_allowed=False,resume=resume)
  return dict(schema='population_external_approval_request.v3',repository=approval.REPOSITORY,pull_request=approval.PR,authority_user_id=approval.AUTHORITY,stage='launch',edition=dict(commit='a'*40,tree='b'*40,sha256='c'*64),publication=dict(commit='d'*40,tree='e'*40),destination='docs/card-game/data/x',planned_groups=200,planned_matches=400,contract_sha256={p:'0'*64 for p in approval.CONTRACTS},target=target)
 def test_v3_request_validates_and_has_a_distinct_digest(self):
  r=self.request();approval._validate_request(r);text=approval.approval_text(r)
  v2=copy.deepcopy(r);v2['schema']='population_external_approval_request.v2';del v2['target']['resume'];approval._validate_request(v2)
  self.assertNotEqual(text,approval.approval_text(v2));self.assertTrue(text.startswith('NAOTOCCHI POPULATION APPROVAL v1\nstage: launch\n'))
 def test_resume_binding_is_fail_closed(self):
  base=self.request()
  def mutate(f):
   r=copy.deepcopy(base);f(r['target']['resume']);return r
  bad=[mutate(lambda x:x.update(parallelism=5)),mutate(lambda x:x.update(parallelism=0)),mutate(lambda x:x.update(owner_approved_manual_resume=False)),mutate(lambda x:x.update(resume_generation=0)),
   mutate(lambda x:x.update(completed_rows=401)),mutate(lambda x:x.update(results_ref=dict(x['results_ref'],branch='other/branch'))),mutate(lambda x:x.pop('checkpoint_sha256')),mutate(lambda x:x.update(attempt_id='fixed400-zz')),
   mutate(lambda x:x.update(original_claim=None))]
  for r in bad:
   with self.assertRaises(ValueError):approval._validate_request(r)
  gen0=mutate(lambda x:x.update(resume_generation=0,original_claim=None,results_ref=None,completed_rows=0));approval._validate_request(gen0)
  v2_with_resume=copy.deepcopy(base);v2_with_resume['schema']='population_external_approval_request.v2'
  with self.assertRaises(ValueError):approval._validate_request(v2_with_resume)
 def test_first_generation_binding(self):
  r=api.first_generation_resume('ab'*20,2);approval._resume_target(r);self.assertEqual((r['resume_generation'],r['completed_rows'],r['attempt_id']),(0,0,'fixed400-'+'ab'*6))


if __name__=='__main__':unittest.main()
