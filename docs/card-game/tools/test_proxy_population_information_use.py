"""Conditional information-use regressions, not an all-path access proof.

Only existing local fixtures and physical copies are permuted. No sampled
orders, production seeds, policy promotion or new evaluation values.
"""
import copy, unittest
import proxy_continuation_quick as quick
import proxy_continuation_state as state
import proxy_population_challenge_window as window
import proxy_population_runtime as runtime
from proxy_mandatory_policy_contract import canonical
from test_proxy_population_loss_reward import fixture
from test_proxy_population_runtime import initial


def supplied(phase, card='E-boss'):
 e,actor,source,events=fixture();g=e['legacy_continuation']['game_state'];p=g['players'][actor]
 # Move actual existing copies; do not replace their definitions/metadata.
 if card!='E-boss':source=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']==card)
 available=p['hand']+p['deck'];p['hand']=[source];p['deck']=[s for s in available if s!=source]
 g['phase']=phase
 if phase=='response_window':e['legacy_continuation']['response_context']['origin_event_seq']=3
 return e,actor,source,events


def execute(e,events,forced):
 supplied_input=initial();history=copy.deepcopy(events)
 if e['legacy_continuation']['game_state']['phase']=='response_window':
  supplied_input['order_id']='unit-only';current=state.current(e)
  history.append(dict(seq=3,action_type='response_pass',actor=current['game_state']['turn_player'],
   game_state_after_sha256=quick.old.start.opening._stop_state_sha256(current['game_state']),
   continuation_state_after_sha256=quick.old.start._hash(current)))
 # Hashes bind each supplied hidden variant separately. State hashes are not
 # public information and are not compared as if they were part of the view.
 return runtime._step(e,supplied_input,history,[],[e],forced)


class InformationUseTests(unittest.TestCase):
 def run_scoped(self,body):
  with window.contract_scope():runtime.operation(initial(),body)

 def assert_unadmitted(self,step):
  self.assertIsNone(step['policy_eligible']);self.assertIsNone(step['balance_admitted'])
  self.assertFalse(step['ready_for_execution'])
  self.assertIsNone(step['evaluation']['policy_eligible']);self.assertIsNone(step['evaluation']['balance_admitted'])

 def test_hidden_permutations_preserve_entire_actual_normal_and_response_decisions(self):
  def run(forced):
   for card in ('E-boss','G-hit-blow','I-c_coin2'):
    for phase in ('normal_action','response_window'):
     e,actor,source,history=supplied(phase,card);g=e['legacy_continuation']['game_state']
     baseline=execute(e,history,forced);view=state.visible(e,actor);self.assert_unadmitted(baseline)
     if phase=='normal_action' and card!='E-boss':
      # Existing114 currently selects pass here despite legal reveal actions;
      # this regression does not redefine certainty or their relative value.
      self.assertEqual(baseline['decision']['selected_candidate'],'pass')
      rows=baseline['decision']['inventory']['legal_candidate_details']
      self.assertEqual(sum(r.get('source_instance_id')==source for r in rows),7 if card=='G-hit-blow' else 1)
      self.assertEqual(baseline['evaluation']['legacy_116'],'not_observed_in_this_record')
     else:
      self.assertEqual(baseline['decision']['selected_action']['source_instance_id'],source)
      self.assertEqual(baseline['evaluation']['legacy_116'],'excluded')
     for mode in ('own_reverse','opponent_reverse','both_rotate','opponent_exchange_first','opponent_exchange_last'):
      changed=copy.deepcopy(e);cg=changed['legacy_continuation']['game_state'];own=cg['players'][actor];other=cg['players']['B' if actor=='A' else 'A']
      if mode=='own_reverse':own['deck'].reverse()
      elif mode=='opponent_reverse':other['deck'].reverse()
      elif mode=='both_rotate':
       for p in cg['players'].values():p['deck']=p['deck'][1:]+p['deck'][:1]
      else:
       i=0 if mode.endswith('first') else -1
       other['hand'][i],other['deck'][i]=other['deck'][i],other['hand'][i]
      with self.subTest(card=card,phase=phase,mode=mode):
       self.assertNotEqual(canonical(changed),canonical(e))
       self.assertEqual(cg['cards'],g['cards'])
       for owner in ('A','B'):
        for zone in ('hand','deck'):self.assertEqual(len(cg['players'][owner][zone]),len(g['players'][owner][zone]))
        self.assertCountEqual(cg['players'][owner]['hand']+cg['players'][owner]['deck'],g['players'][owner]['hand']+g['players'][owner]['deck'])
       self.assertEqual(state.visible(changed,actor),view)
       before=copy.deepcopy(changed);step=execute(changed,history,forced)
       self.assertEqual(changed,before)
       self.assertEqual(canonical(step['decision']),canonical(baseline['decision']))
       self.assertEqual(step['evaluation'],baseline['evaluation']);self.assert_unadmitted(step)
   return {}
  self.run_scoped(run)

 def test_public_time_changes_actual_candidate_and_choice(self):
  def run(forced):
   for phase in ('normal_action','response_window'):
    e,actor,source,history=supplied(phase);baseline=execute(e,history,forced)
    changed=copy.deepcopy(e);changed['legacy_continuation']['game_state']['players'][actor]['time']=0
    self.assertNotEqual(state.visible(changed,actor),state.visible(e,actor))
    step=execute(changed,history,forced)
    with self.subTest(phase=phase):
     self.assertNotEqual(canonical(step['decision']),canonical(baseline['decision']))
     self.assertNotEqual(step['decision']['selected_action'].get('source_instance_id'),source)
     self.assertEqual(step['events'][0]['action_type'],'normal_pass_end_request' if phase=='normal_action' else 'response_pass')
     self.assert_unadmitted(step)
   return {}
  self.run_scoped(run)

 def test_public_loss_history_changes_choice_with_same_current_visible_state(self):
  def run(forced):
   for phase in ('normal_action','response_window'):
    e,actor,source,history=supplied(phase);baseline=execute(e,history,forced)
    # Public history is an allowed input in addition to current visible state.
    # A prior draw supplies no loss entitlement for E-boss.
    changed=copy.deepcopy(history);changed[-1]['result']=dict(outcome='draw')
    step=execute(e,changed,forced)
    with self.subTest(phase=phase):
     self.assertEqual(state.visible(step['source_envelope'],actor),state.visible(baseline['source_envelope'],actor))
     self.assertNotEqual(canonical(step['decision']),canonical(baseline['decision']))
     self.assertNotEqual(step['decision']['selected_action'].get('source_instance_id'),source)
     self.assert_unadmitted(step)
   return {}
  self.run_scoped(run)


if __name__=='__main__':unittest.main()
