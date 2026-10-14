"""Synthetic observations only; no production approval or game execution."""
import copy,json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError,URLError
import proxy_population_external_approval as api
from test_proxy_population_external_approval import request,replies

class Clock:
 def __init__(self):self.now=0;self.waits=[]
 def monotonic(self):return self.now
 def sleep(self,seconds):self.waits.append(seconds);self.now+=seconds

class ReadRetryTests(unittest.TestCase):
 def observe(self,get,req=None,clock=None):
  clock=clock or Clock()
  with patch.object(api,'_get',side_effect=get),patch.object(api,'monotonic',clock.monotonic,create=True),patch.object(api,'sleep',clock.sleep,create=True):
   return api.verify_live(req or request(),17),clock
 def test_transient_failures_restart_all_reads_without_mixing(self):
  req=request();original=copy.deepcopy(req);get,c,r,p=replies(req);calls=[];attempt=0
  def read(path):
   nonlocal attempt
   calls.append(path)
   if path=='':attempt+=1
   if path.endswith('page=1') and attempt==1:raise HTTPError(api.API+path,502,'synthetic',{},None)
   value=get(path)
   if path=='':value['observation']=attempt
   req['destination']='docs/card-game/data/changed-caller'
   return value
  proof,clock=self.observe(read,req)
  self.assertTrue(proof['external_approval_verified'],proof)
  self.assertEqual(clock.waits,[2]);self.assertEqual(calls.count(''),2)
  self.assertEqual(proof['request_sha256'],api.digest(original))
  self.assertEqual(proof['evidence']['repository_sha256'],api.digest(dict(r,observation=2)))
  self.assertEqual(proof['read_audit']['outcome'],'verified')
  self.assertEqual([x['outcome'] for x in proof['read_audit']['observations']],['retry','verified'])
  row=proof['read_audit']['observations'][0]['reads'][-1]
  self.assertEqual((row['endpoint'],row['attempt'],row['http_status']),(api.API+'/issues/259/comments?per_page=100&page=1',1,502))
  for key in ('started_at','finished_at','reason'):self.assertTrue(row[key])
 def test_exact_retryable_failures_and_three_attempt_limit(self):
  for failure in [HTTPError(api.API,code,'synthetic',{},None) for code in (502,503,504)]+[TimeoutError('timed out'),URLError(TimeoutError('timed out'))]:
   calls=[]
   def read(path):calls.append(path);raise failure
   proof,clock=self.observe(read)
   self.assertFalse(proof['external_approval_verified']);self.assertIsNone(proof['evidence'])
   self.assertEqual(calls,['']*3);self.assertEqual(clock.waits,[2,5]);self.assertEqual(proof['read_audit']['outcome'],'attempt_limit')
 def test_nontransport_failures_never_retry(self):
  for failure in [HTTPError(api.API,c,'synthetic',{},None) for c in (301,302,401,403,404,429,500)]+[ValueError('invalid JSON'),OSError('connection reset'),URLError('not a timeout')]:
   calls=[]
   def read(path):calls.append(path);raise failure
   proof,clock=self.observe(read)
   self.assertFalse(proof['external_approval_verified']);self.assertEqual(calls,['']);self.assertEqual(clock.waits,[])
 def test_changed_head_revocation_edit_and_missing_listing_after_retry_fail_closed(self):
  for mutation in ('head','revoke','edit','missing'):
   req=request();get,c,r,p=replies(req);attempt=0
   def read(path):
    nonlocal attempt
    if path=='':attempt+=1
    if attempt==1 and path.endswith('page=1'):raise TimeoutError('synthetic')
    if attempt==2:
     if mutation=='head':p['head']['sha']='9'*40
     if mutation=='edit':c['updated_at']='2026-10-11T10:00:01Z'
     if path.endswith('page=1') and mutation=='revoke':return [c,dict(c,id=18,body=api.revocation_text(req,17))]
     if path.endswith('page=1') and mutation=='missing':return []
    return get(path)
   proof,clock=self.observe(read,req)
   self.assertFalse(proof['external_approval_verified'],mutation);self.assertIsNone(proof['evidence']);self.assertEqual(attempt,2);self.assertEqual(clock.waits,[2])
 def test_owner_mismatch_is_not_hidden_by_later_transport_failure(self):
  req=request();get,c,r,p=replies(req);r['owner']['id']=1;calls=[]
  def read(path):
   calls.append(path)
   if path=='/pulls/259':raise TimeoutError('later failure')
   return get(path)
  proof,clock=self.observe(read,req)
  self.assertEqual(calls,['']);self.assertEqual(clock.waits,[]);self.assertFalse(proof['external_approval_verified'])
 def test_known_revocation_or_listing_mismatch_precedes_next_page_failure(self):
  for mode in ('revoked','edited'):
   req=request();get,c,_,_=replies(req);calls=[]
   def read(path):
    calls.append(path)
    if path.endswith('page=1'):
     bad=dict(c,id=18,body=api.revocation_text(req,17)) if mode=='revoked' else dict(c,body='changed')
     return [bad]+[dict(c,id=i,body='unrelated') for i in range(100,199)]
    if path.endswith('page=2'):raise TimeoutError('later failure')
    return get(path)
   proof,clock=self.observe(read,req)
   self.assertFalse(proof['external_approval_verified']);self.assertEqual(clock.waits,[])
   self.assertFalse(any(x.endswith('page=2') for x in calls))
 def test_deadline_cannot_sleep_or_accept_late_success(self):
  for elapsed,success in ((119,False),(120,True)):
   clock=Clock();get,_,_,_=replies(request());calls=[]
   def read(path):
    calls.append(path);clock.now=elapsed
    if not success:raise TimeoutError('late failure')
    return get(path)
   proof,_=self.observe(read,clock=clock)
   self.assertFalse(proof['external_approval_verified']);self.assertEqual(clock.waits,[])
   self.assertEqual(proof['read_audit']['outcome'],'deadline');self.assertEqual(calls,[''])
 def test_claim_is_written_once_after_recovery_and_failure_retains_audit(self):
  req=request();get,_,_,_=replies(req);calls=0;clock=Clock()
  def read(path):
   nonlocal calls
   calls+=1
   if calls==1:raise TimeoutError('synthetic')
   return get(path)
  with tempfile.TemporaryDirectory() as tmp,patch.object(api,'ROOT',Path(tmp)),patch.object(api,'_get',side_effect=read),patch.object(api,'sleep',clock.sleep,create=True),patch.object(api,'monotonic',clock.monotonic,create=True):
   (Path(tmp)/'data').mkdir();record=api.consume_live(req,17)
   self.assertEqual(len(list(Path(tmp).rglob('17.json'))),1)
   self.assertEqual(record['approval']['read_audit']['outcome'],'verified')
   with self.assertRaisesRegex(FileExistsError,'read_audit'):api.consume_live(req,17)
  with patch.object(api,'_get',side_effect=TimeoutError('synthetic')),patch.object(api,'sleep',clock.sleep,create=True),patch.object(api,'monotonic',clock.monotonic,create=True):
   with self.assertRaisesRegex(ValueError,'read_audit.*attempt_limit'):api.consume_live(req,17)

