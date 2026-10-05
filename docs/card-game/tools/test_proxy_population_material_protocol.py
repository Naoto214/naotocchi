import copy,hashlib,unittest
from test_proxy_population_input_history import document
from proxy_mandatory_policy_contract import canonical
try:import proxy_population_material_protocol as api
except ImportError:api=None
def decks():
 import json
 from proxy_population_contract import ROOT
 d=json.loads((ROOT/'data/proxy-fixtures-107/fixture-107-normal-decision-a-first.json').read_text())
 return {p['player_id']:p['deck_order_top_to_bottom'] for p in d['input']['players']}
def registry():return dict(known_shuffle_seeds=[],order_pairs=[])
def pair(c,a=50,b=100050):
 c.supply(a.to_bytes(16,'big'));c.supply(b.to_bytes(16,'big'))
class MaterialTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api)
 def test_all_initial_pairs_precede_policy_roots_and_new_coincidence_is_retained(self):
  c=api.Cursor(registry(),decks(),group_count=2);pair(c);pair(c)
  for g,a in [(1,'A'),(1,'B'),(2,'A'),(2,'B')]:
   q=c.request();self.assertEqual((q['purpose'],q['group_index'],q['owner'],q['byte_count']),('mandatory_policy_root',g,a,32));c.supply(bytes(32))
  r=c.record();self.assertTrue(r['complete']);self.assertEqual(len(r['calls']),8);self.assertEqual(r['policy_root_value_coincidences'],3);self.assertFalse(r['provenance_verified'])
  self.assertTrue(api.audit_material_record(r,registry(),decks(),group_count=2)['material_consistent'])
  for mutate in (lambda x:x['calls'][1].update(call_index=True),lambda x:x.update(approved=True),lambda x:x['groups'][0]['full_order_A'].reverse(),lambda x:x['calls'][0].update(purpose='mandatory_policy_root')):
   bad=copy.deepcopy(r);mutate(bad);self.assertFalse(api.audit_material_record(bad,registry(),decks(),group_count=2)['material_consistent'])
 def test_malformed_call_rows_are_rejected(self):
  for row in (None,[],True):self.assertFalse(api.audit_material_record({'calls':[row]},registry(),decks(),group_count=1)['material_consistent'])
 def test_rejections_retained_without_blacklisting_new_groups(self):
  r=registry();r['known_shuffle_seeds']=[51];c=api.Cursor(r,decks(),group_count=1);pair(c,50,50);pair(c,51,100051)
  self.assertEqual([a['reason_codes'] for a in c.record()['attempts']],[['within_pair_equal_seeds'],['fixed_historical_seed_or_order_pair_registry_match']]);pair(c);self.assertEqual(c.request()['purpose'],'mandatory_policy_root')
 def test_full_order_pair_historical_match_and_invalid_supply(self):
  from proxy_normal_decision_first_choice_audit import shuffle_deck
  d=decks();o={a:shuffle_deck(d[a],s) for a,s in [('A',50),('B',100050)]};r=registry();r['order_pairs']=[dict(order_pair_sha256=hashlib.sha256(canonical(o)).hexdigest())]
  c=api.Cursor(r,d,group_count=1);before=c.record()
  for raw in (True,'00',bytes(32)):
   with self.assertRaises(ValueError):c.supply(raw)
   self.assertEqual(before,c.record())
  pair(c);self.assertEqual(c.record()['groups'],[]);self.assertEqual(c.record()['attempts'][0]['historical_match_kind'],'order_pair')
class BindingTests(unittest.TestCase):
 def test_group_order_attempt_and_owner_root_are_bound(self):
  self.assertTrue(hasattr(api,'binding_errors'))
  from test_proxy_mandatory_population_input import bundle
  b=bundle();c=api.Cursor(registry(),decks(),group_count=2)
  for g in b['groups'][:2]:pair(c,g['seed_A'],g['seed_B'])
  for _ in range(4):c.supply(bytes(32))
  r=c.record();b['groups']=b['groups'][:2]
  for i,g in enumerate(b['groups'],1):g['generation_attempt_ref']='material-attempt-'+str(i)
  self.assertEqual(api.binding_errors(b,r),[])
  for mutate in (lambda b:b['groups'][0]['full_order_A'].reverse(),lambda b:b['policy_roots']['test-1'].update(A='01'*32),lambda b:b['groups'][0].update(generation_attempt_ref='wrong'),lambda b:b['groups'].reverse()):
   bad=copy.deepcopy(b);mutate(bad);self.assertTrue(api.binding_errors(bad,r))
class OuterTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  from test_proxy_mandatory_population_input import bundle
  cls.b=bundle();c=api.Cursor(registry(),decks(),group_count=1)
  g=cls.b['groups'][0];pair(c,g['seed_A'],g['seed_B']);c.supply(bytes(32));c.supply(bytes(32));template=c.record()
  r=copy.deepcopy(template);r.update(group_count=200,calls=[],attempts=[],groups=[],policy_roots=[],policy_root_value_coincidences=399)
  for i,g in enumerate(cls.b['groups'],1):
   a=copy.deepcopy(template['attempts'][0]);a.update(attempt_index=i,group_index=i,call_indices=[2*i-1,2*i]);r['attempts'].append(a)
   m=copy.deepcopy(template['groups'][0]);m.update(group_index=i,attempt_index=i);r['groups'].append(m)
   g['generation_attempt_ref']='material-attempt-'+str(i)
   for j,owner in enumerate('AB'):
    call=copy.deepcopy(template['calls'][j]);call.update(call_index=2*i-1+j,group_index=i);r['calls'].append(call)
  for i in range(1,201):
   for j,owner in enumerate('AB'):
    call=copy.deepcopy(template['calls'][2+j]);call.update(call_index=400+2*i-1+j,group_index=i);r['calls'].append(call)
    row=copy.deepcopy(template['policy_roots'][j]);row.update(call_index=call['call_index'],group_index=i);r['policy_roots'].append(row)
  cls.r=r;cls.reg=dict(registry(),registry_verified=True)
  cls.b['historical_registry_sha256']=hashlib.sha256(canonical(cls.reg)).hexdigest()
  cls.b['generation_provenance']=dict(material_transcript_sha256=hashlib.sha256(canonical(r)).hexdigest())
 def test_complete_fixed_old_material_double_and_negative_outer_bindings(self):
  from unittest.mock import patch
  with patch('proxy_population_input_history.build_cutoff_registry',return_value=self.reg):
   good=api.audit_population_material(self.b,self.r);self.assertTrue(good['material_binding_verified'],good['errors']);self.assertFalse(good['provenance_verified']);self.assertFalse(good['ready_for_execution'])
   for key in ('historical_registry_sha256','generation_provenance'):
    b=copy.deepcopy(self.b);b[key]='bad';self.assertFalse(api.audit_population_material(b,self.r)['material_binding_verified'])
   for r in ({'calls':[None]},{'calls':[[]]},dict(self.r,calls=[]),None):self.assertFalse(api.audit_population_material(self.b,r)['material_binding_verified'])
if __name__=='__main__':unittest.main()
