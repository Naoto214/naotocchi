import unittest
import proxy_new_seed_mixed_replay_278 as subject

class MixedReplay278Tests(unittest.TestCase):
    def test_four_replays_and_hashes(self):
        report = subject.build_report()
        rows = {x['path_id']: x for x in report['results']}
        self.assertEqual(4, len(rows))
        self.assertEqual('post_placement_response', rows['probe-02-b-first']['final_continuation_state']['game_state']['phase'])
        self.assertEqual(2, len(rows['probe-01-b-first']['new_events']))
        self.assertEqual(5, report['new_events'])
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())

if __name__ == '__main__': unittest.main()
