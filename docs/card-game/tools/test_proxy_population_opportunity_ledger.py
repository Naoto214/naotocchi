"""06 public trigger ordering, no experiment sampling or card preferences."""
import copy,unittest
try:import proxy_population_opportunity_ledger as api
except ImportError:api=None

def occurrence(name,actor,kind,event=1):
 return dict(origin_event_seq=event,source_instance_id=name,actor=actor,category=kind,ability_key='test_ability',source_reference='06-action-chain-checkpoint.md')

class LedgerTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api)
 def test_fixed_categories_preserve_player_choice_inside_a_group(self):
  ledger=api.create('A')
  rows=[occurrence('B-001#1','B','optional'),occurrence('A-002#1','A','optional'),occurrence('A-001#1','A','optional'),occurrence('B-002#1','B','forced'),occurrence('A-003#1','A','forced')]
  ledger=api.observe(ledger,rows,'building')
  self.assertEqual(api.offer(ledger)['actor'],'A');self.assertEqual(api.offer(ledger)['category'],'forced')
  for actor in ('A','B'):
   offer=api.offer(ledger);self.assertEqual(offer['actor'],actor);self.assertEqual(len(offer['candidate_ids']),1);ledger=api.consume(ledger,offer['candidate_ids'][0])
  offer=api.offer(ledger);self.assertEqual(offer['actor'],'A');self.assertEqual(len(offer['candidate_ids']),3)
  options=[k for k,v in offer['actions'].items() if v['action']=='activate'];ledger=api.consume(ledger,options[-1]);self.assertEqual(api.offer(ledger)['actor'],'A')
  ledger=api.consume(ledger,api.offer(ledger)['decline_candidate_id']);self.assertEqual(api.offer(ledger)['actor'],'B')
 def test_decline_closes_occurrences_but_does_not_consume_once_per_turn_usage(self):
  source=occurrence('A-001#1','A','optional');ledger=api.observe(api.create('A'),[source],'empty');offer=api.offer(ledger);ledger=api.consume(ledger,offer['decline_candidate_id'])
  self.assertIsNone(api.offer(ledger));self.assertEqual(next(iter(ledger['occurrences'].values()))['status'],'declined')
  with self.assertRaises(ValueError):api.observe(ledger,[source],'empty')
  later=dict(source,origin_event_seq=2);self.assertIsNotNone(api.offer(api.observe(ledger,[later],'empty')))
 def test_resolution_triggers_wait_for_entire_chain_and_forced_cannot_decline(self):
  ledger=api.observe(api.create('B'),[occurrence('A-001#1','A','forced')],'resolving');self.assertIsNone(api.offer(ledger))
  with self.assertRaises(ValueError):api.release(ledger,chain_link_ids=['outer'])
  ledger=api.release(ledger,chain_link_ids=[]);offer=api.offer(ledger);self.assertIsNone(offer['decline_candidate_id'])
  with self.assertRaises(ValueError):api.consume(ledger,'decline')
 def test_canonical_journal_replay_rejects_missing_ordered_or_typed_evidence(self):
  ledger=api.observe(api.create('A'),[occurrence('A-001#1','A','optional')],'empty');ledger=api.consume(ledger,api.offer(ledger)['decline_candidate_id'])
  self.assertEqual(api.audit(ledger),[])
  bad=copy.deepcopy(ledger);bad['journal'].reverse();self.assertTrue(api.audit(bad))
  bad=copy.deepcopy(ledger);bad['journal'][0]['occurrences'][0]['origin_event_seq']=True;self.assertTrue(api.audit(bad))
  bad=copy.deepcopy(ledger);bad['occurrences']={};self.assertTrue(api.audit(bad))
  self.assertFalse(ledger['opportunity_completeness_proven']);self.assertIsNone(ledger['balance_admitted'])
if __name__=='__main__':unittest.main()
