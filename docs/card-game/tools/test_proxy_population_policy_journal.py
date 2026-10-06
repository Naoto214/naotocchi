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
class OriginSequenceTests(unittest.TestCase):
 def test_no_choice_effect_still_consumes_resolution_ordinal(self):
  from test_proxy_population_effect_application_runtime import fixture
  from test_proxy_population_runtime import initial
  import proxy_population_runtime as runtime
  from proxy_population_policy_bridge import occurrence_key
  import proxy_continuation_state as state
  def run(forced):
   e,actor,_=fixture();key=occurrence_key(state.current(e))
   record=dict(binding=dict(protocol_id='unit',group_id='unit',mirror_side=actor+'_first'),
    runtime=dict(steps=[dict(source_envelope=e,events=[],envelopes=[])]),
    origin_journal={'initial_turn_start':dict(owner=actor,own_turn=1,kind='turn_start',ordinal=0),key:dict(owner=actor,own_turn=1,kind='effect_resolution',ordinal=1)},turn_counts={a:int(a==actor) for a in 'AB'})
   self.assertTrue(api.audit_origins(record)['origin_sequence_verified'])
   record['origin_journal'].pop(key)
   self.assertFalse(api.audit_origins(record)['origin_sequence_verified'])
   return {}
  runtime.operation(initial(),run)

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
  self.assertTrue(r['mandatory_opportunity_audit']['designated_opportunities_covered'])
  missing=copy.deepcopy(r);missing['runtime']['mandatory_policy_journal']['entries']=[]
  self.assertFalse(api.audit_opportunities(missing)['designated_opportunities_covered'])
  self.assertTrue(r['mandatory_origin_audit']['origin_sequence_verified'])
  self.assertFalse(r['mandatory_origin_audit']['all_rule_opportunities_proven'])
  for mutate in (lambda x:x['origin_journal'].clear(),lambda x:x['turn_counts'].update(A=99)):
   bad=copy.deepcopy(r);mutate(bad)
   self.assertFalse(api.audit_origins(bad)['origin_sequence_verified'])
 def test_existing_unit_trace_binds_all_turns_and_designated_choice_entries(self):
  from test_proxy_mandatory_population_input import bundle
  import proxy_population_connected_entry as connected
  r=connected.reconstruct(bundle(),'test-1A',220)
  self.assertTrue(r['completed']);self.assertTrue(r['mandatory_origin_audit']['origin_sequence_verified'])
  proof=r['mandatory_opportunity_audit'];self.assertTrue(proof['designated_opportunities_covered'])
  self.assertGreater(r['mandatory_origin_audit']['resolution_entry_count'],0)
  self.assertGreaterEqual(r['turn_counts']['A'],10);self.assertGreaterEqual(r['turn_counts']['B'],10)
  self.assertEqual(proof['required_choice_count'],r['mandatory_policy_entry_audit']['verified_count'])
  self.assertGreater(proof['required_choice_count'],1)
  bad=copy.deepcopy(r);bad['runtime']['mandatory_policy_journal']['entries'].pop()
  self.assertFalse(api.audit_opportunities(bad)['designated_opportunities_covered'])
  bad=copy.deepcopy(r);bad['runtime']['mandatory_policy_journal']['entries'][0]['frame']['game_state']['round']+=1
  self.assertFalse(api.audit_opportunities(bad)['designated_opportunities_covered'])
  # Unknown global opportunities are not promoted by designated coverage.
  self.assertFalse(proof['all_rule_opportunities_proven']);self.assertIsNone(proof['policy_eligible'])

if __name__=='__main__':unittest.main()
