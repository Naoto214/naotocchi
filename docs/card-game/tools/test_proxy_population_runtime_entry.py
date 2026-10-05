"""Supplied synthetic manifest integration; no generation/lock command."""
import copy,unittest
from test_proxy_mandatory_population_input import bundle
try:import proxy_population_runtime_entry as api
except ImportError:api=None

class EntryTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'bound runtime reconstruction entrance missing')
 def test_complete_record_is_reconstructed_from_inputs_including_policy_and_lookup(self):
  b=bundle();r=api.reconstruct(b,'test-1A',2)
  self.assertEqual(r['runtime']['steps'][0]['source_envelope']['event_seq'],2)
  self.assertEqual(r['binding']['group_id'],'test-1');self.assertEqual(r['binding']['mirror_side'],'A_first')
  self.assertTrue(api.audit(r,b,'test-1A',2)['reconstruction_verified'])
  self.assertFalse(r['ready_for_execution']);self.assertFalse(r['input_lock_verified'])
  bad=copy.deepcopy(r);cards=bad['runtime']['final_envelope']['legacy_continuation']['game_state']['cards'];cards[next(iter(cards))]['card_id']='unknown'
  self.assertFalse(api.audit(bad,b,'test-1A',2)['reconstruction_verified'])
  self.assertIsNone(r['balance_admitted']);self.assertEqual(r['independent_balance_samples'],0)
 def test_source_edition_missing_or_tampered_is_rejected(self):
  import tempfile
  from pathlib import Path
  with tempfile.TemporaryDirectory() as d:
   with self.assertRaises(ValueError):api.verify_sources(Path(d))
 def test_absent_match_and_out_of_bounds_limit_rejected_before_execution(self):
  b=bundle()
  with self.assertRaises(ValueError):api.reconstruct(b,'missing',1)
  with self.assertRaises(ValueError):api.reconstruct(b,'test-1A',True)

if __name__=='__main__':unittest.main()
