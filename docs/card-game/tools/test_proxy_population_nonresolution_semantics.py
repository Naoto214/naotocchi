"""Every supplied non-resolution event needs a bound local full-delta audit."""
import copy,unittest
from unittest.mock import patch
import test_proxy_population_normal_pass_effect as normal
import proxy_population_normal_pass_effect as effect
try:import proxy_population_nonresolution_semantics as api
except ImportError:api=None

def record(b):
 a,event=normal.actual(b)
 return dict(runtime=dict(source_envelope=b,final_envelope=a,events=[event],steps=[dict(source_envelope=b,events=[event],envelopes=[a],final_envelope=a)],supported_trigger_coverage={name:([effect.audit(b,a,event)] if name=='normal_pass_delta_audits' else []) for name in api.FAMILIES}),mandatory_opportunity_audit=dict(egg_choice_delta_audits=[]))

class NonresolutionSemanticTests(unittest.TestCase):
 run_case=normal.NormalPassEffectTests.run_case
 def setUp(self):self.assertIsNotNone(api,'non-resolution full-delta join absent')
 def test_actual_delta_is_joined_without_authentication_or_whole_rule_claim(self):
  def run(b):
   proof=api.audit(record(b));self.assertEqual(proof['errors'],[]);self.assertTrue(proof['supplied_nonresolution_semantics_joined']);self.assertEqual(proof['event_count'],1);self.assertFalse(proof['audit_origin_authenticated']);self.assertFalse(proof['all_rule_opportunities_proven']);self.assertIsNone(proof['balance_admitted']);return {}
  self.run_case(run)
 def test_missing_failed_duplicate_misbound_and_discontinuous_outputs_refused(self):
  def run(b):
   r=record(b)
   for mode in ('missing','hash','event_hash','duplicate','failed','false','applicable','receipt','source','final','events','unknown','wrong_family','partial_movement'):
    bad=copy.deepcopy(r);rows=bad['runtime']['supported_trigger_coverage']['normal_pass_delta_audits']
    if mode=='missing':rows.clear()
    elif mode=='hash':rows[0]['after_envelope_sha256']='0'*64
    elif mode=='event_hash':rows[0]['event_sha256']='0'*64
    elif mode=='duplicate':rows.append(copy.deepcopy(rows[0]))
    elif mode=='failed':rows[0]['errors']=['failed']
    elif mode=='false':rows[0]['supplied_normal_pass_verified']=False
    elif mode=='applicable':rows[0]['applicable']=False
    elif mode=='source':bad['runtime']['steps'][0]['source_envelope']['event_seq']+=1
    elif mode=='final':bad['runtime']['final_envelope']['event_seq']+=1
    elif mode=='events':bad['runtime']['events']=[]
    elif mode=='wrong_family':bad['runtime']['supported_trigger_coverage']['world_placement_delta_audits']=rows[:];rows.clear()
    elif mode=='partial_movement':
     row=rows.pop();row.update(full_delta_applicable=False,payment_consumption_verified=True,movement_payment_verified=True,supplied_relationship_verified=False);bad['runtime']['supported_trigger_coverage']['payment_consumption_audits']=[row]
    else:
     event=bad['runtime']['steps'][0]['events'][0]
     if mode=='receipt':event['selected_candidate']='forged'
     else:event['action_type']='unproved_dispatch'
     bad['runtime']['events']=copy.deepcopy(bad['runtime']['steps'][0]['events'])
    with self.subTest(mode=mode):self.assertTrue(api.audit(bad)['errors'])
   return {}
  self.run_case(run)
 def test_connected_entry_requires_join(self):
  import proxy_population_connected_entry as connected
  from test_proxy_mandatory_population_input import bundle
  with patch.object(api,'audit',return_value=dict(supplied_nonresolution_semantics_joined=False,errors=['sentinel'])):
   with self.assertRaisesRegex(ValueError,'non-resolution semantics'):connected.reconstruct(bundle(),'test-1A',2)

if __name__=='__main__':unittest.main()