import test_proxy_population_generation_authorization as generation_tests
class GenerationAuditTests(unittest.TestCase):
 git=generation_tests.GenerationAuthorizationTests.git
 setUp=generation_tests.GenerationAuthorizationTests.setUp
 def test_late_generation_gate_preserves_approval_reads(self):
  result=generation_tests.GenerationAuthorizationTests.authorization(self,after_read=lambda:(self.root/'unit-source.txt').write_text('changed'))
  self.assertFalse(result['generation_authorization_bound']);self.assertIn('read_audit',str(result['errors']))

class TransportTests(unittest.TestCase):
 def test_historical_binding_retains_redirect_refusal_without_retry(self):
  import proxy_population_execution_binding as binding
  from unittest.mock import MagicMock
  response=MagicMock();response.__enter__.return_value=response
  response.status=200;response.geturl.return_value=api.API+'/git/commits/'+'a'*40
  response.read.return_value=b'{"sha":"synthetic"}'
  with patch.object(binding,'build_opener') as opener:
   opener.return_value.open.return_value=response
   self.assertEqual(binding.read_remote_commit('a'*40),{'sha':'synthetic'})
   self.assertEqual(opener.call_count,1)
   with self.assertRaises(ValueError):opener.call_args.args[0].redirect_request(None,None,None,None,None,None)
 def test_observed_http_status_survives_invalid_json_and_redirect(self):
  from unittest.mock import MagicMock
  from types import SimpleNamespace
  t=api.transport
  response=MagicMock();response.__enter__.return_value=response
  response.status=200;response.geturl.return_value=t.API;response.read.return_value=b'{bad JSON'
  with patch.object(t,'build_opener') as opener:
   opener.return_value.open.return_value=response
   with self.assertRaises(ValueError) as raised:t._read_once('')
   self.assertEqual(getattr(raised.exception,'http_status',None),200)
  with self.assertRaises(ValueError) as raised:t._NoRedirect().redirect_request(None,None,302,None,None,None)
  self.assertEqual(getattr(raised.exception,'http_status',None),302)
  with patch.object(t.subprocess,'run',return_value=SimpleNamespace(returncode=0,stdout=b'{"kind":"invalid","reason":"bad JSON","http_status":200}')) as run:
   proof=api.verify_live(request(),17)
  self.assertEqual(run.call_count,1);self.assertFalse(proof['external_approval_verified'])
  self.assertEqual(proof['read_audit']['observations'][0]['reads'][0]['http_status'],200)
 def test_actual_stalled_read_child_is_terminated(self):
  import subprocess,sys,time
  real=subprocess.run;began=time.monotonic()
  def stalled(command,**kwargs):return real([sys.executable,'-I','-c','import time;time.sleep(10)'],**kwargs)
  with patch.object(api.transport.subprocess,'run',side_effect=stalled) as runner:
   with self.assertRaises(TimeoutError):api.transport.read('',0.1)
  self.assertEqual(runner.call_count,1);self.assertLess(time.monotonic()-began,3)
 def test_reader_is_time_bounded_and_has_no_retry(self):
  import subprocess
  from types import SimpleNamespace
  t=api.transport
  for status in (502,503,504,401,302):
   with patch.object(t.subprocess,'run',return_value=SimpleNamespace(returncode=0,stdout=json.dumps(dict(kind='http',status=status)).encode())) as run:
    with self.assertRaises(HTTPError) as raised:t.read('/pulls/259',7)
    self.assertEqual(raised.exception.code,status);self.assertEqual(run.call_count,1);self.assertEqual(run.call_args.kwargs['timeout'],7)
  with patch.object(t.subprocess,'run',side_effect=subprocess.TimeoutExpired('reader',0.01)) as run:
   with self.assertRaises(TimeoutError):t.read('',0.01)
   self.assertEqual(run.call_count,1)
  with patch.object(t.subprocess,'run') as run:
   for path in ('/git/refs','/pulls/259?x=1','https://other.invalid'):
    with self.assertRaises(ValueError):t.read(path,30)
   run.assert_not_called()
 def test_total_deadline_reaches_transport_and_malformed_json_is_terminal(self):
  clock=Clock();get,_,_,_=replies(request());budgets=[]
  def read(path,timeout):
   budgets.append(timeout);clock.now+=29
   return get(path)
  with patch.object(api.transport,'read',side_effect=read),patch.object(api,'monotonic',clock.monotonic),patch.object(api,'sleep',clock.sleep):proof=api.verify_live(request(),17)
  self.assertFalse(proof['external_approval_verified']);self.assertEqual(budgets,[30,30,30,30,4]);self.assertEqual(clock.waits,[])
  from types import SimpleNamespace
  with patch.object(api.transport.subprocess,'run',return_value=SimpleNamespace(returncode=0,stdout=b'{bad JSON')) as run:
   proof=api.verify_live(request(),17)
  self.assertFalse(proof['external_approval_verified']);self.assertEqual(run.call_count,1)

