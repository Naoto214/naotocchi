"""Real (unmocked) gate paths for the checkpoint contract: worker start schema and resume claim chain.

Synthetic local Git and fixture GitHub replies only; never a real approval.
"""
import copy,json,subprocess,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
import proxy_population_external_approval as approval
import proxy_population_approval_publication as publication
import proxy_population_launch_authorization as authorization
from test_proxy_population_external_approval import replies
from proxy_mandatory_policy_contract import canonical


def v3(publication_commit,publication_tree,generation,original=None,previous=None):
 resume=dict(attempt_id='fixed400-'+publication_commit[:12],resume_generation=generation,original_claim=original,previous_claim=previous,
  results_ref=None if generation==0 else dict(branch='fixed400-results/fixed400-'+publication_commit[:12],commit='d'*40,tree='e'*40),
  checkpoint_sha256='f'*64,completed_rows=0 if generation==0 else 3,pending_schedule_indices_sha256='1'*64,parallelism=4,owner_approved_manual_resume=True)
 target=dict(manifest_sha256='2'*64,receipt_sha256='3'*64,execution_binding_sha256='4'*64,binding_receipt_sha256='5'*64,original_package_receipt_sha256='6'*64,
  old_edition=dict(commit='7'*40,tree='8'*40,sha256='9'*64),execution_order=['m'+str(i) for i in range(400)],reconstruction_step_limit=512,automatic_retry_allowed=False,automatic_resume_allowed=False,resume=resume)
 request=dict(schema='population_external_approval_request.v3',repository=approval.REPOSITORY,pull_request=approval.PR,authority_user_id=approval.AUTHORITY,stage='launch',
  edition=dict(commit='a'*40,tree='b'*40,sha256='c'*64),publication=dict(commit=publication_commit,tree=publication_tree),destination='docs/card-game/data/unit-run',
  planned_groups=200,planned_matches=400,contract_sha256={p:'0'*64 for p in approval.CONTRACTS},target=target)
 approval._validate_request(request);return request


class ResumeClaimChainTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.repo=Path(self.tmp.name);self.root=self.repo/'docs/card-game';(self.root/'data').mkdir(parents=True)
  self.git('init','-q');self.git('config','user.name','unit');self.git('config','user.email','unit@example.invalid')
  (self.root/'source.txt').write_text('publication\n');self.git('add','.');self.git('commit','-qm','publication P')
  self.p=self.git('rev-parse','HEAD');self.pt=self.git('rev-parse','HEAD^{tree}')
  self.r0=v3(self.p,self.pt,0);self.c0=self.claim(self.r0,17)
 def git(self,*args):return subprocess.check_output(['git','-c','core.hooksPath=/dev/null','-C',str(self.repo),*args],stderr=subprocess.PIPE).decode().strip()
 def claim(self,request,comment_id):
  """consume_live at the request's pre-claim head, then a claim-only commit."""
  (self.root/'data').mkdir(parents=True,exist_ok=True)
  head=approval.pre_claim_head(request);get,_,_,pr=replies(request,comment_id);pr['head']['sha']=head['commit']
  def fresh(path):
   value=get(path)
   if path=='/pulls/408':value['head']['sha']=head['commit']
   return value
  with patch.object(approval,'ROOT',self.root),patch.object(approval,'_get',side_effect=fresh):approval.consume_live(request,comment_id)
  self.git('add','.');self.git('commit','-qm','claim '+str(comment_id))
  return dict(comment_id=comment_id,commit=self.git('rev-parse','HEAD'),tree=self.git('rev-parse','HEAD^{tree}'))
 def read(self,request,comment_id,claim):return publication._read_committed_claim(self.repo,request,comment_id,claim['commit'],claim['tree'])

 def test_generation_zero_claims_on_the_publication(self):
  binding,_=self.read(self.r0,17,self.c0);self.assertEqual(binding['parent'],self.p)

 def test_resumed_generations_claim_forward_on_the_previous_claim(self):
  r1=v3(self.p,self.pt,1,self.c0,self.c0);c1=self.claim(r1,18)
  binding,saved=self.read(r1,18,c1);self.assertEqual(binding['parent'],self.c0['commit']);self.assertEqual(saved['evidence']['observed_publication_commit'],self.c0['commit'])
  r2=v3(self.p,self.pt,2,self.c0,c1);c2=self.claim(r2,19)
  binding,_=self.read(r2,19,c2);self.assertEqual(binding['parent'],c1['commit'])
  self.assertEqual(publication._require_claim_chain(lambda *a:subprocess.check_output(['git','-C',str(self.repo),*a]),r2,c1['commit']),[self.c0['commit'],c1['commit']])

 def test_resume_claim_on_the_publication_or_after_a_source_change_is_refused(self):
  r1=v3(self.p,self.pt,1,self.c0,self.c0)
  # A resume claim made directly on P (sibling of the original claim) has the wrong parent.
  self.git('checkout','-q','--detach',self.p);sibling=self.claim(v3(self.p,self.pt,0),18)
  with self.assertRaisesRegex(ValueError,'single direct child'):self.read(r1,18,sibling)
  # A non-claim commit inside the chain breaks it.
  self.git('checkout','-q','--detach',self.c0['commit']);(self.root/'source.txt').write_text('changed\n');self.git('commit','-qam','source change')
  moved=dict(comment_id=17,commit=self.git('rev-parse','HEAD'),tree=self.git('rev-parse','HEAD^{tree}'))
  r1b=v3(self.p,self.pt,2,self.c0,moved);c=self.claim(r1b,20)
  with self.assertRaisesRegex(ValueError,'non-claim commit'):self.read(r1b,20,c)

 def test_chain_must_start_at_the_original_claim(self):
  r1=v3(self.p,self.pt,1,self.c0,self.c0);c1=self.claim(r1,18)
  wrong=v3(self.p,self.pt,2,dict(comment_id=18,commit=c1['commit'],tree=c1['tree']),c1);c2=self.claim(wrong,19)
  with self.assertRaisesRegex(ValueError,'start at the original claim'):self.read(wrong,19,c2)


