"""Connect107 antlion01 to existing movements without changing saved natives."""
import copy,unittest
import proxy_continuation_actions as actions
import proxy_continuation_state as state
import proxy_continuation_candidates as candidates
import proxy_continuation_batch as batch
import proxy_population_payment_consumption as api
import test_proxy_population_payment_consumption as fixtures

class MainRoutesTests(unittest.TestCase):
 run_case=fixtures.ConsumptionTests.run_case
 def test_antlion01_birth_and_transform_use_existing_batch_handler(self):
  def run(template):
   for variant in ('birth','transform'):
    e=copy.deepcopy(template);g=e['legacy_continuation']['game_state'];p=g['players'][g['turn_player']];p['hand'].append(p['board']['main']);p['board']['main']=None
    if variant=='transform':
     current=next(s for s in p['hand'] if g['cards'][s]['card_id']=='M-beetle-01');p['hand'].remove(current);p['board']['main']=current
    action=next(a for a in candidates.audit(e,[])['legal_candidate_details'] if a['card_id']=='M-antlion-01' and a['candidate_variant']==variant)
    after,events=batch.transition(e,action,[]);proof=api.audit(e,after,events[0])
    self.assertEqual(events[0]['action_type'],'main_movement');self.assertEqual(proof['errors'],[]);self.assertTrue(proof['movement_payment_verified'])
    self.assertEqual(events[0]['payment_time'],1 if variant=='birth' else 0)
    self.assertEqual(after['legacy_continuation']['pending_triggers'],[])
   return {}
  self.run_case(run)
 def test_existing_legacy_birth_receipt_is_also_bound(self):
  def run(e):
   g=e['legacy_continuation']['game_state'];p=g['players'][g['turn_player']];p['hand'].append(p['board']['main']);p['board']['main']=None
   action=next(a for a in candidates.audit(e,[])['legal_candidate_details'] if a['card_id']=='M-antlion-01' and a['candidate_variant']=='birth')
   current,events=actions.old.normal.transition(state.current(e),dict(selected_action=action,selected_candidate=action['candidate_id'],candidate_set_complete=True),{})
   after=state.advance(e,current,current['last_event_seq']);event=events[0];proof=api.audit(e,after,event)
   self.assertEqual(event['action_type'],'play_main_birth');self.assertTrue(proof.get('movement_payment_verified'),proof)
   self.assertEqual(proof['errors'],[])
   bad=copy.deepcopy(after);bad['legacy_continuation']['game_state']['players'][g['turn_player']]['time']+=1
   self.assertTrue(api.audit(e,bad,event)['errors']);return {}
  self.run_case(run)
 def test_scope_restores_registry_and_historical_anchor(self):
  import proxy_population_runtime_entry as entry
  original=batch.CAPABILITIES
  self.assertNotIn('M-antlion-01',original)
  self.run_case(lambda e:{})
  self.assertIs(batch.CAPABILITIES,original);self.assertEqual(entry.verify_sources(),entry.SOURCES_SHA)
 def test_positive_discount_and_insufficient_or_malformed_time(self):
  def run(e):
   g=e['legacy_continuation']['game_state'];actor=g['turn_player'];other='A' if actor=='B' else 'B';p=g['players'][actor];p['hand'].append(p['board']['main']);source=next(s for s in p['hand'] if g['cards'][s]['card_id']=='M-beetle-01');p['hand'].remove(source);p['board']['main']=source
   own=[r for r in e['runtime']['payment_effects'] if r['controller']==actor];e['runtime']['payment_effects']=[own[0]]+[r for r in e['runtime']['payment_effects'] if r['controller']!=actor]
   action=next(a for a in candidates.audit(e,[])['legal_candidate_details'] if a['card_id']=='M-antlion-08' and a['candidate_variant']=='transform')
   after,events=batch.transition(e,action,[]);self.assertEqual(events[0]['payment_time'],6);self.assertEqual(api.audit(e,after,events[0])['errors'],[])
   for owner,value in [(actor,5),(actor,True),(other,True),(other,-1)]:
    b=copy.deepcopy(e);a=copy.deepcopy(after);b['legacy_continuation']['game_state']['players'][owner]['time']=value
    if owner==other:a['legacy_continuation']['game_state']['players'][owner]['time']=int(value)
    with self.subTest(owner=owner,value=value):self.assertTrue(api.audit(b,a,events[0])['errors'])
   return {}
  self.run_case(run)

if __name__=='__main__':unittest.main()
