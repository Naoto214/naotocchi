import copy,unittest
import proxy_population_opportunity_ledger as ledger
from test_proxy_population_opportunity_ledger import occurrence
try:import proxy_population_trigger_coverage as api
except ImportError:api=None

class CoverageTests(unittest.TestCase):
 def test_missing_extra_and_duplicate_are_not_complete(self):
  self.assertIsNotNone(api)
  row=occurrence('A-001#1','A','optional');j=ledger.observe(ledger.create('A'),[row],'empty')
  self.assertTrue(api.reconcile([row],[j])['covered'])
  self.assertFalse(api.reconcile([row],[ledger.create('A')])['covered'])
  self.assertFalse(api.reconcile([],[j])['covered'])
  with self.assertRaises(ValueError):api.reconcile([row],[j,j])
  bad=copy.deepcopy(j);bad['occurrences'][ledger.identity(row)]['status']='declined'
  with self.assertRaises(ValueError):api.reconcile([row],[bad])
 def test_matching_ledger_does_not_prove_strategy_or_rules_authenticity(self):
  self.assertIsNotNone(api)
  row=occurrence('A-001#1','A','optional');j=ledger.observe(ledger.create('A'),[row],'empty')
  proof=api.reconcile([row],[j])
  self.assertFalse(proof['origin_authenticated']);self.assertFalse(proof['opportunity_completeness_proven'])
  self.assertEqual(proof['opportunity_scope'],'existing_executor_only')
  self.assertEqual(proof['pending_count'],1)
 def test_archived_boundary_is_bound_to_actual_envelope(self):
  from test_proxy_population_boundary_response import case
  import proxy_population_trigger_sequential as sequential
  from test_proxy_population_runtime import initial
  import proxy_population_runtime as runtime
  def run(forced):
   e=case('end');c=e['legacy_continuation'];c['game_state']['phase']='completed';c['activation_zone']=[];c['pending_triggers']=[]
   j=ledger.create(c['game_state']['turn_player']);archive=sequential.close_turn(j,e)
   result=dict(source_envelope=e,final_envelope=e,steps=[],completed=True,events=[],trigger_ledger=j,closed_turn_trigger_ledgers=[archive])
   self.assertTrue(api.audit(result,[],dict(occurrences=[]))['covered'])
   for key,value in [('boundary_event_seq',999),('boundary_envelope_sha256','0'*64),('round',999)]:
    bad=copy.deepcopy(result);bad['closed_turn_trigger_ledgers'][0][key]=value
    with self.subTest(key=key),self.assertRaises(ValueError):api.audit(bad,[],dict(occurrences=[]))
   return {}
  runtime.operation(initial(),run)
if __name__=='__main__':unittest.main()
