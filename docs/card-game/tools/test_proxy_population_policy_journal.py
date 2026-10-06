import copy,unittest
from test_proxy_mandatory_choice_boundary import frame
from proxy_mandatory_choice_boundary import prepare
from proxy_population_policy_bridge import Session
try:import proxy_population_policy_journal as api
except ImportError:api=None

class PolicyJournalTests(unittest.TestCase):
 def setup_case(self):
  s=Session(dict(protocol_id='unit',group_id='unit',mirror_side='A_first'),{'A':'00'*32,'B':'00'*32});s.turn_start('A','start');s.effect('no-choice','A');s.effect('effect','A')
  f=frame('ability_hand_bottom');b=prepare(f);d=s.choose('effect',f,b['choice_game_state'],b['candidate_ids'])
  return s,d
 def test_exports_complete_local_entries_without_promoting_origin_or_policy(self):
  self.assertIsNotNone(api);s,d=self.setup_case();j=api.export(s);r=api.audit(j,[d],s.origins,s.binding,s.roots)
  self.assertTrue(r['local_entries_verified'],r['errors']);self.assertEqual(r['verified_count'],1)
  self.assertFalse(r['origin_authenticated']);self.assertIsNone(r['policy_eligible'])
  self.assertEqual(j['entries'][0]['identity'],['effect','A','ability_hand_bottom'])
  self.assertTrue(j['entries'][0]['local_record']['strategic_unproven'])
 def test_missing_duplicate_root_and_origin_changes_are_rejected(self):
  self.assertIsNotNone(api);s,d=self.setup_case();j=api.export(s)
  empty=copy.deepcopy(j);empty['entries']=[]
  duplicate=copy.deepcopy(j);duplicate['entries']*=2
  bad=copy.deepcopy(j);bad['entries'][0]['local_record']['strategic_unproven']=False
  for changed in (empty,duplicate,bad):self.assertFalse(api.audit(changed,[d],s.origins,s.binding,s.roots)['local_entries_verified'])
  roots=copy.deepcopy(s.roots);roots['A']='01'*32
  self.assertFalse(api.audit(j,[d],s.origins,s.binding,roots)['local_entries_verified'])
  origins=copy.deepcopy(s.origins);origins['effect']['ordinal']=1
  self.assertFalse(api.audit(j,[d],origins,s.binding,s.roots)['local_entries_verified'])
class BoundPolicyJournalTests(unittest.TestCase):
 def test_entry_exports_actual_opening_and_runtime_callbacks(self):
  from test_proxy_mandatory_population_input import bundle
  import proxy_population_connected_entry as connected
  b=bundle();r=connected.reconstruct(b,'test-1A',3)
  self.assertTrue(r['mandatory_policy_entry_audit']['local_entries_verified'])
  self.assertGreaterEqual(r['mandatory_policy_entry_audit']['verified_count'],1)
  self.assertFalse(r['mandatory_policy_entry_audit']['origin_authenticated'])
  self.assertTrue(r['runtime']['mandatory_policy_journal']['entries'])
  self.assertTrue(r['runtime']['supported_trigger_coverage']['processing_order']['phase_order_verified'])
  self.assertFalse(r['ready_for_execution'])
if __name__=='__main__':unittest.main()
