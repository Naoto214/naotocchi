"""Inside the turn-start window a declined arrival group source is not reoffered by the ordinary inventory."""
import unittest
from test_proxy_population_city_predicates import fixture as city_fixture
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_population_trigger_window as api
import proxy_population_opportunity_ledger as ledger
import proxy_continuation_triggers as triggers
import proxy_continuation_actions as actions
import proxy_continuation_state as state


def fixture():
 """Turn-start window of A (origin 3); A's second play at 5 raised the W-city group, which A declined.

 group-012-B-first 243..247 and group-014-A-first 191..194 share this shape.
 """
 e,h,o=city_fixture();c=e['legacy_continuation'];c['response_context'].update(window_kind='turn_start',origin_event_seq=3,response_opportunity_index=3)
 start=dict(origin_event_seq=3,source_instance_id='A-015#1',actor='A',category='optional',ability_key='own_start_reveal_companion',source_reference='70-companion-26-card-text-draft.md#C-chicken')
 journal=ledger.observe(ledger.create('A'),[start,o],'empty')
 while ledger.offer(journal) is not None:journal=ledger.consume(journal,ledger.offer(journal)['decline_candidate_id'])
 assert {r['status'] for r in journal['occurrences'].values()}=={'declined'}
 return e,h,o,journal


class StartWindowArrivalClosureTests(unittest.TestCase):
 def run_case(self,callback):
  def run(forced):callback();return {}
  with connected.contract_scope():return runtime.operation(initial(),run)

 def test_declined_arrival_source_is_closed_in_the_start_window_like_the_other_modes(self):
  def run():
   e,h,o,journal=fixture();source=o['source_instance_id'];current=state.current(e)
   # The start-only closure (previous behaviour) still enumerates the declined group source.
   with api.closed_start():
    rows,_=triggers.board_candidates(current,h,source,'world',e['runtime']);self.assertEqual([r['candidate_id'] for r in rows],['response-activate-ability-'+source])
   with api.inventory_closure('start',journal,e['event_seq']):
    rows,reason=triggers.board_candidates(current,h,source,'world',e['runtime'])
    self.assertEqual(rows,[]);self.assertEqual(reason['reason_code'],'initial_trigger_occurrence_closed')
    self.assertEqual(actions.start_attachments(e,'A'),[])
   # Start rows stay with closed_start; only arrivals are handed to the native closure.
   self.assertEqual([r['occurrence']['source_instance_id'] for r in api.arrival_rows(journal)['occurrences'].values()],[source])
   with api.inventory_closure('end',journal,e['event_seq']):
    self.assertEqual(triggers.board_candidates(current,h,source,'world',e['runtime'])[0],[])
   # A still-pending arrival row is not closed: the sequential step owns it until a receipt exists.
   pending=ledger.observe(ledger.create('A'),[o],'empty')
   with api.inventory_closure('start',pending,e['event_seq']):
    self.assertEqual(len(triggers.board_candidates(current,h,source,'world',e['runtime'])[0]),1)
  self.run_case(run)


if __name__=='__main__':unittest.main()
