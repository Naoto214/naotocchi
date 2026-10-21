"""Historical115 orders repeated in memory, never independent input samples."""
import copy,hashlib,unittest
import proxy_population_contract as old
import proxy_mandatory_policy_contract as approved
import proxy_mandatory_population_input as inputs
from proxy_population_material_protocol import Cursor
try:import proxy_population_manifest_builder as api
except ImportError:api=None

class BuilderTests(unittest.TestCase):
 def test_supplied_material_projects_all_rows_without_authority(self):
  self.assertIsNotNone(api)
  fixture=old.load_json(old.ROOT/'data/proxy-fixtures-107/fixture-107-normal-decision-a-first.json')
  decks={p['player_id']:p['deck_order_top_to_bottom'] for p in fixture['input']['players']}
  historical=old.load_json(old.ROOT/'data/proxy-normal-decision-first-choice-plan-115-20260918.json')['orders'][0]
  seeds={p['player_id']:p['seed'] for p in historical['players']}
  # Deliberately incomplete synthetic registry. Production authentication must
  # use469's real registry; this fixture does not claim independence.
  registry=dict(known_shuffle_seeds=[],order_pairs=[])
  cursor=Cursor(registry,decks)
  while cursor.request() is not None:
   request=cursor.request();cursor.supply(seeds[request['owner']].to_bytes(16,'big') if request['purpose']=='initial_shuffle_seed' else bytes(32))
  material=cursor.record();before=copy.deepcopy(material)
  sources=old.load_json(old.ROOT/old.PROTOCOL_PATH)['sources_sha256']
  b=api.assemble_supplied(material,registry,decks,sources,'historical-unit-only')
  self.assertEqual(material,before);self.assertTrue(inputs.audit_input_bundle(b)['structure_verified'])
  self.assertEqual(len(b['groups']),200);self.assertEqual(len(b['matches']),400)
  self.assertEqual(b['execution_order'][:4],['group-001-A-first','group-001-B-first','group-002-B-first','group-002-A-first'])
  for group in b['groups']:
   for owner in 'AB':
    self.assertEqual(group['full_order_'+owner],next(p['deck_order_top_to_bottom'] for p in historical['players'] if p['player_id']==owner))
  self.assertEqual(b['lock_evidence'],{})
  self.assertFalse(inputs.audit_input_bundle(b)['ready_for_execution'])
  self.assertEqual(b['generation_provenance'],dict(material_transcript_sha256=hashlib.sha256(approved.canonical(material)).hexdigest()))
  for mutate in (lambda r:r.update(complete=False),lambda r:r['groups'].pop(),lambda r:r['policy_roots'][0].update(root_hex='01'*32),lambda r:r['calls'].pop()):
   bad=copy.deepcopy(material);mutate(bad)
   with self.assertRaises(ValueError):api.assemble_supplied(bad,registry,decks,sources,'historical-unit-only')

if __name__=='__main__':unittest.main()
