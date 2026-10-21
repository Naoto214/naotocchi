import copy
import unittest

import proxy_new_seed_chain_normal_audit_191 as subject


class ChainNormalAudit191Test(unittest.TestCase):
    def test_three_normal_one_chain_response_complete(self):
        report=subject.build_report()
        self.assertEqual(4,report['planned'])
        for row in report['results']:
            self.assertEqual([],subject.validate_result(row))
            self.assertTrue(row['candidate_set_complete'])
        chain=[x for x in report['results'] if x['next_opportunity']=='response_window']
        self.assertEqual(1,len(chain))
        self.assertEqual(['response-pass'],chain[0]['candidate_ids'])

    def test_modified_candidate_is_rejected(self):
        row=copy.deepcopy(subject.build_report()['results'][0]);row['candidate_ids'].append('invalid')
        self.assertTrue(subject.validate_result(row))


if __name__=='__main__':unittest.main()
