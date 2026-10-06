"""Source-local target/cost alternatives survive projection tampering."""
import copy,unittest
import proxy_population_runtime as runtime
import proxy_population_paid_draw as paid
import proxy_continuation_candidates as candidates
import proxy_population_source_inventory as sources
from test_proxy_population_paid_draw import fixture
from test_proxy_population_runtime import initial
try:import proxy_population_candidate_expansions as api
except ImportError:api=None

def repair(inv):
 inv['legal_candidate_details']=sorted((u for u in inv['enumeration_units'] if u['disposition']=='admitted'),key=lambda u:u['candidate_id']);inv['legal_candidate_ids']=[u['candidate_id'] for u in inv['legal_candidate_details']]

class ExpansionTests(unittest.TestCase):
 def test_paid_order_omission_is_distinct_from_source_coverage(self):
  self.assertIsNotNone(api)
  def run(forced):
   e,source,_=fixture('M-antlion-08');e['legacy_continuation']['game_state']['phase']='normal_action'
   with paid.scope():
    inv=candidates.audit(e,[]);proof=api.audit_normal(e,inv)
    self.assertTrue(proof['registered_expansions_verified'],proof['errors']);self.assertFalse(proof['complete_legal_set_proven'])
    bad=copy.deepcopy(inv);row=next(u for u in bad['enumeration_units'] if u['action_type']=='activate_main_ability');bad['enumeration_units'].remove(row);repair(bad)
    self.assertTrue(sources.audit_normal(e,bad)['source_and_variant_coverage_verified'])
    self.assertFalse(api.audit_normal(e,bad)['registered_expansions_verified'])
   return {}
  runtime.operation(initial(),run)
 def test_current_first_date_target_and_item_targets_expand_from_state(self):
  from test_proxy_population_activation_legality import fixture as target_fixture
  import proxy_population_activation_legality as legality
  def run(forced):
   e,actor,source=target_fixture('E-first-date',1);g=e['legacy_continuation']['game_state'];g['phase']='normal_action';p=g['players'][actor]
   # Conditional inventory fixture with multiple known attachment targets.
   for name,zone in (('C-box','companions'),('C-chicken','companions')):
    s=next(s for s in p['hand']+p['deck']+p['discard'] if g['cards'][s]['card_id']==name)
    next(p[z] for z in ('hand','deck','discard') if s in p[z]).remove(s);p['board'][zone].append(s)
   item=next(s for s in p['hand']+p['deck']+p['discard'] if g['cards'][s]['card_id']=='I-bowtie')
   if item not in p['hand']:next(p[z] for z in ('deck','discard') if item in p[z]).remove(item);p['hand'].append(item)
   p['time']=10
   with legality.scope():
    inv=candidates.audit(e,[]);proof=api.audit_normal(e,inv)
    self.assertTrue(proof['registered_expansions_verified'],proof['errors'])
    bad=copy.deepcopy(inv);u=next(r for r in bad['enumeration_units'] if r['source_instance_id']==item);bad['enumeration_units'].remove(u);repair(bad)
    self.assertTrue(sources.audit_normal(e,bad)['source_and_variant_coverage_verified'])
    self.assertFalse(api.audit_normal(e,bad)['registered_expansions_verified'])
    bad=copy.deepcopy(inv);u=next(r for r in bad['enumeration_units'] if r['source_instance_id']==source);u['target_instance_ids']=[];repair(bad)
    self.assertFalse(api.audit_normal(e,bad)['registered_expansions_verified'])
   return {}
  runtime.operation(initial(),run)
class PaymentExpansionTests(unittest.TestCase):
 def test_optional_discount_is_a_separate_candidate_even_when_unaffordable(self):
  def run(forced):
   e,source,_=fixture('M-antlion-01');g=e['legacy_continuation']['game_state'];g['phase']='normal_action';p=g['players'][g['turn_player']]
   item=next(s for s in p['hand']+p['deck']+p['discard'] if g['cards'][s]['card_id']=='I-poop1')
   if item not in p['hand']:next(p[z] for z in ('deck','discard') if item in p[z]).remove(item);p['hand'].append(item)
   for time in (0,10):
    p['time']=time;inv=candidates.audit(e,[])
    rows=[r for r in inv['enumeration_units'] if r['source_instance_id']==item and r['action_type']=='set_item']
    self.assertEqual(len(rows),2)
    self.assertTrue(api.audit_normal(e,inv)['registered_expansions_verified'])
    bad=copy.deepcopy(inv);bad['enumeration_units'].remove(next(r for r in bad['enumeration_units'] if r['source_instance_id']==item and r['action_type']=='set_item' and r['evidence']['cost_modifiers']));repair(bad)
    self.assertTrue(sources.audit_normal(e,bad)['source_and_variant_coverage_verified'])
    self.assertFalse(api.audit_normal(e,bad)['registered_expansions_verified'])
   return {}
  runtime.operation(initial(),run)

class ConnectedExpansionTests(unittest.TestCase):
 def test_actual_normal_entries_export_expansion_evidence(self):
  from test_proxy_mandatory_population_input import bundle
  import proxy_population_connected_entry as connected
  result=connected.reconstruct(bundle(),'test-1A',3)
  entries=[s for s in result['runtime']['steps'] if s.get('decision',{} ) is not None and s['decision'].get('context',{}).get('decision_kind')=='normal_action']
  self.assertTrue(entries)
  for step in entries:
   proof=step['normal_candidate_expansions']
   self.assertTrue(proof['registered_expansions_verified'],proof['errors'])
   self.assertFalse(proof['complete_legal_set_proven'])

if __name__=='__main__':unittest.main()
