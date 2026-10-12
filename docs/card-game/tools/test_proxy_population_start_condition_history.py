"""Bind a start-negative condition to its original actual start boundary."""
import copy,unittest
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connection
import proxy_population_trigger_window as window
import proxy_population_start_obligations as starts
import proxy_continuation_end as end
import proxy_continuation_state as state
import proxy_continuation_quick as quick
from test_proxy_population_trigger_connection import both
from test_proxy_population_runtime import initial


def regular_start(count=3):
 e,_,_=both();e=runtime.engine.payments.upgrade(e);c=e['legacy_continuation'];g=c['game_state'];p=g['players']['A']
 chicken=p['board']['companions'].pop();p['hand'].append(chicken)
 main=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='M-beetle-01')
 for zone in ('hand','deck'):
  if main in p[zone]:p[zone].remove(main)
 p['board']['main']=main
 item=p['board']['prepared'][0];e['runtime']['attachments'][item]['target_instance_id']=main
 available=p['hand']+p['deck'];safe=[s for s in available if g['cards'][s]['card_id'].startswith(('M-','P-','C-'))][:count]
 p['hand']=safe[:count-1];p['deck']=safe[count-1:]+[s for s in available if s not in safe]
 e['event_seq']=5;g['phase']='turn_start';c['return_target']=None
 with end.end_scope(e,[],[],[e]):after,event,_=end.start_regular(state.current(e))
 opened=state.advance(e,after,event['seq']);proof=starts.collect(starts.capture(e),opened)
 return dict(before=e,opened=opened,event=event,proof=proof,item=item,shot=quick.old._snapshot(state.current(opened)))


class StartConditionHistoryTests(unittest.TestCase):
 def test_actual_start_with_three_cards_does_not_block_ordinary_response(self):
  with connection.contract_scope():
   prepared=runtime.operation(initial(),lambda forced:regular_start())
   e=prepared['opened'];proof=prepared['proof'];source=prepared['item']
   self.assertEqual(len(e['legacy_continuation']['game_state']['players']['A']['hand']),3)
   self.assertEqual(next(r for r in proof['classifications'] if r['source_instance_id']==source)['reason_code'],'hand_count_above_two')
   self.assertFalse(any(r['source_instance_id']==source for r in proof['occurrences']))
   result=window.segment(e,initial(),[prepared['event']],[prepared['shot']],[prepared['before'],e],1,proof)
  self.assertIsNone(result['stop'],result['stop']);self.assertEqual(len(result['steps']),1)
  step=result['steps'][0];self.assertTrue(step['response_source_predicate_coverage']['supplied_response_source_predicates_covered'])
  self.assertIn(source,step['response_board_predicates']['verified_source_ids'])


 def test_original_start_count_not_current_count_controls_the_negative(self):
  import proxy_population_board_predicates as api
  from test_proxy_population_response_pass_effect import origin
  def run(forced):
   for start_count,current_count in ((3,2),(2,3)):
    prepared=regular_start(start_count);opened=prepared['opened'];e=copy.deepcopy(opened);e['event_seq']+=1;p=e['legacy_continuation']['game_state']['players']['A']
    while len(p['hand'])>current_count:p['deck'].append(p['hand'].pop())
    while len(p['hand'])<current_count:p['hand'].append(p['deck'].pop(0))
    events=[prepared['event'],origin(e,'response_pass','A')];trace=[prepared['before'],opened,e]
    with window.closed_start():inventory=quick.actions.response_inventory(e,initial(),events)
    proof=api.audit_response(e,events,inventory,trace);self.assertEqual(proof['errors'],[])
    self.assertEqual(prepared['item'] in proof['verified_source_ids'],start_count==3)
    if start_count==3:
     condition=proof['start_negative_audits'][prepared['item']]['condition_at_start']
     self.assertEqual(condition['hand_count_at_start'],3);self.assertFalse(condition['history_authenticated']);self.assertEqual(condition['start_envelope_sha256'],state.canonical_sha256(opened))
    self.assertNotIn(prepared['item'],api.audit_response(e,events,inventory)['verified_source_ids'])
   return {}
  with connection.contract_scope():runtime.operation(initial(),run)

 def test_missing_or_changed_origin_evidence_never_certifies_a_negative(self):
  import proxy_population_board_predicates as api
  def run(forced):
   prepared=regular_start();e=prepared['opened'];events=[prepared['event']];trace=[prepared['before'],e]
   with window.closed_start():inventory=quick.actions.response_inventory(e,initial(),events)
   baseline=api.audit_response(e,events,inventory,trace);self.assertIn(prepared['item'],baseline['verified_source_ids'])
   for mode in ('missing_origin','missing_capture','duplicate','reverse','endpoint','event_hash','continuation_hash','start_hand','source_missing','reoffer'):
    h=copy.deepcopy(events);boundaries=copy.deepcopy(trace);inv=copy.deepcopy(inventory)
    if mode=='missing_origin':boundaries=boundaries[:1]
    elif mode=='missing_capture':boundaries=boundaries[1:]
    elif mode=='duplicate':boundaries.insert(0,copy.deepcopy(boundaries[0]))
    elif mode=='reverse':boundaries.reverse()
    elif mode=='endpoint':boundaries[-1]['legacy_continuation']['game_state']['players']['A']['time']+=1
    elif mode=='event_hash':h[0]['game_state_after_sha256']='0'*64
    elif mode=='continuation_hash':h[0]['continuation_state_after_sha256']='0'*64
    elif mode=='start_hand':
     p=boundaries[-1]['legacy_continuation']['game_state']['players']['A'];p['deck'].append(p['hand'].pop())
    elif mode=='source_missing':boundaries[0]['runtime']['attachments'].pop(prepared['item'])
    else:inv['legal_candidate_details'].append(dict(source_instance_id=prepared['item'],action_type='activate_board_ability'))
    proof=api.audit_response(e,h,inv,boundaries)
    with self.subTest(mode=mode):self.assertTrue(proof['errors'] or prepared['item'] not in proof['verified_source_ids'])
   return {}
  with connection.contract_scope():runtime.operation(initial(),run)

if __name__=='__main__':unittest.main()
