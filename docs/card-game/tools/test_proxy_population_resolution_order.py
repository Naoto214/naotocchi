"""06 order checks over conditional existing resolver output, not a new match."""
import copy,unittest
from unittest.mock import patch
from test_proxy_population_trigger_latching import case
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_continuation_state as state
import proxy_population_chain_resolution as chain
try:import proxy_population_resolution_order as api
except ImportError:api=None

class ResolutionOrderTests(unittest.TestCase):
 def run_case(self,check):
  def run(forced):
   envelope,*_=case();before=state.current(envelope);top=before['activation_zone'][-1];top['candidate_variant']=None
   game=before['game_state'];owner=game['players']['A'];outer=[]
   for n,card in enumerate(('G-hit-blow','E-first-date')):
    source=next(s for s in owner['hand']+owner['deck'] if game['cards'][s]['card_id']==card)
    (owner['hand'] if source in owner['hand'] else owner['deck']).remove(source)
    outer.append(dict(link_id='outer-'+str(n),action_type='use_play' if n==0 else 'use_event',actor='A',card_id=card,card_copy_id=game['cards'][source]['card_copy_id'],source_instance_id=source,target_instance_ids=[],candidate_variant='main' if n==0 else None,payment=dict(time=1)))
   before['activation_zone']=outer+[top];before['response_context']['chain_links']=[r['link_id'] for r in before['activation_zone']]
   before['continuation_state_sha256']=runtime.engine.base.old.start._hash(before)
   after,event=chain.resolve_top(before)
   step=dict(source_envelope=dict(legacy_continuation=before),envelopes=[dict(legacy_continuation=after)],final_envelope=dict(legacy_continuation=after),events=[event],decision=None)
   check(step);return {}
  runtime.operation(initial(),run)
 def test_top_link_and_ordered_remainder_are_checked_without_admission(self):
  self.assertIsNotNone(api)
  def check(step):
   proof=api.audit(step)
   self.assertTrue(proof['resolution_order_verified'],proof['errors'])
   self.assertEqual(proof['outer_link_count'],2)
   self.assertFalse(proof['effect_semantics_proven']);self.assertFalse(proof['all_rule_opportunities_proven'])
   self.assertFalse(proof['origin_authenticated']);self.assertIsNone(proof['balance_admitted'])
  self.run_case(check)
 def test_wrong_link_outer_loss_reorder_and_interruption_are_rejected(self):
  self.assertIsNotNone(api)
  def check(step):
   for mutate in (
    lambda s:s['events'][0].update(chain_link_id='outer-0'),
    lambda s:s['events'][0].update(source_instance_id='different-source'),
    lambda s:s['events'][0].update(actor='B'),
    lambda s:s['events'][0].update(action_type='activate_response'),
    lambda s:s.update(decision={'selected_candidate':'response-pass'}),
    lambda s:s['envelopes'][0]['legacy_continuation']['activation_zone'].reverse(),
    lambda s:s['envelopes'][0]['legacy_continuation']['activation_zone'].pop(),
    lambda s:s['envelopes'][0]['legacy_continuation']['response_context'].update(chain_status='building'),
    lambda s:s['source_envelope']['legacy_continuation']['response_context']['chain_links'].reverse(),
    lambda s:s['events'].append(copy.deepcopy(s['events'][0]))):
    bad=copy.deepcopy(step);mutate(bad)
    self.assertFalse(api.audit(bad)['resolution_order_verified'])
  self.run_case(check)
 def test_non_resolution_is_not_a_vacuous_resolution_proof(self):
  self.assertIsNotNone(api)
  proof=api.audit(dict(source_envelope=dict(legacy_continuation=dict(response_context=dict(chain_status='empty')))))
  self.assertFalse(proof['applicable']);self.assertFalse(proof['resolution_order_verified']);self.assertFalse(proof['errors'])
 def test_source_drift_is_rejected(self):
  self.assertIsNotNone(api)
  with patch.object(api,'SOURCE_SHA','0'*64):
   self.run_case(lambda s:self.assertFalse(api.audit(s)['resolution_order_verified']))

if __name__=='__main__':unittest.main()
