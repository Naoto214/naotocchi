"""No production entry is invoked successfully; OS reads are forbidden here."""
import tempfile,unittest
from pathlib import Path
from unittest.mock import patch
try:import proxy_population_generation_entry as api
except ImportError:api=None

class GenerationEntryTests(unittest.TestCase):
 def test_missing_external_reference_rejects_before_entropy_or_artifact_creation(self):
  self.assertIsNotNone(api)
  with tempfile.TemporaryDirectory() as d,patch.object(api.os,'urandom',side_effect=AssertionError('real entropy forbidden')):
   out=Path(d)/'absent'
   with self.assertRaises(ValueError):api.generate_after_external_approval(Path(d),'0'*40,out,'')
   self.assertFalse(out.exists())
 def test_source_edition_failure_rejects_before_entropy_or_artifact_creation(self):
  self.assertIsNotNone(api)
  with tempfile.TemporaryDirectory() as d,patch.object(api.os,'urandom',side_effect=AssertionError('real entropy forbidden')):
   out=Path(d)/'absent'
   with patch.object(api.edition,'capture',side_effect=ValueError('source differs')) as capture:
    with self.assertRaises(ValueError):api.generate_after_external_approval(api.ROOT.parents[1],'0'*40,api.ROOT/'data'/'never-generated-test','test-reference-not-approval')
    capture.assert_called_once()
   self.assertFalse(out.exists());self.assertFalse((api.ROOT/'data'/'never-generated-test').exists())
 def test_outside_card_game_destination_is_rejected(self):
  self.assertIsNotNone(api)
  with tempfile.TemporaryDirectory() as d,patch.object(api.os,'urandom',side_effect=AssertionError('real entropy forbidden')):
   with self.assertRaises(ValueError):api.generate_after_external_approval(api.ROOT.parents[1],'0'*40,Path(d)/'absent','test-reference-not-approval')
 def test_new_directory_is_durable_before_first_attempted_read(self):
  import os
  import proxy_population_contract as original
  fixture=original.load_json(original.ROOT/'data/proxy-fixtures-107/fixture-107-normal-decision-a-first.json')
  with tempfile.TemporaryDirectory() as d:
   root=Path(d)/'docs'/'card-game';(root/'data').mkdir(parents=True);out=root/'data'/'test-only-interruption';synced=[];real=api.os.fsync
   def sync(fd):synced.append(os.fstat(fd).st_ino);return real(fd)
   def forbid(size):
    self.assertEqual(size,16)
    self.assertIn(out.parent.stat().st_ino,synced)
    self.assertIn(out.stat().st_ino,synced)
    self.assertTrue((out/'sampling-journal.jsonl').exists())
    raise OSError('test interrupts before returning any entropy')
   registry=dict(registry_verified=True,known_shuffle_seeds=[],order_pairs=[])
   with patch.object(api,'ROOT',root),patch.object(api.edition,'capture',return_value={'test_only_edition':True}),patch.object(api.history,'build_cutoff_registry',return_value=registry),patch.object(api,'load_json',return_value=fixture),patch.object(api.os,'fsync',side_effect=sync),patch.object(api.os,'urandom',side_effect=forbid) as read:
    with self.assertRaises(OSError):api.generate_after_external_approval(Path(d),'0'*40,out,'test-only-reference-not-approval')
    read.assert_called_once_with(16)
   self.assertFalse((out/'manifest.json').exists());self.assertFalse((out/'material.json').exists());self.assertFalse((out/'completion.json').exists())

if __name__=='__main__':unittest.main()
