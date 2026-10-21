"""Conditional first-date resolution, physical target generations and cap."""
import copy,unittest
from test_proxy_population_trigger_latching import case
from test_proxy_population_runtime import initial
from test_proxy_population_return_challenge import in_battle
import proxy_population_runtime as runtime
import proxy_population_challenge_window as window
import proxy_population_boundary_response as boundary
import proxy_continuation_state as state
try:import proxy_population_first_date_effect as api
except ImportError:api=None

def actual(forced,stage=0,growth=98,empty=False,mode='normal'):
 b,_,_,_=case();c=b['legacy_continuation'];g=c['game_state'];p=g['players']['A'];link=c['activation_zone'][-1]
 def take(card):
  s=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']==card);(p['hand'] if s in p['hand'] else p['deck']).remove(s);return s
 p['discard'].append(link['source_instance_id']);source=take('E-first-date');main=take('M-beetle-01');p['hand'].append(p['board']['main']);p['board']['main']=main
 target=take('P-anglerfish')
 if p['board']['partner']:p['discard'].append(p['board']['partner'])
 p['board'].update(partner=target,partner_stage=stage);p['growth']=growth
 if mode in ('current2','stale1'):
  new=target.rsplit('#',1)[0]+'#2';g['cards'][new]=copy.deepcopy(g['cards'][target]);p['board']['partner']=new
  if mode=='current2':target=new
 elif mode=='departed':p['hand'].append(target);p['board'].update(partner=None,partner_stage=None)
 elif mode=='egg':p['discard'].append(main);p['board']['main']=None
 link.update(source_instance_id=source,card_id='E-first-date',card_copy_id=g['cards'][source]['card_copy_id'],action_type='use_event',candidate_variant=None,target_instance_ids=[target])
 if empty:p['discard'].extend(p['deck']);p['deck']=[]
 if mode=='outer':
  s=take('C-chicken');p['board']['companions'].append(s);outer=copy.deepcopy(link);outer.update(link_id='supplied-outer',source_instance_id=s,card_id='C-chicken',card_copy_id=g['cards'][s]['card_copy_id'],source_zone='board',action_type='activate_board_ability',payment=dict(time=0),target_instance_ids=[]);c['activation_zone'].insert(0,outer);c['response_context']['chain_links'].insert(0,outer['link_id'])
 if mode in ('comparing','resolved'):b=in_battle(b,mode)
 r=forced(b,initial(),[],[],[b])
 if mode in ('start','end'):r=boundary.normalize(b,r,dict(kind=mode,turn_player='A',origin_event_seq=3))
 ev=r['new_events'][0];a=state.advance(b,r['new_snapshots'][0]['continuation_state'],ev['seq']);return b,a,ev

class FirstDateEffectTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'first-date full delta audit absent')
 def run_case(self,callback):
  with window.contract_scope():return runtime.operation(initial(),callback)
 def test_stage_recheck_cap_and_empty_deck(self):
  def run(forced):
   for stage in (0,1,2,3,'married'):
    for growth in (0,98,100):
     for empty in (False,True):
      b,a,ev=actual(forced,stage,growth,empty);proof=api.audit(b,a,ev)
      with self.subTest(stage=stage,growth=growth,empty=empty):
       self.assertEqual(proof['errors'],[]);self.assertEqual(proof['target_legal'],stage==0);self.assertTrue(proof['supplied_first_date_verified']);self.assertFalse(proof['activation_proven']);self.assertIsNone(proof['balance_admitted'])
       self.assertEqual(ev['result']['effect_applied'],stage==0 and (growth<100 or not empty))
   return {}
  self.run_case(run)
 def test_target_generations_departure_egg_and_contexts(self):
  def run(forced):
   for mode in ('current2','stale1','departed','egg','outer','start','end','comparing','resolved'):
    b,a,ev=actual(forced,mode=mode);proof=api.audit(b,a,ev)
    with self.subTest(mode=mode):
     self.assertEqual(proof['errors'],[]);self.assertEqual(proof['target_legal'],mode not in ('stale1','departed'))
     self.assertEqual(b['legacy_continuation']['game_state']['cards'],a['legacy_continuation']['game_state']['cards'])
   return {}
  self.run_case(run)
 def test_consistent_forgery_and_collateral_changes_rejected(self):
  def run(forced):
   for original in ('normal','stale1'):
    b,a,ev=actual(forced,mode=original)
    for mode in ('receipt','evidence','draw','growth','stage','refund','reservation','metadata','source','dispatch'):
     bad=copy.deepcopy(a);event=copy.deepcopy(ev);g=bad['legacy_continuation']['game_state'];p=g['players']['A']
     if mode=='receipt':event['result']['target_recheck']['legal']=not event['result']['target_recheck']['legal']
     elif mode=='evidence':event['application_evidence']['parts_complete']=False
     elif mode=='draw':p['hand'].append(p['deck'].pop(0))
     elif mode=='growth':p['growth']-=1
     elif mode=='stage':p['board']['partner_stage']=1
     elif mode=='refund':p['time']+=1
     elif mode=='reservation':p['reservations'].append('forged')
     elif mode=='metadata':g['cards'][event['source_instance_id']]['card_id']='E-boss'
     elif mode=='source':p['discard'].remove(event['source_instance_id']);p['hand'].append(event['source_instance_id'])
     else:event['action_type']='resolve_item'
     with self.subTest(original=original,mode=mode):self.assertTrue(api.audit(b,bad,event)['errors'])
   b,a,ev=actual(forced);b['legacy_continuation']['game_state']['players']['A']['board']['partner_stage']=False;self.assertTrue(api.audit(b,a,ev)['errors']);return {}
  self.run_case(run)
 def test_coverage_rejects_rebound_extra_draw(self):
  import proxy_population_trigger_coverage as coverage
  import proxy_continuation_payments as payments
  def run(forced):
   b,a,ev=actual(forced);p=a['legacy_continuation']['game_state']['players']['A'];p['hand'].append(p['deck'].pop(0));event=payments.transition_event(b,a,'resolve_event','A',**{k:ev[k] for k in ('source_instance_id','chain_link_id','payment','result','application_evidence')})
   try:coverage.audit(dict(source_envelope=b,steps=[dict(source_envelope=b,events=[event],envelopes=[a],final_envelope=a)]),[],dict(occurrences=[]))
   except (ValueError,KeyError) as error:message=str(error)
   else:message='accepted false first-date'
   self.assertIn('first-date semantics differ',message);return {}
  self.run_case(run)

if __name__=='__main__':unittest.main()
