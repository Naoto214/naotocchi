"""06: an occurrence met during chain resolution keeps the window driving until it is offered.

group-005-A-first 162..164 shape: M-antlion-06 (after_own_quick_effect_applied)
is met when E-first-date resolves under the W-city link (deferred), released
when the W-city link resolves and the chain is empty, and the same step returns
to normal_action. The window must still offer it before the next ordinary step.
"""
import inspect,unittest
import proxy_population_opportunity_ledger as ledger
import proxy_population_trigger_window as window

ANTLION=dict(origin_event_seq=163,source_instance_id='A-006#1',actor='A',category='optional',ability_key='after_own_quick_effect_applied',source_reference='55-insect-three-lines-card-text-draft.md#M-antlion-06')
CITY=dict(origin_event_seq=158,source_instance_id='A-020#1',actor='A',category='optional',ability_key='second_own_card',source_reference='89-world-13-card-text-draft.md#W-city')


class ChainResolutionOfferTests(unittest.TestCase):
 def journal(self):
  j=ledger.observe(ledger.create('A'),[CITY],'empty')
  return ledger.consume(j,ledger.identity(CITY))

 def test_deferred_then_released_occurrence_is_still_owed(self):
  j=ledger.observe(self.journal(),[ANTLION],'resolving')
  self.assertIsNone(ledger.offer(j));self.assertTrue(window.unresolved_occurrence(j))
  j=ledger.release(j,[])
  self.assertEqual(ledger.offer(j)['actions'][ledger.identity(ANTLION)],dict(action='activate',occurrence_id=ledger.identity(ANTLION)))
  self.assertTrue(window.unresolved_occurrence(j))

 def test_offered_once_then_closed_either_way(self):
  j=ledger.release(ledger.observe(self.journal(),[ANTLION],'resolving'),[])
  activated=ledger.consume(j,ledger.identity(ANTLION))
  self.assertFalse(window.unresolved_occurrence(activated));self.assertIsNone(ledger.offer(activated))
  declined=ledger.consume(j,ledger.offer(j)['decline_candidate_id'])
  self.assertFalse(window.unresolved_occurrence(declined));self.assertIsNone(ledger.offer(declined))
  with self.assertRaises(ValueError):ledger.observe(activated,[ANTLION],'empty')

 def test_closed_ledger_lets_the_window_go_inactive(self):
  self.assertFalse(window.unresolved_occurrence(self.journal()))
  self.assertFalse(window.unresolved_occurrence(ledger.create('A')))

 def test_window_reactivates_only_after_observation_on_return_to_ordinary_phase(self):
  body=inspect.getsource(window.segment)
  deactivate=body.index("else 'normal_action'):active=False");observe=body.index('r=observe_existing(r,e,history)',deactivate);keep=body.index('if not active and unresolved_occurrence(current_ledger):active=True',observe)
  self.assertLess(deactivate,observe);self.assertLess(observe,keep)


if __name__=='__main__':unittest.main()
