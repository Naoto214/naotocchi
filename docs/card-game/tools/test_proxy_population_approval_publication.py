"""Synthetic local Git + mocked fresh reads; never consume a real approval."""
import copy,json,subprocess,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
import proxy_population_external_approval as approval
from test_proxy_population_external_approval import certificate,replies
try:import proxy_population_approval_publication as api
except ImportError:api=None

class ApprovalPublicationTests(unittest.TestCase):
 def setUp(self):
  self.assertIsNotNone(api)
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.repo=Path(self.tmp.name);self.root=self.repo/'docs/card-game';(self.root/'data').mkdir(parents=True)
  self.git('init','-q');self.git('config','user.name','conditional unit');self.git('config','user.email','unit@example.invalid')
  (self.root/'unit-source.txt').write_text('fixed local test source\n');self.git('add','.');self.git('commit','-qm','synthetic source')
  cert=certificate();cert.update(commit=self.git('rev-parse','HEAD'),tree=self.git('rev-parse','HEAD^{tree}'))
  self.request=approval.generation_request(cert,'docs/card-game/data/unit-destination',{'registry_verified':True})
  get,_,_,_=replies(self.request)
  with patch.object(approval,'ROOT',self.root),patch.object(approval,'_get',side_effect=get):self.record=approval.consume_live(self.request,17)
  self.path=self.root/'data/proxy-population-approval-consumption/17.json'
  self.git('add','.');self.git('commit','-qm','synthetic claim');self.commit=self.git('rev-parse','HEAD');self.tree=self.git('rev-parse','HEAD^{tree}')
 def git(self,*args):return subprocess.check_output(['git','-c','core.hooksPath=/dev/null','-C',str(self.repo),*args],stderr=subprocess.PIPE).decode().strip()
 def check(self,request=None,commit=None,tree=None,remote=True,change=None):
  req=request or self.request;get,_,_,_=replies(req);head=commit or self.commit
  def fresh(path):
   value=get(path)
   if path=='/pulls/408':value['head']['sha']=head
   if change:change(path,value)
   return value
  with patch.object(approval,'_get',side_effect=fresh),patch.object(api.remote,'verify',return_value=dict(fresh_remote_head_verified=remote)):
   return api.audit_committed_consumption(self.repo,req,17,head,tree or self.tree)
 def test_only_claim_child_is_bound_to_current_comment_and_remote(self):
  proof=self.check();self.assertTrue(proof['remote_consumption_bound'],proof)
  self.assertTrue(proof['external_approval_verified']);self.assertFalse(proof['pre_outcome_ordering_verified']);self.assertFalse(proof['remote_rollback_absence_proven']);self.assertFalse(proof['ready_for_execution'])
  # Ordinary pre-consumption verifier must not accept an arbitrary new HEAD.
  get,_,_,pr=replies(self.request);pr['head']['sha']=self.commit
  with patch.object(approval,'_get',side_effect=get):self.assertFalse(approval.verify_live(self.request,17)['external_approval_verified'])
 def test_extra_source_change_wrong_parent_and_tree_are_rejected(self):
  (self.root/'unit-source.txt').write_text('changed\n');self.git('add','.');self.git('commit','--amend','--no-edit','-q')
  self.assertFalse(self.check(commit=self.git('rev-parse','HEAD'),tree=self.git('rev-parse','HEAD^{tree}'))['remote_consumption_bound'])
  self.git('reset','--hard',self.commit);(self.root/'extra.txt').write_text('extra\n');self.git('add','.');self.git('commit','-qm','another child')
  self.assertFalse(self.check(commit=self.git('rev-parse','HEAD'),tree=self.git('rev-parse','HEAD^{tree}'))['remote_consumption_bound'])
  self.assertFalse(self.check(tree='0'*40)['remote_consumption_bound'])
 def test_saved_request_or_comment_metadata_cannot_be_replaced(self):
  for mode in ('request','author','body','claim_status','saved_head','saved_ready'):
   self.git('reset','--hard',self.commit);row=copy.deepcopy(self.record)
   if mode=='request':row['request']['destination']='docs/card-game/data/other'
   elif mode=='author':row['approval']['evidence']['comment']['user']['id']=1
   elif mode=='body':row['approval']['evidence']['comment']['body']='forged'
   elif mode=='saved_head':row['approval']['evidence']['observed_publication_commit']='0'*40
   elif mode=='saved_ready':row['approval']['ready_for_execution']=True
   else:row['local_consumption_recorded']=False
   self.path.write_bytes(approval.canonical(row));self.git('add','.');self.git('commit','--amend','--no-edit','-q')
   self.assertFalse(self.check(commit=self.git('rev-parse','HEAD'),tree=self.git('rev-parse','HEAD^{tree}'))['remote_consumption_bound'],mode)
 def test_later_revocation_remote_movement_and_other_request_reject(self):
  self.assertFalse(self.check(remote=False)['remote_consumption_bound'])
  other=copy.deepcopy(self.request);other['destination']='docs/card-game/data/other'
  self.assertFalse(self.check(request=other)['remote_consumption_bound'])
  def revoked(path,value):
   if isinstance(value,list):value.append(dict(value[0],id=18,body=approval.revocation_text(self.request,17)))
  self.assertFalse(self.check(change=revoked)['remote_consumption_bound'])
 def test_local_claim_reader_also_rejects_false_owner_or_body(self):
  for kind in ('author','body'):
   self.git('reset','--hard',self.commit);row=copy.deepcopy(self.record)
   if kind=='author':row['approval']['evidence']['comment']['user']['id']=1
   else:row['approval']['evidence']['comment']['body']='not the approved request'
   self.path.write_bytes(approval.canonical(row));self.git('add','.');self.git('commit','--amend','--no-edit','-q')
   with self.assertRaises(ValueError):api._read_committed_claim(self.repo,self.request,17,self.git('rev-parse','HEAD'),self.git('rev-parse','HEAD^{tree}'))
 def test_local_claim_saved_scope_cannot_inflate(self):
  for key in ('provenance_verified','historical_edit_absence_proven','pre_outcome_ordering_verified','balance_admitted'):
   self.git('reset','--hard',self.commit);row=copy.deepcopy(self.record);row['approval'][key]=True
   self.path.write_bytes(approval.canonical(row));self.git('add','.');self.git('commit','--amend','--no-edit','-q')
   with self.assertRaises(ValueError):api._read_committed_claim(self.repo,self.request,17,self.git('rev-parse','HEAD'),self.git('rev-parse','HEAD^{tree}'))
 def test_noncanonical_claim_and_second_claim_file_cannot_hide_in_commit(self):
  self.path.write_text(json.dumps(self.record));self.git('add','.');self.git('commit','--amend','--no-edit','-q')
  self.assertFalse(self.check(commit=self.git('rev-parse','HEAD'),tree=self.git('rev-parse','HEAD^{tree}'))['remote_consumption_bound'])
  self.git('reset','--hard',self.commit);(self.path.parent/'18.json').write_bytes(approval.canonical(self.record));self.git('add','.');self.git('commit','--amend','--no-edit','-q')
  self.assertFalse(self.check(commit=self.git('rev-parse','HEAD'),tree=self.git('rev-parse','HEAD^{tree}'))['remote_consumption_bound'])

if __name__=='__main__':unittest.main()
