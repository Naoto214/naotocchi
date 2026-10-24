"""A turn-start source stays negatively proven after a registered main/companion activation origin."""
import copy,unittest
from test_proxy_population_concealed_origin import activated
from test_proxy_population_prepared_activation_origin import receipted
from test_proxy_population_runtime import initial
import proxy_population_runtime as base
import proxy_population_challenge_window as connected
import proxy_population_board_predicates as api
import proxy_continuation_actions as actions
import proxy_continuation_state as state


def with_chicken(after):
 """The activator also keeps C-chicken on its board (group-023-B-first at 188)."""
 e=copy.deepcopy(after);g=e['legacy_continuation']['game_state'];p=g['players']['A']
 chicken=next(x for x in p['hand']+p['deck'] if g['cards'][x]['card_id']=='C-chicken')
 for zone in ('hand','deck'):
  if chicken in p[zone]:p[zone].remove(chicken)
 p['board']['companions'].append(chicken);state.validate(e);return e,chicken


def inventory(e):
 """Only the identity fields audit_response reads; the board negative never consults candidates."""
 ctx=e['legacy_continuation']['response_context'];return dict(actor=ctx['priority_actor'],response_context=copy.deepcopy(ctx),legal_candidate_details=[])


class StartSourceAfterActivationTests(unittest.TestCase):
 def run_case(self,callback):
  def run(forced):callback();return {}
  with connected.contract_scope():base.operation(initial(),run)

 def test_chicken_negative_is_proven_after_the_paid_draw_origin(self):
  def run():
   after,history,hidden=activated();e,chicken=with_chicken(receipted(after))
   self.assertEqual(e['legacy_continuation']['response_context']['priority_actor'],'A');self.assertEqual(history[-1]['action_type'],'activate_main_ability')
   proof=api.audit_response(e,history,inventory(e))
   self.assertEqual(proof['errors'],[]);self.assertIn(chicken,proof['verified_source_ids'])
   self.assertNotIn(chicken,[r['source_instance_id'] for r in proof['unproved_sources']])
  self.run_case(run)

 def test_unknown_own_turn_mechanism_stays_unproved(self):
  def run():
   after,history,hidden=activated();e,chicken=with_chicken(receipted(after))
   other=copy.deepcopy(history);other[-1]['action_type']='activate_unknown_ability'
   proof=api.audit_response(e,other,inventory(e))
   self.assertIn(chicken,[r['source_instance_id'] for r in proof['unproved_sources']])
  self.run_case(run)


if __name__=='__main__':unittest.main()
