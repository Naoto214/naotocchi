"""107 physical source closure over the actual bound trace, no new inputs."""
import copy,unittest
from unittest.mock import patch
from test_proxy_mandatory_population_input import bundle
import proxy_population_connected_entry as entry
try:import proxy_population_source_conservation as api
except ImportError:api=None

class SourceConservationTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.bundle=bundle();cls.record=entry.reconstruct(cls.bundle,'test-1A',3)
 def setUp(self):self.assertIsNotNone(api,'bound source conservation absent')
 def test_initial_and_every_actual_transition_are_bound(self):
  before=copy.deepcopy(self.record);r=api.audit(self.record,self.bundle)
  self.assertEqual(r['errors'],[]);self.assertTrue(r['supplied_source_conservation_verified'])
  self.assertEqual(r['physical_copy_count'],80);self.assertEqual(r['card_type_count'],41)
  self.assertEqual(r['event_count'],len(self.record['runtime']['events']))
  self.assertTrue(r['observed_legacy_reservations_absent']);self.assertFalse(r['legacy_reservation_unreachable_proven']);self.assertFalse(r['origin_authenticated']);self.assertIsNone(r['balance_admitted']);self.assertEqual(self.record,before)
  self.assertEqual(self.record['source_conservation_audit'],r)
 def test_forged_source_metadata_and_journal_are_rejected(self):
  for mode in ('root','metadata','extra','missing','journal','receipt','sequence','reservation','owner'):
   bad=copy.deepcopy(self.record);runtime=bad['runtime'];source=runtime['source_envelope'];g=source['legacy_continuation']['game_state'];actor='A';s=g['players'][actor]['hand'][0]
   if mode=='root':bad['opening']['initial']['initial_game_state']['cards'][s]['card_id']='C-box'
   elif mode=='metadata':g['cards'][s]['card_id']='C-box'
   elif mode=='extra':g['cards']['A-999#1']=dict(g['cards'][s],card_copy_id='A-999',initial_instance_id='A-999#1');g['players'][actor]['hand'].append('A-999#1')
   elif mode=='missing':g['players'][actor]['hand'].remove(s)
   elif mode=='journal':runtime['physical_lifecycle_final']['seen_field'].append(s.split('#')[0])
   elif mode=='receipt':runtime['physical_lifecycle_steps'][0]['event_sha256']='0'*64
   elif mode=='sequence':runtime['steps'][0]['events'][0]['seq']+=1
   elif mode=='reservation':g['players'][actor]['reservations'].append({'invented':True})
   else:g['players'][actor]['hand'].remove(s);g['players']['B']['hand'].append(s)
   with self.subTest(mode=mode):self.assertTrue(api.audit(bad,self.bundle)['errors'])
 def test_missing_duplicate_step_and_final_changes_rejected(self):
  for mode in ('missing','duplicate','final','step_final'):
   bad=copy.deepcopy(self.record);r=bad['runtime']
   if mode=='missing':r['steps'].pop()
   elif mode=='duplicate':r['steps'].append(copy.deepcopy(r['steps'][-1]))
   elif mode=='final':r['final_envelope']['event_seq']+=1
   else:r['steps'][0]['final_envelope']['event_seq']+=1
   with self.subTest(mode=mode):self.assertTrue(api.audit(bad,self.bundle)['errors'])
 def test_unknown_activation_actor_is_not_ignored_by_owner_check(self):
  import proxy_population_incarnation as life
  e=copy.deepcopy(self.record['runtime']['source_envelope']);g=life.game(e);source=g['players']['A']['hand'].pop()
  e['legacy_continuation']['activation_zone'].append(dict(actor='unknown',source_zone='hand',action_type='use_event',source_instance_id=source))
  life.create(e) # Physical membership alone does not check action ownership.
  owners={v['card_copy_id']:s.split('-')[0] for s,v in g['cards'].items()}
  with self.assertRaisesRegex(ValueError,'activation actor'):api.check_owners(e,owners)

 def test_entry_rejects_failed_conservation_gate(self):
  with patch.object(api,'audit',return_value=dict(errors=['synthetic source mismatch'],supplied_source_conservation_verified=False)):
   with self.assertRaisesRegex(ValueError,'source conservation'):entry.reconstruct(self.bundle,'test-1A',1)

if __name__=='__main__':unittest.main()
