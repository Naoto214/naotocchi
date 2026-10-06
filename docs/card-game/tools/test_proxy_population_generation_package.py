"""Synthetic local Git bundle: repeated115 orders, no OS sampler or games."""
import copy,hashlib,subprocess,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
import proxy_population_contract as population
from proxy_mandatory_policy_contract import canonical
from proxy_population_material_protocol import Cursor
from proxy_population_generation_journal import collect_supplied
from proxy_population_manifest_builder import assemble_supplied
try:import proxy_population_generation_package as api
except ImportError:api=None

class PackageTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.temp=tempfile.TemporaryDirectory();cls.repo=Path(cls.temp.name);cls.directory=cls.repo/'docs/card-game/data/unit-only';cls.directory.mkdir(parents=True)
  fixture=population.load_json(population.ROOT/'data/proxy-fixtures-107/fixture-107-normal-decision-a-first.json')
  decks={p['player_id']:p['deck_order_top_to_bottom'] for p in fixture['input']['players']}
  historical=population.load_json(population.ROOT/'data/proxy-normal-decision-first-choice-plan-115-20260918.json')['orders'][0]
  seeds={p['player_id']:p['seed'] for p in historical['players']}
  cls.registry=dict(registry_verified=True,known_shuffle_seeds=[],order_pairs=[])
  cursor=Cursor(cls.registry,decks)
  def read(size):
   request=cursor.request();return seeds[request['owner']].to_bytes(16,'big') if size==16 else bytes(32)
  collect_supplied(cursor,cls.directory/'sampling-journal.jsonl',read)
  cls.material=cursor.record();sources=population.load_json(population.ROOT/population.PROTOCOL_PATH)['sources_sha256']
  cls.certificate=dict(files={n:dict(sha256=v) for n,v in sources.items()},python=dict(version='unit-only'))
  cls.bundle=assemble_supplied(cls.material,cls.registry,decks,sources,'unit-only')
  for name,value in [('manifest.json',cls.bundle),('material.json',cls.material),('historical-registry.json',cls.registry),('edition.json',cls.certificate)]:
   (cls.directory/name).write_bytes(canonical(value))
  cls.git('init');cls.git('config','user.email','unit@example.invalid');cls.git('config','user.name','unit');cls.git('add','.');cls.git('commit','-m','synthetic package')
  cls.receipt=dict(commit=cls.git('rev-parse','HEAD'),tree=cls.git('rev-parse','HEAD^{tree}'),path='docs/card-game/data/unit-only/manifest.json',blob=cls.git('rev-parse','HEAD:docs/card-game/data/unit-only/manifest.json'),canonical_sha256=hashlib.sha256(canonical(cls.bundle)).hexdigest())
 @classmethod
 def tearDownClass(cls):cls.temp.cleanup()
 @classmethod
 def git(cls,*args):return subprocess.check_output(['git','-C',str(cls.repo),*args],stderr=subprocess.DEVNULL).decode().strip()
 def check(self,receipt=None,registry=True,edition=True):
  from contextlib import ExitStack
  with ExitStack() as stack:
   if registry:stack.enter_context(patch.object(api.history,'build_cutoff_registry',return_value=copy.deepcopy(self.registry)))
   stack.enter_context(patch.object(api.edition,'audit_bundle_edition',return_value=dict(bundle_edition_bound=edition,errors=[] if edition else ['unit edition mismatch'])))
   return api.audit_committed_generation(self.bundle,receipt or self.receipt,self.certificate,self.repo)
 def test_same_commit_package_is_content_evidence_only(self):
  self.assertIsNotNone(api);r=self.check()
  self.assertTrue(r['committed_generation_consistent'],r['errors']);self.assertEqual(len(r['artifact_bindings']),5)
  for flag in ('provenance_verified','input_lock_verified','remote_publication_verified','external_approval_verified','ready_for_execution'):self.assertFalse(r[flag])
  # Working files are deliberately not the source of an immutable receipt.
  (self.directory/'material.json').write_text('{}')
  self.assertTrue(self.check()['committed_generation_consistent'])
 def test_real_historical_registry_and_edition_gates_are_required(self):
  self.assertIsNotNone(api)
  self.assertFalse(self.check(registry=False)['committed_generation_consistent'])
  self.assertFalse(self.check(edition=False)['committed_generation_consistent'])
 def test_mixed_commit_and_missing_or_corrupt_siblings_rejected(self):
  self.assertIsNotNone(api)
  for name,body in [('material.json',b'{}'),('historical-registry.json',b'{}'),('edition.json',b'{}'),('sampling-journal.jsonl',b'{}\n')]:
   self.git('reset','--hard',self.receipt['commit']);(self.directory/name).write_bytes(body);self.git('add','.');self.git('commit','-m','corrupt unit')
   receipt=dict(self.receipt,commit=self.git('rev-parse','HEAD'),tree=self.git('rev-parse','HEAD^{tree}'))
   self.assertFalse(self.check(receipt)['committed_generation_consistent'],name)
   self.assertTrue(self.check()['committed_generation_consistent'])
  self.git('reset','--hard',self.receipt['commit']);self.git('rm',str((self.directory/'sampling-journal.jsonl').relative_to(self.repo)));self.git('commit','-m','missing unit')
  receipt=dict(self.receipt,commit=self.git('rev-parse','HEAD'),tree=self.git('rev-parse','HEAD^{tree}'))
  self.assertFalse(self.check(receipt)['committed_generation_consistent'])
class EntryPackageGateTests(unittest.TestCase):
 def test_invalid_package_blocks_worker_and_supervisor_before_output(self):
  import proxy_population_attempt_runner as attempt
  import proxy_population_batch_supervisor as supervisor
  from test_proxy_mandatory_population_input import bundle
  for entry in (attempt,supervisor):
   with self.subTest(entry=entry.__name__),tempfile.TemporaryDirectory() as d:
    root=Path(d)/'docs/card-game';(root/'data').mkdir(parents=True);out=root/'data/never-started'
    with patch.object(entry,'ROOT',root),patch.object(entry.lock,'verify_git_binding',return_value=dict(immutable_content_verified=True)),patch.object(entry.edition,'audit_bundle_edition',return_value=dict(bundle_edition_bound=True)),patch.object(api,'audit_committed_generation',return_value=dict(committed_generation_consistent=False,errors=['missing immutable journal'])),patch.object(attempt.connected,'reconstruct',side_effect=AssertionError('executor must not run')),patch.object(supervisor.subprocess,'run',side_effect=AssertionError('child must not launch')):
     args=(bundle(),{},{},Path(d))
     if entry is attempt:args+=('test-1A',)
     with self.assertRaisesRegex(ValueError,'generation package'):entry.run_after_external_approval(*args,3,out,'unit-reference-only')
    self.assertFalse(out.exists())
if __name__=='__main__':unittest.main()
