"""Live publication is a prerequisite, never approval or a historical lock."""
import os,subprocess,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
try:import proxy_population_remote_publication as api
except ImportError:api=None

class RemotePublicationTests(unittest.TestCase):
 def test_temp_directory_inside_repository_cannot_inherit_url_rewrites(self):
  self.assertIsNotNone(api)
  with tempfile.TemporaryDirectory() as parent:
   subprocess.check_call(['git','init','-q',parent])
   subprocess.check_call(['git','-C',parent,'config','url.https://wrong.example/.insteadOf','https://github.com/'])
   def isolated(command,**kwargs):
    probe=subprocess.run(['git','rev-parse','--show-toplevel'],cwd=kwargs['cwd'],env=kwargs['env'],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    self.assertNotEqual(probe.returncode,0,'remote query inherited ancestor repository')
    return b'no-network-probe'
   with patch.object(api.tempfile,'tempdir',parent),patch.object(api.subprocess,'check_output',side_effect=isolated):
    self.assertEqual(api._query_remote(),b'no-network-probe')

 def test_transport_pins_remote_and_isolates_git_config_with_timeout(self):
  self.assertIsNotNone(api)
  def transport(command,**kwargs):
   self.assertEqual(command[-2:],['https://github.com/Naoto214/naotocchi.git','refs/heads/design/card-pool-master-20260914'])
   self.assertEqual(kwargs['timeout'],30)
   self.assertTrue(Path(kwargs['cwd']).is_dir());self.assertFalse((Path(kwargs['cwd'])/'.git').exists())
   self.assertNotIn('GIT_DIR',kwargs['env']);self.assertNotIn('GIT_CONFIG_COUNT',kwargs['env'])
   self.assertEqual(kwargs['env']['GIT_CONFIG_GLOBAL'],os.devnull);self.assertEqual(kwargs['env']['GIT_CONFIG_NOSYSTEM'],'1')
   return b'transport-only-test'
  with patch.dict(os.environ,{'GIT_DIR':'forged','GIT_CONFIG_COUNT':'1','GIT_CONFIG_KEY_0':'url.file:///tmp/forged.insteadOf','GIT_CONFIG_VALUE_0':'https://github.com/'}),patch.object(api.subprocess,'check_output',side_effect=transport):
   self.assertEqual(api._query_remote(),b'transport-only-test')

 def test_exact_fresh_ref_binds_local_commit_tree_but_not_consent(self):
  self.assertIsNotNone(api,'remote publication prerequisite absent')
  with tempfile.TemporaryDirectory() as temp:
   def git(*args):return subprocess.check_output(['git','-C',temp,*args],stderr=subprocess.DEVNULL).decode().strip()
   git('init');git('config','user.name','fixture');git('config','user.email','fixture@example.invalid')
   Path(temp,'synthetic.txt').write_text('no production inputs');git('add','.');git('commit','-m','fixture')
   commit=git('rev-parse','HEAD');tree=git('rev-parse','HEAD^{tree}')
   raw=(commit+'\trefs/heads/design/card-pool-master-20260914\n').encode()
   with patch.object(api,'_query_remote',return_value=raw):
    result=api.verify(temp,commit,tree)
   self.assertTrue(result['fresh_remote_head_verified'],result['errors'])
   self.assertEqual(result['observed_commit'],commit);self.assertEqual(result['tree'],tree)
   for key in ('external_approval_verified','input_lock_verified','pre_outcome_ordering_verified','ready_for_execution'):
    self.assertFalse(result[key])
   for response in (b'',raw+raw,raw.replace(commit.encode(),b'0'*40),raw.replace(b'card-pool-master',b'other-pool-master'),b'garbage'):
    with patch.object(api,'_query_remote',return_value=response):
     self.assertFalse(api.verify(temp,commit,tree)['fresh_remote_head_verified'])
   with patch.object(api,'_query_remote',side_effect=OSError('transport unavailable')):
    self.assertFalse(api.verify(temp,commit,tree)['fresh_remote_head_verified'])
   with patch.object(api,'_query_remote',side_effect=AssertionError('invalid local identity must not query')):
    for c,t in [('HEAD',tree),(commit,'0'*40),(tree,tree)]:
     self.assertFalse(api.verify(temp,c,t)['fresh_remote_head_verified'])

 def test_entries_reject_unpublished_content_before_any_side_effect(self):
  self.assertIsNotNone(api,'remote publication prerequisite absent')
  import proxy_population_generation_entry as gen
  import proxy_population_attempt_runner as attempt
  import proxy_population_batch_supervisor as supervisor
  from test_proxy_mandatory_population_input import bundle
  from contextlib import ExitStack
  for module in (gen,attempt,supervisor):
   with self.subTest(entry=module.__name__),tempfile.TemporaryDirectory() as temp,ExitStack() as stack:
    root=Path(temp)/'docs'/'card-game';(root/'data').mkdir(parents=True);out=root/'data'/'must-not-exist'
    stack.enter_context(patch.object(module,'ROOT',root))
    stack.enter_context(patch.object(api,'verify',return_value=dict(fresh_remote_head_verified=False,errors=['remote head moved'])))
    stack.enter_context(patch.object(gen.os,'urandom',side_effect=AssertionError('no entropy')))
    stack.enter_context(patch.object(attempt.connected,'reconstruct',side_effect=AssertionError('no execution')))
    stack.enter_context(patch.object(supervisor.subprocess,'run',side_effect=AssertionError('no child')))
    certificate={'commit':'1'*40,'tree':'2'*40}
    if module is gen:
     stack.enter_context(patch.object(gen.edition,'capture',return_value=certificate))
     with self.assertRaisesRegex(ValueError,'remote'):gen.generate_after_external_approval(temp,'1'*40,out,'not-approval')
    else:
     stack.enter_context(patch.object(module.lock,'verify_git_binding',return_value=dict(immutable_content_verified=True)))
     stack.enter_context(patch.object(module.edition,'audit_bundle_edition',return_value=dict(bundle_edition_bound=True)))
     stack.enter_context(patch.object(module.generation_package,'audit_committed_generation',return_value=dict(committed_generation_consistent=True)))
     args=(bundle(),certificate,certificate,temp)
     if module is attempt:args+=('test-1A',)
     with self.assertRaisesRegex(ValueError,'remote'):module.run_after_external_approval(*args,3,out,'not-approval')
    self.assertFalse(out.exists())

if __name__=='__main__':unittest.main()
