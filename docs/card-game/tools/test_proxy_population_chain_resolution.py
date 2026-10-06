import copy,unittest
from test_proxy_population_trigger_latching import case
from test_proxy_population_runtime import initial
import proxy_population_runtime as base
import proxy_continuation_state as state
try:import proxy_population_chain_resolution as api
except ImportError:api=None

class ChainTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'shared bounded top-link resolution missing')
 def test_coin_at_cap_records_real_reveal_but_zero_growth(self):
  def run(forced):
   e,_,_,_=case();c=state.current(e);link=c['activation_zone'][-1];link['candidate_variant']=None;p=c['game_state']['players']['A'];p['growth']=100
   main=next(s for s in p['deck'] if c['game_state']['cards'][s]['card_id'].startswith('M-'));p['deck'].remove(main);p['deck'].insert(0,main);c['continuation_state_sha256']=base.engine.base.old.start._hash(c)
   original=copy.deepcopy(c);after,event=api.resolve_top(c)
   self.assertEqual(after['game_state']['players']['A']['growth'],100);self.assertEqual(event['result']['growth_added'],0);self.assertEqual(event['result']['revealed_instance_id'],main);self.assertEqual(after['game_state']['players']['A']['deck'][-1],main)
   self.assertEqual(event['application_evidence']['status'],'applied');self.assertEqual(event['application_evidence']['parts'][0]['actual_delta'],0)
   self.assertEqual(c,original);self.assertEqual(api.audit(after,event,c),[])
   return {}
  base.operation(initial(),run)
 def test_opt_in_dispatch_restores_original_handler(self):
  import proxy_continuation_runner as runner
  import proxy_continuation_end as end
  def run(forced):
   e,_,_,_=case();c=state.current(e);c['activation_zone'][-1]['candidate_variant']=None;c['continuation_state_sha256']=base.engine.base.old.start._hash(c)
   prior=runner._forced
   with api.scope():
    result=runner._forced(c,initial(),[],[])
    self.assertEqual(result['new_events'][0]['application_evidence']['contract'],'effective_application_474.v1')
   self.assertIs(runner._forced,prior)
   return {}
  base.operation(initial(),run)
 def test_normalized_end_provenance_is_reconstructed_and_tampering_rejected(self):
  from unittest.mock import patch
  import proxy_continuation_runner as runner
  import proxy_continuation_end as end
  import proxy_continuation_actions as actions
  def run(forced):
   e,_,_,_=case();e['legacy_continuation']['activation_zone'][-1]['candidate_variant']=None;e['legacy_continuation']['response_context']['source_phase']='turn_end';e['legacy_continuation']['game_state']['phase']='turn_end_response';c=state.current(e)
   with patch.object(end,'verify_new_events',return_value=[]),api.scope():
    result=actions.normalize_resolution_result(e,runner._forced(c,initial(),[],[]));event=result['new_events'][0];after=state.advance(e,result['new_snapshots'][0]['continuation_state'],event['seq']);runtime=[e,after]
    self.assertEqual(after['legacy_continuation']['game_state']['phase'],'turn_end');proof=end.verify_new_events([event],[],runtime);self.assertEqual(len(proof),1)
    bad=copy.deepcopy(event);bad['result']['growth_added']=True
    with self.assertRaisesRegex(ValueError,'provenance'):end.verify_new_events([bad],[],runtime)
    bad_after=copy.deepcopy(after);bad_after['legacy_continuation']['game_state']['players']['A']['time']+=1
    with self.assertRaisesRegex(ValueError,'provenance'):end.verify_new_events([event],[],[e,bad_after])
   return {}
  base.operation(initial(),run)
 def test_hit_blow_reuses_native_effect_and_bounds_growth(self):
  def run(forced):
   e,_,_,_=case();c=state.current(e);g=c['game_state'];p=g['players']['A'];link=c['activation_zone'][-1];p['discard'].append(link['source_instance_id'])
   source=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='G-hit-blow');(p['hand'] if source in p['hand'] else p['deck']).remove(source)
   link.update(source_instance_id=source,card_id='G-hit-blow',card_copy_id=g['cards'][source]['card_copy_id'],action_type='use_play',candidate_variant='main')
   main=next(s for s in p['deck'] if g['cards'][s]['card_id'].startswith('M-'));p['deck'].remove(main);p['deck'].insert(0,main);p['growth']=100;c['continuation_state_sha256']=base.engine.base.old.start._hash(c)
   after,event=api.resolve_top(c);self.assertIn(main,after['game_state']['players']['A']['hand']);self.assertEqual(event['result']['growth_added'],0);self.assertTrue(event['result']['effect_applied']);self.assertTrue(event['result']['declaration_matched'])
   return {}
  base.operation(initial(),run)
 def test_legal_first_date_at_cap_empty_deck_is_resolved_but_not_applied(self):
  def run(forced):
   e,_,_,_=case();c=state.current(e);g=c['game_state'];p=g['players']['A'];link=c['activation_zone'][-1];p['discard'].append(link['source_instance_id'])
   source=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='E-first-date');(p['hand'] if source in p['hand'] else p['deck']).remove(source)
   partner=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='P-anglerfish');(p['hand'] if partner in p['hand'] else p['deck']).remove(partner)
   if p['board']['partner']:p['discard'].append(p['board']['partner'])
   p['board']['partner']=partner;p['board']['partner_stage']=0;p['growth']=100;p['discard'].extend(p['deck']);p['deck']=[]
   link.update(source_instance_id=source,card_id='E-first-date',card_copy_id=g['cards'][source]['card_copy_id'],action_type='use_event',candidate_variant=None,target_instance_ids=[partner]);c['continuation_state_sha256']=base.engine.base.old.start._hash(c)
   after,event=api.resolve_top(c);self.assertTrue(event['result']['target_recheck']['legal']);self.assertEqual(event['result']['growth_added'],0);self.assertFalse(event['result']['effect_applied']);self.assertEqual(event['application_evidence']['status'],'not_applied')
   return {}
  base.operation(initial(),run)
 def test_first_date_rechecks_current_incarnation_without_migrating_old_target(self):
  def run(forced):
   e,_,_,_=case();c=state.current(e);g=c['game_state'];p=g['players']['A'];link=c['activation_zone'][-1];p['discard'].append(link['source_instance_id'])
   source=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='E-first-date');(p['hand'] if source in p['hand'] else p['deck']).remove(source)
   partner=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='P-anglerfish');(p['hand'] if partner in p['hand'] else p['deck']).remove(partner)
   if p['board']['partner']:p['discard'].append(p['board']['partner'])
   old_partner=partner;partner=partner.rsplit('#',1)[0]+'#2';g['cards'][partner]=copy.deepcopy(g['cards'][old_partner]);p['board']['partner']=partner;p['board']['partner_stage']=0;p['growth']=90;p['discard'].extend(p['deck']);p['deck']=[]
   link.update(source_instance_id=source,card_id='E-first-date',card_copy_id=g['cards'][source]['card_copy_id'],action_type='use_event',candidate_variant=None,target_instance_ids=[partner]);c['continuation_state_sha256']=base.engine.base.old.start._hash(c)
   after,event=api.resolve_top(c);self.assertTrue(event['result']['target_recheck']['legal']);self.assertEqual(event['result']['growth_added'],5);self.assertTrue(event['result']['effect_applied']);self.assertEqual(after['game_state']['cards'],g['cards'])
   c['activation_zone'][-1]['target_instance_ids']=[old_partner];c['continuation_state_sha256']=base.engine.base.old.start._hash(c);_,event=api.resolve_top(c);self.assertFalse(event['result']['target_recheck']['legal']);self.assertFalse(event['result']['effect_applied'])
   return {}
  base.operation(initial(),run)
 def test_empty_deck_resolves_without_effect_and_receipt_tampering_is_rejected(self):
  def run(forced):
   e,_,_,_=case();c=state.current(e);c['activation_zone'][-1]['candidate_variant']=None;p=c['game_state']['players']['A'];p['discard'].extend(p['deck']);p['deck']=[];c['continuation_state_sha256']=base.engine.base.old.start._hash(c)
   after,event=api.resolve_top(c);self.assertEqual(event['application_evidence']['status'],'not_applied');self.assertFalse(event['result']['effect_applied']);self.assertIsNone(event['result']['revealed_instance_id']);self.assertEqual(after['activation_zone'],[])
   event['result']['growth_added']=True;self.assertTrue(api.audit(after,event,c))
   return {}
  base.operation(initial(),run)
 def test_top_link_resolves_above_multiple_outer_links_without_resolving_them(self):
  def run(forced):
   e,_,_,_=case();c=state.current(e);top=c['activation_zone'][-1];top['candidate_variant']=None;g=c['game_state'];p=g['players']['A'];outer=[]
   for n,card in enumerate(('G-hit-blow','E-first-date')):
    source=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']==card);(p['hand'] if source in p['hand'] else p['deck']).remove(source)
    outer.append(dict(link_id='outer-'+str(n),action_type='use_play' if n==0 else 'use_event',actor='A',card_id=card,card_copy_id=g['cards'][source]['card_copy_id'],source_instance_id=source,target_instance_ids=[],candidate_variant='main' if n==0 else None,payment=dict(time=1)))
   c['activation_zone']=outer+[top];c['response_context']['chain_links']=[l['link_id'] for l in c['activation_zone']];c['continuation_state_sha256']=base.engine.base.old.start._hash(c)
   after,event=api.resolve_top(c);self.assertEqual(after['activation_zone'],outer);self.assertEqual(after['response_context']['chain_links'],[l['link_id'] for l in outer]);self.assertEqual(after['response_context']['chain_status'],'resolving');self.assertEqual(event['chain_link_id'],top['link_id'])
   return {}
  base.operation(initial(),run)

if __name__=='__main__':unittest.main()
