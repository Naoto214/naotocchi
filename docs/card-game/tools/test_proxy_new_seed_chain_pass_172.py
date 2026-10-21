import copy
import unittest

import proxy_new_seed_chain_pass_172 as subject


class ChainPass172Test(unittest.TestCase):
    def test_one_chain_pass_and_three_held_normal_actions(self):
        report = subject.build_report()
        self.assertEqual(4, report['planned'])
        self.assertEqual(1, report['new_events'])
        self.assertEqual(1, report['new_decisions'])
        self.assertTrue(all(not subject.validate_result(row) for row in report['results']))

    def test_modified_event_chain_is_rejected(self):
        row = copy.deepcopy(subject.build_report()['results'][-1])
        row['new_events'][0]['continuation_state_after_sha256'] = '0' * 64
        self.assertTrue(subject.validate_result(row))


if __name__ == '__main__':
    unittest.main()
