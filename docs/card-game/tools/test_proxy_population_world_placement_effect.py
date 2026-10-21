import copy,unittest
import test_proxy_population_payment_consumption as fixtures
from test_proxy_population_first_response import game_with
from proxy_population_start_window import _context
import proxy_continuation_candidates as candidates
import proxy_continuation_batch as batch
import proxy_continuation_payments as payments
import proxy_continuation_state as state
import proxy_population_incarnation_runtime as incarnation
try:import proxy_population_world_placement_effect as api
except ImportError:api=None

CARDS=('W-city','W-countryside','W-deepsea')

def actual(template,card,previous=None):
 b=copy.deepcopy(template);g=b['legacy_continuation']['game_state'];actor=g['turn_player'];p=g['players'][actor]
 if previous:
  source=next(s for s in p['hand'] if g['cards'][s]['card_id']==previous);p['hand'].remove(source);p['board']['world']=source
 action=next(a for a in candidates.audit(b,[])['legal_candidate_details'] if a['action_type']=='place_world' and a['card_id']==card)
 a,events=batch.transition(b,action,[]);return b,a,events[0]

def reentry():
 g,actor,source=game_with('W-city');g['phase']='normal_action';p=g['players'][actor];p['time']=10;p['hand'].remove(source);p['board']['world']=source
 e=payments.upgrade(state.create(dict(game_state=g,response_context=_context(actor,actor),activation_zone=[],pending_triggers=[],return_target='normal_action_opportunity'),2));connection=incarnation.Connection(e);before=copy.deepcopy(e)
 p=e['legacy_continuation']['game_state']['players'][actor];p['board']['world']=None;p['hand'].append(source);e['event_seq']+=1
 recovered=payments.transition_event(before,e,'unit_recovery',actor);connection.capture(before,e,recovered)
 with connection.scope():
  action=next(a for a in candidates.audit(e,[recovered])['legal_candidate_details'] if a['action_type']=='place_world' and a['source_instance_id']==source);after,events=batch.transition(e,action,[recovered])
 return e,after,events[0]

class WorldPlacementEffectTests(unittest.TestCase):
 run_case=fixtures.ConsumptionTests.run_case
 def setUp(self):self.assertIsNotNone(api,'world placement full delta absent')
 def test_three_worlds_initial_replacement_current107_single_copy_and_reentry(self):
  def run(template):
   for card in CARDS:
    for previous in (None,*CARDS):
     if previous==card:
      # Current107 has one physical copy of each world in this deck.
      with self.assertRaises(StopIteration):actual(template,card,previous)
      continue
     b,a,event=actual(template,card,previous);proof=api.audit(b,a,event)
     with self.subTest(card=card,previous=previous):self.assertEqual(proof['errors'],[]);self.assertTrue(proof['supplied_world_placement_verified']);self.assertFalse(proof['incarnation_origin_proven']);self.assertIsNone(proof['balance_admitted'])
   b,a,event=reentry();self.assertTrue(event['source_instance_id'].endswith('#2'));self.assertEqual(api.audit(b,a,event)['errors'],[]);return {}
  self.run_case(run)
 def test_payment_identity_relocation_and_unrelated_state_tampering_refused(self):
  def run(template):
   b,a,event=actual(template,'W-city','W-deepsea');actor=event['actor'];old=event['previous_world_instance_id']
   for mode in ('old','draw','growth','time','cost','previous','main','person','typed','metadata','reaction'):
    bad=copy.deepcopy(a);ev=copy.deepcopy(event);p=bad['legacy_continuation']['game_state']['players'][actor]
    if mode=='old':p['discard'].remove(old);p['hand'].append(old)
    elif mode=='draw':p['hand'].append(p['discard'].pop(0))
    elif mode=='growth':p['growth']+=5
    elif mode=='time':p['time']+=1
    elif mode=='cost':ev['payment_time']=1
    elif mode=='previous':ev['previous_world_instance_id']=None
    elif mode=='main':p['board']['main']=None
    elif mode=='person':p['person_placed']=not p['person_placed']
    elif mode=='typed':bad['runtime']['payment_effects']=[]
    elif mode=='metadata':bad['legacy_continuation']['game_state']['cards'][old]['card_id']='W-city'
    else:bad['legacy_continuation']['response_context']['consecutive_passes']=1
    with self.subTest(mode=mode):self.assertTrue(api.audit(b,bad,ev)['errors'])
   return {}
  self.run_case(run)
 def test_coverage_rejects_added_growth_even_with_updated_hashes(self):
  import proxy_population_trigger_coverage as coverage
  def run(template):
   b,a,event=actual(template,'W-city');a['legacy_continuation']['game_state']['players'][event['actor']]['growth']+=5
   ev=payments.transition_event(b,a,event['action_type'],event['actor'],**{k:event[k] for k in ('source_instance_id','previous_world_instance_id','payment_time','source_reference','candidate_variant','payment_effect_ids','selected_candidate')})
   try:coverage.audit(dict(source_envelope=b,steps=[dict(source_envelope=b,events=[ev],envelopes=[a],final_envelope=a)]),[],dict(occurrences=[]))
   except (ValueError,KeyError) as error:message=str(error)
   else:message='accepted extra growth'
   self.assertIn('world placement full delta',message);return {}
  self.run_case(run)

if __name__=='__main__':unittest.main()
