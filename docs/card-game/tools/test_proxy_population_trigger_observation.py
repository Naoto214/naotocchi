"""Actual event addresses, no retroactive optional-trigger revival."""
import unittest
from unittest.mock import patch
import proxy_population_opportunity_ledger as ledger
from test_proxy_population_trigger_existing import case
from test_proxy_population_opportunity_ledger import occurrence
import proxy_population_trigger_existing as existing
try:import proxy_population_trigger_observation as api
except ImportError:api=None

class ObservationTests(unittest.TestCase):
 def test_same_origin_is_observed_once_and_resolution_is_deferred(self):
  self.assertIsNotNone(api)
  e=dict(event_seq=3);event=dict(seq=3,actor='A',action_type='resolve_board_ability');row=occurrence('A-001#1','A','optional');row['origin_event_seq']=3
  proof=dict(occurrences=[row],unproved_sources=[],opportunity_completeness_proven=False)
  with patch.object(existing.ExistingAdapter,'proof',return_value=proof):
   first,p=api.observe(ledger.create('A'),e,event,[event],'resolving')
   self.assertIsNone(ledger.offer(first))
   again,_=api.observe(first,e,event,[event],'resolving')
   self.assertEqual(first,again)
   released=ledger.release(first,[]);self.assertIsNotNone(ledger.offer(released))
 def test_past_unrecorded_origin_is_not_repaired_by_a_later_event(self):
  self.assertIsNotNone(api)
  e=dict(event_seq=3);event=dict(seq=3,actor='A',action_type='place_world');row=occurrence('A-001#1','A','optional');row['origin_event_seq']=2
  proof=dict(occurrences=[row],unproved_sources=[],opportunity_completeness_proven=False)
  l=ledger.create('A')
  with patch.object(existing.ExistingAdapter,'proof',return_value=proof):
   after,p=api.observe(l,e,event,[event],'empty')
  self.assertEqual(after,l);self.assertEqual(p['not_new_occurrences'],[row])
if __name__=='__main__':unittest.main()
