import unittest

import proxy_new_seed_mixed_audit_273 as subject


class MixedAudit273Tests(unittest.TestCase):
    def test_three_response_sets_and_coin_resolution(self):
        report = subject.build_report()
        rows = {row['path_id']: row for row in report['results']}
        self.assertEqual(4, len(rows))
        for path in ('probe-01-a-first', 'probe-01-b-first'):
            self.assertEqual(['response-pass'], rows[path]['candidate_ids'])
        self.assertEqual(['response-pass', 'response-use-item-A-033#1'], rows['probe-02-a-first']['candidate_ids'])
        coin = rows['probe-02-b-first']
        self.assertEqual('resolve_item', coin['next_opportunity'])
        self.assertEqual('A-033#1', coin['source_instance_id'])
        self.assertEqual([], coin['candidate_ids'])
        self.assertEqual(subject.canonical_bytes(report), subject.OUTPUT.read_bytes())


if __name__ == '__main__':
    unittest.main()
