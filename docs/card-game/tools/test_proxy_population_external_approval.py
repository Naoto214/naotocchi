"""Synthetic GitHub replies only. No live approval, entropy or match start."""
import copy,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
try: import proxy_population_external_approval as api
except ImportError: api=None


def certificate():
 return dict(commit='1'*40,tree='2'*40,files={n:dict(sha256='3'*64) for n in (
  '107-normal-decision-match-protocol.md','463-precommitted-mandatory-policy-detail.md',
  '464-approved-mandatory-policy-contract.md','465-mandatory-boundary-and-population-input.md')})


def request(): return api.generation_request(certificate(),'docs/card-game/data/proposed-only',{'registry_verified':True})


def replies(req,comment_id=17):
 comment=dict(id=comment_id,user=dict(id=323909980,type='User'),
  issue_url='https://api.github.com/repos/Naoto214/naotocchi/issues/259',
  html_url=f'https://github.com/Naoto214/naotocchi/pull/259#issuecomment-{comment_id}',
  body=api.approval_text(req),created_at='2026-10-11T10:00:00Z',updated_at='2026-10-11T10:00:00Z')
 repo=dict(full_name='Naoto214/naotocchi',owner=dict(id=323909980,type='User'))
 pr=dict(number=259,state='open',draft=True,merged=False,
  head=dict(ref='design/card-pool-master-20260914',sha=req['publication']['commit'],repo=dict(full_name='Naoto214/naotocchi')))
 def get(path):
  if path=='': return copy.deepcopy(repo)
  if path=='/pulls/259': return copy.deepcopy(pr)
  if path==f'/issues/comments/{comment_id}': return copy.deepcopy(comment)
  if path=='/issues/259/comments?per_page=100&page=1': return [copy.deepcopy(comment)]
  raise AssertionError(path)
 return get,comment,repo,pr


