"""Synthetic claim and fixed schedule; no entropy and no matches executed."""
import copy,unittest
from unittest.mock import patch
import test_proxy_population_generation_authorization as fixtures
import proxy_population_external_approval as approval
from test_proxy_population_external_approval import replies
from test_proxy_mandatory_population_input import bundle
try:import proxy_population_launch_authorization as api
except ImportError:api=None

class LaunchAuthorizationTests(unittest.TestCase):
 git=fixtures.GenerationAuthorizationTests.git
 def setUp(self):
  fixtures.GenerationAuthorizationTests.setUp(self)
  self.assertIsNotNone(api,'launch authorization integration missing')
  self.git('reset','--hard',self.cert['commit']);(self.root/'data').mkdir(exist_ok=True)
  self.bundle=bundle();self.receipt=dict(commit=self.cert['commit'],tree=self.cert['tree'])
  self.package=dict(committed_generation_consistent=True,artifact_bindings={'synthetic':'package'})
  self.request=approval.launch_request(self.bundle,self.receipt,self.cert,self.package,3,'docs/card-game/data/unit-destination')
  get,_,_,_=replies(self.request)
  with patch.object(approval,'ROOT',self.root),patch.object(approval,'_get',side_effect=get):approval.consume_live(self.request,17)
  self.git('add','.');self.git('commit','-qm','synthetic launch claim');self.commit=self.git('rev-parse','HEAD');self.tree=self.git('rev-parse','HEAD^{tree}')
 def authorization(self,remote=True,after_read=None,**kwargs):
  get,_,_,pr=replies(self.request);pr['head']['sha']=self.commit
  def fresh(path):
   value=get(path)
   if after_read:after_read()
   return value
  with patch.object(api,'ROOT',self.root),patch.object(approval,'_get',side_effect=fresh),patch.object(api.publication.remote,'verify',return_value=dict(fresh_remote_head_verified=remote)),patch.object(api.edition,'audit_bundle_edition',return_value=dict(bundle_edition_bound=True)):
   args=dict(repository=self.repo,bundle=self.bundle,receipt=self.receipt,certificate=self.cert,package=self.package,limit=3,destination=self.destination,comment_id=17,commit=self.commit,tree=self.tree);args.update(kwargs)
   return api.audit_launch(**args)
 def test_exact_launch_claim_binds_but_does_not_open_preflight(self):
  proof=self.authorization();self.assertTrue(proof['launch_authorization_bound'],proof)
  self.assertEqual(proof['request'],self.request);self.assertFalse(proof['ready_for_execution']);self.assertFalse(self.destination.exists())
 def test_changed_schedule_limit_destination_or_package_reject(self):
  changed=copy.deepcopy(self.bundle);changed['execution_order'].reverse()
  package=dict(self.package,artifact_bindings={'different':'package'})
  for args in (dict(bundle=changed),dict(limit=4),dict(destination=self.destination.with_name('other')),dict(package=package),dict(comment_id=None)):
   with self.subTest(args=args):self.assertFalse(self.authorization(**args)['launch_authorization_bound'])
  self.assertFalse(self.destination.exists())
 def test_remote_movement_source_race_and_alias_reject(self):
  self.assertFalse(self.authorization(remote=False)['launch_authorization_bound'])
  link=self.root/'data/alias';link.symlink_to(self.root/'data',target_is_directory=True)
  self.assertFalse(self.authorization(destination=link/self.destination.name)['launch_authorization_bound'])
  self.assertFalse(self.authorization(after_read=lambda:(self.root/'unit-source.txt').write_text('source changed'))['launch_authorization_bound'])
 def test_entries_reject_reference_only_before_any_execution(self):
  import proxy_population_attempt_runner as attempt
  import proxy_population_batch_supervisor as supervisor
  from contextlib import ExitStack
  for entry in (attempt,supervisor):
   with self.subTest(entry=entry.__name__),ExitStack() as stack:
    stack.enter_context(patch.object(entry,'ROOT',self.root))
    stack.enter_context(patch.object(entry.external_approval,'require_operation_ready',return_value=None))
    stack.enter_context(patch.object(entry.lock,'verify_git_binding',return_value=dict(immutable_content_verified=True)))
    stack.enter_context(patch.object(entry.edition,'audit_bundle_edition',return_value=dict(bundle_edition_bound=True)))
    stack.enter_context(patch.object(entry.generation_package,'audit_committed_generation',return_value=self.package))
    stack.enter_context(patch.object(entry.remote,'verify',return_value=dict(fresh_remote_head_verified=True)))
    stack.enter_context(patch.object(attempt.connected,'reconstruct',side_effect=AssertionError('no execution')))
    stack.enter_context(patch.object(supervisor.subprocess,'run',side_effect=AssertionError('no child')))
    args=(self.bundle,self.receipt,self.cert,self.repo)
    if entry is attempt:args+=(self.bundle['execution_order'][0],)
    with self.assertRaisesRegex(ValueError,'approval'):entry.run_after_external_approval(*args,3,self.destination,'reference only')
    self.assertFalse(self.destination.exists())
 def test_supervisor_and_worker_recheck_same_claim_before_execution(self):
  import json
  import proxy_population_attempt_runner as attempt
  import proxy_population_batch_supervisor as supervisor
  from contextlib import ExitStack
  get,_,_,pr=replies(self.request);pr['head']['sha']=self.commit
  real=supervisor.subprocess.run;calls=[]
  def child(command,**kwargs):
   if '-I' not in command:return real(command,**kwargs)
   row=json.loads(kwargs['input']);calls.append(row)
   self.assertEqual(row['launch_destination'],str(self.destination));self.assertEqual(row['schedule_index'],1)
   self.assertEqual(row['claim_commit'],self.commit);self.assertEqual(row['comment_id'],17)
   with self.assertRaisesRegex(OSError,'synthetic stop before game'):attempt.run_after_external_approval(**row)
   start=json.loads((self.destination/'attempt-0001/start.json').read_text())
   self.assertTrue(start['external_approval_verified']);self.assertEqual(start['launch_authorization']['request'],self.request)
   raise OSError('synthetic child stop')
  with ExitStack() as stack:
   for module in (api,attempt,supervisor):stack.enter_context(patch.object(module,'ROOT',self.root))
   stack.enter_context(patch.object(approval,'_get',side_effect=get))
   stack.enter_context(patch.object(approval,'require_operation_ready',return_value=None))
   stack.enter_context(patch.object(api.publication.remote,'verify',return_value=dict(fresh_remote_head_verified=True)))
   stack.enter_context(patch.object(api.edition,'audit_bundle_edition',return_value=dict(bundle_edition_bound=True)))
   stack.enter_context(patch.object(attempt.lock,'verify_git_binding',return_value=dict(immutable_content_verified=True)))
   stack.enter_context(patch.object(attempt.generation_package,'audit_committed_generation',return_value=self.package))
   stack.enter_context(patch.object(attempt.connected,'reconstruct',side_effect=OSError('synthetic stop before game'))) 
   stack.enter_context(patch.object(supervisor.subprocess,'run',side_effect=child))
   report=supervisor.run_after_external_approval(self.bundle,self.receipt,self.cert,self.repo,3,self.destination,'synthetic reference',comment_id=17,claim_commit=self.commit,claim_tree=self.tree)
  self.assertEqual(len(calls),1);self.assertEqual(report['not_executed_rows'],399)
  self.assertIn('synthetic child stop',report['planned_rows'][0]['stop_reason']);self.assertFalse(report['ready_for_execution'])
 def test_worker_requires_exact_fixed_row_and_saved_supervisor_claim(self):
  proof=self.authorization();self.destination.mkdir()
  worker=self.destination/'attempt-0001'
  args=dict(destination=worker,launch_destination=self.destination,schedule_index=1,match_id=self.bundle['execution_order'][0])
  self.assertFalse(self.authorization(**args)['launch_authorization_bound'])
  (self.destination/'start.json').write_bytes(approval.canonical(dict(schema='fixed_population_supervisor_start.v1',launch_authorization=proof)))
  self.assertTrue(self.authorization(**args)['launch_authorization_bound'])
  for delta in (dict(schedule_index=True),dict(schedule_index=2),dict(match_id='other'),dict(destination=self.destination/'other')):
   self.assertFalse(self.authorization(**dict(args,**delta))['launch_authorization_bound'])
  worker.mkdir();self.assertFalse(self.authorization(**args)['launch_authorization_bound'])

if __name__=='__main__':unittest.main()
