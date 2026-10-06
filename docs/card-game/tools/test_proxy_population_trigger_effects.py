"""Positive current107 effects through the common119 activation contract."""
import copy,unittest
from test_proxy_population_paid_draw import fixture
from test_proxy_population_runtime import initial
import proxy_population_runtime as base
import proxy_population_trigger_latching as latching
import proxy_continuation_state as state
import proxy_continuation_batch as batch
try:import proxy_population_trigger_effects as api
except ImportError:api=None

def case(card):
 e,old,costs=fixture('M-antlion-08');g=e['legacy_continuation']['game_state'];p=g['players']['A'];source=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']==card)
 for z in ('hand','deck'):
  if source in p[z]:p[z].remove(source)
 if card.startswith('M-'):p['board']['main']=source;p['hand'].append(old)
 elif card=='C-bat':p['board']['companions'].append(source)
 else:p['board']['partner']=source
 if card in ('C-bat','M-antlion-03'):
  g['turn_player']='B';p['discard'].remove(costs[0]);p['board']['prepared'].append(costs[0]);e['runtime']['public_prepared'][costs[0]]=dict(controller='A',face_up=False,paid_time=1,placed_event_seq=2)
 if card=='M-antlion-06':
  worlds=[s for s in p['hand']+p['deck'] if g['cards'][s]['card_id'].startswith('W-')][:2]
  for s in worlds:
   for z in ('hand','deck'):
    if s in p[z]:p[z].remove(s)
  p['hand'].append(worlds[0]);p['discard'].append(worlds[1])
 cap=batch.classification(card);row=dict(origin_event_seq=3,source_instance_id=source,actor='A',category='optional',ability_key=cap['timing'],source_reference=cap['reference']);state.validate(e)
 return e,row

def resolving(e):
 e=copy.deepcopy(e);e['legacy_continuation']['response_context'].update(chain_status='resolving',consecutive_passes=2);return e

class EffectsTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'positive shared handler missing')
 def test_world_exchange_cost_is_atomic_and_invalid_target_never_refunds_or_retargets(self):
  def run(forced):
   e,row=case('M-antlion-06');action=latching.current_actions(e,row)[0][0];cost=action['cost_instance_ids'][0];target=action['target_instance_ids'][0]
   with api.scope():
    after,events=api.activate(e,action,row);p=after['legacy_continuation']['game_state']['players']['A'];self.assertNotIn(cost,p['hand']);self.assertEqual(p['deck'][-1],cost);self.assertEqual(events[0]['payment']['revealed_hand_world_to_bottom'],[cost]);self.assertEqual(latching.current_actions(after,row)[0],[])
    good=api.resolve(resolving(after),initial());self.assertIn(target,good['new_envelopes'][0]['legacy_continuation']['game_state']['players']['A']['hand'])
    invalid=resolving(after);p=invalid['legacy_continuation']['game_state']['players']['A'];p['discard'].remove(target);p['deck'].append(target);bad=api.resolve(invalid,initial());self.assertFalse(bad['new_events'][0]['result']['effect_applied']);self.assertIn(cost,bad['new_envelopes'][0]['legacy_continuation']['game_state']['players']['A']['deck'])
    self.assertEqual(api.validate_activation(after,events,e,action,row),[]);forged=copy.deepcopy(after);forged['runtime']['ability_uses']=[];self.assertTrue(api.validate_activation(forged,events,e,action,row))
   return {}
  base.operation(initial(),run)
 def test_bat_returns_facedown_without_inspecting_text_and_rechecks_target(self):
  def run(forced):
   e,row=case('C-bat');action=latching.current_actions(e,row)[0][0];target=action['target_instance_ids'][0]
   with api.scope():
    after,_=api.activate(e,action,row);result=api.resolve(resolving(after),initial());final=result['new_envelopes'][0];p=final['legacy_continuation']['game_state']['players']['A'];self.assertIn(target,p['hand']);self.assertNotIn(target,p['board']['prepared']);self.assertNotIn(target,final['runtime']['public_prepared']);self.assertTrue(result['new_events'][0]['result']['effect_applied'])
   return {}
  base.operation(initial(),run)
 def test_main_stat_choice_stays116_and_only_original_main_is_modified(self):
  def run(forced):
   import proxy_continuation_payments as payments
   e,row=case('M-antlion-03');action=latching.current_actions(e,row)[0][0]
   with api.scope():
    after,_=api.activate(e,action,row);result=api.resolve(resolving(after),initial());final=result['new_envelopes'][0];self.assertEqual(result['new_decisions'][0]['reason_code'],'strategic_unresolved_seeded_fallback');delta=payments.stat_delta(final,row['source_instance_id']);self.assertEqual(sum(delta.values()),1);self.assertEqual(final['runtime']['stat_effects'][0]['target_instance_id'],row['source_instance_id'])
    before=resolving(after);p=before['legacy_continuation']['game_state']['players']['A'];p['board']['main']=None;p['discard'].append(row['source_instance_id']);result=api.resolve(before,initial());self.assertEqual(result['new_decisions'],[]);self.assertEqual(result['new_envelopes'][0]['runtime']['stat_effects'],[])
   return {}
  base.operation(initial(),run)
 def test_goat_modifier_is_bound_to_same_partner_and_expires_and_egg_suppresses_resolution(self):
  def run(forced):
   import proxy_continuation_payments as payments
   e,row=case('P-cliff_goat');action=latching.current_actions(e,row)[0][0]
   with api.scope():
    after,_=api.activate(e,action,row);result=api.resolve(resolving(after),initial());final=result['new_envelopes'][0];effect=final['runtime']['payment_effects'][0];self.assertEqual(effect['payment_kind'],'relationship_same_source');self.assertEqual(effect['source_instance_id'],row['source_instance_id']);self.assertEqual(effect['amount'],1);final['legacy_continuation']['game_state']['phase']='turn_end';final['legacy_continuation']['response_context']['consecutive_passes']=2;expired=payments.expire(final);self.assertEqual(expired['new_envelopes'][0]['runtime']['payment_effects'],[])
    egg=resolving(after);p=egg['legacy_continuation']['game_state']['players']['A'];p['discard'].append(p['board']['main']);p['board']['main']=None;result=api.resolve(egg,initial());self.assertFalse(result['new_events'][0]['result']['effect_applied']);self.assertEqual(result['new_envelopes'][0]['runtime']['payment_effects'],[])
   return {}
  base.operation(initial(),run)
 def test_same_partner_discount_connects_existing_normal_progress_and_consumes_once(self):
  def run(forced):
   import proxy_continuation_candidates as candidates
   e,row=case('P-cliff_goat');e['legacy_continuation']['game_state']['players']['A']['board']['partner_stage']=0
   with api.scope():
    action=latching.current_actions(e,row)[0][0];after,_=api.activate(e,action,row);final=api.resolve(resolving(after),initial())['new_envelopes'][0];p=final['legacy_continuation']['game_state']['players']['A'];p['time']=0
    inv=candidates.audit(final,[]);options=[a for a in inv['legal_candidate_details'] if a['action_type']=='relationship'];self.assertEqual(len(options),1);self.assertEqual(options[0]['evidence']['payment_time'],0)
    result,events=batch.transition(final,options[0],[]);q=result['legacy_continuation']['game_state']['players']['A'];self.assertEqual(q['board']['partner_stage'],1);self.assertEqual(q['time'],0);self.assertTrue(q['relationship_progressed']);self.assertEqual(result['runtime']['payment_effects'],[]);self.assertEqual(events[0]['payment_time'],0);self.assertEqual(events[0]['envelope_before_sha256'],state.state_hash(final))
   return {}
  base.operation(initial(),run)

if __name__=='__main__':unittest.main()