import test_proxy_population_launch_authorization as launch_tests
class PrevalidationTests(unittest.TestCase):
 git=launch_tests.LaunchAuthorizationTests.git
 setUp=launch_tests.LaunchAuthorizationTests.setUp
 def test_same_supervisor_read_recovery_dispatches_one_worker_and_keeps_schedule(self):
  clock=Clock();original_replies=launch_tests.replies;observations=[]
  def fixture(req):
   get,c,r,p=original_replies(req)
   def read(path):
    if path=='':
     observations.append(path)
     if len(observations) in (1,3):raise TimeoutError('synthetic read stall')
    return get(path)
   return read,c,r,p
  with patch.object(launch_tests,'replies',side_effect=fixture),patch.object(api,'sleep',clock.sleep),patch.object(api,'monotonic',clock.monotonic),patch.object(api,'consume_live',side_effect=AssertionError('no reconsumption')):
   # Existing real supervisor and attempt guards; mock worker stops before game.
   launch_tests.LaunchAuthorizationTests.test_supervisor_and_worker_recheck_same_claim_before_execution(self)
  self.assertEqual(len(observations),4);self.assertEqual(clock.waits,[2,2])
 def test_later_gate_failure_retains_successful_read_audit(self):
  result=launch_tests.LaunchAuthorizationTests.authorization(self,remote=False)
  self.assertFalse(result['launch_authorization_bound']);self.assertIn('read_audit',str(result['errors']))
 def test_consumption_failure_retains_prevalidation_audit(self):
  import proxy_population_launch_authorization as launch
  checked=dict(preconsumption_verified=True,request=self.request,live_approval={'read_audit':{'outcome':'verified','observations':[{'attempt':2}]}},errors=[])
  with patch.object(launch,'prevalidate_launch',return_value=checked),patch.object(api,'consume_live',side_effect=FileExistsError('already consumed')) as consume:
   with self.assertRaisesRegex(FileExistsError,'prevalidation.*read_audit'):
    launch.consume_launch_after_prevalidation(self.repo,self.bundle,self.receipt,self.cert,3,self.destination,17)
   consume.assert_called_once()
 def test_terminal_failure_keeps_audit_through_publication_and_launch_errors(self):
  clock=Clock();original=launch_tests.replies
  def fixture(req):
   _,c,r,p=original(req)
   def read(path):raise HTTPError(api.API+path,502,'synthetic',{},None)
   return read,c,r,p
  with patch.object(launch_tests,'replies',side_effect=fixture),patch.object(api,'sleep',clock.sleep),patch.object(api,'monotonic',clock.monotonic):
   result=launch_tests.LaunchAuthorizationTests.authorization(self)
  self.assertFalse(result['launch_authorization_bound'])
  self.assertIn('read_audit',str(result['errors']));self.assertIn('attempt_limit',str(result['errors']))
  self.assertEqual(clock.waits,[2,5]);self.assertFalse(self.destination.exists())
 def test_preclaim_local_gates_fail_before_any_consumption(self):
  import proxy_population_launch_authorization as launch
  from contextlib import ExitStack
  for gate in ('preparation','structure','lock','package','edition'):
   with self.subTest(gate=gate),ExitStack() as stack:
    stack.enter_context(patch.object(launch,'ROOT',self.root))
    stack.enter_context(patch.object(api,'require_operation_ready',side_effect=ValueError('preparation') if gate=='preparation' else None))
    stack.enter_context(patch('proxy_mandatory_population_input.audit_input_bundle',return_value={'structure_verified':gate!='structure'}))
    stack.enter_context(patch('proxy_population_input_lock.verify_git_binding',return_value={'immutable_content_verified':gate!='lock'}))
    stack.enter_context(patch('proxy_population_generation_package.audit_committed_generation',return_value=dict(self.package,committed_generation_consistent=gate!='package')))
    stack.enter_context(patch.object(launch.edition,'audit_bundle_edition',return_value={'bundle_edition_bound':gate!='edition'}))
    consume=stack.enter_context(patch.object(api,'consume_live',side_effect=AssertionError('must not consume')))
    network=stack.enter_context(patch.object(api,'_get',side_effect=AssertionError('must not read approval')))
    with self.assertRaises(ValueError):launch.consume_launch_after_prevalidation(self.repo,self.bundle,self.receipt,self.cert,3,self.destination,17)
    consume.assert_not_called();network.assert_not_called()
 def test_prevalidation_gates_consumption_without_starting_workers(self):
  import proxy_population_launch_authorization as launch
  import proxy_population_batch_supervisor as supervisor
  from contextlib import ExitStack
  for mode in ('recover','unavailable','head_changed','remote_changed'):
   self.git('reset','--hard',self.request['publication']['commit'])
   (self.root/'data').mkdir(exist_ok=True)
   (self.root/'data/proxy-population-approval-consumption/17.json').unlink(missing_ok=True)
   get,_,_,pr=replies(self.request);calls=0;clock=Clock()
   def read(path):
    nonlocal calls
    calls+=1
    if mode=='unavailable' or calls==1:raise TimeoutError('synthetic')
    if mode=='head_changed':pr['head']['sha']='9'*40
    return get(path)
   original=copy.deepcopy(self.bundle)
   with ExitStack() as stack:
    for module in (api,launch):stack.enter_context(patch.object(module,'ROOT',self.root))
    stack.enter_context(patch.object(api,'_get',side_effect=read))
    stack.enter_context(patch.object(api,'sleep',clock.sleep));stack.enter_context(patch.object(api,'monotonic',clock.monotonic))
    stack.enter_context(patch.object(api,'require_operation_ready',return_value=None))
    stack.enter_context(patch.object(launch.edition,'audit_bundle_edition',return_value=dict(bundle_edition_bound=True)))
    stack.enter_context(patch.object(launch.publication.remote,'verify',return_value=dict(fresh_remote_head_verified=mode!='remote_changed')))
    stack.enter_context(patch.object(launch,'_preclaim_package',return_value=self.package,create=True))
    native=api.consume_live;consume=stack.enter_context(patch.object(api,'consume_live',wraps=native))
    worker=stack.enter_context(patch.object(supervisor,'run_after_external_approval',side_effect=AssertionError('no supervisor')))
    call=lambda:launch.consume_launch_after_prevalidation(self.repo,self.bundle,self.receipt,self.cert,3,self.destination,17)
    if mode=='recover':
     result=call();self.assertTrue(result['consumption']['local_consumption_recorded']);self.assertEqual(consume.call_count,1)
    else:
     with self.assertRaises(ValueError):call()
     consume.assert_not_called()
    worker.assert_not_called()
   self.assertEqual(self.bundle,original);self.assertEqual(len(self.bundle['execution_order']),400);self.assertFalse(self.destination.exists())
   self.assertEqual(len(list((self.root/'data/proxy-population-approval-consumption').glob('17.json'))),int(mode=='recover'))

if __name__=='__main__':unittest.main()
