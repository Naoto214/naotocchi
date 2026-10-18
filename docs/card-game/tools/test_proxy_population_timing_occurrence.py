"""Reject omitted event obligations even when producer and replay agree."""
import copy,unittest
from unittest.mock import patch
from test_proxy_population_trigger_latching import case
from test_proxy_population_runtime import initial
from test_proxy_population_positive_window import setup
import proxy_population_runtime as runtime
import proxy_population_trigger_latching as producer
import proxy_population_challenge_window as connected
try:import proxy_population_timing_occurrence as api
except ImportError:api=None

class TimingOccurrenceTests(unittest.TestCase):
 def test_independent_check_binds_negative_classifications_and_positive_rows(self):
  self.assertIsNotNone(api,'independent timing occurrence check missing')
  def run(forced):
   before,after,event,source=case();capture=producer.capture(before,after,event)
   check=api.audit(before,after,event,capture)
   self.assertEqual(check['errors'],[]);self.assertTrue(check['supplied_timing_occurrences_verified'])
   self.assertFalse(check['all_rule_opportunities_proven'])
   mutations=[]
   for field in ('occurrences','classifications'):
    bad=copy.deepcopy(capture);bad[field]=[];mutations.append(bad)
   bad=copy.deepcopy(capture);bad['occurrences']*=2;mutations.append(bad)
   bad=copy.deepcopy(capture);bad['occurrences'][0]['actor']='B';mutations.append(bad)
   bad=copy.deepcopy(capture);bad['before_envelope_sha256']='0'*64;mutations.append(bad)
   for bad in mutations:self.assertTrue(api.audit(before,after,event,bad)['errors'])
   event['result']['effect_applied']=False;negative=producer.capture(before,after,event)
   self.assertEqual(api.audit(before,after,event,negative)['errors'],[])
   negative['occurrences']=capture['occurrences'];self.assertTrue(api.audit(before,after,event,negative)['errors'])
   return {}
  runtime.operation(initial(),run)
 def test_real_entry_does_not_accept_consistently_omitted_producer_occurrence(self):
  supplied=setup();before=supplied['envelope'];native=producer.capture
  def omitted(*args):
   result=native(*args);result['occurrences']=[];return result
  with patch.object(producer,'capture',omitted):
   result=connected.segment(before,initial(),supplied['history'],[],[before],1,supplied['proof'])
  self.assertIsNotNone(result['stop'],'producer omission silently accepted')
  self.assertIn('timing occurrence',result['stop']['detail'])

import test_proxy_population_trigger_latching as timing_fixtures
class OtherTimingCrossAuditTests(timing_fixtures.OtherTimingTests):
 def setUp(self):
  native=producer.capture
  def checked(before,after,event):
   capture=native(before,after,event)
   self.assertEqual(api.audit(before,after,event,capture)['errors'],[])
   return capture
  self.capture_patch=patch.object(producer,'capture',checked)
  self.capture_patch.start();self.addCleanup(self.capture_patch.stop)

if __name__=='__main__':unittest.main()
