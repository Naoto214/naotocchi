"""Source arithmetic and full deltas for three deterministic growth effects."""
import copy,unittest
from test_proxy_population_effect_application_runtime import fixture
from test_proxy_population_trigger_latching import case
from test_proxy_population_runtime import initial
from test_proxy_population_return_challenge import in_battle
import proxy_population_runtime as runtime
import proxy_population_challenge_window as window
import proxy_population_boundary_response as boundary
import proxy_continuation_state as state
import proxy_continuation_payments as payments
import proxy_continuation_triggers as triggers
import proxy_continuation_actions as actions
try:import proxy_population_immediate_growth as api
except ImportError:api=None

def actual(card,growth=95,count=7,empty=(),mode='normal'):
 if card=='W-countryside':
  b,_,_,_=case();g=b['legacy_continuation']['game_state'];p=g['players']['A'];link=b['legacy_continuation']['activation_zone'][-1];p['discard'].append(link['source_instance_id'])
  source=next(s for s in p['deck']+p['hand'] if g['cards'][s]['card_id']==card);(p['deck'] if source in p['deck'] else p['hand']).remove(source)
  if p['board']['world']:p['discard'].append(p['board']['world'])
  p['board']['world']=source;p['growth']=growth
  link.update(source_instance_id=source,card_id=card,card_copy_id=g['cards'][source]['card_copy_id'],action_type='activate_board_ability',source_zone='board',candidate_variant=None,payment=dict(time=0))
 else:
  b,_,source=fixture(card,growth);g=b['legacy_continuation']['game_state'];p=g['players']['A'];link=b['legacy_continuation']['activation_zone'][-1]
  if count==6:p['hand'].append(p['board']['companions'].pop())
  for _ in range(max(0,count-7)):
   s=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id'].startswith('I-'));(p['hand'] if s in p['hand'] else p['deck']).remove(s);p['board']['prepared'].append(s);b['runtime']['public_prepared'][s]=dict(controller='A',face_up=False,paid_time=2,placed_event_seq=1)
 for actor in empty:g['players'][actor]['discard'].extend(g['players'][actor]['deck']);g['players'][actor]['deck']=[]
 c=b['legacy_continuation']
 if mode=='departed' and card=='W-countryside':p['board']['world']=None;p['discard'].append(source)
 if mode=='outer':
  outer=copy.deepcopy(link);outer['link_id']='supplied-outer';outer['card_id']='C-chicken';s=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='C-chicken');(p['hand'] if s in p['hand'] else p['deck']).remove(s);p['board']['companions'].append(s)
  outer.update(source_instance_id=s,card_copy_id=g['cards'][s]['card_copy_id'],source_zone='board',action_type='activate_board_ability',candidate_variant=None,payment=dict(time=0));c['activation_zone'].insert(0,outer);c['response_context']['chain_links'].insert(0,outer['link_id'])
 if mode in ('comparing','resolved'):b=in_battle(b,mode)
 r=triggers.resolve(state.current(b),initial()) if card=='W-countryside' else payments.resolve(b,initial())
 r=actions.normalize_resolution_result(b,r)
 if mode in ('start','end'):r=boundary.normalize(b,r,dict(kind=mode,turn_player='A',origin_event_seq=3))
 ev=r['new_events'][0];a=r['new_envelopes'][0] if 'new_envelopes' in r else state.advance(b,r['new_snapshots'][0]['continuation_state'],ev['seq'])
 return b,a,ev

class ImmediateGrowthTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'immediate growth audit absent')
 def run_case(self,callback):
  with window.contract_scope():return runtime.operation(initial(),lambda forced:callback())
 def test_area_resolution_counts_and_cap_without_redeciding_activation(self):
  def run():
   for count in (6,7,8,9):
    for growth in (0,95,98,100):
     b,a,ev=actual('G-area-claim',growth,count);p=api.audit(b,a,ev)
     with self.subTest(count=count,growth=growth):
      self.assertEqual(p['errors'],[]);self.assertEqual(p['requested_growth'],0 if count<7 else 15 if count>=9 else 10);self.assertFalse(p['activation_proven']);self.assertIsNone(p['balance_admitted'])
   return {}
  self.run_case(run)
 def test_boss_draws_and_countryside_growth_have_complete_application(self):
  def run():
   for card in ('E-boss','W-countryside'):
    for growth in (0,98,100):
     for empty in ((),('A',),('B',),('A','B')):
      b,a,ev=actual(card,growth,empty=empty);p=api.audit(b,a,ev)
      with self.subTest(card=card,growth=growth,empty=empty):
       self.assertEqual(p['errors'],[]);self.assertTrue(p['supplied_growth_resolution_verified']);self.assertEqual(p['effect_applied'],growth<100 or (card=='E-boss' and len(empty)<2))
   return {}
  self.run_case(run)
 def test_contexts_and_unproved_source_departure_refusal(self):
  def run():
   for card in ('G-area-claim','E-boss','W-countryside'):
    for mode in ('outer','start','end','comparing','resolved'):
     b,a,ev=actual(card,mode=mode)
     with self.subTest(card=card,mode=mode):self.assertEqual(api.audit(b,a,ev)['errors'],[])
   # Supplied links lack a departure activation receipt: do not bypass the existing guard.
   with self.assertRaisesRegex(ValueError,'source is not on owner board'):actual('W-countryside',mode='departed')
   return {}
  self.run_case(run)
 def test_consistent_false_operands_receipts_evidence_and_state_are_rejected(self):
  def run():
   for card in ('G-area-claim','E-boss','W-countryside'):
    b,a,ev=actual(card)
    for mode in ('growth','receipt','evidence','draw','refund','reservation','source','dispatch'):
     bad=copy.deepcopy(a);event=copy.deepcopy(ev);p=bad['legacy_continuation']['game_state']['players']['A'];receipt=event['result'] if card=='W-countryside' else event['created_effect']
     if mode=='growth':p['growth']-=1
     elif mode=='receipt':receipt['growth_requested']+=1
     elif mode=='evidence':event['application_evidence']['activation_reference']['origin_authenticated']=True
     elif mode=='draw':p['hand'].append(p['deck'].pop(0))
     elif mode=='refund':p['time']+=1
     elif mode=='reservation':p['reservations'].append('forged')
     elif mode=='source':p['hand'].append(event['source_instance_id'])
     else:event['action_type']='pass_response'
     with self.subTest(card=card,mode=mode):self.assertTrue(api.audit(b,bad,event)['errors'])
   return {}
  self.run_case(run)
 def test_coverage_rejects_rebound_extra_draw(self):
  import proxy_population_trigger_coverage as coverage
  def run():
   b,a,ev=actual('E-boss');p=a['legacy_continuation']['game_state']['players']['A'];p['hand'].append(p['deck'].pop(0))
   event=payments.transition_event(b,a,'resolve_immediate_effect','A',**{k:ev[k] for k in ('source_instance_id','chain_link_id','source_reference','created_effect','application_evidence')})
   try:coverage.audit(dict(source_envelope=b,steps=[dict(source_envelope=b,events=[event],envelopes=[a],final_envelope=a)]),[],dict(occurrences=[]))
   except (ValueError,KeyError) as error:message=str(error)
   else:message='accepted false draw'
   self.assertIn('immediate growth semantics differ',message);return {}
  self.run_case(run)

if __name__=='__main__':unittest.main()
