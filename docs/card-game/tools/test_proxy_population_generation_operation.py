"""Synthetic saved operation; repeated old115 bytes, no OS generation or games."""
import copy,unittest
import test_proxy_population_generation_package as fixtures
import proxy_population_generation_operation as api
from proxy_population_generation_journal import audit_journal_bytes

class OperationTests(unittest.TestCase):
 git=classmethod(fixtures.PackageTests.git.__func__)
 @classmethod
 def setUpClass(cls):fixtures.PackageTests.setUpClass.__func__(cls)
 @classmethod
 def tearDownClass(cls):cls.temp.cleanup()
 def check(self,operation=None,completion=None,receipt=None):
  self.git('reset','--hard',self.receipt['commit'])
  body=(self.directory/'sampling-journal.jsonl').read_bytes()
  return api.audit(self.repo,receipt or self.receipt,self.certificate,self.registry,operation or self.operation,completion or self.completion,self.material,body,audit_journal_bytes(body,self.material))
 def test_saved_claim_operation_completion_join_is_not_os_origin_proof(self):
  r=self.check();self.assertTrue(r['operation_records_bound'],r)
  for flag in ('provenance_verified','external_approval_verified','input_lock_verified','pre_outcome_ordering_verified','ready_for_execution'):self.assertFalse(r[flag])
 def test_changed_metadata_request_and_observation_reject(self):
  for kind in ('api','request','author','remote','scope'):
   op=copy.deepcopy(self.operation)
   if kind=='api':op['api']='other'
   elif kind=='request':op['generation_authorization']['request']['destination']='docs/card-game/data/other'
   elif kind=='author':op['generation_authorization']['consumption']['live_approval']['evidence']['comment']['user']['id']=1
   elif kind=='remote':op['remote_publication_observation']['observed_commit']='0'*40
   else:op['generation_authorization']['consumption']['ready_for_execution']=True
   self.assertFalse(self.check(operation=op)['operation_records_bound'],kind)
 def test_nested_observation_identity_and_scope_inflation_reject(self):
  for section,fields in (
   ('remote',{'schema':'wrong','remote':'https://example.invalid/other.git','ref':'refs/heads/other','commit':'0'*40,'errors':['failed'],'ready_for_execution':True,'provenance_verified':True}),
   ('live',{'schema':'wrong','ready_for_execution':True,'provenance_verified':True,'input_lock_verified':True,'historical_edit_absence_proven':True,'pre_outcome_ordering_verified':True,'balance_admitted':True}),
   ('claim',{'balance_admitted':True}),('auth',{'balance_admitted':True})):
   for key,value in fields.items():
    op=copy.deepcopy(self.operation);auth=op['generation_authorization'];claim=auth['consumption']
    target=claim['remote_publication'] if section=='remote' else claim['live_approval'] if section=='live' else claim if section=='claim' else auth
    target[key]=value
    if section=='remote':op['remote_publication_observation']=copy.deepcopy(target)
    self.assertFalse(self.check(operation=op)['operation_records_bound'],(section,key))
 def test_completion_counts_journal_and_permission_cannot_change(self):
  for field,value in (('actual_os_read_calls',1),('returned_byte_count',0),('planned_matches',399),('completed_local_generation',False),('new_matches',1),('ready_for_execution',True),('collection',{}),('journal',{})):
   c=copy.deepcopy(self.completion);c[field]=value
   self.assertFalse(self.check(completion=c)['operation_records_bound'],field)
 def test_changed_package_parent_or_extra_outputs_reject(self):
  self.git('reset','--hard',self.receipt['commit']);(self.directory/'extra.json').write_text('{}');self.git('add','.');self.git('commit','--amend','--no-edit','-q')
  receipt=dict(self.receipt,commit=self.git('rev-parse','HEAD'),tree=self.git('rev-parse','HEAD^{tree}'))
  self.assertFalse(self.check(receipt=receipt)['operation_records_bound'])
  self.git('reset','--hard',self.receipt['commit']);self.git('commit','--allow-empty','-m','later publication')
  receipt=dict(self.receipt,commit=self.git('rev-parse','HEAD'),tree=self.git('rev-parse','HEAD^{tree}'))
  self.assertFalse(self.check(receipt=receipt)['operation_records_bound'])

if __name__=='__main__':unittest.main()