class ExternalApprovalTests(unittest.TestCase):
 def setUp(self): self.assertIsNotNone(api)
 def test_exact_request_and_live_authority_are_separate_from_readiness(self):
  req=request();get,_,_,_=replies(req)
  with patch.object(api,'_get',side_effect=get) as transport:
   proof=api.verify_live(req,17)
  self.assertTrue(proof['external_approval_verified'],proof)
  self.assertFalse(proof['ready_for_execution']);self.assertFalse(proof['input_lock_verified'])
  self.assertGreaterEqual(transport.call_count,5)
  self.assertEqual(proof['request_sha256'],api.digest(req))
 def test_wrong_author_target_edited_deleted_or_changed_comment_rejects(self):
  req=request()
  mutations=[lambda c,r,p:c['user'].update(id=1),lambda c,r,p:c['user'].update(type='Bot'),
   lambda c,r,p:c.update(id=True),lambda c,r,p:c.update(updated_at='2026-10-11T10:00:01Z'),
   lambda c,r,p:c.update(body=c['body']+' '),lambda c,r,p:c.update(issue_url=c['issue_url'].replace('259','258')),
   lambda c,r,p:p['head'].update(sha='4'*40),lambda c,r,p:p.update(draft=False),
   lambda c,r,p:r['owner'].update(id=9),lambda c,r,p:c.update(created_at='invalid',updated_at='invalid')]
  for mutate in mutations:
   get,c,r,p=replies(req);mutate(c,r,p)
   with patch.object(api,'_get',side_effect=get):self.assertFalse(api.verify_live(req,17)['external_approval_verified'])
  with patch.object(api,'_get',side_effect=OSError('unavailable')):
   self.assertFalse(api.verify_live(req,17)['external_approval_verified'])
  get,_,_,_=replies(req);seen=0
  def changing(path):
   nonlocal seen
   x=get(path)
   if path=='/issues/comments/17':
    seen+=1
    if seen==2:x['body']='changed'
   return x
  with patch.object(api,'_get',side_effect=changing):self.assertFalse(api.verify_live(req,17)['external_approval_verified'])
 def test_revocation_and_pagination_cannot_be_skipped(self):
  req=request();get,c,_,_=replies(req)
  revoked=dict(c,id=18,body=api.revocation_text(req,17))
  def pages(path):
   if path.endswith('page=1'):return [dict(c,id=n,body='unrelated') for n in range(100,200)]
   if path.endswith('page=2'):return [c,revoked]
   return get(path)
  with patch.object(api,'_get',side_effect=pages):self.assertFalse(api.verify_live(req,17)['external_approval_verified'])
  def missing(path):return [] if '/comments?' in path else get(path)
  with patch.object(api,'_get',side_effect=missing):self.assertFalse(api.verify_live(req,17)['external_approval_verified'])
 def test_stages_and_every_bound_input_have_distinct_digests(self):
  req=request();edition=certificate();bundle=dict(groups=[dict(group_id=str(i)) for i in range(200)],execution_order=[str(i) for i in range(400)])
  receipt=dict(commit='4'*40,tree='5'*40);package=dict(committed_generation_consistent=True,artifact_bindings={'manifest.json':dict(sha256='6'*64)})
  launch=api.launch_request(bundle,receipt,edition,package,512,'docs/card-game/data/proposed-run')
  self.assertNotEqual(api.digest(req),api.digest(launch));self.assertNotEqual(api.approval_text(req),api.approval_text(launch))
  for key in ('commit','tree'):
   changed=copy.deepcopy(edition);changed[key]='9'*40
   self.assertNotEqual(api.digest(req),api.digest(api.generation_request(changed,req['destination'],{'registry_verified':True})))
  other=copy.deepcopy(bundle);other['execution_order'].reverse()
  self.assertNotEqual(api.digest(launch),api.digest(api.launch_request(other,receipt,edition,package,512,'docs/card-game/data/proposed-run')))
  for path in ('/tmp/x','docs/card-game/data/../x','docs/card-game/data','docs/card-game/data/x\\y'):
   with self.assertRaisesRegex(ValueError,'invalid CARD GAME destination'):api.generation_request(edition,path,{'registry_verified':True})
  for limit in (True,0,513):
   with self.assertRaises(ValueError):api.launch_request(bundle,receipt,edition,package,limit,'docs/card-game/data/proposed-run')
 def test_request_is_frozen_before_network_reads_and_claim_storage(self):
  req=request();original=copy.deepcopy(req);get,_,_,_=replies(original)
  def mutate(path):
   req['destination']='docs/card-game/data/swapped-after-approval'
   return get(path)
  with tempfile.TemporaryDirectory() as tmp,patch.object(api,'ROOT',Path(tmp)),patch.object(api,'_get',side_effect=mutate):
   (Path(tmp)/'data').mkdir()
   record=api.consume_live(req,17)
   self.assertEqual(record['request'],original)
   self.assertEqual(record['approval']['request_sha256'],api.digest(original))

 def test_transport_is_pinned_bounded_and_rejects_redirects(self):
  from types import SimpleNamespace
  from unittest.mock import MagicMock
  with self.assertRaises(ValueError):api.transport._read_once('/issues/comments/17?redirect=https://other.invalid')
  with self.assertRaises(ValueError):api.transport._NoRedirect().redirect_request(None,None,None,None,None,None)
  response=MagicMock();response.__enter__.return_value=response
  response.status=200;response.geturl.return_value=api.API;response.read.return_value=b'{"ok":true}'
  opener=SimpleNamespace(open=MagicMock(return_value=response))
  with patch.object(api.transport,'build_opener',return_value=opener):
   self.assertEqual(api.transport._read_once(''),{'ok':True})
   req=opener.open.call_args.args[0]
   self.assertEqual(req.full_url,api.API);self.assertEqual(opener.open.call_args.kwargs['timeout'],30)
   response.read.assert_called_with(8*1024*1024+1)
   response.read.return_value=b'{"duplicate":1,"duplicate":2}'
   with self.assertRaises(ValueError):api.transport._read_once('')
   response.geturl.return_value='https://other.invalid'
   with self.assertRaises(ValueError):api.transport._read_once('')

 def test_local_claim_is_exclusive_but_not_a_remote_consumption_proof(self):
  req=request();get,_,_,_=replies(req)
  with tempfile.TemporaryDirectory() as tmp,patch.object(api,'ROOT',Path(tmp)),patch.object(api,'_get',side_effect=get):
   (Path(tmp)/'data').mkdir()
   first=api.consume_live(req,17)
   self.assertTrue(first['local_consumption_recorded']);self.assertFalse(first['remote_consumption_verified'])
   with self.assertRaises(FileExistsError):api.consume_live(req,17)
   self.assertEqual(len(list((Path(tmp)/'data/proxy-population-approval-consumption').glob('*.json'))),1)
 def test_operational_gate_cannot_use_a_string_or_verified_comment_as_readiness(self):
  import proxy_population_generation_entry as gen
  import proxy_population_attempt_runner as attempt
  import proxy_population_batch_supervisor as supervisor
  native=supervisor.subprocess.run
  def no_worker(command,**kwargs):
   if '-I' in command:raise AssertionError('no child')
   return native(command,**kwargs) # Read-only Git edition queries are allowed.
  with patch.object(gen.os,'urandom',side_effect=AssertionError('no entropy')),patch.object(attempt.connected,'reconstruct',side_effect=AssertionError('no match')),patch.object(supervisor.subprocess,'run',side_effect=no_worker):
   for call in (lambda:gen.generate_after_external_approval(gen.ROOT.parents[1],'1'*40,gen.ROOT/'data'/'never-auth-generated','looks-approved'),
    lambda:attempt.run_after_external_approval({}, {}, {},attempt.ROOT.parents[1],'test',3,attempt.ROOT/'data'/'never-auth-run','looks-approved'),
    lambda:supervisor.run_after_external_approval({}, {}, {},supervisor.ROOT.parents[1],3,supervisor.ROOT/'data'/'never-auth-batch','looks-approved')):
    with self.assertRaisesRegex(ValueError,'preflight'):call()

if __name__=='__main__':unittest.main()
