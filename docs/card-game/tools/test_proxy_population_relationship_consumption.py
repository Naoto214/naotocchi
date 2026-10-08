"""Actual same-partner progress must not be mistaken for foreign consumption."""
import copy,unittest
from test_proxy_population_trigger_effects import case,resolving
from test_proxy_population_runtime import initial
import proxy_population_challenge_window as connected
import proxy_population_runtime as runtime
import proxy_population_trigger_effects as effects
import proxy_population_trigger_latching as latching
import proxy_continuation_candidates as candidates
import proxy_continuation_batch as batch
import proxy_continuation_payments as payments
import proxy_population_payment_consumption as api


def fixture(stage=0):
 e,row=case('P-cliff_goat');p=e['legacy_continuation']['game_state']['players']['A'];p['board']['partner_stage']=stage
 action=latching.current_actions(e,row)[0][0];after,_=effects.activate(e,action,row)
 e=effects.resolve(resolving(after),initial())['new_envelopes'][0];p=e['legacy_continuation']['game_state']['players']['A'];p['time']=0;p['growth']=20
 return e


def progress(e):
 action=next(a for a in candidates.audit(e,[])['legal_candidate_details'] if a['action_type']=='relationship')
 after,events=batch.transition(e,action,[]);return after,events[0]

class RelationshipConsumptionTests(unittest.TestCase):
 def run_case(self,callback):
  def run(forced):
   with effects.scope():return callback()
  with connected.contract_scope():return runtime.operation(initial(),run)
 def test_actual_discount_all_four_stages_consumes_once_at_zero_payment(self):
  def run():
   for stage,next_stage in [(0,1),(1,2),(2,3),(3,'married')]:
    e=fixture(stage);after,event=progress(e);proof=api.audit(e,after,event)
    with self.subTest(stage=stage):
     self.assertEqual(proof['errors'],[]);self.assertTrue(proof['payment_consumption_verified']);self.assertEqual(proof['consumed_effect_count'],1)
     self.assertEqual(event['payment_time'],0);self.assertEqual(after['legacy_continuation']['game_state']['players']['A']['board']['partner_stage'],next_stage)
     self.assertEqual(after['runtime']['payment_effects'],[])
   return {}
  self.run_case(run)
 def test_unsupported_growth100_boundary_is_not_certified(self):
  def run():
   e=fixture(3);after,event=progress(e);e['legacy_continuation']['game_state']['players']['A']['growth']=90;after['legacy_continuation']['game_state']['players']['A']['growth']=100
   with self.assertRaisesRegex(ValueError,'100 maintenance'):progress(e)
   self.assertTrue(api.audit(e,after,event)['errors']);return {}
  self.run_case(run)
 def test_other_controller_and_nonrelationship_modifiers_are_preserved(self):
  def run():
   e=fixture();g=e['legacy_continuation']['game_state']
   for owner,card in [('B','P-cliff_goat'),('A','E-fateful-transform')]:
    source=next(s for s,v in g['cards'].items() if s.startswith(owner+'-') and v['card_id']==card);payments.add_modifier(e,owner,source)
   after,event=progress(e);proof=api.audit(e,after,event)
   self.assertEqual(proof['errors'],[]);self.assertEqual(proof['consumed_effect_count'],1)
   self.assertEqual(len(after['runtime']['payment_effects']),2)
   for mode in ('receipt','erase_other','keep_used','source','variant','cost','links','stage'):
    b=copy.deepcopy(e);a=copy.deepcopy(after);ev=copy.deepcopy(event)
    if mode=='receipt':ev['payment_effect_ids']=[]
    elif mode=='erase_other':a['runtime']['payment_effects']=[]
    elif mode=='keep_used':a['runtime']['payment_effects']=copy.deepcopy(e['runtime']['payment_effects'])
    elif mode=='source':ev['source_instance_id']='foreign'
    elif mode=='variant':ev['candidate_variant']='3-to-marriage'
    elif mode=='cost':ev['payment_time']=1
    elif mode=='links':b['legacy_continuation']['response_context']['chain_links']=['open']
    else:a['legacy_continuation']['game_state']['players']['A']['board']['partner_stage']=3
    with self.subTest(mode=mode):self.assertTrue(api.audit(b,a,ev)['errors'])
   return {}
  self.run_case(run)
 def test_nonmatching_partner_progress_preserves_old_effects(self):
  def run():
   e=fixture();g=e['legacy_continuation']['game_state'];p=g['players']['A'];old=p['board']['partner'];new=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='P-anglerfish')
   for z in ('hand','deck'):
    if new in p[z]:p[z].remove(new)
   p['discard'].append(old);p['board']['partner']=new;p['time']=1
   after,event=progress(e);proof=api.audit(e,after,event)
   self.assertEqual(proof['errors'],[]);self.assertEqual(proof['consumed_effect_count'],0);self.assertEqual(event['payment_time'],1)
   self.assertEqual(after['runtime']['payment_effects'],e['runtime']['payment_effects']);return {}
  self.run_case(run)

if __name__=='__main__':unittest.main()
