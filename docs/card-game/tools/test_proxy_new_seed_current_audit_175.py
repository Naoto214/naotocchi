import copy
import unittest

import proxy_new_seed_current_audit_175 as subject


class CurrentAudit175Test(unittest.TestCase):
    def test_current_four_opportunities(self):
        report = subject.build_report()
        self.assertEqual(4, report['planned'])
        self.assertEqual(0, report['new_events'])
        self.assertEqual(3, sum(x['candidate_ids'] in (['pass'], ['response-pass'])
                                for x in report['results']))
        self.assertTrue(all(not subject.validate_result(row) for row in report['results']))

    def test_corrupt_boundary_is_rejected(self):
        row = copy.deepcopy(subject.build_report()['results'][0])
        row['source_continuation_state_sha256'] = '0' * 64
        self.assertTrue(subject.validate_result(row))


if __name__ == '__main__': unittest.main()
