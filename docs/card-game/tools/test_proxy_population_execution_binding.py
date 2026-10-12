"""No entropy, production play or approval."""
import copy,hashlib,importlib.util,unittest
from unittest.mock import patch
import test_proxy_population_generation_package as fixtures
class ProjectionTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  fixtures.PackageTests.setUpClass();cls.f=fixtures.PackageTests
 @classmethod
 def tearDownClass(cls):cls.f.tearDownClass()
 def api(self):
  self.assertIsNotNone(importlib.util.find_spec('proxy_population_execution_binding'),'execution binding implementation missing')
  import proxy_population_execution_binding as api
  return api
 def inputs(self):
  old=copy.deepcopy(self.f.certificate);new=copy.deepcopy(old);new['commit']='a'*40;new['tree']='b'*40
  name='plans/2026-10-12-execution-rebinding.md'
  new['files'][name]={'sha256':hashlib.sha256((fixtures.population.ROOT/name).read_bytes()).hexdigest()}
  return old,new
 def derive(self,api,old,new):return api.derive(self.f.bundle,self.f.material,self.f.registry,old,new,api.source_delta(old,new))
 def test_exact_projection_preserves_every_non_source_field_without_entropy(self):
  api=self.api();old,new=self.inputs()
  with patch('os.urandom',side_effect=AssertionError('no entropy')):result=self.derive(api,old,new)
  expected=copy.deepcopy(self.f.bundle);expected['source_versions']={k:v['sha256'] for k,v in new['files'].items()}
  self.assertEqual(result,expected)
 def test_python_generator_and_unapproved_delta_rejected(self):
  api=self.api();old,new=self.inputs();changed=copy.deepcopy(new);changed['python']['version']='changed'
  with self.assertRaisesRegex(ValueError,'Python'):self.derive(api,old,changed)
  old['files']['tools/proxy_population_manifest_builder.py']={'sha256':'0'*64};new['files']['tools/proxy_population_manifest_builder.py']={'sha256':'1'*64}
  with self.assertRaisesRegex(ValueError,'generator'):self.derive(api,old,new)
  old,new=self.inputs()
  with self.assertRaisesRegex(ValueError,'delta'):api.derive(self.f.bundle,self.f.material,self.f.registry,old,new,{})
 def test_every_non_source_mutation_rejected(self):
  api=self.api();old,new=self.inputs();good=self.derive(api,old,new)
  for key in good:
   if key=='source_versions':continue
   bad=copy.deepcopy(good);bad[key]=None
   with self.subTest(key=key),self.assertRaises(ValueError):api.require_equivalent(self.f.bundle,bad)
  bad=copy.deepcopy(good);bad['extra']='not permitted'
  with self.assertRaises(ValueError):api.require_equivalent(self.f.bundle,bad)
  bad=copy.deepcopy(good);bad['execution_order'].reverse()
  with self.assertRaises(ValueError):api.require_equivalent(self.f.bundle,bad)
 def test_original_projection_mismatch_rejected(self):
  api=self.api();old,new=self.inputs();bad=copy.deepcopy(self.f.bundle);bad['policy_roots']['group-1']={}
  with self.assertRaises(ValueError):api.derive(bad,self.f.material,self.f.registry,old,new,api.source_delta(old,new))
if __name__=='__main__':unittest.main()

class HistoricalTests(unittest.TestCase):
 def test_old_package_is_audited_by_old_code_and_never_consumed_again(self):
  import proxy_population_execution_binding as api
  self.assertTrue(hasattr(api,'audit_historical'),'independent historical auditor missing')
  from pathlib import Path
  import subprocess,json,hashlib
  repo=fixtures.population.ROOT.parents[1]
  commit='e40a2dd2248139875b5878a66648c4e568032d2d';path='docs/card-game/data/proxy-population-400-20261012/manifest.json'
  def git(*a):return subprocess.check_output(['git','-C',str(repo),*a]).decode().strip()
  raw=subprocess.check_output(['git','-C',str(repo),'show',commit+':'+path])
  receipt=dict(commit=commit,tree=git('rev-parse',commit+'^{tree}'),path=path,blob=git('rev-parse',commit+':'+path),canonical_sha256=hashlib.sha256(raw).hexdigest())
  # Network transport is isolated; immutable Git and old validators are real.
  with patch.object(api,'require_remote_commit',return_value=None):
   proof=api.audit_historical(repo,receipt)
   self.assertTrue(proof['package']['committed_generation_consistent'],proof)
   self.assertTrue(proof['preparation']['preflight_ready'],proof)
   self.assertEqual(len(proof['package']['artifact_bindings']),7)
   bad=dict(receipt,canonical_sha256='0'*64)
   with self.assertRaises(ValueError):api.audit_historical(repo,bad)
 def test_historical_http_identity_is_required(self):
  import proxy_population_execution_binding as api
  self.assertTrue(hasattr(api,'require_remote_commit'),'remote historical identity missing')
  with patch.object(api,'read_remote_commit',return_value=dict(sha='a'*40,tree={'sha':'b'*40})):
   self.assertIsNone(api.require_remote_commit('a'*40,'b'*40))
   with self.assertRaises(ValueError):api.require_remote_commit('c'*40,'b'*40)

