"""Rebinding authorization boundaries; no production execution."""
import copy,unittest
from pathlib import Path
from unittest.mock import patch
import proxy_population_external_approval as approval
from test_proxy_population_external_approval import certificate as edition
from test_proxy_mandatory_population_input import bundle
class RequestTests(unittest.TestCase):
 def test_v2_request_binds_both_editions_and_exact_proof(self):
  self.assertTrue(hasattr(approval,'rebinding_request'),'rebinding request missing')
  cert=edition();data=bundle();receipt=dict(commit='a'*40,tree='b'*40)
  proof=dict(original_receipt={'commit':'c'*40,'tree':'d'*40},old_edition={'commit':'e'*40,'tree':'f'*40,'sha256':'1'*64},new_edition=approval._edition(cert),derived_manifest_sha256=approval.digest(data),source_delta={'x':'y'})
  context=dict(binding=proof,binding_receipt=receipt)
  request=approval.rebinding_request(data,receipt,cert,context,512,'docs/card-game/data/new-attempt')
  approval.approval_text(request)
  self.assertEqual(request['schema'],'population_external_approval_request.v2')
  self.assertEqual(request['target']['execution_binding_sha256'],approval.digest(proof))
  self.assertEqual(request['target']['original_package_receipt_sha256'],approval.digest(proof['original_receipt']))
  other=copy.deepcopy(request);other['schema']='population_external_approval_request.v1'
  with self.assertRaises(ValueError):approval.approval_text(other)
  for key in ('execution_binding_sha256','binding_receipt_sha256','original_package_receipt_sha256','old_edition'):
   bad=copy.deepcopy(request);bad['target'].pop(key)
   with self.subTest(key=key),self.assertRaises(ValueError):approval.approval_text(bad)
 def test_entries_require_real_binding_before_output_or_reconstruction(self):
  import proxy_population_attempt_runner as attempt
  import proxy_population_batch_supervisor as supervisor
  import tempfile,inspect
  self.assertIn('execution_binding',inspect.signature(attempt.run_after_external_approval).parameters,'binding entry missing')
  for entry in (attempt,supervisor):
   with tempfile.TemporaryDirectory() as d,patch.object(approval,'require_operation_ready',return_value={}),patch.object(entry,'ROOT',Path(d)/'docs/card-game'):
    root=Path(d)/'docs/card-game';(root/'data').mkdir(parents=True);out=root/'data/new'
    args=(bundle(),{}, {},Path(d))
    if entry is attempt:args+=('test-1A',)
    # An unverified boolean cannot be binding evidence; rejection precedes output.
    with self.assertRaisesRegex(ValueError,'binding'):
     entry.run_after_external_approval(*args,512,out,'unit',execution_binding={'verified':True})
    self.assertFalse(out.exists())

