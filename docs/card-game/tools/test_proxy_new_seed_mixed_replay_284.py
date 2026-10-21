import unittest
import proxy_new_seed_mixed_replay_284 as subject


class MixedReplay284Tests(unittest.TestCase):
    def test_three_passes_one_coin_resolution_and_hash_chains(self):
        report = subject.build_report()
        self.assertEqual(4, report['new_events'])
        rows = {x['path_id']: x for x in report['results']}
        self.assertEqual('resolve_item', rows['probe-02-a-first']['new_events'][0]['action_type'])
        self.assertEqual(3, sum(x['new_events'][0]['action_type'] == 'response_pass' for x in rows.values()))
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())
