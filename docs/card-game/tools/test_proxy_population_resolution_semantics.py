"""Join actual top-link transitions to existing full-delta audit outputs."""
import copy,unittest
from unittest.mock import patch
from test_proxy_population_designated_effects import actual
from test_proxy_population_runtime import initial
import proxy_population_runtime as runtime
import proxy_population_challenge_window as window
import proxy_population_designated_effects as designated
try:import proxy_population_resolution_semantics as api
except ImportError:api=None

def record(forced):
 b,a,ev,decisions,registry=actual(forced,'P-cat_ceo')
 proof=designated.audit(b,a,ev,decisions,registry)
 return dict(runtime=dict(source_envelope=b,final_envelope=a,events=[ev],steps=[dict(source_envelope=b,decision=None,events=[ev],envelopes=[a],final_envelope=a)],supported_trigger_coverage={key:[] for key in api.FAMILIES}),mandatory_opportunity_audit=dict(designated_effect_audits=[proof]))

class ResolutionSemanticTests(unittest.TestCase):
 def setUp(self):self.assertIsNotNone(api,'full resolution semantic join absent')
 def run_case(self,fn):
  with window.contract_scope():return runtime.operation(initial(),fn)
 def test_actual_designated_delta_is_joined_without_promoting_authenticity(self):
  def run(forced):
   r=record(forced);proof=api.audit(r);self.assertEqual(proof['errors'],[]);self.assertTrue(proof['supplied_resolution_semantics_joined']);self.assertEqual(proof['resolution_count'],1);self.assertFalse(proof['audit_origin_authenticated']);self.assertFalse(proof['all_rule_opportunities_proven']);self.assertIsNone(proof['balance_admitted']);return {}
  self.run_case(run)
 def test_missing_misbound_duplicate_failed_and_wrong_order_are_rejected(self):
  def run(forced):
   r=record(forced)
   for mode in ('missing','hash','duplicate','failure','false','applicable','event','receipt','source','final'):
    bad=copy.deepcopy(r);rows=bad['mandatory_opportunity_audit']['designated_effect_audits']
    if mode=='missing':rows.clear()
    elif mode=='hash':rows[0]['after_envelope_sha256']='0'*64
    elif mode=='duplicate':rows.append(copy.deepcopy(rows[0]))
    elif mode=='failure':rows[0]['errors']=['bad effect']
    elif mode=='false':rows[0]['supplied_designated_effect_verified']=False
    elif mode=='applicable':rows[0]['applicable']=False
    elif mode=='event':bad['runtime']['steps'][0]['events'][0]['action_type']='pass'
    elif mode=='receipt':bad['runtime']['steps'][0]['events'][0]['result']['growth_added']=5;bad['runtime']['events']=copy.deepcopy(bad['runtime']['steps'][0]['events'])
    elif mode=='source':bad['runtime']['steps'][0]['source_envelope']['event_seq']+=1
    else:bad['runtime']['final_envelope']['event_seq']+=1
    with self.subTest(mode=mode):self.assertTrue(api.audit(bad)['errors'])
   return {}
  self.run_case(run)
 def test_connected_entry_requires_semantic_join(self):
  import proxy_population_connected_entry as connected
  from test_proxy_mandatory_population_input import bundle
  with patch.object(api,'audit',return_value=dict(supplied_resolution_semantics_joined=False,errors=['sentinel'])):
   with self.assertRaisesRegex(ValueError,'resolution semantics'):connected.reconstruct(bundle(),'test-1A',2)

if __name__=='__main__':unittest.main()
