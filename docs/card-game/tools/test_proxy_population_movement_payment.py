"""Bind02/06 normal movement prices to the actual event and time delta."""
import copy,unittest
import proxy_continuation_candidates as candidates
import proxy_continuation_batch as batch
import proxy_population_payment_consumption as api
import test_proxy_population_payment_consumption as fixtures

class MovementPaymentTests(unittest.TestCase):
 run_case=fixtures.ConsumptionTests.run_case
 transform=fixtures.ConsumptionTests.transform
 def test_forged_payment_and_time_changes_are_rejected(self):
  def run(e):
   _,after,event=self.transform(e);actor=event['actor'];other='A' if actor=='B' else 'B'
   for mode in ('receipt','refund','other_time','both','source','birth'):
    a=copy.deepcopy(after);ev=copy.deepcopy(event)
    if mode in ('receipt','both'):ev['payment_time']+=1
    if mode in ('refund','both'):a['legacy_continuation']['game_state']['players'][actor]['time']-=1
    if mode=='other_time':a['legacy_continuation']['game_state']['players'][other]['time']+=1
    if mode=='source':ev['source_reference']='foreign'
    if mode=='birth':ev['candidate_variant']='birth';ev['payment_effect_ids']=[];a['runtime']['payment_effects']=copy.deepcopy(e['runtime']['payment_effects'])
    with self.subTest(mode=mode):self.assertTrue(api.audit(e,a,ev)['errors'])
   return {}
  self.run_case(run)
 def test_all_movement_prices_and_final_zero_floor(self):
  def run(template):
   for variant,card,base in [('birth','M-antlion-08',8),('time_skip','M-antlion-08',7),('transform','M-beetle-02',2)]:
    for discounted in (False,True):
     e=copy.deepcopy(template);g=e['legacy_continuation']['game_state'];p=g['players'][g['turn_player']]
     if variant=='birth':p['discard'].append(p['board']['main']);p['board']['main']=None
     if not discounted:e['runtime']['payment_effects']=[]
     rows=[r for r in e['runtime']['payment_effects'] if r['controller']==g['turn_player'] and r['payment_kind']=='transform']
     action=next(a for a in candidates.audit(e,[])['legal_candidate_details'] if a['action_type']=='play_main' and a['card_id']==card and a['candidate_variant']==variant)
     after,events=batch.transition(e,action,[]);proof=api.audit(e,after,events[0]);expected=max(0,base-sum(r['amount'] for r in rows)) if variant=='transform' else base
     self.assertEqual(proof['errors'],[]);self.assertTrue(proof.get('movement_payment_verified'))
     self.assertEqual(events[0]['payment_time'],expected);self.assertEqual(after['legacy_continuation']['game_state']['players'][g['turn_player']]['time'],10-expected)
     self.assertFalse(proof['payment_amount_proven']);self.assertFalse(proof['effect_creation_proven'])
   return {}
  self.run_case(run)

if __name__=='__main__':unittest.main()
