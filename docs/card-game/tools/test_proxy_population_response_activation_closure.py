"""Activated status needs an actual group activation and full-delta audit."""
import copy,unittest
from test_proxy_population_board_group_effect import actual
from test_proxy_population_response_pass_effect import origin
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_population_response_group_closure as api
import proxy_population_trigger_window as window
import proxy_continuation_quick as quick


def fixture(card):
 b,a,event,r,h=actual(card)
 if not h:h=[origin(b,'egg_exchange_bottom','A')]
 h=h+[event];trace=[b,a];source=event['source_instance_id'];actor=event['actor']
 e=a
 # Existing119 starts ordinary priority after the complete initial group.
 with window.closed_start() if card in ('C-chicken','I-bowtie') else window.closed_native(r['after_ledger'],e['event_seq']):inv=quick.actions.response_inventory(e,initial(),h)
 assert inv['actor']==actor
 return e,h,inv,r['after_ledger'],[r],trace,[source]

class ResponseActivationClosureTests(unittest.TestCase):
 def run_case(self,callback):
  with connected.contract_scope():runtime.operation(initial(),lambda forced:callback())
 def test_real_start_arrival_and_end_activation_receipts_are_bound(self):
  def run():
   for card in ('C-chicken','I-bowtie','M-antlion-04','W-countryside'):
    args=fixture(card);p=api.audit(*args);self.assertEqual(p['errors'],[],card);self.assertEqual(p['verified_source_ids'],args[-1]);self.assertTrue(p['activation_delta_audits']);self.assertFalse(p['occurrence_origin_authenticated'])
   return {}
  self.run_case(run)
 def test_activated_status_without_actual_record_and_reoffered_source_fail(self):
  def run():
   args=fixture('C-chicken')
   for mode in ('missing','chosen','reoffer','history','decision'):
    bad=copy.deepcopy(args);e,h,inv,j,records,trace,wanted=bad
    if mode=='missing':records.clear()
    elif mode=='chosen':records[0]['chosen']['occurrence_id']='foreign'
    elif mode=='reoffer':inv['legal_candidate_details'].append(dict(source_instance_id=wanted[0],action_type='activate_board_ability'))
    elif mode=='history':h.pop(1)
    else:records[0]['decision']['selected_candidate']='foreign'
    with self.subTest(mode=mode):self.assertTrue(api.audit(*bad)['errors'])
   return {}
  self.run_case(run)
 def test_positive_four_actual_receipts_use_existing_conditional_adapter(self):
  from test_proxy_population_positive_activation_effect import actual as positive_actual
  from unittest.mock import patch
  import proxy_population_trigger_observation as observation
  import proxy_population_trigger_latching as latching
  class ConditionalAdapter(observation.Adapter):
   def enumerate(self,e,row):
    card=e['legacy_continuation']['game_state']['cards'][row['source_instance_id']]['card_id']
    return latching.current_actions(e,row) if card in latching.CARDS else super().enumerate(e,row)
  def run():
   for card in sorted(latching.CARDS):
    b,a,event,r=positive_actual(card);source=event['source_instance_id'];ctx=a['legacy_continuation']['response_context']
    # This supplied empty inventory exercises receipt binding, not native
    # timing capture/authentication; the full connected route is a separate gate.
    inv=dict(actor=ctx['priority_actor'],response_context=copy.deepcopy(ctx),legal_candidate_details=[]);h=[origin(b,'turn_start_and_normal_draw',b['legacy_continuation']['game_state']['turn_player']),event]
    with patch.object(observation,'Adapter',ConditionalAdapter):p=api.audit(a,h,inv,r['after_ledger'],[r],[b,a],[source])
    self.assertEqual(p['errors'],[],card);self.assertEqual(p['verified_source_ids'],[source]);self.assertTrue(p['activation_delta_audits'][0]['supplied_positive_activation_verified'])
   return {}
  self.run_case(run)
 def test_coherently_rehashed_extra_growth_still_fails_full_delta(self):
  import proxy_continuation_payments as payments
  def run():
   e,h,inv,j,records,trace,wanted=fixture('C-chicken');r=records[0];event=r['events'][0];e['legacy_continuation']['game_state']['players']['A']['growth']+=5
   changed=payments.transition_event(r['before_envelope'],e,event['action_type'],event['actor'],**{k:event[k] for k in ('source_instance_id','source_zone','selected_candidate','chain_link_id','target_instance_ids','payment','trigger_origin_event_seq','mandatory','source_reference')})
   r['after_envelope']=copy.deepcopy(e);r['events']=[changed];h[-1]=changed;trace[-1]=copy.deepcopy(e)
   self.assertTrue(any('full delta' in error for error in api.audit(e,h,inv,j,records,trace,wanted)['errors']))
   return {}
  self.run_case(run)
if __name__=='__main__':unittest.main()