class ResumeClaimChainReviewTests(ResumeClaimChainTests):
 """Review 2bfbe209: a rewound PR branch and a forged chain file are refused."""
 def test_rewound_branch_cannot_claim_a_later_generation(self):
  r1=v3(self.p,self.pt,1,self.c0,self.c0);self.claim(r1,18)
  # PR branch reset back to the original claim; a generation-2 request naming it as previous.
  self.git('checkout','-q','--detach',self.c0['commit'])
  rewound=v3(self.p,self.pt,2,self.c0,self.c0)
  c=self.claim(rewound,19)
  with self.assertRaisesRegex(ValueError,'length differs from the generation'):self.read(rewound,19,c)
  on_publication=v3(self.p,self.pt,2,self.c0,dict(comment_id=17,commit=self.p,tree=self.pt))
  self.git('checkout','-q','--detach',self.p);c=self.claim(on_publication,20)
  with self.assertRaises(ValueError):self.read(on_publication,20,c)

 def test_chain_file_must_be_a_consumption_record_of_this_attempt(self):
  self.git('checkout','-q','--detach',self.c0['commit'])
  (self.root/'data/proxy-population-approval-consumption/99.json').write_text('{}');self.git('add','.');self.git('commit','-qm','forged claim')
  forged=dict(comment_id=99,commit=self.git('rev-parse','HEAD'),tree=self.git('rev-parse','HEAD^{tree}'))
  r2=v3(self.p,self.pt,2,self.c0,forged);c=self.claim(r2,21)
  with self.assertRaisesRegex(ValueError,'not a consumption record'):self.read(r2,21,c)
  # A genuine record of another attempt's request is refused too.
  self.git('checkout','-q','--detach',self.c0['commit'])
  foreign=self.claim(r1_like(self,self.c0),22)
  r2b=v3(self.p,self.pt,2,self.c0,foreign);c=self.claim(r2b,23)
  with self.assertRaisesRegex(ValueError,'another attempt or generation'):self.read(r2b,23,c)


def r1_like(case,c0):
 """A generation-1 request of a different attempt on the same publication commit (wrong attempt id)."""
 r=v3(case.p,case.pt,1,c0,c0);r['target']['resume']['attempt_id']='fixed400-'+'0'*12;r['target']['resume']['results_ref']['branch']='fixed400-results/fixed400-'+'0'*12
 approval._validate_request(r);return r


class WorkerStartSchemaTests(unittest.TestCase):
 """The worker reads the supervisor start record; each contract accepts only its own schema."""
 def audit(self,schema,resume):
  with tempfile.TemporaryDirectory() as d:
   batch=Path(d)/'batch';batch.mkdir();request=dict(test_request=True);claim=dict(binding=dict(commit='c'*40),remote_consumption_bound=True,errors=[])
   start=dict(schema=schema,execution_binding=dict(binding=1),current_preparation=dict(prep=1),resume=resume,launch_authorization=dict(launch_authorization_bound=True,request=request,consumption=dict(binding=dict(commit='c'*40))))
   if resume is None:del start['resume']
   (batch/'start.json').write_bytes(canonical(start))
   with patch.object(authorization,'_prepare_launch',return_value=(request,dict(prep=1))),patch.object(authorization.publication,'audit_committed_consumption',return_value=claim),patch.object(authorization.edition,'verify',return_value=dict(local_edition_verified=True)):
    return authorization.audit_launch(Path(d),{},{},{},None,512,batch/'attempt-0001',1,'c'*40,'d'*40,launch_destination=batch,schedule_index=1,match_id='m',execution_binding=dict(binding=1),resume=resume)
 def test_checkpoint_start_schema_requires_resume_and_vice_versa(self):
  resume=dict(r=1)
  self.assertTrue(self.audit('fixed_population_checkpoint_supervisor_start.v1',resume)['launch_authorization_bound'])
  self.assertTrue(self.audit('fixed_population_supervisor_start.v1',None)['launch_authorization_bound'])
  self.assertFalse(self.audit('fixed_population_supervisor_start.v1',resume)['launch_authorization_bound'])
  self.assertFalse(self.audit('fixed_population_checkpoint_supervisor_start.v1',None)['launch_authorization_bound'])


if __name__=='__main__':unittest.main()
