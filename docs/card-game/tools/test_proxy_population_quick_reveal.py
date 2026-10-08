"""Real bounded public-reveal handlers against independent full-delta audit."""
import copy,unittest
from test_proxy_population_trigger_latching import case
from test_proxy_population_runtime import initial
from test_proxy_population_return_challenge import in_battle
import proxy_population_runtime as runtime
import proxy_population_challenge_window as window
import proxy_population_boundary_response as boundary
import proxy_continuation_state as state
import proxy_continuation_rules as rules
try:import proxy_population_quick_reveal as api
except ImportError:api=None

KINDS=('main','companion','partner','world','play','item','event')

def actual(forced,card,kind='main',declared='main',size='many',growth=98,mode='normal'):
 b,_,_,_=case();c=b['legacy_continuation'];g=c['game_state'];p=g['players']['A'];link=c['activation_zone'][-1]
 # Avoid an unrelated M06 post-effect obligation in these supplied boundaries.
 main=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='M-beetle-01');(p['hand'] if main in p['hand'] else p['deck']).remove(main);p['hand'].append(p['board']['main']);p['board']['main']=main
 if card!='I-c_coin2':
  p['discard'].append(link['source_instance_id']);source=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']==card);(p['hand'] if source in p['hand'] else p['deck']).remove(source);link.update(source_instance_id=source,card_id=card,card_copy_id=g['cards'][source]['card_copy_id'],action_type='use_play')
 link['candidate_variant']=declared if card=='G-hit-blow' else None;p['growth']=growth
 table={r['card_id']:r['card_type'] for r in rules.table()['cards']};top=next(s for s in p['deck']+p['hand']+p['discard'] if table[g['cards'][s]['card_id']]==kind)
 next(p[z] for z in ('deck','hand','discard') if top in p[z]).remove(top);p['deck'].insert(0,top)
 if size=='one':p['discard'].extend(p['deck'][1:]);p['deck']=p['deck'][:1]
 elif size=='empty':p['discard'].extend(p['deck']);p['deck']=[]
 if mode=='outer':
  outer=copy.deepcopy(link);outer['link_id']='supplied-outer';s=next(s for s in p['hand']+p['deck']+p['discard'] if g['cards'][s]['card_id']=='C-chicken');next(p[z] for z in ('hand','deck','discard') if s in p[z]).remove(s);p['board']['companions'].append(s)
  outer.update(source_instance_id=s,card_id='C-chicken',card_copy_id=g['cards'][s]['card_copy_id'],source_zone='board',action_type='activate_board_ability',candidate_variant=None,payment=dict(time=0));c['activation_zone'].insert(0,outer);c['response_context']['chain_links'].insert(0,outer['link_id'])
 if mode in ('comparing','resolved'):b=in_battle(b,mode)
 r=forced(b,initial(),[],[],[b])
 if mode in ('start','end'):r=boundary.normalize(b,r,dict(kind=mode,turn_player='A',origin_event_seq=3))
 ev=r['new_events'][0];a=state.advance(b,r['new_snapshots'][0]['continuation_state'],ev['seq']);return b,a,ev

class QuickRevealTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'quick reveal audit absent')
 def run_case(self,callback):
  with window.contract_scope():return runtime.operation(initial(),callback)
 def test_every_printed_type_and_declared_match_branch(self):
  def run(forced):
   for card in ('I-c_coin2','G-hit-blow'):
    for kind in KINDS:
     for declared in (KINDS if card=='G-hit-blow' else ('main',)):
      b,a,ev=actual(forced,card,kind,declared);p=api.audit(b,a,ev)
      with self.subTest(card=card,kind=kind,declared=declared):
       self.assertEqual(p['errors'],[]);self.assertTrue(p['supplied_quick_reveal_verified']);self.assertFalse(p['activation_proven']);self.assertIsNone(p['balance_admitted'])
   return {}
  self.run_case(run)
 def test_empty_singleton_and_growth_cap(self):
  def run(forced):
   for card in ('I-c_coin2','G-hit-blow'):
    for size in ('empty','one'):
     for kind in ('main','world'):
      for growth in (0,100):
       b,a,ev=actual(forced,card,kind,'main',size,growth);p=api.audit(b,a,ev)
       with self.subTest(card=card,size=size,kind=kind,growth=growth):
        self.assertEqual(p['errors'],[]);self.assertEqual(ev['result']['effect_applied'],size!='empty')
        if size=='one' and kind=='world':self.assertEqual(ev['result']['drawn_instance_id'],ev['result']['revealed_instance_id'])
   return {}
  self.run_case(run)
 def test_contexts_preserve_outer_and_restart_responses(self):
  def run(forced):
   for card in ('I-c_coin2','G-hit-blow'):
    for mode in ('outer','start','end','comparing','resolved'):
     b,a,ev=actual(forced,card,mode=mode)
     with self.subTest(card=card,mode=mode):self.assertEqual(api.audit(b,a,ev)['errors'],[])
   return {}
  self.run_case(run)
 def test_false_reveal_order_growth_evidence_and_collateral_changes_rejected(self):
  def run(forced):
   for card in ('I-c_coin2','G-hit-blow'):
    b,a,ev=actual(forced,card)
    for mode in ('receipt','growth','evidence','deck','refund','reservation','source','dispatch'):
     bad=copy.deepcopy(a);event=copy.deepcopy(ev);p=bad['legacy_continuation']['game_state']['players']['A']
     if mode=='receipt':event['result']['revealed_card_type']='world'
     elif mode=='growth':p['growth']-=1
     elif mode=='evidence':event['application_evidence']['parts'][1]['status']='not_applied'
     elif mode=='deck':p['deck'].reverse()
     elif mode=='refund':p['time']+=1
     elif mode=='reservation':p['reservations'].append('forged')
     elif mode=='source':p['discard'].remove(event['source_instance_id']);p['hand'].append(event['source_instance_id'])
     else:event['action_type']='resolve_event'
     with self.subTest(card=card,mode=mode):self.assertTrue(api.audit(b,bad,event)['errors'])
   return {}
  self.run_case(run)
 def test_coverage_rejects_self_consistent_false_reveal(self):
  import proxy_population_trigger_coverage as coverage
  import proxy_continuation_payments as payments
  def run(forced):
   b,a,ev=actual(forced,'I-c_coin2');p=a['legacy_continuation']['game_state']['players']['A'];p['hand'].append(p['deck'].pop(0));event=payments.transition_event(b,a,'resolve_item','A',**{k:ev[k] for k in ('source_instance_id','chain_link_id','payment','result','application_evidence')})
   try:coverage.audit(dict(source_envelope=b,steps=[dict(source_envelope=b,events=[event],envelopes=[a],final_envelope=a)]),[],dict(occurrences=[]))
   except (ValueError,KeyError) as error:message=str(error)
   else:message='accepted false reveal'
   self.assertIn('quick reveal semantics differ',message);return {}
  self.run_case(run)

if __name__=='__main__':unittest.main()
