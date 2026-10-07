"""Forced relationship activation conditions, not selection eligibility."""
import copy,unittest
from test_proxy_population_arrival_predicates import fixture
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_population_challenge_window as connected
import proxy_population_trigger_existing as existing
import proxy_population_trigger_predicates as api
import proxy_population_opportunity_ledger as ledger
import proxy_population_trigger_sequential as sequential
import proxy_continuation_batch as batch


def relationship():
 e,h,o,_=fixture('M-beetle-01');g=e['legacy_continuation']['game_state'];p=g['players']['A'];source=next(s for s in p['hand']+p['deck'] if g['cards'][s]['card_id']=='P-cat_ceo')
 (p['hand'] if source in p['hand'] else p['deck']).remove(source);p['board'].update(partner=source,partner_stage=0)
 cap=batch.classification('P-cat_ceo');h=[dict(seq=3,actor='A',action_type='relationship_start',source_instance_id=source)]
 o.update(source_instance_id=source,category='forced',ability_key=cap['timing'],source_reference=cap['reference'])
 return e,h,o

class RelationshipPredicateTests(unittest.TestCase):
 def setUp(self):self.assertTrue(hasattr(api,'audit_relationship'),'forced relationship audit missing')
 def test_forced_activation_remains_with_empty_hand_and_has_no_decline(self):
  def run(forced):
   e,h,o=relationship();p=e['legacy_continuation']['game_state']['players']['A'];p['deck'].extend(p['hand']);p['hand']=[]
   with connected.contract_scope():
    rows,proof=existing.ExistingAdapter(h).enumerate(e,o)
    self.assertTrue(proof['current_predicate_audit']['current_trigger_predicates_verified'])
    journal=ledger.observe(ledger.create('A'),[o],'empty');inv=sequential.inventory(e,journal,existing.ExistingAdapter(h))
    self.assertEqual(len(inv['legal_candidate_details']),1);self.assertEqual(inv['category'],'forced')
   for bad in ([],rows+rows,[dict(rows[0],target_instance_ids=['foreign'])],[dict(rows[0],base_time_cost=1)]):self.assertTrue(api.audit_relationship(e,o,bad,h)['errors'])
   self.assertTrue(api.audit_relationship(e,dict(o,category='optional'),rows,h)['errors'])
   return {}
  runtime.operation(initial(),run)
 def test_same_occurrence_consumption_and_unrelated_origins(self):
  def run(forced):
   e,h,o=relationship();rows,_=existing.ExistingAdapter(h).enumerate(e,o)
   for mode in ('progress','source','actor','missing','duplicate'):
    bad=copy.deepcopy(h)
    if mode=='progress':bad[0]['action_type']='relationship_progress'
    elif mode=='source':bad[0]['source_instance_id']='foreign'
    elif mode=='actor':bad[0]['actor']='B'
    elif mode=='missing':bad=[]
    else:bad+=copy.deepcopy(bad)
    self.assertTrue(api.audit_relationship(e,o,rows,bad)['errors'],mode)
   h.append(dict(seq=4,actor='A',action_type='activate_response',source_zone='board',source_instance_id=o['source_instance_id'],trigger_origin_event_seq=3));e['event_seq']=4
   with connected.contract_scope():
    rows,proof=existing.ExistingAdapter(h).enumerate(e,o);self.assertEqual(rows,[]);self.assertTrue(proof['current_predicate_audit']['current_trigger_predicates_verified'])
   return {}
  runtime.operation(initial(),run)
if __name__=='__main__':unittest.main()
