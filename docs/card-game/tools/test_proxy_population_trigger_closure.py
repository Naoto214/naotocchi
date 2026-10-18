import copy,unittest
from test_proxy_population_opportunity_ledger import occurrence
from test_proxy_population_start_obligations import fixture
import proxy_population_opportunity_ledger as ledger
import proxy_population_trigger_sequential as api

class ClosureTests(unittest.TestCase):
 def test_pending_or_deferred_occurrences_cannot_disappear_at_next_turn(self):
  self.assertTrue(hasattr(api,'close_turn'),'cross-turn trigger closure absent')
  e,actor,source=fixture();c=e['legacy_continuation'];c['game_state']['phase']='turn_end';c['activation_zone']=[];c['pending_triggers']=[];e['event_seq']=10
  for status in ('empty','resolving'):
   journal=ledger.observe(ledger.create(actor),[occurrence(source,actor,'optional')],status)
   with self.assertRaisesRegex(ValueError,'unfinished'):api.close_turn(journal,e)
 def test_closed_bookkeeping_is_preserved_without_claiming_origin_or_execution(self):
  self.assertTrue(hasattr(api,'close_turn'))
  e,actor,source=fixture();c=e['legacy_continuation'];c['game_state']['phase']='turn_end';c['activation_zone']=[];c['pending_triggers']=[];e['event_seq']=10
  journal=ledger.observe(ledger.create(actor),[occurrence(source,actor,'optional')],'empty');journal=ledger.consume(journal,ledger.offer(journal)['decline_candidate_id'])
  result=api.close_turn(journal,e);self.assertEqual(result['ledger'],journal);self.assertFalse(result['opportunity_completeness_proven']);self.assertFalse(result['origin_authenticated'])
  c['activation_zone']=[{'link_id':'unresolved'}]
  with self.assertRaises(ValueError):api.close_turn(journal,e)

if __name__=='__main__':unittest.main()
