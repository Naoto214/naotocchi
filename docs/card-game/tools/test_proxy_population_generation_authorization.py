"""Real local edition/claim binding; synthetic comments, no OS material or games."""
import copy,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
import proxy_population_external_approval as approval
import proxy_population_execution_edition as edition
import test_proxy_population_approval_publication as fixtures
from test_proxy_population_external_approval import replies
try:import proxy_population_generation_authorization as api
except ImportError:api=None

class GenerationAuthorizationTests(unittest.TestCase):
 git=fixtures.ApprovalPublicationTests.git
 def setUp(self):
  fixtures.ApprovalPublicationTests.setUp(self)
  self.assertIsNotNone(api,'generation authorization integration missing')
  self.git('reset','--hard',self.request['publication']['commit'])
  for name in approval.CONTRACTS:(self.root/name).write_text('synthetic pinned contract '+name)
  self.git('add','.');self.git('commit','-qm','synthetic edition')
  self.cert=edition.capture(self.repo,self.git('rev-parse','HEAD'))
  (self.root/'data').mkdir(exist_ok=True)
  self.registry=dict(registry_verified=True,known_shuffle_seeds=[],order_pairs=[])
  self.destination=self.root/'data/unit-destination'
  self.request=approval.generation_request(self.cert,'docs/card-game/data/unit-destination',self.registry)
  get,_,_,_=replies(self.request)
  with patch.object(approval,'ROOT',self.root),patch.object(approval,'_get',side_effect=get):self.record=approval.consume_live(self.request,17)
  self.git('add','.');self.git('commit','-qm','synthetic new claim');self.commit=self.git('rev-parse','HEAD');self.tree=self.git('rev-parse','HEAD^{tree}')
 def authorization(self,remote_verified=True,after_read=None,**kwargs):
  get,_,_,_=replies(self.request)
  def fresh(path):
   value=get(path)
   if path=='/pulls/259':value['head']['sha']=self.commit
   if after_read:after_read()
   return value
  with patch.object(api,'ROOT',self.root),patch.object(approval,'_get',side_effect=fresh),patch.object(api.publication.remote,'verify',return_value=dict(fresh_remote_head_verified=remote_verified)):
   args=dict(repository=self.repo,certificate=self.cert,registry=self.registry,destination=self.destination,comment_id=17,commit=self.commit,tree=self.tree);args.update(kwargs)
   return api.audit_generation(**args)
 def test_current_edition_registry_destination_and_live_claim_join(self):
  proof=self.authorization();self.assertTrue(proof['generation_authorization_bound'],proof)
  self.assertEqual(proof['request'],self.request)
  self.assertFalse(proof['ready_for_input_generation']);self.assertFalse(proof['ready_for_execution']);self.assertFalse(proof['provenance_verified'])
  self.assertFalse(self.destination.exists())
 def test_changed_edition_registry_destination_reject_before_creation(self):
  other=copy.deepcopy(self.registry);other['known_shuffle_seeds']=['changed']
  for kwargs in (dict(registry=other),dict(destination=self.root/'data/another'),dict(comment_id=18)):
   with self.subTest(kwargs=kwargs):self.assertFalse(self.authorization(**kwargs)['generation_authorization_bound'])
  (self.root/'unit-source.txt').write_text('unsaved source mutation')
  self.assertFalse(self.authorization()['generation_authorization_bound']);self.assertFalse(self.destination.exists())
 def test_existing_destination_and_symlink_alias_reject(self):
  self.destination.mkdir();self.assertFalse(self.authorization()['generation_authorization_bound']);self.destination.rmdir()
  link=self.root/'data/alias';link.symlink_to(self.root/'data',target_is_directory=True)
  self.assertFalse(self.authorization(destination=link/'unit-destination')['generation_authorization_bound'])
 def test_generation_entry_reference_alone_never_reaches_entropy(self):
  import proxy_population_generation_entry as entry
  import proxy_population_contract as contract
  fixture=contract.load_json(contract.ROOT/'data/proxy-fixtures-107/fixture-107-normal-decision-a-first.json')
  with patch.object(entry,'ROOT',self.root),patch.object(entry.external_approval,'require_operation_ready',return_value=None),patch.object(entry.edition,'capture',return_value=self.cert),patch.object(entry.remote,'verify',return_value=dict(fresh_remote_head_verified=True)),patch.object(entry.history,'build_cutoff_registry',return_value=self.registry),patch.object(entry,'load_json',return_value=fixture),patch.object(entry.os,'urandom',side_effect=ValueError('test reached entropy')):
   with self.assertRaisesRegex(ValueError,'approval'):entry.generate_after_external_approval(self.repo,self.cert['commit'],self.destination,'reference-only')
  self.assertFalse(self.destination.exists())
 def test_generation_entry_records_exact_claim_before_first_entropy_attempt(self):
  import json
  import proxy_population_generation_entry as entry
  import proxy_population_contract as contract
  fixture=contract.load_json(contract.ROOT/'data/proxy-fixtures-107/fixture-107-normal-decision-a-first.json')
  get,_,_,pr=replies(self.request);pr['head']['sha']=self.commit
  def interrupted(size):
   operation=json.loads((self.destination/'operation.json').read_text())
   self.assertTrue(operation['external_approval_verified'])
   self.assertEqual(operation['generation_authorization']['request'],self.request)
   self.assertEqual(operation['generation_authorization']['consumption']['binding']['commit'],self.commit)
   self.assertFalse(operation['provenance_verified']);self.assertFalse(operation['ready_for_execution'])
   raise OSError('synthetic stop before returning any bytes')
  with patch.object(api,'ROOT',self.root),patch.object(entry,'ROOT',self.root),patch.object(entry.external_approval,'require_operation_ready',return_value=None),patch.object(approval,'_get',side_effect=get),patch.object(api.publication.remote,'verify',return_value=dict(fresh_remote_head_verified=True)),patch.object(entry.history,'build_cutoff_registry',return_value=self.registry),patch.object(entry,'load_json',return_value=fixture),patch.object(entry.os,'urandom',side_effect=interrupted):
   with self.assertRaisesRegex(OSError,'synthetic stop'):entry.generate_after_external_approval(self.repo,self.cert['commit'],self.destination,'synthetic reference',comment_id=17,claim_commit=self.commit,claim_tree=self.tree)
  self.assertFalse((self.destination/'material.json').exists());self.assertFalse((self.destination/'manifest.json').exists())
 def test_source_change_during_live_reads_rejects(self):
  proof=self.authorization(after_read=lambda:(self.root/'unit-source.txt').write_text('changed during live check'))
  self.assertFalse(proof['generation_authorization_bound']);self.assertFalse(self.destination.exists())
 def test_remote_movement_rejects_generation_binding(self):
  proof=self.authorization(remote_verified=False)
  self.assertFalse(proof['generation_authorization_bound']);self.assertIn('fresh consumption publication differs',str(proof['errors']));self.assertFalse(self.destination.exists())
 def test_unverified_registry_and_wrong_repository_reject(self):
  self.assertFalse(self.authorization(registry={'registry_verified':False})['generation_authorization_bound'])
  with tempfile.TemporaryDirectory() as other:self.assertFalse(self.authorization(repository=Path(other))['generation_authorization_bound'])

if __name__=='__main__':unittest.main()
