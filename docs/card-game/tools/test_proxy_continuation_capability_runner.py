import copy
import unittest
import proxy_resource_value_trajectory as old
import proxy_continuation_candidates as candidates
import proxy_continuation_rules as rules
import proxy_resource_value_integration as saved
try:
    import proxy_continuation_capability_runner as runner
except ImportError:
    runner=None


class CapabilityRunnerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.initials=old.load_initial_routes()
        if runner:cls.runs=[runner.run_route(i,p) for i in cls.initials for p in old.POLICIES]
    def setUp(self):self.assertIsNotNone(runner,'opt-in shared capability runner absent')
    def test_eight_initials_missing_results_and_explicit_coverage(self):
        self.assertEqual(len({r['run_id'] for r in self.runs}),8)
        for r in self.runs:
            self.assertEqual(r['initial_raw_sha256'],old.INITIAL_SHA)
            self.assertEqual(r['coverage_revision'],runner.COVERAGE)
            self.assertFalse(r['policy_promoted']);self.assertEqual(r['independent_balance_sample_count'],0)
            if not r['completed']:self.assertIsNone(r['result']['winner'])
    def test_actual_birth_proof_is_saved_without_false_future_execution(self):
        r=self.runs[0];proofs=r['main_capability_evidence']
        self.assertTrue(any(e['event_seq']==31 and e['proof']['source_reference'].endswith('#M-beetle-02') for e in proofs))
        self.assertTrue(all(not e['proof']['future_trigger_execution_certified'] for e in proofs))
    def test_independent_replay_rejects_boolean_or_proof_tampering(self):
        r=self.runs[0];self.assertEqual(runner.validate_route(r,self.initials[0],old.POLICIES[0]),[])
        bad=copy.deepcopy(r);bad['main_capability_evidence'][0]['proof']['future_trigger_execution_certified']=True
        self.assertTrue(runner.validate_route(bad,self.initials[0],old.POLICIES[0]))

if __name__=='__main__':unittest.main()
