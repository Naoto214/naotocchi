"""Synthetic source changes at operational boundaries; no entropy or games."""
import json, subprocess, tempfile, unittest
from contextlib import contextmanager, ExitStack
from pathlib import Path
from unittest.mock import patch
import proxy_population_generation_entry as generation
import proxy_population_attempt_runner as attempt
import proxy_population_execution_edition as edition
from proxy_population_contract import load_json
from proxy_mandatory_policy_contract import ROOT
from test_proxy_mandatory_population_input import bundle


@contextmanager
def saved_source():
 with tempfile.TemporaryDirectory() as directory:
  repo=Path(directory);root=repo/'docs/card-game';(root/'data').mkdir(parents=True)
  source=root/'source.md';source.write_text('saved rules\n')
  def git(*args):return subprocess.check_output(['git','-C',directory,*args],stderr=subprocess.PIPE).decode().strip()
  git('init');git('config','user.email','fixture@example.invalid');git('config','user.name','fixture')
  git('add','.');git('commit','-m','synthetic edition')
  certificate=edition.capture(repo,git('rev-parse','HEAD'))
  yield repo,root,source,certificate


class OperationEditionTests(unittest.TestCase):
 def test_generation_rechecks_real_edition_after_authorization_and_storage(self):
  fixture=load_json(ROOT/'data/proxy-fixtures-107/fixture-107-normal-decision-a-first.json')
  registry=dict(registry_verified=True,known_shuffle_seeds=[],order_pairs=[])
  for boundary in ('authorization','storage','unchanged'):
   with self.subTest(boundary=boundary),saved_source() as (repo,root,source,certificate),ExitStack() as stack:
    out=root/'data'/'unstarted';write=generation.write_exclusive
    def authorize(*args,**kwargs):
     if boundary=='authorization':source.write_text('changed rules\n')
     return dict(generation_authorization_bound=True,consumption=dict(remote_publication={}))
    def store(path,value):
     write(path,value)
     if boundary=='storage' and path.name=='historical-registry.json':source.write_text('changed rules\n')
    for target,name,value in ((generation,'ROOT',root),(generation.external_approval,'require_operation_ready',lambda stage:None),(generation.history,'build_cutoff_registry',lambda:registry),(generation.authorization,'audit_generation',authorize),(generation,'load_json',lambda path:fixture),(generation,'write_exclusive',store)):
     stack.enter_context(patch.object(target,name,value))
    error=OSError('test stops before any entropy return') if boundary=='unchanged' else AssertionError('entropy must not be reached')
    read=stack.enter_context(patch.object(generation.os,'urandom',side_effect=error))
    if boundary=='unchanged':
     with self.assertRaisesRegex(OSError,'test stops before any entropy return'):
      generation.generate_after_external_approval(repo,certificate['commit'],out,'test-only-not-approval')
     read.assert_called_once_with(16)
     rows=[json.loads(line)['event'] for line in (out/'sampling-journal.jsonl').read_text().splitlines()]
     self.assertEqual([r['kind'] for r in rows],['request','interrupted'])
     for name in ('material.json','manifest.json','completion.json'):self.assertFalse((out/name).exists())
     continue
    with self.assertRaisesRegex(ValueError,'source edition changed before generation'):
     generation.generate_after_external_approval(repo,certificate['commit'],out,'test-only-not-approval')
    read.assert_not_called()
    for name in ('sampling-journal.jsonl','material.json','manifest.json','completion.json'):self.assertFalse((out/name).exists())

 def test_attempt_rechecks_real_edition_after_authorization_and_storage(self):
  for boundary in ('authorization','storage'):
   with self.subTest(boundary=boundary),saved_source() as (repo,root,source,certificate),ExitStack() as stack:
    out=root/'data'/'unstarted';write=attempt.write_exclusive
    def authorize(*args,**kwargs):
     if boundary=='authorization':source.write_text('changed rules\n')
     return dict(launch_authorization_bound=True,consumption=dict(remote_publication={}))
    def store(path,value):
     write(path,value)
     if boundary=='storage' and path.name=='start.json':source.write_text('changed rules\n')
    for target,name,value in ((attempt,'ROOT',root),(attempt.external_approval,'require_operation_ready',lambda stage:None),(attempt.lock,'verify_git_binding',lambda *a:dict(immutable_content_verified=True)),(attempt.edition,'audit_bundle_edition',lambda *a:dict(bundle_edition_bound=True)),(attempt.generation_package,'audit_committed_generation',lambda *a:dict(committed_generation_consistent=True)),(attempt.authorization,'audit_launch',authorize),(attempt,'write_exclusive',store)):
     stack.enter_context(patch.object(target,name,value))
    execute=stack.enter_context(patch.object(attempt.connected,'reconstruct',side_effect=AssertionError('executor must not be reached')))
    with self.assertRaisesRegex(ValueError,'source edition changed before attempt'):
     attempt.run_after_external_approval(bundle(),{},certificate,repo,'test-1A',3,out,'test-only-not-approval')
    execute.assert_not_called()
    self.assertTrue((out/'start.json').exists())
    interrupted=json.loads((out/'interruption.json').read_text())
    self.assertEqual(interrupted['error_type'],'ValueError');self.assertFalse(interrupted['automatic_retry_allowed'])
    self.assertFalse((out/'record.json.gz').exists());self.assertFalse((out/'receipt.json').exists())


if __name__=='__main__':unittest.main()
