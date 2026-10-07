"""Current end-trigger predicates for supplied native occurrences."""
import copy,unittest
from test_proxy_population_arrival_predicates import fixture
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_continuation_batch as batch
import proxy_population_trigger_existing as existing
import proxy_population_trigger_predicates as api


def end_fixture(card):
 e,h,o,targets=fixture('M-beetle-02');c=e['legacy_continuation'];g=c['game_state'];p=g['players']['A'];s=p['board']['main']
 if card!='M-beetle-02':
  s=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']==card)
  (p['hand'] if s in p['hand'] else p['deck']).remove(s)
  if card=='I-sleepboost1':
   p['board']['prepared'].append(s);e['runtime']['public_prepared'][s]=dict(controller='A',face_up=True,paid_time=2,placed_event_seq=1)
   e['runtime']['attachments'][s]=dict(controller='A',target_instance_id=p['board']['main'],attached_event_seq=1)
  else:
   slot='world' if card.startswith('W-') else 'partner';p['board'][slot]=s
   if slot=='partner':p['board']['partner_stage']=0
 p['time']=2;p['challenge_used']=False;g['phase']='turn_end_response';e['event_seq']=5
 c['response_context'].update(origin_event_seq=5,window_kind='after_normal_action',source_phase='turn_end')
 h=[dict(seq=1,actor='A',action_type='turn_start_and_normal_draw'),dict(seq=2,actor='A',action_type='use_item',source_instance_id=targets[0])]
 if card=='P-desert_scorpion':h.append(dict(seq=3,actor='A',action_type='use_play',source_instance_id=targets[1]))
 h.append(dict(seq=5,actor='A',action_type='open_turn_end_triggers',eligible_source_instance_ids=[s]))
 cap=batch.classification(card);o.update(source_instance_id=s,origin_event_seq=5,ability_key=cap['timing'],source_reference=cap['reference'])
 return e,h,o

class EndPredicateTests(unittest.TestCase):
 def setUp(self):self.assertTrue(hasattr(api,'audit_end'),'end audit missing')
 def test_all_four_sources_and_forged_alternatives(self):
  def run(forced):
   for card in ('M-beetle-02','W-countryside','P-desert_scorpion','I-sleepboost1'):
    e,h,o=end_fixture(card);rows,_=existing.ExistingAdapter(h).enumerate(e,o);self.assertEqual(len(rows),1,card)
    p=api.audit_end(e,o,rows,h);self.assertTrue(p['current_trigger_predicates_verified'],p['errors'])
    for bad in ([],rows+rows,[dict(rows[0],base_time_cost=2)],[dict(rows[0],target_instance_ids=['foreign'])]):self.assertTrue(api.audit_end(e,o,bad,h)['errors'])
   return {}
  runtime.operation(initial(),run)
 def test_end_conditions_are_current_and_turn_bounded(self):
  def run(forced):
   for card in ('M-beetle-02','W-countryside','P-desert_scorpion','I-sleepboost1'):
    e,h,o=end_fixture(card);p=e['legacy_continuation']['game_state']['players']['A']
    if card=='M-beetle-02':h.insert(-1,dict(seq=4,actor='A',action_type='main_movement',candidate_variant='time_skip',source_instance_id=o['source_instance_id']))
    elif card=='W-countryside':h.insert(-1,dict(h[1],seq=4))
    elif card=='P-desert_scorpion':h[1]['action_type']='set_item'
    else:p['time']=1
    rows,_=existing.ExistingAdapter(h).enumerate(e,o);self.assertEqual(rows,[],card);self.assertTrue(api.audit_end(e,o,rows,h)['current_trigger_predicates_verified'])
   return {}
  runtime.operation(initial(),run)
 def test_scope_and_missing_occurrence_membership(self):
  def run(forced):
   e,h,o=end_fixture('I-sleepboost1')
   with api.scope():rows,p=existing.ExistingAdapter(h).enumerate(e,o)
   self.assertTrue(p['current_predicate_audit']['current_trigger_predicates_verified'])
   h[-1]['eligible_source_instance_ids']=[]
   self.assertTrue(api.audit_end(e,o,rows,h)['errors'])
   self.assertTrue(api.audit_end(e,o,[],h)['current_trigger_predicates_verified'])
   return {}
  runtime.operation(initial(),run)
 def test_sleep_challenge_use_and_prior_turn_play_boundaries(self):
  def run(forced):
   for mode in ('challenge','used','prior_turn'):
    e,h,o=end_fixture('I-sleepboost1' if mode!='prior_turn' else 'P-desert_scorpion')
    if mode=='challenge':e['legacy_continuation']['game_state']['players']['A']['challenge_used']=True
    elif mode=='used':h.insert(-1,dict(seq=4,actor='A',action_type='activate_response',source_zone='board',source_instance_id=o['source_instance_id'],trigger_origin_event_seq=4))
    else:h[1]['seq']=0
    rows,_=existing.ExistingAdapter(h).enumerate(e,o);self.assertEqual(rows,[],mode)
    self.assertTrue(api.audit_end(e,o,rows,h)['current_trigger_predicates_verified'])
   return {}
  runtime.operation(initial(),run)

 def test_resolving_end_source_observation_retains_empty_scan(self):
  from test_proxy_population_prepared_predicates import link
  def run(forced):
   for card in ('M-beetle-02','W-countryside','P-desert_scorpion','I-sleepboost1'):
    e,h,o=end_fixture(card);rows,_=existing.ExistingAdapter(h).enumerate(e,o);link(e,'E-final-time')
    e['event_seq']=6;e['legacy_continuation']['response_context'].update(chain_status='resolving',consecutive_passes=2)
    self.assertTrue(api.audit_end(e,o,rows,h)['errors'])
    self.assertTrue(api.audit_end(e,o,[],h)['errors'])
    h.append(dict(seq=6,actor='B',action_type='response_pass'))
    with api.scope():proof=existing.ExistingAdapter(h).proof(e,6)
    self.assertEqual(proof['occurrences'],[])
   return {}
  runtime.operation(initial(),run)

if __name__=='__main__':unittest.main()
