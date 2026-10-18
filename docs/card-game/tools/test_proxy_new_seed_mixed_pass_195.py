import copy
import unittest

import proxy_new_seed_mixed_pass_195 as subject


class MixedPass195Test(unittest.TestCase):
    def test_four_unique_pass_transitions(self):
        report=subject.build_report()
        self.assertEqual(4,report['new_events'])
        for row in report['results']:
            self.assertEqual([],subject.validate_result(row))
            self.assertEqual('response_pass',row['new_events'][0]['action_type'])
        self.assertEqual(1,sum(x['final_continuation_state']['response_context']['chain_status']=='resolving'
                               for x in report['results']))

    def test_modified_hash_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0])
        row['final_continuation_state_sha256']='0'*64
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__':unittest.main()
