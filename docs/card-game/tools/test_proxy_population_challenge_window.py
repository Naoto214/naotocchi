import copy,unittest
import test_proxy_continuation_challenge as fixtures
from test_proxy_population_runtime import initial
import proxy_population_runtime as base
import proxy_population_trigger_existing as existing
import proxy_continuation_state as state
import proxy_continuation_payments as payments
try:import proxy_population_challenge_window as api
except ImportError:api=None

class ChallengeWindowTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'challenge sequential connection absent')
 def test_normal_declaration_observes_partner_and_continues_comparison(self):
  h=fixtures.ChallengeTests();h.setUp()
  def build(forced):
   e=payments.upgrade(h.e);g=e['legacy_continuation']['game_state'];g['phase']='normal_action';actor=g['turn_player'];p=g['players'][actor]
   for card,slot in [('P-anglerfish','partner'),('W-deepsea','world')]:
    source=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']==card)
    (p['hand'] if source in p['hand'] else p['deck']).remove(source)
    if p['board'][slot]:p['discard'].append(p['board'][slot])
    p['board'][slot]=source
   p['board']['partner_stage']=0
   for owner in g['players'].values():owner['deck'].extend(owner['hand']);owner['hand']=[];owner['time']=0
   # This conditional prefix supplies the current-turn boundary, while still
   # deliberately omitting complete snapshots for the later end-history gate.
   event=dict(seq=e['legacy_continuation']['response_context']['origin_event_seq'],actor=actor,action_type='turn_start_and_normal_draw',fixture_only=True);history=[event]
   with api.contract_scope():proof=existing.ExistingAdapter(history).proof(e)
   return dict(envelope=e,history=history,proof=proof,partner=p['board']['partner'])
  built=base.operation(initial(),build);e=built['envelope'];history=built['history'];proof=built['proof'];partner=built['partner']
  r=api.segment(e,initial(),history,[],[e],12,proof)
  self.assertEqual(r['stop']['detail'],'end history event/snapshot coverage differs');self.assertEqual(r['events'][0]['action_type'],'challenge_declared')
  occurrences=[x for p in r['other_occurrence_proofs'] for x in p['new_occurrences']]
  self.assertIn(partner,[x['source_instance_id'] for x in occurrences])
  self.assertTrue(r['trigger_records']);self.assertIn('challenge_compared',[x['action_type'] for x in r['events']]);self.assertIn('challenge_finished',[x['action_type'] for x in r['events']]);self.assertFalse(r['ready_for_execution'])
  self.assertTrue(any(x['decision']['reason_code']=='strategic_unresolved_seeded_fallback' for x in r['trigger_records']))
  self.assertEqual(api.validate(r,e,initial(),history,[],[e],12,proof),[])

class MultiTurnConnectionTests(unittest.TestCase):
 def test_existing_unit_prefix_crosses_multiple_turns_with_all_histories(self):
  from test_proxy_mandatory_population_input import bundle
  from proxy_population_opening import reconstruct_opening
  from proxy_population_policy_bridge import Session
  prefix=reconstruct_opening(bundle(),'test-1A');e=prefix['final_envelope'];cards=e['legacy_continuation']['game_state']['cards'];shots=[]
  for snap in prefix['snapshots'][:2]:
   g=copy.deepcopy(snap['state']);g['cards']=copy.deepcopy(cards)
   shots.append(dict(event_seq=snap['seq'],game_state=g,game_state_sha256=snap['state_sha256'],continuation_state=None,continuation_state_sha256=None))
  shots.append(base.engine.base.old._snapshot(state.current(e)))
  i=initial();i.update(path_id='test-1A',order_id='test-1');i['inputs']['path_id']=i['path_id']
  session=Session(dict(protocol_id='policy_conditional_population.v1',group_id='test-1',mirror_side='A_first'),{'A':'00'*32,'B':'00'*32});session.turn_start('A','opening')
  def prepare(forced):
   upgraded=payments.upgrade(e)
   with api.contract_scope():proof=existing.ExistingAdapter(prefix['events']).proof(upgraded)
   return dict(envelope=upgraded,proof=proof)
  prepared=base.operation(i,prepare);e=prepared['envelope']
  r=api.segment(e,i,prefix['events'],shots,[e],220,prepared['proof'],session)
  import json
  from pathlib import Path
  Path('/tmp/card-game-multiturn-diagnostic.json').write_text(json.dumps(dict(stop=r['stop'],events=[x['action_type'] for x in r['events']],last=r['final_envelope']['legacy_continuation']['game_state']['round']),indent=2))
  self.assertIsNone(r['stop']);self.assertTrue(r['completed']);self.assertEqual(r['events'][-1]['action_type'],'r10_final_comparison')
  self.assertTrue(r['supported_trigger_coverage']['covered'],r['supported_trigger_coverage'])
  self.assertEqual(len(r['supported_trigger_coverage']['transitions']),len(r['events']))
  self.assertEqual(r['supported_trigger_coverage']['pending_count'],0)
  lifetime=r['supported_trigger_coverage']['challenge_lifetime_audits'];self.assertEqual(len(lifetime),len(r['events']))
  self.assertEqual([p['applicable'] for p in lifetime],[event['action_type'] in ('challenge_compared','challenge_finished') for event in r['events']])
  payments_audit=r['supported_trigger_coverage']['payment_consumption_audits'];self.assertEqual(len(payments_audit),len(r['events']))
  self.assertEqual([p['payment_consumption_verified'] for p in payments_audit],[event['action_type']=='main_movement' for event in r['events']])
  order=r['supported_trigger_coverage']['processing_order'];self.assertTrue(order['phase_order_verified'])
  self.assertEqual(sum(order[k] for k in ('ordinary_normal_count','ordinary_response_count','automatic_step_count','sequential_trigger_step_count')),len(r['steps']))
  self.assertGreaterEqual(sum(x['action_type']=='turn_end_completed' for x in r['events']),18,r['stop'])
  self.assertGreaterEqual(session.counts['A'],2);self.assertGreaterEqual(session.counts['B'],1)
  self.assertFalse(r['ready_for_execution'])

if __name__=='__main__':unittest.main()