class GeneratorBoundaryTests(unittest.TestCase):
 def test_transitive_generator_helpers_are_protected(self):
  import proxy_population_execution_binding as api
  expected={'proxy_population_contract','proxy_mandatory_choice_boundary','proxy_mandatory_policy_local','proxy_independent_seed_probe','proxy_normal_decision_fallback_contract','proxy_normal_decision_hardening','proxy_normal_decision_seeded_restart','proxy_population_input_history','proxy_record_validator'}
  for module in expected:
   name='tools/'+module+'.py';old=dict(python={'version':'unit'},files={name:{'sha256':'0'*64}});new=copy.deepcopy(old);new['files'][name]['sha256']='1'*64
   with self.subTest(module=module),self.assertRaisesRegex(ValueError,'generator'):
    api.derive({'python_version':'unit','source_versions':{name:'0'*64}},{},{},old,new,api.source_delta(old,new))

class PublishedBindingTests(unittest.TestCase):
 def test_immutable_roundtrip_reconstructs_proof_and_rejects_forged_fields(self):
  import proxy_population_execution_binding as api
  import proxy_population_execution_edition as edition
  import proxy_population_current_preflight as prep
  import tempfile,subprocess
  from pathlib import Path
  from contextlib import ExitStack
  fixtures.PackageTests.setUpClass();f=fixtures.PackageTests
  try:
   root=f.repo/'docs/card-game';fixture='data/proxy-fixtures-107/fixture-107-normal-decision-a-first.json'
   (root/fixture).parent.mkdir(parents=True,exist_ok=True);(root/fixture).write_bytes((fixtures.population.ROOT/fixture).read_bytes())
   old=copy.deepcopy(f.certificate);new=copy.deepcopy(old);new['commit']=f.receipt['commit'];new['tree']=f.receipt['tree']
   name='plans/2026-10-12-execution-rebinding.md';new['files'][name]={'sha256':hashlib.sha256((fixtures.population.ROOT/name).read_bytes()).hexdigest()}
   current=dict(preflight_ready=True,errors=[],execution_edition_sha256=api.approval.digest(new))
   with ExitStack() as stack:
    stack.enter_context(patch.object(api,'ROOT',root))
    stack.enter_context(patch.object(edition,'verify',return_value={'local_edition_verified':True}))
    stack.enter_context(patch.object(prep,'audit',return_value=current))
    stack.enter_context(patch.object(api,'audit_historical',return_value={'package':{'committed_generation_consistent':True},'preparation':{'preflight_ready':True}}))
    proof,derived=api.build(f.repo,f.receipt,new,api.source_delta(old,new))
    target='docs/card-game/data/proxy-population-effective-application/verification/unit-binding'
    directory=f.repo/target;directory.mkdir(parents=True)
    for n,value in [('binding.json',proof),('manifest.json',derived)]: (directory/n).write_bytes(api.canonical(value))
    f.git('add',target);f.git('commit','-qm','synthetic binding publication')
    def receipt(name):
     return dict(commit=f.git('rev-parse','HEAD'),tree=f.git('rev-parse','HEAD^{tree}'),path=target+'/'+name,blob=f.git('rev-parse','HEAD:'+target+'/'+name),canonical_sha256=hashlib.sha256((directory/name).read_bytes()).hexdigest())
    manifest_receipt=receipt('manifest.json');context=dict(binding=proof,binding_receipt=receipt('binding.json'))
    self.assertEqual(api.audit(context,derived,manifest_receipt,new,f.repo),proof)
    for key in ('historical_audit','current_preparation','source_delta','old_edition','new_edition'):
     changed=copy.deepcopy(context);changed['binding'][key]={}
     with self.subTest(key=key),self.assertRaises(ValueError):api.audit(changed,derived,manifest_receipt,new,f.repo)
    changed=copy.deepcopy(derived);changed['execution_order'].reverse()
    with self.assertRaises(ValueError):api.audit(context,changed,manifest_receipt,new,f.repo)
    changed=dict(manifest_receipt,commit=f.receipt['commit'],tree=f.receipt['tree'])
    with self.assertRaises(ValueError):api.audit(context,derived,changed,new,f.repo)
    with patch.object(prep,'audit',return_value={'preflight_ready':False,'errors':['unproved']}):
     with self.assertRaisesRegex(ValueError,'preflight'):api.audit(context,derived,manifest_receipt,new,f.repo)
  finally:f.tearDownClass()
