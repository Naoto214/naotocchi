import copy
import gzip
import json
import unittest
from pathlib import Path
import proxy_resource_value_trajectory as old
import proxy_continuation_runner as base
try:
    import proxy_continuation_end_runner as runner
except ImportError:
    runner=None

class EndRunnerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.initials=old.load_initial_routes()
        cls.saved=json.loads(gzip.decompress((Path(__file__).resolve().parents[1]/'data/proxy-continuation-contract/paired.json.gz').read_bytes()))['results']
        if runner:cls.runs=[runner.run_route(i,p) for i in cls.initials for p in old.POLICIES]
    def setUp(self):self.assertIsNotNone(runner,'opt-in shared end runner absent')

    def test_old_433_default_replay_still_exact(self):
        for initial in self.initials:
            for policy in old.POLICIES:
                before=next(r for r in self.saved if r['path_id']==initial['path_id'] and r['policy_id']==policy)
                with self.subTest(path=initial['path_id'],policy=policy):self.assertEqual(base.run_route(initial,policy),before)

    def test_paired_eight_initial_inputs_and_explicit_coverage(self):
        self.assertEqual(len({r['run_id'] for r in self.runs}),8)
        for r in self.runs:
            self.assertEqual(r['coverage_revision'],runner.end.COVERAGE)
            self.assertEqual(r['initial_raw_sha256'],old.INITIAL_SHA)
            self.assertFalse(r['policy_promoted']);self.assertEqual(r['independent_balance_sample_count'],0)
            if not r['completed']:self.assertIsNone(r['result']['winner'])

    def test_reached_main_and_equipment_end_boundaries_advance(self):
        limits={'probe-01-a-first':22,'probe-01-b-first':12,'probe-02-a-first':30}
        for r in self.runs:
            if r['policy_id']==old.POLICIES[1] and r['path_id'] in limits:
                self.assertGreater(r['last_valid_event_seq'],limits[r['path_id']])
                self.assertTrue(r['end_evidence'])

    def test_egg_draw_is_never_executed_with_main_present(self):
        regular=[]
        for r in self.runs:
            snapshots={s['event_seq']:s for s in r['snapshots']}
            for event in r['events']:
                if event['action_type'] not in ('turn_start_and_egg_draw','turn_start_and_normal_draw'):continue
                main=snapshots[event['seq']]['legacy_continuation']['game_state']['players'][event['actor']]['board']['main']
                if event['action_type']=='turn_start_and_egg_draw':self.assertIsNone(main)
                else:self.assertIsNotNone(main);regular.append(event)
        self.assertTrue(regular)

    def test_independent_replay_checks_runtime_and_end_evidence(self):
        r=next(r for r in self.runs if r['path_id']=='probe-02-a-first' and r['policy_id']==old.POLICIES[1]);i=self.initials[2]
        self.assertEqual(runner.validate_route(r,i,r['policy_id']),[])
        bad=copy.deepcopy(r);bad['end_evidence'][-1]['envelope_sha256']='0'*64
        self.assertTrue(runner.validate_route(bad,i,r['policy_id']))

if __name__=='__main__':unittest.main()
