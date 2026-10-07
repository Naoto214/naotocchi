"""Current arrival alternatives, separate from authenticating the occurrence."""
import copy,unittest
from test_proxy_population_first_response import game_with
from test_proxy_population_runtime import initial
from proxy_population_start_window import _context
import proxy_population_runtime as runtime
import proxy_continuation_state as state
import proxy_continuation_batch as batch
import proxy_population_trigger_existing as existing
import proxy_population_trigger_predicates as api


def fixture(card,variant='birth'):
 g,actor,s=game_with(card);p=g['players'][actor];p['hand'].remove(s);p['board']['main']=s;g['phase']='response_window'
 targets=[]
 for cardid in ('I-c_coin2','G-hit-blow'):
  t=next(t for t in p['hand']+p['deck'] if g['cards'][t]['card_id']==cardid)
  (p['hand'] if t in p['hand'] else p['deck']).remove(t);p['discard'].append(t);targets.append(t)
 ctx=_context(actor,actor);ctx.update(origin_event_seq=3,window_kind='after_normal_action')
 e=state.create(dict(game_state=g,response_context=ctx,activation_zone=[],pending_triggers=[],return_target='normal_action_opportunity'),3)
 e=runtime.engine.payments.upgrade(e)
 h=[dict(seq=3,actor=actor,action_type='main_movement',source_instance_id=s,candidate_variant=variant)]
 cap=batch.classification(card);o=dict(origin_event_seq=3,source_instance_id=s,actor=actor,category='optional',ability_key=cap['timing'],source_reference=cap['reference'])
 return e,h,o,targets


class ArrivalPredicateTests(unittest.TestCase):
 def setUp(self):self.assertTrue(hasattr(api,'audit_arrival'),'arrival semantic audit absent')
 def test_source_variants_full_physical_targets_and_mutations(self):
  def run(forced):
   for card in ('M-antlion-04','M-antlion-05','M-beetle-01'):
    for variant in ('birth','time_skip','transform'):
     e,h,o,targets=fixture(card,variant);rows,_=existing.ExistingAdapter(h).enumerate(e,o);p=api.audit_arrival(e,o,rows,h)
     self.assertTrue(p['current_trigger_predicates_verified'],p['errors'])
     expected=2 if card=='M-antlion-04' else int((card=='M-antlion-05' and variant=='time_skip') or (card=='M-beetle-01' and variant=='birth'))
     self.assertEqual(p['verified_candidate_count'],expected)
     if rows:
      for mode in ('omit','duplicate','target','cost','copy'):
       bad=copy.deepcopy(rows)
       if mode=='omit':bad.pop()
       elif mode=='duplicate':bad.append(copy.deepcopy(bad[0]))
       elif mode=='target':bad[0]['target_instance_ids']=['foreign']
       elif mode=='cost':bad[0]['base_time_cost']=1
       else:bad[0]['card_copy_id']='foreign'
       self.assertTrue(api.audit_arrival(e,o,bad,h)['errors'],mode)
   return {}
  runtime.operation(initial(),run)

 def test_prepared_conditions_and_same_occurrence_use(self):
  def run(forced):
   for card in ('M-antlion-04','M-antlion-05'):
    for faceup in (True,False):
     e,h,o,targets=fixture(card,'time_skip');g=e['legacy_continuation']['game_state'];p=g['players']['A']
     name='I-bowtie' if faceup else 'I-poop1';s=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']==name)
     (p['hand'] if s in p['hand'] else p['deck']).remove(s);p['board']['prepared'].append(s)
     e['runtime']['public_prepared'][s]=dict(controller='A',face_up=faceup,paid_time=2 if faceup else 1,placed_event_seq=2)
     if faceup:e['runtime']['attachments'][s]=dict(controller='A',target_instance_id=p['board']['main'],attached_event_seq=2)
     rows,_=existing.ExistingAdapter(h).enumerate(e,o);proof=api.audit_arrival(e,o,rows,h)
     self.assertTrue(proof['current_trigger_predicates_verified'],proof['errors']);self.assertEqual(len(rows),2 if card=='M-antlion-04' and faceup else 0)
   e,h,o,_=fixture('M-beetle-01');h.append(dict(seq=4,actor='A',action_type='activate_response',source_zone='board',source_instance_id=o['source_instance_id'],trigger_origin_event_seq=3));e['event_seq']=4
   rows,_=existing.ExistingAdapter(h).enumerate(e,o);self.assertEqual(rows,[]);self.assertTrue(api.audit_arrival(e,o,rows,h)['current_trigger_predicates_verified'])
   return {}
  runtime.operation(initial(),run)

 def test_scope_attaches_fresh_audit_and_restores_adapter(self):
  native=existing.ExistingAdapter.enumerate
  def run(forced):
   e,h,o,_=fixture('M-antlion-04')
   with api.scope():
    rows,p=existing.ExistingAdapter(h).enumerate(e,o);self.assertTrue(p['current_predicate_audit']['current_trigger_predicates_verified'])
    self.assertFalse(p['current_predicate_audit']['all_rule_opportunities_proven']);self.assertIsNone(p['current_predicate_audit']['balance_admitted'])
   self.assertIs(existing.ExistingAdapter.enumerate,native)
   for history in ([],h+h):self.assertTrue(api.audit_arrival(e,o,rows,history)['errors'])
   return {}
  runtime.operation(initial(),run)

 def test_resolving_observation_can_prove_empty_but_cannot_offer_activation(self):
  from test_proxy_population_prepared_predicates import link
  def run(forced):
   for card in ('M-antlion-04','M-antlion-05','M-beetle-01'):
    e,h,o,_=fixture(card,'time_skip' if card=='M-antlion-05' else 'birth')
    rows,_=existing.ExistingAdapter(h).enumerate(e,o);link(e,'E-final-time')
    e['event_seq']=4;e['legacy_continuation']['response_context'].update(chain_status='resolving',consecutive_passes=2)
    self.assertTrue(api.audit_arrival(e,o,rows,h)['errors'])
    self.assertTrue(api.audit_arrival(e,o,[],h)['errors'])
    h.append(dict(seq=4,actor='B',action_type='response_pass'))
    with api.scope():proof=existing.ExistingAdapter(h).proof(e,4)
    self.assertEqual(proof['occurrences'],[])
    self.assertTrue(all(r['proof']['current_predicate_audit']['current_trigger_predicates_verified'] for r in proof['classifications']))
   return {}
  runtime.operation(initial(),run)

if __name__=='__main__':unittest.main()
