import unittest

import proxy_new_seed_next_audit_159 as audit


class NewSeedNextAudit159Tests(unittest.TestCase):
    def test_three_normal_one_turn_end(self):
        report = audit.build_report()
        self.assertEqual((report['planned'], report['new_events'], report['completed'],
                          report['independent_balance_sample_count']), (4, 0, 0, 0))
        rows = {x['path_id']: x for x in report['results']}
        self.assertEqual(rows['probe-01-a-first']['candidate_ids'],
                         ['candidate-play-main-B-001#1-birth', 'pass'])
        self.assertEqual(rows['probe-01-b-first']['candidate_ids'], ['pass'])
        self.assertEqual(rows['probe-02-b-first']['candidate_ids'], ['pass'])
        self.assertEqual(rows['probe-02-a-first']['next_opportunity'], 'turn_end')

    def test_saved_replay(self):
        report = audit.build_report()
        self.assertEqual(audit.OUTPUT.read_bytes(), audit.canonical_bytes(report))
        for row in report['results']:
            self.assertEqual(audit.validate_result(row), [])


if __name__ == '__main__': unittest.main()
