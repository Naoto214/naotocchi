"""Existing465 egg choice and actual current turn bridge delta."""
import copy,unittest
from test_proxy_population_start_draw_effect import actual
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_population_incarnation as life
import proxy_continuation_state as state
import proxy_population_policy_journal as journal
try:import proxy_population_egg_choice_effect as api
except ImportError:api=None

def case(actor='A',count=4,empty=False):
 start,b,_,r=actual(actor,True,count,full=True,empty_hand=empty);a=state.advance(b,r['new_snapshots'][2]['continuation_state'],r['new_snapshots'][2]['event_seq']);entry=journal.egg_entry(life.game(start),actor)
 return b,a,r['new_events'][2],entry,r['new_decisions'],life.create(b)

class EggChoiceEffectTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'egg choice actual delta absent')
 def run_case(self,callback):
  with connected.contract_scope():return runtime.operation(initial(),lambda forced:callback())
 def test_actual_both_actors_empty_deck_hand_and_designated_choice(self):
  def run():
   for actor in ('A','B'):
    for count,empty in ((4,False),(1,False),(0,False),(0,True)):
     b,a,e,f,d,r=case(actor,count,empty);p=api.audit(b,a,e,f,d,r);self.assertEqual(p['errors'],[],(actor,count,empty));self.assertTrue(p['supplied_egg_choice_verified']);self.assertEqual(p['required_choice_count'],int(not empty));self.assertFalse(p['choice_origin_authenticated']);self.assertIsNone(p['balance_admitted'])
   return {}
  self.run_case(run)
 def test_wrong_choice_draw_deck_order_metadata_and_callback_rejected(self):
  def run():
   b,a,e,f,d,r=case()
   for mode in ('draw','growth','time','front','metadata','actor','receipt','missing','duplicate','entry','decision','runtime','context','choice_source'):
    bad=copy.deepcopy(a);ev=copy.deepcopy(e);frame=copy.deepcopy(f);choices=copy.deepcopy(d);p=life.game(bad)['players']['A']
    if mode=='draw':p['hand'].append(p['deck'].pop(0))
    elif mode=='growth':p['growth']+=5
    elif mode=='time':p['time']+=1
    elif mode=='front':p['deck'].insert(0,p['deck'].pop())
    elif mode=='metadata':next(iter(life.game(bad)['cards'].values()))['card_id']='invented'
    elif mode=='actor':ev['actor']='B'
    elif mode=='receipt':ev['selected_candidate']='foreign-copy'
    elif mode=='missing':choices=[]
    elif mode=='duplicate':choices*=2
    elif mode=='entry':frame['game_state']['players']['B']['time']+=1
    elif mode=='decision':choices[0]['selected_candidate']='foreign-copy'
    elif mode=='runtime':bad['runtime']['ability_uses'].append({'invented':True})
    elif mode=='context':bad['legacy_continuation']['response_context']['priority_actor']='B'
    else:choices[0]['selected_action']['instance_id']='foreign'
    with self.subTest(mode=mode):self.assertTrue(api.audit(b,bad,ev,frame,choices,r)['errors'])
   b,a,e,f,d,r=case('A',0,True);self.assertTrue(api.audit(b,a,e,f,[{'invented':True}],r)['errors']);return {}
  self.run_case(run)
 def test_policy_journal_invokes_actual_delta_audit(self):
  from unittest.mock import patch
  from test_proxy_mandatory_population_input import bundle
  import proxy_population_connected_entry as entry
  record=entry.reconstruct(bundle(),'test-1A',2)
  with patch.object(api,'audit',return_value=dict(applicable=True,errors=['unit egg delta mismatch'])):
   proof=journal.audit_opportunities(record)
  self.assertFalse(proof['designated_opportunities_covered']);self.assertIn('egg choice semantics differ',str(proof['errors']))

if __name__=='__main__':unittest.main()
