"""107 root and actual lifecycle journal must meet the existing replay loop."""
import copy,unittest
import proxy_population_policy_journal as journal
import proxy_population_connected_entry as connected
from test_proxy_mandatory_population_input import bundle

class SourceRootTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):cls.record=connected.reconstruct(bundle(),'test-1A',3)
 def test_existing_trace_binds_initial_eighty_and_actual_lifecycle(self):
  proof=journal.audit_opportunities(self.record)
  self.assertEqual(proof['errors'],[])
  self.assertTrue(proof.get('physical_source_root_and_journal_verified',False))
  self.assertFalse(proof['origin_authenticated']);self.assertFalse(proof['all_rule_opportunities_proven'])
 def test_changed_root_prefix_and_actual_journal_are_rejected(self):
  for mode in ('initial_card','initial_players','initial_location','prefix_card','prefix_sequence','source_prefix','root_seen','root_pin','journal_missing','journal_hash','journal_event','journal_duplicate'):
   bad=copy.deepcopy(self.record);run=bad['runtime'];opening=bad['opening'];cards=opening['initial']['initial_game_state']['cards'];source=next(iter(cards))
   if mode=='initial_card':cards[source]['card_id']='C-box'
   elif mode=='initial_players':opening['initial']['initial_game_state']['players'].pop('B')
   elif mode=='initial_location':opening['initial']['initial_game_state']['players']['B']['deck'].append(opening['initial']['initial_game_state']['players']['A']['deck'].pop())
   elif mode=='prefix_card':opening['final_envelope']['legacy_continuation']['game_state']['cards'][source]['card_id']='C-box'
   elif mode=='prefix_sequence':opening['final_envelope']['event_seq']+=1
   elif mode=='source_prefix':opening['final_envelope']['legacy_continuation']['game_state']['players']['A']['time']+=1
   elif mode=='root_seen':run['physical_lifecycle_root']['seen_field']=[cards[source]['card_copy_id']]
   elif mode=='root_pin':run['physical_lifecycle_root']['source_sha256']={}
   elif mode=='journal_missing':run['physical_lifecycle_steps']=[]
   elif mode=='journal_hash':run['physical_lifecycle_steps'][0]['after_lifecycle_sha256']='0'*64
   elif mode=='journal_event':run['physical_lifecycle_steps'][0]['event_sha256']='0'*64
   else:run['physical_lifecycle_steps'].append(copy.deepcopy(run['physical_lifecycle_steps'][0]))
   with self.subTest(mode=mode):self.assertTrue(journal.audit_opportunities(bad)['errors'])

if __name__=='__main__':unittest.main()