import test_proxy_population_launch_authorization as launch_fixtures
class BoundClaimTests(unittest.TestCase):
 git=launch_fixtures.LaunchAuthorizationTests.git
 def setUp(self):
  launch_fixtures.LaunchAuthorizationTests.setUp(self)
  self.git('reset','--hard',self.cert['commit']);(self.root/'data').mkdir(exist_ok=True)
  self.context=dict(binding=dict(original_receipt={'commit':'c'*40,'tree':'d'*40},old_edition={'commit':'e'*40,'tree':'f'*40,'sha256':'1'*64},new_edition=approval._edition(self.cert),derived_manifest_sha256=approval.digest(self.bundle),current_preparation=None),binding_receipt=self.receipt)
  self.request=approval.rebinding_request(self.bundle,self.receipt,self.cert,self.context,512,'docs/card-game/data/unit-destination')
  from test_proxy_population_external_approval import replies
  get,_,_,_=replies(self.request)
  with patch.object(approval,'ROOT',self.root),patch.object(approval,'_get',side_effect=get):approval.consume_live(self.request,17)
  self.git('add','.');self.git('commit','-qm','synthetic v2 claim');self.commit=self.git('rev-parse','HEAD');self.tree=self.git('rev-parse','HEAD^{tree}')
 def authorization(self,**kw):
  import proxy_population_execution_binding as rebinding
  args=dict(limit=512,execution_binding=self.context);args.update(kw)
  # Isolate live claim binding; full immutable reconstruction tested separately.
  with patch.object(rebinding,'audit',return_value=self.context['binding']):
   return launch_fixtures.LaunchAuthorizationTests.authorization(self,**args)
 def test_new_claim_rejects_changed_binding_manifest_and_old_route(self):
  self.assertTrue(self.authorization()['launch_authorization_bound'])
  changed=copy.deepcopy(self.context);changed['binding']['old_edition']['sha256']='0'*64
  self.assertFalse(self.authorization(execution_binding=changed)['launch_authorization_bound'])
  self.assertFalse(self.authorization(execution_binding=None)['launch_authorization_bound'])
  changed=copy.deepcopy(self.bundle);changed['execution_order'].reverse()
  self.assertFalse(self.authorization(bundle=changed)['launch_authorization_bound'])
  self.assertFalse(self.authorization(limit=511)['launch_authorization_bound'])
 def test_worker_cannot_omit_or_replace_supervisor_binding(self):
  proof=self.authorization();self.destination.mkdir();worker=self.destination/'attempt-0001'
  args=dict(destination=worker,launch_destination=self.destination,schedule_index=1,match_id=self.bundle['execution_order'][0])
  saved=dict(schema='fixed_population_supervisor_start.v1',launch_authorization=proof,current_preparation=None)
  (self.destination/'start.json').write_bytes(approval.canonical(saved))
  self.assertFalse(self.authorization(**args)['launch_authorization_bound'])
  saved['execution_binding']=self.context;(self.destination/'start.json').write_bytes(approval.canonical(saved))
  self.assertTrue(self.authorization(**args)['launch_authorization_bound'])
  worker.mkdir();self.assertFalse(self.authorization(**args)['launch_authorization_bound'])
 def test_supervisor_forwards_binding_to_worker_before_game(self):
  import json
  import proxy_population_attempt_runner as attempt
  import proxy_population_batch_supervisor as supervisor
  import proxy_population_launch_authorization as auth
  import proxy_population_execution_binding as binding
  from test_proxy_population_external_approval import replies
  from contextlib import ExitStack
  get,_,_,pr=replies(self.request);pr['head']['sha']=self.commit
  native=supervisor.subprocess.run;seen=[]
  def child(command,**kw):
   if '-I' not in command:return native(command,**kw)
   row=json.loads(kw['input']);seen.append(row)
   self.assertEqual(row['execution_binding'],self.context)
   with self.assertRaisesRegex(OSError,'before game'):attempt.run_after_external_approval(**row)
   saved=json.loads((self.destination/'attempt-0001/start.json').read_text())
   self.assertEqual(saved['execution_binding'],self.context)
   self.assertEqual(saved['launch_authorization']['request'],self.request)
   raise OSError('synthetic child stop')
  with ExitStack() as stack:
   for module in (auth,attempt,supervisor):stack.enter_context(patch.object(module,'ROOT',self.root))
   stack.enter_context(patch.object(approval,'_get',side_effect=get))
   stack.enter_context(patch.object(approval,'require_operation_ready',return_value=None))
   stack.enter_context(patch.object(auth.publication.remote,'verify',return_value={'fresh_remote_head_verified':True}))
   stack.enter_context(patch.object(auth.edition,'audit_bundle_edition',return_value={'bundle_edition_bound':True}))
   stack.enter_context(patch.object(attempt.lock,'verify_git_binding',return_value={'immutable_content_verified':True}))
   stack.enter_context(patch.object(binding,'audit',return_value=self.context['binding']))
   stack.enter_context(patch.object(attempt.connected,'reconstruct',side_effect=OSError('before game')))
   stack.enter_context(patch.object(supervisor.subprocess,'run',side_effect=child))
   result=supervisor.run_after_external_approval(self.bundle,self.receipt,self.cert,self.repo,512,self.destination,'unit',comment_id=17,claim_commit=self.commit,claim_tree=self.tree,execution_binding=self.context)
  self.assertEqual(len(seen),1);self.assertEqual(result['not_executed_rows'],399)
