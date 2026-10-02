import copy
import gzip
import json
from pathlib import Path
import unittest
import proxy_resource_value_trajectory as old
try:
    import proxy_continuation_world_runner as runner
except ImportError:
    runner=None

class WorldRunnerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.initials=old.load_initial_routes()
        cls.results=[] if runner is None else [runner.run_route(i,p) for i in cls.initials for p in old.POLICIES]
    def test_eight_same_initials_and_missing_outcomes(self):
        self.assertIsNotNone(runner,'shared world proof runner absent')
        self.assertEqual(len(self.results),8)
        for r in self.results:
            self.assertEqual(r['coverage_revision'],'continuation_world_immediate_outcomes_v1')
            self.assertFalse(r['policy_promoted']);self.assertEqual(r['independent_balance_sample_count'],0)
            if not r['completed']:self.assertIsNone(r['result']['winner'])
    def test_world_proofs_are_reached_on_three_legacy_paths(self):
        self.assertIsNotNone(runner,'shared world proof runner absent')
        paths={r['path_id'] for r in self.results if r['policy_id']==old.POLICIES[0] and r['world_placement_evidence']}
        self.assertTrue({'probe-01-a-first','probe-01-b-first','probe-02-a-first'}<=paths)
        for r in self.results:
            for e in r['world_placement_evidence']:
                self.assertFalse(e['proof']['future_continuous_execution_certified'])
                self.assertFalse(e['proof']['safe_free_development_certified'])
    def test_independent_replay_rejects_tampered_proof(self):
        self.assertIsNotNone(runner,'shared world proof runner absent')
        r=copy.deepcopy(self.results[0]);self.assertTrue(r['world_placement_evidence'])
        r['world_placement_evidence'][0]['proof']['payment_time']=True
        self.assertTrue(runner.validate_route(r,self.initials[0],old.POLICIES[0]))

class HistoricalWorldComparisonTests(unittest.TestCase):
    def test_saved_board_references_survive_historical_comparison_shape(self):
        helper=getattr(runner,'previous_shape',None)
        self.assertIsNotNone(helper,'436 comparison must validate board reference semantics')
        saved=json.loads(gzip.decompress((Path(__file__).resolve().parents[1]/'data/proxy-continuation-capabilities-436/paired.json.gz').read_bytes()))
        before=copy.deepcopy(saved['results'][0]);after=helper(before)
        pairs=[(a,b) for a,b in zip(before['snapshots'],after['snapshots']) if a['legacy_continuation']['activation_zone']]
        self.assertTrue(pairs)
        for a,b in pairs:self.assertEqual(b['continuation_state']['activation_zone'],a['legacy_continuation']['activation_zone'])
        self.assertEqual(before,saved['results'][0])

if __name__=='__main__':unittest.main()
