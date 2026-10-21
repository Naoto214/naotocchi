import copy,unittest
from test_proxy_mandatory_population_input import bundle
try:import proxy_population_input_history as api
except ImportError:api=None

def document():
 g=bundle()['groups'][0]
 return dict(players=[dict(player_id=a,seed=g['seed_'+a],deck_order_top_to_bottom=g['full_order_'+a]) for a in 'AB'])
class HistoryTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api)
 def test_dedup_retains_locations_and_outcomes_do_not_change_identity(self):
  d=document();r=api.collect([d,dict(d,winner='A')],'unit')
  self.assertEqual(len(r['order_pairs']),1);self.assertEqual(len(r['order_pairs'][0]['source_locations']),2);self.assertEqual(r['gaps'],[])
 def test_malformed_input_is_not_silently_dropped(self):
  for mutate in (lambda d:d['players'].pop(),lambda d:d['players'][0].update(seed=True),lambda d:d['players'][0]['deck_order_top_to_bottom'].pop(),lambda d:d.update(seed=55),lambda d:d['players'][1].pop('deck_order_top_to_bottom')):
   d=document();mutate(d);self.assertTrue(api.collect(d,'unit')['gaps'])
 def test_nested_bad_owner_and_card_values_are_gaps(self):
  for mutate in (lambda d:d['players'][0].update(player_id=[]),lambda d:d['players'][0]['deck_order_top_to_bottom'][0].update(card_copy_id=[])):
   d=document();mutate(d);self.assertTrue(api.collect(d,'unit')['gaps'])
 def test_seed_projection_and_schema_definition_are_distinct(self):
  r=api.collect(dict(player_id='A',seed=50,top_seven=[]),'unit');self.assertEqual(r['known_seeds']['A'],[50]);self.assertFalse(r['gaps'])
  self.assertFalse(api.collect({'$schema':'https://json-schema.org/draft/2020-12/schema','type':'object','properties':{'deck_order_top_to_bottom':{'type':'array'}}},'schema')['gaps'])
 def test_cutoff_registry_has_fixed_code_only_input_and_exact_scope(self):
  r=api.build_cutoff_registry();self.assertEqual(r['gaps'],[]);self.assertEqual(len(r['order_pairs']),45);self.assertEqual(len(r['known_shuffle_seeds']),10)
  self.assertIn(2026092501,r['known_shuffle_seeds']);self.assertFalse(r['outside_repository_coverage_claim']);self.assertEqual(r['entropy_bytes_sampled'],0)
if __name__=='__main__':unittest.main()
