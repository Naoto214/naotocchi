"""Independent C-chicken reveal/draw semantics at supplied boundaries."""
import copy,unittest
from test_proxy_population_start_effects import chicken
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_population_start_effects as effects
import proxy_population_boundary_response as boundary
import proxy_continuation_state as state
import proxy_continuation_rules as rules
try:import proxy_population_reveal_effects as api
except ImportError:api=None

def actual(kind='companion',outer=False):
 b=chicken(outer,kind=='empty');g=b['legacy_continuation']['game_state'];p=g['players']['A']
 if kind!='empty':
  table={r['card_id']:r for r in rules.table()['cards']}
  target=next(s for s in p['deck'] if (table[g['cards'][s]['card_id']]['card_type']=='companion')==(kind=='companion'))
  p['deck'].remove(target);p['deck'].insert(0,target)
 result=effects.resolve_chicken(state.current(b),initial())
 result=boundary.normalize(b,result,dict(kind='start',turn_player='A',origin_event_seq=3))
 event=result['new_events'][0];a=state.advance(b,result['new_snapshots'][0]['continuation_state'],event['seq'])
 return b,a,event

class RevealEffectsTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'reveal semantic audit absent')
 def test_all_outcomes_and_outer_chain(self):
  def run(forced):
   for kind in ('companion','other','empty'):
    for outer in (False,True):
     b,a,event=actual(kind,outer);proof=api.audit(b,a,event)
     with self.subTest(kind=kind,outer=outer):
      self.assertEqual(proof['errors'],[]);self.assertTrue(proof['supplied_reveal_resolution_verified']);self.assertFalse(proof['activation_proven']);self.assertIsNone(proof['balance_admitted'])
      self.assertEqual(proof['drawn_instance_id'] is not None,kind=='companion')
   return {}
  runtime.operation(initial(),run)
 def test_forged_reveal_movement_and_unrelated_state_rejected(self):
  def run(forced):
   for kind in ('companion','other','empty'):
    b,a,event=actual(kind)
    for mode in ('receipt','refund','metadata','reservation','use','source','deck','dispatch','identity'):
     bad=copy.deepcopy(a);ev=copy.deepcopy(event);g=bad['legacy_continuation']['game_state'];p=g['players']['A'];source=event['source_instance_id']
     if mode=='receipt':ev['result']['revealed_card_type']='forged'
     elif mode=='refund':p['time']+=1
     elif mode=='metadata':g['cards'][source]['card_id']='C-box'
     elif mode=='reservation':p['reservations'].append('forged')
     elif mode=='use':bad['runtime']['board_ability_uses']={}
     elif mode=='source':p['board']['companions'].remove(source);p['hand'].append(source)
     elif mode=='deck':
      if p['deck']:p['hand'].append(p['deck'].pop(0))
      else:p['deck'].append(p['discard'].pop())
     elif mode=='dispatch':ev['action_type']='pass_response'
     else:ev['source_instance_id']='foreign'
     with self.subTest(kind=kind,mode=mode):self.assertTrue(api.audit(b,bad,ev)['errors'])
   b,a,event=actual('companion',True);a['legacy_continuation']['activation_zone']=[]
   self.assertTrue(api.audit(b,a,event)['errors']);return {}
  runtime.operation(initial(),run)
 def test_coverage_rejects_rebound_false_reveal(self):
  import proxy_population_trigger_coverage as coverage
  import proxy_continuation_payments as payments
  def run(forced):
   b,a,event=actual('other');p=a['legacy_continuation']['game_state']['players']['A'];p['hand'].append(p['deck'].pop(0))
   fields={k:event[k] for k in ('source_instance_id','source_zone','chain_link_id','payment','result','processing_boundary')}
   ev=payments.transition_event(b,a,'resolve_board_ability','A',**fields)
   result=dict(source_envelope=b,steps=[dict(source_envelope=b,events=[ev],envelopes=[a],final_envelope=a)])
   try:coverage.audit(result,[],dict(occurrences=[]))
   except (ValueError,KeyError) as error:message=str(error)
   else:message='accepted false reveal'
   self.assertIn('reveal effect semantics differ',message);return {}
  runtime.operation(initial(),run)

if __name__=='__main__':unittest.main()
