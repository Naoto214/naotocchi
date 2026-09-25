import copy
import unittest

import proxy_new_seed_followup_audit_177 as subject


class FollowupAudit177Test(unittest.TestCase):
    def test_three_response_and_one_normal_opportunity(self):
        report = subject.build_report()
        self.assertEqual(4, report['planned'])
        self.assertEqual(0, report['new_events'])
        self.assertTrue(all(not subject.validate_result(row) for row in report['results']))
        self.assertEqual(3, sum(row['next_opportunity'] == 'response_window'
                                for row in report['results']))
        self.assertTrue(all(row['candidate_ids'] in (['response-pass'], ['pass'])
                            for row in report['results']))

    def test_corrupted_hash_is_rejected(self):
        row = copy.deepcopy(subject.build_report()['results'][0])
        row['source_game_state_sha256'] = '0' * 64
        self.assertTrue(subject.validate_result(row))


if __name__ == '__main__': unittest.main()
